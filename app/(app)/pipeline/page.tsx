"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import {
  Plus,
  GripVertical,
  TrendingUp,
  FileText,
  FolderPlus,
  Trash2,
  Percent,
  Sigma,
  CalendarRange,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ReceiptEuro,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { useLocalState } from "@/hooks/use-local-state"
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/types"
import { eur, dateDE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Input, Label, Select, Textarea } from "@/components/ui/input"
import { SearchInput, FilterChips } from "@/components/page-toolbar"
import { DocEditorDialog } from "@/components/documents/doc-editor"
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

type PipelineView = "kanban" | "list" | "timeline"

export default function PipelinePage() {
  const { db, moveDeal, upsertDeal, upsertProject, remove, add, customerById, pushActivity } =
    useStore()
  const confirm = useConfirm()
  const router = useRouter()
  const wantNew = useQueryFlag("new")
  const [view, setView] = useLocalState<PipelineView>("dyn-pipeline-view", "kanban")
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState<Deal | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<Deal | null>(null)
  const [docDeal, setDocDeal] = React.useState<{ deal: Deal; kind: "quote" | "invoice" } | null>(
    null,
  )

  React.useEffect(() => {
    if (wantNew) setDialogOpen(true)
  }, [wantNew])

  function createProjectFromDeal(deal: Deal) {
    upsertProject({
      name: deal.title,
      customerId: deal.customerId,
      status: "planning",
      budget: deal.value,
      color: "#00ffe6",
    })
    setDetail(null)
    toast.success("Projekt aus Deal angelegt")
    router.push("/projects")
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function onDragStart(e: DragStartEvent) {
    const deal = db.deals.find((d) => d.id === e.active.id)
    setActive(deal ?? null)
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null)
    const overId = e.over?.id as DealStage | undefined
    const dealId = e.active.id as string
    if (!overId) return
    const deal = db.deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === overId) return
    moveDeal(dealId, overId)
    if (overId === "won") {
      pushActivity({
        type: "deal",
        title: `Deal gewonnen — ${deal.title}`,
        meta: `${customerById(deal.customerId)?.company ?? ""} · ${eur(deal.value)}`,
        customerId: deal.customerId,
      })
      toast.success(`🎉 Deal gewonnen: ${eur(deal.value)}`)
    }
  }

  const companyOf = React.useCallback(
    (d: Deal) => customerById(d.customerId)?.company ?? "—",
    [customerById],
  )

  // Suche wirkt in allen drei Views
  const deals = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return db.deals
    return db.deals.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || companyOf(d).toLowerCase().includes(q),
    )
  }, [db.deals, query, companyOf])

  // Header-KPIs — immer über der Gesamt-Pipeline (nicht über der Suche)
  const openDeals = db.deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
  const totalWeighted = openDeals.reduce((s, d) => s + (d.value * d.probability) / 100, 0)
  const wonCount = db.deals.filter((d) => d.stage === "won").length
  const lostCount = db.deals.filter((d) => d.stage === "lost").length
  const conversion = wonCount + lostCount > 0 ? wonCount / (wonCount + lostCount) : null
  const avgOpenValue =
    openDeals.length > 0
      ? openDeals.reduce((s, d) => s + d.value, 0) / openDeals.length
      : null

  return (
    <div className="mx-auto max-w-[1760px]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <KpiChip
          icon={<TrendingUp className="size-5 text-brand-cyan" />}
          label="Gewichtete Pipeline"
          value={eur(totalWeighted)}
          gradient
        />
        <KpiChip
          icon={<Percent className="size-5 text-brand-blue" />}
          label="Conversion"
          value={conversion === null ? "—" : `${Math.round(conversion * 100)} %`}
        />
        <KpiChip
          icon={<Sigma className="size-5 text-[#8b5cf6]" />}
          label="Ø Dealwert"
          value={avgOpenValue === null ? "—" : eur(avgOpenValue)}
        />
        <Button
          variant="brand"
          size="lg"
          className="ml-auto gap-1.5"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4" /> Neuer Deal
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Deal oder Kunde…" />
        <FilterChips
          value={view}
          onChange={setView}
          options={[
            { id: "kanban", label: "Kanban" },
            { id: "list", label: "Liste" },
            { id: "timeline", label: "Timeline" },
          ]}
        />
      </div>

      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 xl:overflow-x-visible">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id)
              const total = stageDeals.reduce((s, d) => s + d.value, 0)
              return (
                <Column
                  key={stage.id}
                  id={stage.id}
                  label={stage.label}
                  tint={stage.tint}
                  total={total}
                  count={stageDeals.length}
                >
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      company={companyOf(deal)}
                      tint={stage.tint}
                      onOpen={() => setDetail(deal)}
                    />
                  ))}
                </Column>
              )
            })}
          </div>

          <DragOverlay>
            {active && (
              <div className="w-72 rotate-2 opacity-90">
                <DealCardInner
                  deal={active}
                  company={companyOf(active)}
                  tint="#00ffe6"
                  dragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {view === "list" && (
        <ListView deals={deals} companyOf={companyOf} onOpen={(d) => setDetail(d)} />
      )}

      {view === "timeline" && (
        <TimelineView deals={deals} companyOf={companyOf} onOpen={(d) => setDetail(d)} />
      )}

      <DealDialog
        key={dialogOpen ? "open" : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={db.customers}
        onSave={(data) => {
          upsertDeal(data)
          toast.success("Deal angelegt")
          setDialogOpen(false)
        }}
      />

      {detail && (
        <DealDetailDialog
          key={detail.id}
          deal={detail}
          company={companyOf(detail)}
          onOpenChange={(o) => !o && setDetail(null)}
          onSave={(d) => {
            upsertDeal(d)
            toast.success("Deal aktualisiert")
            setDetail(null)
          }}
          onCreateQuote={() => {
            setDocDeal({ deal: detail, kind: "quote" })
            setDetail(null)
          }}
          onCreateInvoice={() => {
            setDocDeal({ deal: detail, kind: "invoice" })
            setDetail(null)
          }}
          onCreateProject={() => createProjectFromDeal(detail)}
          onDelete={async () => {
            const ok = await confirm({
              title: `Deal „${detail.title}" löschen?`,
              description: "Der Deal wird aus der Pipeline entfernt.",
              confirmLabel: "Löschen",
              destructive: true,
            })
            if (!ok) return
            remove("deals", detail.id)
            setDetail(null)
            toast.success("Deal gelöscht", {
              action: { label: "Rückgängig", onClick: () => add("deals", detail) },
            })
          }}
        />
      )}

      {docDeal && (
        <DocEditorDialog
          kind={docDeal.kind}
          open={!!docDeal}
          onOpenChange={(o) => !o && setDocDeal(null)}
          doc={null}
          defaultCustomerId={docDeal.deal.customerId}
          defaultItems={[
            {
              id: nanoid(6),
              description: docDeal.deal.title,
              qty: 1,
              unitPrice: docDeal.deal.value,
              taxRate: 0.19,
            },
          ]}
          onSaved={() => {
            toast.success(
              docDeal.kind === "quote" ? "Angebot aus Deal erstellt" : "Rechnung aus Deal erstellt",
            )
            setDocDeal(null)
          }}
        />
      )}
    </div>
  )
}

function KpiChip({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode
  label: string
  value: string
  gradient?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
      {icon}
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-display text-[17px] font-bold tnum",
          gradient && "text-brand-gradient",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function StageBadge({ stage }: { stage: DealStage }) {
  const s = DEAL_STAGES.find((x) => x.id === stage) ?? DEAL_STAGES[0]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={{
        color: s.tint,
        background: `color-mix(in srgb, ${s.tint} 13%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.tint }} />
      {s.label}
    </span>
  )
}

// ---------- Listen-Ansicht ----------

type SortKey = "title" | "customer" | "stage" | "value" | "weighted" | "expectedClose" | "owner"

const stageIndex = (s: DealStage) => DEAL_STAGES.findIndex((x) => x.id === s)

const LIST_GRID =
  "grid grid-cols-[minmax(220px,1.6fr)_minmax(180px,1.3fr)_150px_120px_120px_160px_100px] items-center gap-4 px-6"

function ListView({
  deals,
  companyOf,
  onOpen,
}: {
  deals: Deal[]
  companyOf: (d: Deal) => string
  onOpen: (d: Deal) => void
}) {
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "value",
    dir: -1,
  })

  function toggle(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: (s.dir * -1) as 1 | -1 }
        : { key, dir: key === "value" || key === "weighted" ? -1 : 1 },
    )
  }

  const rows = React.useMemo(() => {
    const list = deals.map((deal) => ({
      deal,
      company: companyOf(deal),
      weighted: (deal.value * deal.probability) / 100,
    }))
    const dir = sort.dir
    list.sort((a, b) => {
      switch (sort.key) {
        case "title":
          return a.deal.title.localeCompare(b.deal.title, "de") * dir
        case "customer":
          return a.company.localeCompare(b.company, "de") * dir
        case "stage":
          return (stageIndex(a.deal.stage) - stageIndex(b.deal.stage)) * dir
        case "value":
          return (a.deal.value - b.deal.value) * dir
        case "weighted":
          return (a.weighted - b.weighted) * dir
        case "expectedClose": {
          const av = a.deal.expectedClose ?? ""
          const bv = b.deal.expectedClose ?? ""
          if (!av && !bv) return 0
          if (!av) return 1 // ohne Termin immer ans Ende
          if (!bv) return -1
          return av.localeCompare(bv) * dir
        }
        case "owner":
          return a.deal.owner.localeCompare(b.deal.owner, "de") * dir
      }
    })
    return list
  }, [deals, sort, companyOf])

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="size-6" />}
        title="Keine Deals gefunden"
        hint="Passe die Suche an oder lege einen neuen Deal an."
      />
    )
  }

  const th = (key: SortKey, label: string, align?: "right") => {
    const active = sort.key === key
    return (
      <button
        onClick={() => toggle(key)}
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors",
          align === "right" && "justify-end text-right",
          active ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground",
        )}
      >
        {label}
        {active ? (
          sort.dir === 1 ? (
            <ChevronUp className="size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3 shrink-0 opacity-50" />
        )}
      </button>
    )
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className={cn(LIST_GRID, "border-b border-white/10 py-4")}>
            {th("title", "Deal")}
            {th("customer", "Kunde")}
            {th("stage", "Phase")}
            {th("value", "Wert", "right")}
            {th("weighted", "Gewichtet", "right")}
            {th("expectedClose", "Erw. Abschluss")}
            {th("owner", "Owner")}
          </div>
          {rows.map(({ deal, company, weighted }) => (
            <button
              key={deal.id}
              onClick={() => onOpen(deal)}
              className={cn(
                LIST_GRID,
                "w-full border-b border-white/[0.05] py-4 text-left transition-colors last:border-0 hover:bg-white/[0.025]",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{deal.title}</span>
                <span className="block text-[12px] tnum text-muted-foreground">
                  {deal.probability} % Wahrscheinlichkeit
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={company} className="size-8 text-[10px]" />
                <span className="truncate text-[14px] text-muted-foreground">{company}</span>
              </span>
              <span>
                <StageBadge stage={deal.stage} />
              </span>
              <span className="text-right text-[15px] font-semibold tnum">
                {eur(deal.value)}
              </span>
              <span className="text-right text-[14px] tnum text-muted-foreground">
                {eur(weighted)}
              </span>
              <span className="text-[14px] text-muted-foreground">
                {deal.expectedClose ? dateDE(deal.expectedClose) : "—"}
              </span>
              <span className="truncate text-[14px] text-muted-foreground">{deal.owner}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Timeline-Ansicht ----------

function monthLabel(ym: string): string {
  return new Date(`${ym}-01T12:00:00`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  })
}

function TimelineView({
  deals,
  companyOf,
  onOpen,
}: {
  deals: Deal[]
  companyOf: (d: Deal) => string
  onOpen: (d: Deal) => void
}) {
  // Nur offene Deals — won/lost haben in der Monatsspur nichts verloren
  const groups = React.useMemo(() => {
    const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
    const map = new Map<string, Deal[]>()
    for (const d of open) {
      const key = d.expectedClose ? d.expectedClose.slice(0, 7) : "none"
      const list = map.get(key) ?? []
      list.push(d)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.expectedClose ?? "").localeCompare(b.expectedClose ?? ""))
    }
    const monthKeys = [...map.keys()].filter((k) => k !== "none").sort()
    const ordered: { key: string; label: string; deals: Deal[] }[] = []
    const none = map.get("none")
    if (none) ordered.push({ key: "none", label: "Ohne Termin", deals: none })
    for (const k of monthKeys) ordered.push({ key: k, label: monthLabel(k), deals: map.get(k)! })
    return ordered
  }, [deals])

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<CalendarRange className="size-6" />}
        title="Keine offenen Deals"
        hint="Sobald offene Deals ein erwartetes Abschlussdatum haben, erscheinen sie hier in der Monatsspur."
      />
    )
  }

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-4">
      {groups.map((g) => {
        const total = g.deals.reduce((s, d) => s + d.value, 0)
        const isNone = g.key === "none"
        return (
          <div key={g.key} className="w-[280px] shrink-0 snap-start">
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <CalendarRange
                className={cn("size-4 shrink-0", isNone ? "text-muted-foreground/60" : "text-brand-cyan")}
              />
              <span className="truncate text-[15px] font-semibold capitalize">{g.label}</span>
              <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] tnum text-muted-foreground">
                {g.deals.length}
              </span>
              <span className="ml-auto text-[13px] font-medium tnum text-muted-foreground">
                {eur(total, { compact: true })}
              </span>
            </div>
            <div className="flex min-h-[220px] flex-col gap-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-2.5">
              {g.deals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => onOpen(deal)}
                  className="group rounded-2xl border border-white/8 bg-[#141417] p-4 text-left transition-all hover:border-white/15"
                >
                  <p className="text-[15px] font-semibold leading-snug">{deal.title}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Avatar name={companyOf(deal)} className="size-7 text-[10px]" />
                    <span className="truncate text-[13px] text-muted-foreground">
                      {companyOf(deal)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-display text-[17px] font-bold tnum text-brand-cyan">
                      {eur(deal.value, { compact: true })}
                    </span>
                    <StageBadge stage={deal.stage} />
                  </div>
                  {deal.expectedClose && (
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      Abschluss: {dateDE(deal.expectedClose)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DealDetailDialog({
  deal,
  company,
  onOpenChange,
  onSave,
  onCreateQuote,
  onCreateInvoice,
  onCreateProject,
  onDelete,
}: {
  deal: Deal
  company: string
  onOpenChange: (o: boolean) => void
  onSave: (d: Partial<Deal>) => void
  onCreateQuote: () => void
  onCreateInvoice: () => void
  onCreateProject: () => void
  onDelete: () => void
}) {
  const [form, setForm] = React.useState<Deal>(deal)
  const set = (p: Partial<Deal>) => setForm((f) => ({ ...f, ...p }))
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Deal bearbeiten</DialogTitle>
          <p className="text-sm text-muted-foreground">{company}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Titel</Label>
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <Label>Wert (€ netto)</Label>
            <Input type="number" value={form.value} onChange={(e) => set({ value: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Wahrscheinlichkeit (%)</Label>
            <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => set({ probability: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Phase</Label>
            <Select value={form.stage} onChange={(e) => set({ stage: e.target.value as DealStage })}>
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Erwarteter Abschluss</Label>
            <Input
              type="date"
              value={form.expectedClose ? new Date(form.expectedClose).toISOString().slice(0, 10) : ""}
              onChange={(e) => set({ expectedClose: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
          <div className="col-span-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Aus diesem Deal erstellen</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" onClick={onCreateQuote}>
              <FileText className="size-4 text-brand-cyan" /> Angebot erstellen
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" onClick={onCreateInvoice}>
              <ReceiptEuro className="size-4 text-brand-blue" /> Rechnung erstellen
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" onClick={onCreateProject}>
              <FolderPlus className="size-4 text-[#2fd3a5]" /> Projekt anlegen
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" className="gap-1.5 sm:mr-auto" onClick={onDelete}>
            <Trash2 className="size-4" /> Löschen
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Schließen</Button>
          </DialogClose>
          <Button variant="brand" onClick={() => onSave(form)}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Column({
  id,
  label,
  tint,
  total,
  count,
  children,
}: {
  id: string
  label: string
  tint: string
  total: number
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex w-[260px] shrink-0 flex-col xl:w-auto xl:flex-1 xl:min-w-0">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className="size-3 shrink-0 rounded-full" style={{ background: tint, boxShadow: `0 0 8px ${tint}` }} />
        <span className="truncate text-[15px] font-semibold">{label}</span>
        <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] tnum text-muted-foreground">
          {count}
        </span>
        <span className="ml-auto text-[13px] font-medium tnum text-muted-foreground">
          {eur(total, { compact: true })}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[calc(100vh-264px)] flex-col gap-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-2.5 transition-colors",
          isOver && "border-brand-cyan/40 bg-brand-cyan/[0.04]",
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DealCard({
  deal,
  company,
  tint,
  onOpen,
}: {
  deal: Deal
  company: string
  tint: string
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-30")}
      {...attributes}
    >
      <DealCardInner
        deal={deal}
        company={company}
        tint={tint}
        listeners={listeners}
        onOpen={onOpen}
      />
    </div>
  )
}

function DealCardInner({
  deal,
  company,
  tint,
  listeners,
  dragging,
  onOpen,
}: {
  deal: Deal
  company: string
  tint: string
  listeners?: Record<string, unknown>
  dragging?: boolean
  onOpen?: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group rounded-2xl border border-white/8 bg-[#141417] p-4 transition-all hover:border-white/15",
        onOpen && "cursor-pointer",
        dragging && "shadow-2xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[16px] font-semibold leading-snug">{deal.title}</p>
        <button
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Avatar name={company} className="size-7 text-[10px]" />
        <span className="truncate text-[13.5px] text-muted-foreground">{company}</span>
      </div>
      <div className="mt-3.5 flex items-center justify-between">
        <span className="font-display text-[18px] font-bold tnum" style={{ color: tint }}>
          {eur(deal.value, { compact: true })}
        </span>
        <Badge variant="muted" className="text-[11px]">
          {deal.probability}%
        </Badge>
      </div>
      {deal.expectedClose && (
        <p className="mt-2.5 text-[12.5px] text-muted-foreground">
          Abschluss: {dateDE(deal.expectedClose)}
        </p>
      )}
    </div>
  )
}

function DealDialog({
  open,
  onOpenChange,
  customers,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customers: { id: string; company: string }[]
  onSave: (d: Partial<Deal>) => void
}) {
  // Owner wird beim Speichern in upsertDeal aus settings.ownerName abgeleitet.
  const [form, setForm] = React.useState<Partial<Deal>>({
    stage: "lead",
    probability: 20,
    value: 0,
  })
  const set = (p: Partial<Deal>) => setForm((f) => ({ ...f, ...p }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Deal</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Titel</Label>
            <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Meta Ads Retainer" />
          </div>
          <div className="col-span-2">
            <Label>Kunde</Label>
            <Select value={form.customerId ?? ""} onChange={(e) => set({ customerId: e.target.value })}>
              <option value="">— wählen —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Wert (€ netto)</Label>
            <Input type="number" value={form.value ?? 0} onChange={(e) => set({ value: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Wahrscheinlichkeit (%)</Label>
            <Input type="number" min={0} max={100} value={form.probability ?? 20} onChange={(e) => set({ probability: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Phase</Label>
            <Select value={form.stage ?? "lead"} onChange={(e) => set({ stage: e.target.value as DealStage })}>
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Erwarteter Abschluss</Label>
            <Input type="date" onChange={(e) => set({ expectedClose: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          </div>
          <div className="col-span-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button variant="brand" disabled={!form.title || !form.customerId} onClick={() => onSave(form)}>
            Deal anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
