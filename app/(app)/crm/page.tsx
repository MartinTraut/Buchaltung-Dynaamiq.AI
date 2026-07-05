"use client"

import * as React from "react"
import Link from "next/link"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { useLocalState } from "@/hooks/use-local-state"
import { useRouter } from "next/navigation"
import {
  Plus,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Trash2,
  Pencil,
  FileText,
  ReceiptEuro,
  LayoutGrid,
  List,
  TrendingUp,
  History,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { eur, dateDE, relativeTime, computeTotals, emailSignature } from "@/lib/format"
import {
  DEAL_STAGES,
  INVOICE_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  type Activity,
  type Customer,
} from "@/lib/types"
import { DocEditorDialog } from "@/components/documents/doc-editor"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Input, Label, Textarea, Select } from "@/components/ui/input"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import { Segmented } from "@/components/ui/segmented"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Health = "all" | "active" | "lead" | "churned"
type CrmView = "grid" | "list"
type CrmSort = "name" | "revenue" | "activity"

const HEALTH_BADGE: Record<Customer["health"], { label: string; variant: "success" | "brand" | "muted" }> = {
  active: { label: "Aktiv", variant: "success" },
  lead: { label: "Lead", variant: "brand" },
  churned: { label: "Inaktiv", variant: "muted" },
}

// ---------- Kunden-Verlauf (gemischte Timeline) ----------

type TimelineItem = {
  id: string
  kind: "invoice" | "quote" | "deal" | "email" | "activity"
  at: string
  title: string
  amount?: number
  status?: string
  href: string
}

const TIMELINE_ICON: Record<TimelineItem["kind"], LucideIcon> = {
  invoice: ReceiptEuro,
  quote: FileText,
  deal: TrendingUp,
  email: Mail,
  activity: History,
}

const ACTIVITY_HREF: Record<Activity["type"], string> = {
  invoice: "/invoices",
  quote: "/quotes",
  deal: "/pipeline",
  customer: "/crm",
  project: "/projects",
  email: "/emails",
  payment: "/finance",
  ai: "/assistant",
}

/** Nächste freie Kundennummer — Format des Bestands respektieren (höchster numerischer Suffix + 1). */
function nextCustomerNumber(customers: Customer[]): string {
  let best: { prefix: string; num: number; width: number } | null = null
  for (const c of customers) {
    const m = /^(.*?)(\d+)$/.exec((c.customerNumber ?? "").trim())
    if (!m) continue
    const num = parseInt(m[2], 10)
    if (!best || num > best.num) best = { prefix: m[1], num, width: m[2].length }
  }
  if (!best) return "K-1001"
  return `${best.prefix}${String(best.num + 1).padStart(best.width, "0")}`
}

