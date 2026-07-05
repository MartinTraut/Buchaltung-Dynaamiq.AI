"use client"

import * as React from "react"
import Link from "next/link"
import {
  Plus,
  MoreHorizontal,
  FileDown,
  Mail,
  CheckCircle2,
  Send,
  Trash2,
  Pencil,
  ReceiptEuro,
  BellRing,
  Repeat,
  CopyPlus,
  Ban,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { eur, dateDE, computeTotals } from "@/lib/format"
import { REMINDER_LABEL } from "@/lib/types"
import type { Invoice, InvoiceStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import { InvoiceStatusBadge } from "@/components/documents/status-badge"
import { DocEditorDialog } from "@/components/documents/doc-editor"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown"
import { toast } from "sonner"

type Filter = "all" | InvoiceStatus

export default function InvoicesPage() {
  const {
    db,
    customerById,
    setInvoiceStatus,
    remove,
    add,
    upsertEmail,
    pushActivity,
    sendReminder,
    toggleRecurring,
    duplicateRecurring,
    createCancellation,
  } = useStore()
  const confirm = useConfirm()
  const wantNew = useQueryFlag("new")
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

  function sendByEmail(inv: Invoice) {
    const c = customerById(inv.customerId)
    const total = eur(computeTotals(inv.items).gross)
    upsertEmail({
      to: c?.email ?? "",
      customerId: inv.customerId,
      subject: `Ihre Rechnung ${inv.number} von Dynaamiq AI`,
      body: `Hallo ${c?.contactName ?? ""},\n\nanbei erhalten Sie die Rechnung ${inv.number} über ${total}.\nZahlbar bis ${dateDE(inv.dueDate)}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nBeste Grüße\nMartin — Dynaamiq AI`,
      relatedType: "invoice",
      relatedId: inv.id,
      status: "draft",
    })
    if (inv.status === "draft") setInvoiceStatus(inv.id, "sent")
    toast.success("E-Mail-Entwurf erstellt", {
      description: "Im Bereich E-Mails findest du den Entwurf.",
    })
  }

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
        <div className="glass overflow-hidden rounded-2xl">
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
                className="grid grid-cols-2 items-center gap-4 border-b border-white/[0.05] px-6 py-4 transition-colors last:border-0 hover:bg-white/[0.025] md:grid-cols-[1.6fr_1fr_130px_140px_120px_48px]"
              >
                <button
                  onClick={() => {
                    setEditing(inv)
                    setOpen(true)
                  }}
                  className="flex items-center gap-3.5 text-left"
                >
                  <Avatar name={c?.company ?? "?"} className="size-11 text-[12px]" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-semibold">
                        {c?.company ?? "—"}
                      </span>
                      {inv.recurring && (
                        <Repeat className="size-3.5 shrink-0 text-brand-cyan" />
                      )}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground md:hidden">
                      {inv.number} · {eur(total)}
                    </span>
                  </span>
                </button>
                <span className="hidden md:block">
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
                <span className="hidden text-[15px] text-muted-foreground md:block">
                  {dateDE(inv.issueDate)}
                </span>
                <span className="hidden text-right text-[15px] font-semibold tnum md:block">
                  {eur(total)}
                </span>
                <span className="hidden md:block">
                  <InvoiceStatusBadge status={inv.status} />
                </span>
                <div className="flex justify-end">
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem
                        onSelect={() => {
                          setEditing(inv)
                          setOpen(true)
                        }}
                      >
                        <Pencil /> Bearbeiten
                      </DropdownItem>
                      <DropdownItem asChild>
                        <Link href={`/print/invoice/${inv.id}`} target="_blank">
                          <FileDown /> PDF / Drucken
                        </Link>
                      </DropdownItem>
                      <DropdownItem onSelect={() => sendByEmail(inv)}>
                        <Mail /> Per E-Mail senden
                      </DropdownItem>
                      <DropdownSeparator />
                      {inv.status !== "paid" && (
                        <DropdownItem
                          onSelect={() => {
                            setInvoiceStatus(inv.id, "paid")
                            pushActivity({
                              type: "payment",
                              title: `Zahlung erhalten — ${inv.number}`,
                              meta: `${c?.company ?? ""} · ${eur(total)}`,
                            })
                            toast.success("Als bezahlt markiert")
                          }}
                        >
                          <CheckCircle2 /> Als bezahlt markieren
                        </DropdownItem>
                      )}
                      {inv.status === "draft" && (
                        <DropdownItem onSelect={() => setInvoiceStatus(inv.id, "sent")}>
                          <Send /> Als versendet markieren
                        </DropdownItem>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <DropdownItem
                          onSelect={() => {
                            const r = sendReminder(inv.id)
                            if (r)
                              toast.success(`${r.email.subject.split(" — ")[0]} erstellt`, {
                                description: "Entwurf im Bereich E-Mails.",
                              })
                          }}
                        >
                          <BellRing /> Mahnung / Erinnerung senden
                        </DropdownItem>
                      )}
                      {inv.status !== "draft" &&
                        inv.status !== "canceled" &&
                        !inv.cancelsInvoiceId && (
                          <DropdownItem
                            onSelect={async () => {
                              const ok = await confirm({
                                title: `Rechnung ${inv.number} stornieren?`,
                                description: `Es wird eine Stornorechnung mit negierten Positionen erstellt. ${inv.number} wird auf „Storniert" gesetzt.`,
                                confirmLabel: "Stornorechnung erstellen",
                                destructive: true,
                              })
                              if (!ok) return
                              const storno = createCancellation(inv.id)
                              if (storno)
                                toast.success(`Stornorechnung ${storno.number} erstellt`, {
                                  description: `${inv.number} wurde storniert.`,
                                })
                            }}
                          >
                            <Ban /> Stornorechnung erstellen
                          </DropdownItem>
                        )}
                      <DropdownSeparator />
                      <DropdownItem onSelect={() => toggleRecurring(inv.id)}>
                        <Repeat /> {inv.recurring ? "Retainer deaktivieren" : "Als monatlich (Retainer)"}
                      </DropdownItem>
                      <DropdownItem
                        onSelect={() => {
                          const next = duplicateRecurring(inv.id)
                          if (next)
                            toast.success(`Folge-Rechnung ${next.number} erzeugt`, {
                              description: "Als Entwurf für den nächsten Monat angelegt.",
                            })
                        }}
                      >
                        <CopyPlus /> Folge-Rechnung erzeugen
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        className="text-destructive data-[highlighted]:text-destructive"
                        onSelect={async () => {
                          const ok = await confirm({
                            title: `Rechnung ${inv.number} löschen?`,
                            description: `Die Rechnung für ${c?.company ?? "diesen Kunden"} über ${eur(total)} wird entfernt.`,
                            confirmLabel: "Löschen",
                            destructive: true,
                          })
                          if (!ok) return
                          remove("invoices", inv.id)
                          toast.success("Rechnung gelöscht", {
                            action: { label: "Rückgängig", onClick: () => add("invoices", inv) },
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
        kind="invoice"
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        doc={editing}
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
