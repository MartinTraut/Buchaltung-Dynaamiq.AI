"use client"

import * as React from "react"
import Link from "next/link"
import {
  Plus,
  MoreHorizontal,
  FileDown,
  Mail,
  ArrowRightLeft,
  Trash2,
  Pencil,
  FileText,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Quote, QuoteStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import { QuoteStatusBadge } from "@/components/documents/status-badge"
import { DocEditorDialog } from "@/components/documents/doc-editor"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown"
import { toast } from "sonner"

type Filter = "all" | QuoteStatus

export default function QuotesPage() {
  const {
    db,
    customerById,
    upsertQuote,
    convertQuoteToInvoice,
    remove,
    add,
    upsertEmail,
  } = useStore()
  const confirm = useConfirm()
  const wantNew = useQueryFlag("new")
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [editing, setEditing] = React.useState<Quote | null>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (wantNew) {
      setEditing(null)
      setOpen(true)
    }
  }, [wantNew])

  const rows = db.quotes
    .filter((q) => (filter === "all" ? true : q.status === filter))
    .filter((q) => {
      const s = query.toLowerCase()
      const c = customerById(q.customerId)
      return !s || q.number.toLowerCase().includes(s) || c?.company.toLowerCase().includes(s)
    })
    .sort((a, b) => +new Date(b.issueDate) - +new Date(a.issueDate))

  const counts = (s: QuoteStatus) => db.quotes.filter((q) => q.status === s).length
  const sumOf = (s: QuoteStatus[]) =>
    db.quotes
      .filter((q) => s.includes(q.status))
      .reduce((acc, q) => acc + computeTotals(q.items).gross, 0)

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuoteSummary label="Gesamtwert" value={eur(sumOf(["draft", "sent", "accepted", "declined", "expired"]))} tint="#ff6a00" />
        <QuoteSummary label="Versendet (offen)" value={eur(sumOf(["sent"]))} tint="#ffb02e" />
        <QuoteSummary label="Angenommen" value={eur(sumOf(["accepted"]))} tint="#2fd3a5" />
        <QuoteSummary label="Entwürfe" value={String(counts("draft"))} tint="#8e8e98" />
      </div>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Angebotsnr. oder Kunde…" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.quotes.length },
            { id: "draft", label: "Entwürfe", count: counts("draft") },
            { id: "sent", label: "Versendet", count: counts("sent") },
            { id: "accepted", label: "Angenommen", count: counts("accepted") },
          ]}
        />
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="lg" className="gap-1.5">
            <Link href="/assistant?intent=quote">
              <Sparkles className="size-4 text-brand-pink" /> Mit KI
            </Link>
          </Button>
          <Button
            variant="brand"
            size="lg"
            className="gap-1.5"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="size-4" /> Neues Angebot
          </Button>
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="Keine Angebote"
          hint="Erstelle ein Angebot manuell oder lass es von der KI generieren."
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="hidden grid-cols-[1.6fr_1fr_130px_140px_130px_48px] gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase md:grid">
            <span>Kunde</span>
            <span>Nummer</span>
            <span>Datum</span>
            <span className="text-right">Betrag</span>
            <span>Status</span>
            <span />
          </div>
          {rows.map((q) => {
            const c = customerById(q.customerId)
            const total = computeTotals(q.items).gross
            return (
              <div
                key={q.id}
                className="grid grid-cols-2 items-center gap-4 border-b border-white/[0.05] px-6 py-4 transition-colors last:border-0 hover:bg-white/[0.025] md:grid-cols-[1.6fr_1fr_130px_140px_130px_48px]"
              >
                <button
                  onClick={() => {
                    setEditing(q)
                    setOpen(true)
                  }}
                  className="flex items-center gap-3.5 text-left"
                >
                  <Avatar name={c?.company ?? "?"} className="size-11 text-[12px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{c?.company ?? "—"}</span>
                    <span className="block truncate text-[13px] text-muted-foreground md:hidden">
                      {q.number} · {eur(total)}
                    </span>
                  </span>
                </button>
                <span className="hidden font-mono text-[13px] text-muted-foreground md:block">{q.number}</span>
                <span className="hidden text-[15px] text-muted-foreground md:block">{dateDE(q.issueDate)}</span>
                <span className="hidden text-right text-[15px] font-semibold tnum md:block">{eur(total)}</span>
                <span className="hidden md:block"><QuoteStatusBadge status={q.status} /></span>
                <div className="flex justify-end">
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem onSelect={() => { setEditing(q); setOpen(true) }}>
                        <Pencil /> Bearbeiten
                      </DropdownItem>
                      <DropdownItem asChild>
                        <Link href={`/print/quote/${q.id}`} target="_blank"><FileDown /> PDF / Drucken</Link>
                      </DropdownItem>
                      <DropdownItem
                        onSelect={() => {
                          upsertEmail({
                            to: c?.email ?? "",
                            customerId: q.customerId,
                            subject: `Ihr Angebot ${q.number} von Dynaamiq AI`,
                            body: `Hallo ${c?.contactName ?? ""},\n\nanbei unser Angebot ${q.number} über ${eur(total)}. Bei Fragen bin ich jederzeit für Sie da.\n\nBeste Grüße\nMartin — Dynaamiq AI`,
                            relatedType: "quote",
                            relatedId: q.id,
                            status: "draft",
                          })
                          if (q.status === "draft") upsertQuote({ ...q, status: "sent" })
                          toast.success("E-Mail-Entwurf erstellt")
                        }}
                      >
                        <Mail /> Per E-Mail senden
                      </DropdownItem>
                      <DropdownSeparator />
                      {q.status !== "accepted" && (
                        <DropdownItem onSelect={() => { upsertQuote({ ...q, status: "accepted" }); toast.success("Angebot angenommen") }}>
                          <CheckCircle2 /> Als angenommen markieren
                        </DropdownItem>
                      )}
                      <DropdownItem
                        onSelect={() => {
                          const inv = convertQuoteToInvoice(q.id)
                          if (inv) toast.success(`Rechnung ${inv.number} erstellt`, { description: "Im Bereich Rechnungen verfügbar." })
                        }}
                      >
                        <ArrowRightLeft /> In Rechnung umwandeln
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        className="text-destructive data-[highlighted]:text-destructive"
                        onSelect={async () => {
                          const ok = await confirm({
                            title: `Angebot ${q.number} löschen?`,
                            description: `Das Angebot für ${c?.company ?? "diesen Kunden"} wird entfernt.`,
                            confirmLabel: "Löschen",
                            destructive: true,
                          })
                          if (!ok) return
                          remove("quotes", q.id)
                          toast.success("Angebot gelöscht", {
                            action: { label: "Rückgängig", onClick: () => add("quotes", q) },
                          })
                        }}
                      >
                        <Trash2 /> Löschen
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DocEditorDialog
        kind="quote"
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        doc={editing}
        onSaved={() => toast.success("Angebot gespeichert")}
      />
    </div>
  )
}

function QuoteSummary({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: tint }} />
        <span className="text-[12px] font-medium tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-[22px] font-bold tnum">{value}</p>
    </div>
  )
}
