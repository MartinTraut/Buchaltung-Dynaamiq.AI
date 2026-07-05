"use client"

import * as React from "react"
import Link from "next/link"
import { nanoid } from "nanoid"
import {
  Sparkles,
  SendHorizontal,
  FileText,
  ReceiptEuro,
  Mail,
  Check,
  Loader2,
  Wand2,
  ArrowRight,
  Globe,
  UserPlus,
  Wallet,
  Lightbulb,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { eur, computeTotals } from "@/lib/format"
import type { LineItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DynaamiqMark } from "@/components/brand/logo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AiAction {
  type: "quote" | "invoice" | "email" | "contact" | "expense" | "answer"
  message: string
  customerId?: string | null
  customerName?: string | null
  items?: LineItem[]
  notes?: string
  rationale?: string
  validDays?: number
  email?: { subject: string; body: string }
  contact?: {
    company: string
    contactName?: string
    email?: string
    phone?: string
    website?: string
    city?: string
    tags?: string[]
  }
  expense?: {
    category: string
    amount: number
    taxRate: number
    description: string
    date?: string | null
  }
}

interface Turn {
  id: string
  role: "user" | "assistant"
  text?: string
  action?: AiAction
  demo?: boolean
  analyzed?: string | null
  tier?: "fast" | "balanced" | "max" | "override"
  done?: { kind: string; href: string; label: string }
}

// Wie das gewählte Modell im UI erscheint (Routing-Transparenz)
const TIER_BADGE: Record<NonNullable<Turn["tier"]>, { label: string; icon: string; cls: string }> = {
  fast: { label: "Haiku · schnell", icon: "⚡", cls: "border-sky-400/20 bg-sky-400/10 text-sky-300" },
  balanced: { label: "Sonnet · ausgewogen", icon: "◆", cls: "border-violet-400/20 bg-violet-400/10 text-violet-300" },
  max: { label: "Opus · Höchstleistung", icon: "✦", cls: "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan" },
  override: { label: "Festes Modell", icon: "●", cls: "border-white/15 bg-white/[0.06] text-foreground/70" },
}

const SUGGESTIONS = [
  { icon: Globe, label: "Erstell ein Angebot: Webseite gebaut für 5.000 €, ca. 90 Stunden — https://studiovega.de — analysier die Seite und begründe den Preis fachlich", intent: "quote" },
  { icon: FileText, label: "Angebot für EcoMove über Meta Ads Retainer 2.400 €/Monat + Setup 1.200 €", intent: "quote" },
  { icon: UserPlus, label: "Neuer Kontakt: Atlas Bau GmbH, Ansprechpartner Jonas Keller, jonas@atlasbau.de, München — Branche Bau, Google Ads", intent: "contact" },
  { icon: Wallet, label: "Ausgabe erfassen: Figma Abo 45 € im Monat bezahlt", intent: "expense" },
]