export default function CrmPage() {
  const { db, upsertCustomer, remove, add, upsertEmail, customerById } = useStore()
  const confirm = useConfirm()
  const router = useRouter()
  const wantNew = useQueryFlag("new")
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Health>("all")
  const [view, setView] = useLocalState<CrmView>("dyn-crm-view", "grid")
  const [sortBy, setSortBy] = React.useState<CrmSort>("name")
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [docEditor, setDocEditor] = React.useState<{
    kind: "invoice" | "quote"
    customerId: string
  } | null>(null)

  function createEmailFor(c: Customer) {
    upsertEmail({
      to: c.email,
      customerId: c.id,
      subject: `Nachricht von ${db.settings.name}`,
      body: `Hallo ${c.contactName || ""},\n\n\n\n${emailSignature(db.settings)}`,
      status: "draft",
    })
    setDetailId(null)
    toast.success("E-Mail-Entwurf erstellt")
    router.push("/emails")
  }

  React.useEffect(() => {
    if (wantNew) {
      setEditing(null)
      setDialogOpen(true)
    }
  }, [wantNew])

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setDialogOpen(true)
  }

  // Eine Ableitung über die ganze DB: Verlauf je Kunde + „zuletzt aktiv" + Umsatz.
  const { timelineByCustomer, lastActivityAt, revenueByCustomer } = React.useMemo(() => {
    const timeline = new Map<string, TimelineItem[]>()
    const push = (cid: string | undefined, item: TimelineItem) => {
      if (!cid) return
      const list = timeline.get(cid) ?? []
      list.push(item)
      timeline.set(cid, list)
    }
    for (const i of db.invoices)
      push(i.customerId, {
        id: `inv-${i.id}`,
        kind: "invoice",
        at: i.issueDate,
        title: `Rechnung ${i.number}`,
        amount: computeTotals(i.items).gross,
        status: INVOICE_STATUS_LABEL[i.status],
        href: "/invoices",
      })
    for (const q of db.quotes)
      push(q.customerId, {
        id: `quo-${q.id}`,
        kind: "quote",
        at: q.issueDate,
        title: `Angebot ${q.number}`,
        amount: computeTotals(q.items).gross,
        status: QUOTE_STATUS_LABEL[q.status],
        href: "/quotes",
      })
    for (const d of db.deals)
      push(d.customerId, {
        id: `deal-${d.id}`,
        kind: "deal",
        at: d.createdAt,
        title: `Deal — ${d.title}`,
        amount: d.value,
        status: DEAL_STAGES.find((s) => s.id === d.stage)?.label,
        href: "/pipeline",
      })
    for (const e of db.emails)
      push(e.customerId, {
        id: `mail-${e.id}`,
        kind: "email",
        at: e.createdAt,
        title: e.subject || "E-Mail",
        status: e.status === "sent" ? "Gesendet" : "Entwurf",
        href: "/emails",
      })
    for (const a of db.activities)
      push(a.customerId, {
        id: `act-${a.id}`,
        kind: "activity",
        at: a.at,
        title: a.title,
        href: ACTIVITY_HREF[a.type] ?? "/",
      })

    const last = new Map<string, string>()
    for (const [cid, items] of timeline) {
      items.sort((x, y) => y.at.localeCompare(x.at))
      last.set(cid, items[0].at)
    }

    const revenue = new Map<string, number>()
    for (const i of db.invoices) {
      if (i.status !== "paid") continue
      revenue.set(i.customerId, (revenue.get(i.customerId) ?? 0) + computeTotals(i.items).gross)
    }
    return { timelineByCustomer: timeline, lastActivityAt: last, revenueByCustomer: revenue }
  }, [db])

  const filtered = db.customers.filter((c) => {
    if (filter !== "all" && c.health !== filter) return false
    const q = query.toLowerCase()
    return (
      !q ||
      c.company.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const sorted = [...filtered]
  if (sortBy === "name") sorted.sort((a, b) => a.company.localeCompare(b.company, "de"))
  else if (sortBy === "revenue")
    sorted.sort((a, b) => (revenueByCustomer.get(b.id) ?? 0) - (revenueByCustomer.get(a.id) ?? 0))
  else
    sorted.sort((a, b) =>
      (lastActivityAt.get(b.id) ?? "").localeCompare(lastActivityAt.get(a.id) ?? ""),
    )

  const counts = {
    all: db.customers.length,
    active: db.customers.filter((c) => c.health === "active").length,
    lead: db.customers.filter((c) => c.health === "lead").length,
    churned: db.customers.filter((c) => c.health === "churned").length,
  }

  const detail = customerById(detailId ?? undefined)

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar className="mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Kunde, Kontakt oder Tag…" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: counts.all },
            { id: "active", label: "Aktiv", count: counts.active },
            { id: "lead", label: "Leads", count: counts.lead },
            { id: "churned", label: "Inaktiv", count: counts.churned },
          ]}
        />
        <Button variant="brand" size="lg" className="ml-auto gap-1.5" onClick={openNew}>
          <Plus className="size-4" /> Neuer Kunde
        </Button>
      </Toolbar>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-muted-foreground">Sortieren:</span>
        <FilterChips
          value={sortBy}
          onChange={setSortBy}
          options={[
            { id: "name", label: "Name" },
            { id: "revenue", label: "Umsatz" },
            { id: "activity", label: "Zuletzt aktiv" },
          ]}
        />
        <Segmented
          className="ml-auto"
          value={view}
          onChange={setView}
          options={[
            {
              id: "grid",
              ariaLabel: "Kartenansicht",
              label: <LayoutGrid className="size-[18px]" />,
            },
            {
              id: "list",
              ariaLabel: "Listenansicht",
              label: <List className="size-[18px]" />,
            },
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Keine Kunden gefunden"
          hint="Lege deinen ersten Kunden an, um Deals, Projekte und Rechnungen zu verknüpfen."
          action={
            <Button variant="brand" onClick={openNew} className="gap-1.5">
              <Plus className="size-4" /> Kunde anlegen
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => {
            const revenue = revenueByCustomer.get(c.id) ?? 0
            const openDeals = db.deals.filter(
              (d) => d.customerId === c.id && d.stage !== "won" && d.stage !== "lost",
            ).length
            const last = lastActivityAt.get(c.id)
            const hb = HEALTH_BADGE[c.health]
            return (
              <Card
                key={c.id}
                className="cursor-pointer p-5 active:scale-[0.99]"
                onClick={() => setDetailId(c.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.company} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display font-semibold">{c.company}</p>
                      <Badge variant={hb.variant} className="shrink-0">{hb.label}</Badge>
                      <ChevronRight className="ml-auto size-4 shrink-0 text-white/25" />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.contactName || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="muted" className="text-[10px]">{t}</Badge>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Umsatz</p>
                    <p className="font-semibold tnum">{eur(revenue, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Offene Deals</p>
                    <p className="font-semibold tnum">{openDeals}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-2.5 text-[11.5px] text-muted-foreground">
                  <span className="font-mono">{c.customerNumber ?? ""}</span>
                  <span className="truncate">
                    {last ? `zuletzt aktiv ${relativeTime(last)}` : "noch keine Aktivität"}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[minmax(240px,1.8fr)_110px_110px_130px_110px_170px_16px] items-center gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase">
                <span>Kunde</span>
                <span>Nr.</span>
                <span>Status</span>
                <span className="text-right">Umsatz</span>
                <span className="text-right">Offene Deals</span>
                <span>Zuletzt aktiv</span>
                <span />
              </div>
              {sorted.map((c) => {
                const revenue = revenueByCustomer.get(c.id) ?? 0
                const openDeals = db.deals.filter(
                  (d) => d.customerId === c.id && d.stage !== "won" && d.stage !== "lost",
                ).length
                const last = lastActivityAt.get(c.id)
                const hb = HEALTH_BADGE[c.health]
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetailId(c.id)}
                    className="grid w-full grid-cols-[minmax(240px,1.8fr)_110px_110px_130px_110px_170px_16px] items-center gap-4 border-b border-white/[0.05] px-6 py-4 text-left transition-[background-color,transform] duration-150 ease-out last:border-0 hover:bg-white/[0.025] active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <Avatar name={c.company} className="size-11 text-[12px]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">
                          {c.company}
                        </span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {c.contactName || "—"}
                        </span>
                      </span>
                    </span>
                    <span className="font-mono text-[13px] text-muted-foreground">
                      {c.customerNumber ?? "—"}
                    </span>
                    <span>
                      <Badge variant={hb.variant}>{hb.label}</Badge>
                    </span>
                    <span className="text-right text-[15px] font-semibold tnum">
                      {eur(revenue, { compact: true })}
                    </span>
                    <span className="text-right text-[15px] tnum text-muted-foreground">
                      {openDeals}
                    </span>
                    <span className="truncate text-[14px] text-muted-foreground">
                      {last ? relativeTime(last) : "—"}
                    </span>
                    <ChevronRight className="size-4 text-white/25" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <CustomerDialog
        key={dialogOpen ? (editing?.id ?? "new") : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editing}
        suggestedNumber={editing ? undefined : nextCustomerNumber(db.customers)}
        onSave={(data) => {
          upsertCustomer(data)
          toast.success(editing ? "Kunde aktualisiert" : "Kunde angelegt")
          setDialogOpen(false)
        }}
      />

      {/* Detail */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        {detail && (
          <DialogContent size="lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar name={detail.company} className="size-12" />
                <div>
                  <DialogTitle>{detail.company}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {detail.contactName}
                    {detail.customerNumber && (
                      <span className="ml-2 font-mono text-[12px] text-muted-foreground/70">
                        {detail.customerNumber}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {detail.email && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> {detail.email}
                </span>
              )}
              {detail.phone && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> {detail.phone}
                </span>
              )}
              {detail.website && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="size-4" /> {detail.website}
                </span>
              )}
              {(detail.city || detail.address) && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" /> {[detail.address, detail.zip, detail.city].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const revenue = revenueByCustomer.get(detail.id) ?? 0
                const deals = db.deals.filter((d) => d.customerId === detail.id)
                const projects = db.projects.filter((p) => p.customerId === detail.id)
                return (
                  <>
                    <Stat label="Umsatz" value={eur(revenue, { compact: true })} />
                    <Stat label="Deals" value={String(deals.length)} />
                    <Stat label="Projekte" value={String(projects.length)} />
                  </>
                )
              })()}
            </div>

            {detail.notes && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                {detail.notes}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                Verlauf
              </p>
              {(() => {
                const items = timelineByCustomer.get(detail.id) ?? []
                if (items.length === 0)
                  return (
                    <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                      Noch keine Aktivitäten zu diesem Kunden.
                    </p>
                  )
                return (
                  <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-xl border border-white/8 bg-white/[0.02] p-2">
                    {items.map((item) => {
                      const Icon = TIMELINE_ICON[item.kind]
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setDetailId(null)}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-muted-foreground">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium">
                              {item.title}
                            </span>
                            <span className="block text-[11.5px] text-muted-foreground">
                              {dateDE(item.at)} · {relativeTime(item.at)}
                              {item.status ? ` · ${item.status}` : ""}
                            </span>
                          </span>
                          {item.amount !== undefined && (
                            <span className="shrink-0 text-[13px] font-semibold tnum">
                              {eur(item.amount)}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                Schnell erstellen
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => {
                    setDetailId(null)
                    setDocEditor({ kind: "quote", customerId: detail.id })
                  }}
                >
                  <FileText className="size-4 text-brand-cyan" /> Angebot
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => {
                    setDetailId(null)
                    setDocEditor({ kind: "invoice", customerId: detail.id })
                  }}
                >
                  <ReceiptEuro className="size-4 text-brand-blue" /> Rechnung
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => createEmailFor(detail)}
                >
                  <Mail className="size-4 text-[#a78bfa]" /> E-Mail
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                className="gap-1.5 sm:mr-auto"
                onClick={async () => {
                  const ok = await confirm({
                    title: `${detail.company} löschen?`,
                    description:
                      "Der Kunde wird entfernt. Verknüpfte Rechnungen, Angebote und Deals bleiben erhalten, verlieren aber die Zuordnung.",
                    confirmLabel: "Löschen",
                    destructive: true,
                  })
                  if (!ok) return
                  remove("customers", detail.id)
                  setDetailId(null)
                  toast.success("Kunde gelöscht", {
                    action: { label: "Rückgängig", onClick: () => add("customers", detail) },
                  })
                }}
              >
                <Trash2 className="size-4" /> Löschen
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Schließen</Button>
              </DialogClose>
              <Button
                variant="brand"
                className="gap-1.5"
                onClick={() => {
                  setDetailId(null)
                  openEdit(detail)
                }}
              >
                <Pencil className="size-4" /> Bearbeiten
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {docEditor && (
        <DocEditorDialog
          kind={docEditor.kind}
          open={!!docEditor}
          onOpenChange={(o) => !o && setDocEditor(null)}
          doc={null}
          defaultCustomerId={docEditor.customerId}
          onSaved={() => {
            toast.success(docEditor.kind === "quote" ? "Angebot erstellt" : "Rechnung erstellt")
            setDocEditor(null)
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tnum">{value}</p>
    </div>
  )
}

function CustomerDialog({
  open,
  onOpenChange,
  customer,
  suggestedNumber,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customer: Customer | null
  suggestedNumber?: string
  onSave: (data: Partial<Customer> & { id?: string }) => void
}) {
  const [form, setForm] = React.useState<Partial<Customer>>(
    customer ?? {
      health: "lead",
      country: "Deutschland",
      tags: [],
      customerNumber: suggestedNumber,
    },
  )
  const [tagText, setTagText] = React.useState((customer?.tags ?? []).join(", "))
  const set = (patch: Partial<Customer>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Kunde bearbeiten" : "Neuer Kunde"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Firma">
            <Input value={form.company ?? ""} onChange={(e) => set({ company: e.target.value })} placeholder="Firmenname" />
          </Field>
          <Field label="Ansprechpartner">
            <Input value={form.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} placeholder="Vor- und Nachname" />
          </Field>
          <Field label="E-Mail">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="name@firma.de" />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="+49 …" />
          </Field>
          <Field label="Website">
            <Input value={form.website ?? ""} onChange={(e) => set({ website: e.target.value })} placeholder="firma.de" />
          </Field>
          <Field label="USt-IdNr.">
            <Input value={form.vatId ?? ""} onChange={(e) => set({ vatId: e.target.value })} placeholder="DE…" />
          </Field>
          <Field label="Kundennummer">
            <Input value={form.customerNumber ?? ""} onChange={(e) => set({ customerNumber: e.target.value })} placeholder="z. B. K-1001" />
          </Field>
          <Field label="Adresse">
            <Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} placeholder="Straße & Nr." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PLZ">
              <Input value={form.zip ?? ""} onChange={(e) => set({ zip: e.target.value })} />
            </Field>
            <Field label="Stadt">
              <Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.health ?? "lead"} onChange={(e) => set({ health: e.target.value as Customer["health"] })}>
              <option value="lead">Lead</option>
              <option value="active">Aktiv</option>
              <option value="churned">Inaktiv</option>
            </Select>
          </Field>
          <Field label="Tags (Komma-getrennt)">
            <Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Meta Ads, Retainer" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notizen">
              <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Interne Notizen…" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="brand"
            disabled={!form.company}
            onClick={() =>
              onSave({
                ...form,
                id: customer?.id,
                tags: tagText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
