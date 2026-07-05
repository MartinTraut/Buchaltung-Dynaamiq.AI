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
import { Plus, GripVertical, TrendingUp, FileText, FolderPlus, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/types"
import { eur, dateDE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/misc"
import { Input, Label, Select, Textarea } from "@/components/ui/input"
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

export default function PipelinePage() {
  const { db, moveDeal, upsertDeal, upsertProject, remove, add, customerById, pushActivity } =
    useStore()
  const confirm = useConfirm()
  const router = useRouter()
  const wantNew = useQueryFlag("new")
  const [active, setActive] = React.useState<Deal | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<Deal | null>(null)
  const [docDeal, setDocDeal] = React.useState<Deal | null>(null)

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
      })
      toast.success(`🎉 Deal gewonnen: ${eur(deal.value)}`)
    }
  }

  const totalWeighted = db.deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((s, d) => s + (d.value * d.probability) / 100, 0)

  return (
    <div className="mx-auto max-w-[1760px]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
          <TrendingUp className="size-5 text-brand-cyan" />
          <span className="text-sm text-muted-foreground">Gewichtete Pipeline</span>
          <span className="font-display text-[17px] font-bold tnum text-brand-gradient">
            {eur(totalWeighted)}
          </span>
        </div>
        <Button
          variant="brand"
          size="lg"
          className="ml-auto gap-1.5"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4" /> Neuer Deal
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 xl:overflow-x-visible">
          {DEAL_STAGES.map((stage) => {
            const deals = db.deals.filter((d) => d.stage === stage.id)
            const total = deals.reduce((s, d) => s + d.value, 0)
            return (
              <Column
                key={stage.id}
                id={stage.id}
                label={stage.label}
                tint={stage.tint}
                total={total}
                count={deals.length}
              >
                {deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    company={customerById(deal.customerId)?.company ?? "—"}
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
                company={customerById(active.customerId)?.company ?? "—"}
                tint="#00ffe6"
                dragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
          company={customerById(detail.customerId)?.company ?? "—"}
          onOpenChange={(o) => !o && setDetail(null)}
          onSave={(d) => {
            upsertDeal(d)
            toast.success("Deal aktualisiert")
            setDetail(null)
          }}
          onCreateQuote={() => {
            setDocDeal(detail)
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
          kind="quote"
          open={!!docDeal}
          onOpenChange={(o) => !o && setDocDeal(null)}
          doc={null}
          defaultCustomerId={docDeal.customerId}
          defaultItems={[
            { id: nanoid(6), description: docDeal.title, qty: 1, unitPrice: docDeal.value, taxRate: 0.19 },
          ]}
          onSaved={() => {
            toast.success("Angebot aus Deal erstellt")
            setDocDeal(null)
          }}
        />
      )}
    </div>
  )
}

function DealDetailDialog({
  deal,
  company,
  onOpenChange,
  onSave,
  onCreateQuote,
  onCreateProject,
  onDelete,
}: {
  deal: Deal
  company: string
  onOpenChange: (o: boolean) => void
  onSave: (d: Partial<Deal>) => void
  onCreateQuote: () => void
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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" onClick={onCreateQuote}>
              <FileText className="size-4 text-brand-cyan" /> Angebot erstellen
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
  const [form, setForm] = React.useState<Partial<Deal>>({
    stage: "lead",
    probability: 20,
    value: 0,
    owner: "Martin",
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
