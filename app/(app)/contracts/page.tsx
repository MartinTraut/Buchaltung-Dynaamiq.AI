"use client"

import * as React from "react"
import Link from "next/link"
import {
  MoreHorizontal,
  Plus,
  FileDown,
  FileSignature,
  FileText,
  ReceiptEuro,
  FolderKanban,
  ChevronRight,
  Paperclip,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useQueryValue } from "@/hooks/use-query-flag"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Contract, ContractStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/misc"
import { CustomerAvatar } from "@/components/ui/customer-avatar"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import { ContractStatusBadge } from "@/components/documents/status-badge"
import { useDocMenus } from "@/components/documents/doc-actions"
import { ContractComposer } from "@/components/documents/contract-composer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown"
import { toast } from "sonner"

type Filter = "all" | ContractStatus

export default function ContractsPage() {
  const { db, customerById, createContractFromQuote } = useStore()
  const { contractMenu } = useDocMenus()
  const focusDoc = useQueryValue("doc")
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  // Der Deep-Link `?doc=` öffnet die Detailansicht, ohne dass ein Effekt
  // State nachzieht: die offene ID wird abgeleitet. `dismissed` merkt sich,
  // dass der Nutzer sie geschlossen hat — sonst risse der Link sie wieder auf.
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [dismissed, setDismissed] = React.useState(false)
  // Composer: `editing` ist der Vertrag, der bearbeitet wird — null heißt neu.
  const [editing, setEditing] = React.useState<Contract | null>(null)
  const [composerOpen, setComposerOpen] = React.useState(false)
  const activeId = detailId ?? (dismissed ? null : (focusDoc ?? null))
  const detail = db.contracts.find((x) => x.id === activeId) ?? null

  const openDetail = (c: Contract) => {
    setDismissed(false)
    setDetailId(c.id)
  }
  const closeDetail = () => {
    setDetailId(null)
    setDismissed(true)
  }

  const rows = db.contracts
    .filter((c) => (filter === "all" ? true : c.status === filter))
    .filter((c) => {
      const s = query.toLowerCase()
      const cust = customerById(c.customerId)
      return (
        !s ||
        c.number.toLowerCase().includes(s) ||
        cust?.company.toLowerCase().includes(s) ||
        c.title.toLowerCase().includes(s)
      )
    })
    .sort((a, b) => +new Date(b.issueDate) - +new Date(a.issueDate))

  const counts = (s: ContractStatus) => db.contracts.filter((c) => c.status === s).length

  /** Angebote ohne Vertrag — genau die Lücke, die dieses Modul schließen soll. */
  const offeneAngebote = db.quotes.filter(
    (q) => q.status !== "expired" && q.status !== "declined" && !db.contracts.some((c) => c.quoteId === q.id),
  )

  // Das Menü kommt aus `useDocMenus` — dieselben Aktionen wie in der
  // Kundenakte und in der Pipeline.
  const openEditor = (c: Contract | null) => {
    setEditing(c)
    setComposerOpen(true)
  }
  const menuFor = (c: Contract) =>
    contractMenu(c, { onDetail: openDetail, onEdit: openEditor })

  return (
    <div className="mx-auto max-w-[1760px]">
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary
          label="Vertragswert"
          value={eur(db.contracts.reduce((s, c) => s + (c.netValue ?? 0), 0))}
          tint="#1f7bf2"
        />
        <Summary label="Unterzeichnet" value={String(counts("signed") + counts("active"))} tint="#2fd3a5" />
        <Summary label="Beim Kunden" value={String(counts("sent"))} tint="#ffb02e" />
        <Summary label="Angebote ohne Vertrag" value={String(offeneAngebote.length)} tint="#8e8e98" />
      </div>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Vertragsnr., Kunde oder Titel…" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.contracts.length },
            { id: "draft", label: "Entwürfe", count: counts("draft") },
            { id: "sent", label: "Versendet", count: counts("sent") },
            { id: "signed", label: "Unterzeichnet", count: counts("signed") },
          ]}
        />
        <div className="ml-auto flex gap-2">
          {offeneAngebote.length > 0 && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="outline" size="lg" className="gap-1.5">
                  <FileSignature className="size-4" /> Zum Angebot
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                {offeneAngebote.map((q) => (
                  <DropdownItem
                    key={q.id}
                    onSelect={() => {
                      const c = createContractFromQuote(q.id)
                      if (c)
                        toast.success(`Vertrag ${c.number} angelegt`, {
                          description: "Klauseln aus dem zuletzt angelegten Vertrag übernommen.",
                        })
                    }}
                  >
                    <FileText /> {q.number} — {customerById(q.customerId)?.company ?? "—"}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}
          <Button
            variant="brand"
            size="lg"
            className="gap-1.5"
            onClick={() => {
              setEditing(null)
              setComposerOpen(true)
            }}
          >
            <Plus className="size-4" /> Neuer Vertrag
          </Button>
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="size-6" />}
          title="Keine Verträge"
          hint="Ein Vertrag regelt, was das Angebot bewusst offenlässt — mit Angebot als Grundlage oder frei angelegt."
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_130px_140px_130px_48px] gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase md:grid">
            <span>Kunde</span>
            <span>Vertrag</span>
            <span>Verknüpft</span>
            <span>Datum</span>
            <span className="text-right">Auftragswert</span>
            <span>Status</span>
            <span />
          </div>
          {rows.map((c) => {
            const cust = customerById(c.customerId)
            const quote = db.quotes.find((q) => q.id === c.quoteId)
            const invoices = invoicesFor(db.invoices, c)
            return (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-2 border-b border-white/[0.05] px-4 py-4 transition-colors last:border-0 hover:bg-white/[0.025] md:grid-cols-[1.5fr_1fr_1fr_130px_140px_130px_48px] md:items-center md:gap-4 md:px-6"
              >
                <button onClick={() => openDetail(c)} className="flex items-center gap-3.5 text-left">
                  <CustomerAvatar customer={cust} className="size-11 text-[12px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">
                      {cust?.company ?? "—"}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {c.title}
                      {c.titleAccent ? ` ${c.titleAccent}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-white/25 md:hidden" />
                </button>
                <span className="font-mono text-[13px] text-muted-foreground">{c.number}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {quote && <LinkChip href={`/quotes?doc=${quote.id}`} icon={<FileText className="size-3" />} label={quote.number} />}
                  {invoices.map((inv) => (
                    <LinkChip
                      key={inv.id}
                      href={`/invoices?doc=${inv.id}`}
                      icon={<ReceiptEuro className="size-3" />}
                      label={inv.number}
                    />
                  ))}
                  {!quote && invoices.length === 0 && (
                    <span className="text-[12.5px] text-muted-foreground/60">—</span>
                  )}
                </span>
                <span className="text-[15px] text-muted-foreground">{dateDE(c.issueDate)}</span>
                <span className="text-[15px] font-semibold tnum md:text-right">
                  {c.netValue != null ? eur(c.netValue) : "—"}
                </span>
                <span>
                  <ContractStatusBadge status={c.status} />
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
                    {menuFor(c)}
                  </Dropdown>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ContractDetail contract={detail} onClose={closeDetail} />

      <ContractComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        contract={editing}
      />
    </div>
  )
}

/**
 * Rechnungen zum Vertrag: ausdrücklich verknüpfte zuerst, sonst über das
 * gemeinsame Projekt. Ohne die zweite Regel bliebe die Spalte leer, bis jemand
 * jede Rechnung von Hand zuordnet — und genau das passiert nie.
 */
function invoicesFor(invoices: { id: string; number: string; projectId?: string }[], c: Contract) {
  if (c.invoiceIds?.length) return invoices.filter((i) => c.invoiceIds!.includes(i.id))
  if (!c.projectId) return []
  return invoices.filter((i) => i.projectId === c.projectId)
}

function LinkChip({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  )
}

function ContractDetail({ contract, onClose }: { contract: Contract | null; onClose: () => void }) {
  const { db, customerById } = useStore()
  if (!contract) return null
  const c = db.contracts.find((x) => x.id === contract.id) ?? contract
  const cust = customerById(c.customerId)
  const quote = db.quotes.find((q) => q.id === c.quoteId)
  const project = db.projects.find((p) => p.id === c.projectId)
  const invoices = db.invoices.filter((i) =>
    c.invoiceIds?.length ? c.invoiceIds.includes(i.id) : c.projectId && i.projectId === c.projectId,
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {c.title}
            {c.titleAccent ? ` ${c.titleAccent}` : ""}{" "}
            <span className="font-mono text-muted-foreground">{c.number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-4">
          <Fact label="Kunde" value={cust?.company ?? "—"} />
          <Fact label="Vertragsdatum" value={dateDE(c.issueDate)} />
          <Fact label="Auftragswert" value={c.netValue != null ? `${eur(c.netValue)} netto` : "—"} />
          <Fact label="Status" value={<ContractStatusBadge status={c.status} />} />
        </div>

        <div className="mt-4">
          <SubHead>Verknüpfte Vorgänge</SubHead>
          <div className="mt-2 space-y-2">
            {quote && (
              <Row
                href={`/quotes?doc=${quote.id}`}
                icon={<FileText className="size-4" />}
                title={`Angebot ${quote.number}`}
                meta={`${eur(computeTotals(quote.items).net)} netto · gültig bis ${dateDE(quote.validUntil)}`}
              />
            )}
            {project && (
              <Row
                href={`/projects`}
                icon={<FolderKanban className="size-4" />}
                title={project.name}
                meta="Projekt"
              />
            )}
            {invoices.map((inv) => (
              <Row
                key={inv.id}
                href={`/invoices?doc=${inv.id}`}
                icon={<ReceiptEuro className="size-4" />}
                title={`Rechnung ${inv.number}`}
                meta={`${eur(computeTotals(inv.items).gross)} brutto · ${dateDE(inv.issueDate)}`}
              />
            ))}
            {!quote && !project && invoices.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Noch nichts verknüpft.</p>
            )}
          </div>
        </div>

        {c.notes && (
          <div className="mt-4">
            <SubHead>Vermerk</SubHead>
            <p className="mt-2 text-[13px] leading-[1.6] text-muted-foreground">{c.notes}</p>
          </div>
        )}

        <div className="mt-4">
          <SubHead>Regelungen — {c.clauses.length} Paragrafen</SubHead>
          <ol className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {c.clauses.map((cl, i) => (
              <li key={cl.title} className="flex gap-2 text-[13px] text-muted-foreground">
                <span className="w-[26px] shrink-0 tabular-nums text-brand-cyan">§ {i + 1}</span>
                <span className="min-w-0 flex-1">{cl.title}</span>
              </li>
            ))}
          </ol>
        </div>

        {c.attachments?.length ? (
          <div className="mt-4">
            <SubHead>Anlagen</SubHead>
            <ul className="mt-2 space-y-1">
              {c.attachments.map((a) => (
                <li key={a} className="flex gap-2 text-[13px] text-muted-foreground">
                  <Paperclip className="mt-[3px] size-3.5 shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button asChild variant="brand" size="lg" className="gap-1.5">
            <Link href={`/print/contract/${c.id}`} target="_blank">
              <FileDown className="size-4" /> Vertrag als PDF
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase">
      {children}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
      <div className="text-[11px] tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-[14px] font-semibold">{value}</div>
    </div>
  )
}

function Row({
  href,
  icon,
  title,
  meta,
}: {
  href: string
  icon: React.ReactNode
  title: string
  meta: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 transition-colors hover:bg-white/[0.05]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-brand-cyan">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{title}</span>
        <span className="block truncate text-[12.5px] text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-white/25" />
    </Link>
  )
}

function Summary({ label, value, tint }: { label: string; value: string; tint: string }) {
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