export default function AssistantPage() {
  const { db, upsertQuote, upsertInvoice, upsertEmail, upsertCustomer, addTransaction, pushActivity, customerById } = useStore()
  const [input, setInput] = React.useState("")
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [loading, setLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, loading])

  async function send(text: string, intent: string = "auto") {
    if (!text.trim() || loading) return
    setInput("")
    setTurns((t) => [...t, { id: nanoid(6), role: "user", text }])
    setLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          intent,
          customers: db.customers.map((c) => ({ id: c.id, company: c.company })),
          company: { name: db.settings.name, defaultTaxRate: db.settings.defaultTaxRate, today: new Date().toISOString().slice(0, 10), ownerName: db.settings.ownerName },
        }),
      })
      const data = await res.json()
      const action = data.action as AiAction
      setTurns((t) => [
        ...t,
        { id: nanoid(6), role: "assistant", action, demo: data.demo, analyzed: data.analyzed, tier: data.tier },
      ])
    } catch {
      setTurns((t) => [...t, { id: nanoid(6), role: "assistant", text: "Es gab ein Problem bei der Anfrage. Bitte erneut versuchen." }])
    } finally {
      setLoading(false)
    }
  }

  function resolveCustomerId(action: AiAction): string {
    if (action.customerId && customerById(action.customerId)) return action.customerId
    if (action.customerName) {
      const existing = db.customers.find((c) => c.company.toLowerCase() === action.customerName!.toLowerCase())
      if (existing) return existing.id
      const created = upsertCustomer({ company: action.customerName, health: "lead" })
      return created.id
    }
    return db.customers[0]?.id ?? ""
  }

  function execute(turnId: string, action: AiAction) {
    const items = (action.items ?? []).map((it) => ({ ...it, id: nanoid(6) }))
    const docNotes = [action.rationale, action.notes].filter(Boolean).join("\n\n")
    if (action.type === "quote") {
      const customerId = resolveCustomerId(action)
      const valid = new Date(); valid.setDate(valid.getDate() + (action.validDays ?? 21))
      const q = upsertQuote({ customerId, status: "draft", issueDate: new Date().toISOString(), validUntil: valid.toISOString(), items, notes: docNotes })
      pushActivity({ type: "ai", title: `KI-Angebot ${q.number} erstellt`, meta: customerById(customerId)?.company, customerId })
      finish(turnId, { kind: "Angebot", href: "/quotes", label: `${q.number} öffnen` })
      toast.success(`Angebot ${q.number} erstellt`)
    } else if (action.type === "invoice") {
      const customerId = resolveCustomerId(action)
      const due = new Date(); due.setDate(due.getDate() + db.settings.paymentTermsDays)
      const inv = upsertInvoice({ customerId, status: "draft", issueDate: new Date().toISOString(), dueDate: due.toISOString(), items, notes: docNotes })
      pushActivity({ type: "ai", title: `KI-Rechnung ${inv.number} erstellt`, meta: customerById(customerId)?.company, customerId })
      finish(turnId, { kind: "Rechnung", href: "/invoices", label: `${inv.number} öffnen` })
      toast.success(`Rechnung ${inv.number} erstellt`)
    } else if (action.type === "email" && action.email) {
      const customerId = action.customerName ? resolveCustomerId(action) : undefined
      const c = customerId ? customerById(customerId) : undefined
      upsertEmail({ to: c?.email ?? "", customerId, subject: action.email.subject, body: action.email.body, status: "draft" })
      pushActivity({ type: "ai", title: `KI-E-Mail erstellt`, meta: c?.company, customerId })
      finish(turnId, { kind: "E-Mail", href: "/emails", label: "Entwurf öffnen" })
      toast.success("E-Mail-Entwurf erstellt")
    } else if (action.type === "contact" && action.contact) {
      const c = upsertCustomer({
        company: action.contact.company,
        contactName: action.contact.contactName,
        email: action.contact.email,
        phone: action.contact.phone,
        website: action.contact.website,
        city: action.contact.city,
        tags: action.contact.tags ?? [],
        health: "lead",
      })
      pushActivity({ type: "customer", title: `KI-Kontakt angelegt — ${c.company}`, meta: c.city, customerId: c.id })
      finish(turnId, { kind: "Kontakt", href: "/crm", label: `${c.company} öffnen` })
      toast.success(`Kontakt ${c.company} angelegt`)
    } else if (action.type === "expense" && action.expense) {
      addTransaction({
        type: "expense",
        category: action.expense.category,
        description: action.expense.description,
        amount: action.expense.amount,
        taxRate: action.expense.taxRate ?? 0.19,
        date: action.expense.date ? new Date(action.expense.date).toISOString() : new Date().toISOString(),
      })
      pushActivity({ type: "ai", title: `KI-Ausgabe erfasst — ${action.expense.category}`, meta: eur(action.expense.amount) })
      finish(turnId, { kind: "Ausgabe", href: "/finance", label: "In Buchhaltung" })
      toast.success("Ausgabe einsortiert")
    }
  }

  function finish(turnId: string, done: Turn["done"]) {
    setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, done } : x)))
  }

  const empty = turns.length === 0

  return (
    <div className="mx-auto flex h-[calc(100vh-128px)] max-w-3xl flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
        {empty && (
          <div className="flex flex-col items-center justify-center pt-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-brand-cyan/20 blur-2xl" />
              <DynaamiqMark size={64} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
              Was soll ich für dich <span className="text-brand-gradient">erstellen</span>?
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Beschreibe in natürlicher Sprache, was du brauchst — ich erzeuge das Angebot, die Rechnung oder die E-Mail und lege sie nach einem Klick direkt an.
            </p>
            <div className="mt-7 grid w-full gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.label, s.intent)}
                  className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 text-left transition-all hover:border-brand-cyan/30 hover:bg-white/[0.04]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-cyan/12 text-brand-cyan">
                    <s.icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm text-foreground/90">{s.label}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white">
                {turn.text}
              </div>
            </div>
          ) : (
            <div key={turn.id} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
                <DynaamiqMark size={20} />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {turn.analyzed && (
                    <Badge variant="violet" className="gap-1.5 text-[11px]">
                      <Globe className="size-3" /> Website analysiert
                    </Badge>
                  )}
                  {turn.tier && !turn.demo && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        TIER_BADGE[turn.tier].cls,
                      )}
                      title="Der Assistent hat dieses Modell automatisch für die Aufgabe gewählt"
                    >
                      <span>{TIER_BADGE[turn.tier].icon}</span> {TIER_BADGE[turn.tier].label}
                    </span>
                  )}
                  {turn.demo && (
                    <Badge variant="warning" className="text-[11px]">Demo-Modus · ohne API-Key</Badge>
                  )}
                </div>
                {turn.action && <ActionPreview action={turn.action} customerName={turn.action.customerId ? customerById(turn.action.customerId)?.company : turn.action.customerName ?? undefined} />}
                {turn.text && <p className="text-sm text-foreground/90">{turn.text}</p>}

                {turn.action && turn.action.type !== "answer" && (
                  turn.done ? (
                    <div className="flex items-center gap-2 text-sm text-[#3ee3b5]">
                      <Check className="size-4" /> {turn.done.kind} erstellt ·{" "}
                      <Link href={turn.done.href} className="underline underline-offset-2">{turn.done.label}</Link>
                    </div>
                  ) : (
                    <Button variant="brand" size="lg" className="gap-1.5" onClick={() => execute(turn.id, turn.action!)}>
                      <Wand2 className="size-4" /> Ausführen & anlegen
                    </Button>
                  )
                )}
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
              <DynaamiqMark size={20} />
            </span>
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand-cyan" /> Denke nach…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/8 pt-4">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-cyan/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="z. B. Erstelle ein Angebot für Studio Vega über Branding + Performance…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <Button variant="brand" size="icon-lg" disabled={!input.trim() || loading} onClick={() => send(input)}>
            <SendHorizontal className="size-4" />
          </Button>
        </div>
        <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground/60">
          <Sparkles className="mr-1 inline size-3" />
          KI kann Fehler machen — prüfe Beträge vor dem Versand.
        </p>
      </div>
    </div>
  )
}

