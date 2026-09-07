"use client"

import * as React from "react"
import { Plus, MoreHorizontal, ReceiptEuro, Repeat, ChevronRight } from "lucide-react"
import { useStore } from "@/lib/store"
import { useQueryFlag, useQueryValue } from "@/hooks/use-query-flag"
import { eur, dateDE, computeTotals } from "@/lib/format"
import { REMINDER_LABEL } from "@/lib/types"
import type { Invoice, InvoiceStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/misc"
import { CustomerAvatar } from "@/components/ui/customer-avatar"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import { InvoiceStatusBadge } from "@/components/documents/status-badge"
import { DocComposer } from "@/components/documents/doc-composer"
import { useDocMenus } from "@/components/documents/doc-actions"
import { Dropdown, DropdownTrigger } from "@/components/ui/dropdown"
import { toast } from "sonner"

type Filter = "all" | InvoiceStatus

export default function InvoicesPage() {
  const { db, customerById } = useStore()
  const { invoiceMenu } = useDocMenus()
  const wantNew = useQueryFlag("new")
  const newCustomer = useQueryValue("customer") // Vorbelegung z. B. aus Kunden-/Projektansicht
  const focusDoc = useQueryValue("doc") // Deep-Link: bestimmte Rechnung direkt öffnen
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [editing, setEditing] = React.useState<Invoice | null>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (wantNew) {
      setEditing(null)
      setOpen(true)
    }
  }, [wantNew])

  React.useEffect(() => {
    if (!focusDoc) return
    const inv = db.invoices.find((i) => i.id === focusDoc)
    if (inv) {
      setEditing(inv)
      setOpen(true)
    }
  }, [focusDoc, db.invoices])

  const rows = db.invoices
    .filter((i) => (filter === "all" ? true : i.status === filter))
    .filter((i) => {
      const q = query.toLowerCase()
      const c = customerById(i.customerId)
      return (
        !q ||
        i.number.toLowerCase().includes(q) ||
        c?.company.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => +new Date(b.issueDate) - +new Date(a.issueDate))

  const sum = (s: InvoiceStatus[]) =>
    db.invoices
      .filter((i) => s.includes(i.status))
      .reduce((acc, i) => acc + computeTotals(i.items).gross, 0)

  const counts = (s: InvoiceStatus) =>
    db.invoices.filter((i) => i.status === s).length

  function openEditor(inv: Invoice | null) {
    setEditing(inv)
    setOpen(true)
  }

  // Das Menü kommt aus `useDocMenus` — dieselben Aktionen wie in der
  // Kundenakte und in der Pipeline.
  const menuFor = (inv: Invoice) => invoiceMenu(inv, { onEdit: openEditor })

  return (
    <div className="mx-auto max-w-[1760px]">
      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Bezahlt (gesamt)" value={eur(sum(["paid"]))} tint="#2fd3a5" />
        <SummaryCard label="Offen" value={eur(sum(["sent"]))} tint="#ffb02e" />
        <SummaryCard label="Überfällig" value={eur(sum(["overdue"]))} tint="#ff4d4d" />
        <SummaryCard label="Entwürfe" value={String(counts("draft"))} tint="#8a8a93" />
      </div>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Rechnungsnr. oder Kunde…" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.invoices.length },
            { id: "sent", label: "Offen", count: counts("sent") },
            { id: "overdue", label: "Überfällig", count: counts("overdue") },
            { id: "paid", label: "Bezahlt", count: counts("paid") },
            { id: "draft", label: "Entwürfe", count: counts("draft") },
          ]}
        />
        <Button
          variant="brand"
          size="lg"
          className="ml-auto gap-1.5"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="size-4" /> Neue Rechnung
        </Button>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptEuro className="size-6" />}
          title="Keine Rechnungen"
          hint="Erstelle deine erste Rechnung — mit Positionen, USt und PDF-Export."
        />
      ) : (
        <>
          {/* Phone: Kartenliste */}
          <div className="space-y-3 md:hidden">
            {rows.map((inv) => {
              const c = customerById(inv.customerId)
              const total = computeTotals(inv.items).gross
              return (
                <div
                  key={inv.id}
                  onClick={() => openEditor(inv)}
                  className="glass cursor-pointer rounded-2xl p-4 transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] active:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <CustomerAvatar customer={c} className="size-11 shrink-0 text-[12px]" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {c?.company ?? "—"}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <InvoiceStatusBadge status={inv.status} />
                      {inv.cancelsInvoiceId && (
                        <span className="text-[11px] font-medium text-[#ff8a8a]">
                          Stornorechnung
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-white/25" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                    <span className="font-mono">{inv.number}</span>
                    <span>Fällig {dateDE(inv.dueDate)}</span>
                    {!!inv.reminderLevel && (
                      <span className="rounded-md bg-[#ffc35c]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#ffc35c]">
                        {REMINDER_LABEL[inv.reminderLevel]}
                      </span>
                    )}
                    {inv.recurring && (
                      <Repeat className="size-3.5 shrink-0 text-brand-cyan" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-lg font-bold tnum">
                      {eur(total)}
                    </span>
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          className="size-11"
                          aria-label="Aktionen"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-5" />
                        </Button>
                      </DropdownTrigger>
                      {menuFor(inv)}
                    </Dropdown>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: Tabelle */}
          <div className="glass hidden overflow-hidden rounded-2xl md:block">
            <div className="hidden grid-cols-[1.6fr_1fr_130px_140px_120px_48px] gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase md:grid">
              <span>Kunde</span>
              <span>Nummer</span>
              <span>Datum</span>
              <span className="text-right">Betrag</span>
              <span>Status</span>
              <span />
            </div>
            {rows.map((inv) => {
              const c = customerById(inv.customerId)
              const total = computeTotals(inv.items).gross
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1.6fr_1fr_130px_140px_120px_48px] items-center gap-4 border-b border-white/[0.05] px-6 py-4 transition-colors last:border-0 hover:bg-white/[0.025]"
                >
                  <button
                    onClick={() => openEditor(inv)}
                    className="flex items-center gap-3.5 text-left"
                  >
                    <CustomerAvatar customer={c} className="size-11 text-[12px]" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-semibold">
                          {c?.company ?? "—"}
                        </span>
                        {inv.recurring && (
                          <Repeat className="size-3.5 shrink-0 text-brand-cyan" />
                        )}
                      </span>
                    </span>
                  </button>
                  <span>
                    <span className="block font-mono text-[13px] text-muted-foreground">
                      {inv.number}
                    </span>
                    {inv.cancelsInvoiceId && (
                      <span className="text-[11px] font-medium text-[#ff8a8a]">
                        Stornorechnung
                      </span>
                    )}
                    {!!inv.reminderLevel && (
                      <span className="text-[11px] font-medium text-[#ffc35c]">
                        {REMINDER_LABEL[inv.reminderLevel]}
                      </span>
                    )}
                  </span>
                  <span className="text-[15px] text-muted-foreground">
                    {dateDE(inv.issueDate)}
                  </span>
                  <span className="text-right text-[15px] font-semibold tnum">
                    {eur(total)}
                  </span>
                  <span>
                    <InvoiceStatusBadge status={inv.status} />
                  </span>
                  <div className="flex justify-end">
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Aktionen"
                          className="size-11 md:size-7"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownTrigger>
                      {menuFor(inv)}
                    </Dropdown>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <DocComposer
        kind="invoice"
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        doc={editing}
        defaultCustomerId={editing ? undefined : newCustomer ?? undefined}
        onSaved={() => toast.success("Rechnung gespeichert")}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tint,
}: {
  label: string
  value: string
  tint: string
}) {
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