function ActionPreview({ action, customerName }: { action: AiAction; customerName?: string }) {
  if (action.type === "answer") {
    return <p className="text-sm text-foreground/90">{action.message}</p>
  }
  if (action.type === "email" && action.email) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <div className="border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">E-Mail-Entwurf</p>
          <p className="mt-0.5 text-sm font-semibold">{action.email.subject}</p>
        </div>
        <p className="whitespace-pre-wrap px-4 py-3 text-sm text-foreground/85">{action.email.body}</p>
      </div>
    )
  }
  if (action.type === "contact" && action.contact) {
    const c = action.contact
    return (
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <UserPlus className="size-4 text-brand-cyan" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Neuer Kontakt</p>
        </div>
        <div className="space-y-1 px-4 py-3 text-sm">
          <p className="font-semibold">{c.company}</p>
          {c.contactName && <p className="text-muted-foreground">{c.contactName}</p>}
          {c.email && <p className="text-muted-foreground">{c.email}</p>}
          {(c.phone || c.city) && <p className="text-muted-foreground">{[c.phone, c.city].filter(Boolean).join(" · ")}</p>}
          {c.tags && c.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {c.tags.map((t) => <Badge key={t} variant="muted" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
        </div>
      </div>
    )
  }
  if (action.type === "expense" && action.expense) {
    const e = action.expense
    return (
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <Wallet className="size-4 text-brand-blue" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Ausgabe</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{e.description || e.category}</p>
            <p className="text-xs text-muted-foreground">{e.category} · {Math.round((e.taxRate ?? 0.19) * 100)} % USt</p>
          </div>
          <p className="font-display text-lg font-bold tnum text-foreground">−{eur(e.amount)}</p>
        </div>
      </div>
    )
  }
  const items = action.items ?? []
  const totals = computeTotals(items)
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {action.type === "quote" ? "Angebot" : "Rechnung"}
          </p>
          {customerName && <p className="mt-0.5 text-sm font-semibold">{customerName}</p>}
        </div>
        <Badge variant="brand">{action.type === "quote" ? "Angebots-Entwurf" : "Rechnungs-Entwurf"}</Badge>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="flex-1">{it.description}</span>
            <span className="text-xs text-muted-foreground tnum">{it.qty} × {eur(it.unitPrice)}</span>
            <span className="w-20 text-right font-medium tnum">{eur(it.qty * it.unitPrice)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5">
        <span className="text-sm text-muted-foreground">Gesamt (brutto)</span>
        <span className="font-display text-base font-bold tnum text-brand-gradient">{eur(totals.gross)}</span>
      </div>
      {action.rationale && (
        <div className="border-t border-white/8 bg-white/[0.015] px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <Lightbulb className="size-3 text-brand-blue" /> Wert-Begründung (kommt aufs Dokument)
          </p>
          <p className="text-[13px] leading-relaxed text-foreground/80">{action.rationale}</p>
        </div>
      )}
    </div>
  )
}
