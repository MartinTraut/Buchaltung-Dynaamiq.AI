"use client"

import * as React from "react"
import {
  Plus,
  FolderKanban,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { eur, dateDE } from "@/lib/format"
import { PROJECT_STATUS_LABEL, type Project, type ProjectStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress, EmptyState } from "@/components/ui/misc"
import { Input, Label, Select, Textarea } from "@/components/ui/input"
import { Toolbar, FilterChips } from "@/components/page-toolbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const STATUS_VARIANT: Record<ProjectStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  planning: "violet",
  active: "success",
  on_hold: "warning",
  done: "muted",
  canceled: "danger",
}

type Filter = "all" | ProjectStatus

export default function ProjectsPage() {
  const { db, customerById, upsertProject, upsertTask, toggleTask, remove, add } = useStore()
  const confirm = useConfirm()
  const wantNew = useQueryFlag("new")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [open, setOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [newTask, setNewTask] = React.useState("")

  React.useEffect(() => {
    if (wantNew) setOpen(true)
  }, [wantNew])

  const rows = db.projects.filter((p) => filter === "all" || p.status === filter)
  const counts = (s: ProjectStatus) => db.projects.filter((p) => p.status === s).length
  const detail = db.projects.find((p) => p.id === detailId)
  const detailTasks = db.tasks.filter((t) => t.projectId === detailId)

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar>
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.projects.length },
            { id: "active", label: "Aktiv", count: counts("active") },
            { id: "planning", label: "Planung", count: counts("planning") },
            { id: "done", label: "Abgeschlossen", count: counts("done") },
          ]}
        />
        <Button variant="brand" size="lg" className="ml-auto gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Neues Projekt
        </Button>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon={<FolderKanban className="size-6" />} title="Keine Projekte" hint="Lege ein Projekt an, um Budget, Tasks und Lieferung zu steuern." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const c = customerById(p.customerId)
            const tasks = db.tasks.filter((t) => t.projectId === p.id)
            const doneTasks = tasks.filter((t) => t.status === "done").length
            const spentPct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0
            const over = spentPct > 90
            return (
              <Card key={p.id} className="cursor-pointer p-5" onClick={() => setDetailId(p.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="size-3 rounded-full" style={{ background: p.color }} />
                    <div>
                      <p className="font-display font-semibold leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{c?.company}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="tnum">
                      <span className={over ? "text-[#ff7a7a]" : "text-foreground"}>{eur(p.spent, { compact: true })}</span>
                      <span className="text-muted-foreground"> / {eur(p.budget, { compact: true })}</span>
                    </span>
                  </div>
                  <Progress value={spentPct} className="mt-1.5" tint={over ? "#ff4d4d" : p.color} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> {doneTasks}/{tasks.length} Tasks
                  </span>
                  {p.dueDate && <span>Fällig {dateDE(p.dueDate)}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* New project */}
      <ProjectDialog open={open} onOpenChange={setOpen} customers={db.customers} onSave={(d) => { upsertProject(d); toast.success("Projekt angelegt"); setOpen(false) }} />

      {/* Detail with tasks */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        {detail && (
          <DialogContent size="lg">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full" style={{ background: detail.color }} />
                <DialogTitle>{detail.name}</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">{customerById(detail.customerId)?.company}</p>
            </DialogHeader>

            {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}

            <div className="grid grid-cols-3 gap-3">
              <Mini label="Budget" value={eur(detail.budget, { compact: true })} />
              <Mini label="Verbraucht" value={eur(detail.spent, { compact: true })} />
              <Mini label="Verbleibend" value={eur(detail.budget - detail.spent, { compact: true })} />
            </div>

            <div>
              <Label>Aufgaben</Label>
              <div className="space-y-1">
                {detailTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    {t.status === "done" ? (
                      <CheckCircle2 className="size-4 text-[#2fd3a5]" />
                    ) : t.status === "doing" ? (
                      <Clock className="size-4 text-brand-blue" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                    <span className={t.status === "done" ? "flex-1 text-sm line-through opacity-50" : "flex-1 text-sm"}>
                      {t.title}
                    </span>
                    {t.due && <span className="text-[11px] text-muted-foreground">{dateDE(t.due)}</span>}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Neue Aufgabe…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTask.trim()) {
                      upsertTask({ projectId: detail.id, title: newTask.trim() })
                      setNewTask("")
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (newTask.trim()) {
                      upsertTask({ projectId: detail.id, title: newTask.trim() })
                      setNewTask("")
                    }
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                className="gap-1.5 sm:mr-auto"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Projekt „${detail.name}" löschen?`,
                    description: "Das Projekt wird entfernt. Zugehörige Aufgaben gehen dabei verloren.",
                    confirmLabel: "Löschen",
                    destructive: true,
                  })
                  if (!ok) return
                  remove("projects", detail.id)
                  setDetailId(null)
                  toast.success("Projekt gelöscht", {
                    action: { label: "Rückgängig", onClick: () => add("projects", detail) },
                  })
                }}
              >
                <Trash2 className="size-4" /> Löschen
              </Button>
              <DialogClose asChild><Button variant="outline">Schließen</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-bold tnum">{value}</p>
    </div>
  )
}

function ProjectDialog({
  open,
  onOpenChange,
  customers,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customers: { id: string; company: string }[]
  onSave: (d: Partial<Project>) => void
}) {
  const COLORS = ["#1f7bf2", "#00ffe6", "#5b2eff", "#8b5cf6", "#2fd3a5", "#ffb02e"]
  const [form, setForm] = React.useState<Partial<Project>>({ status: "planning", color: COLORS[0], budget: 0, spent: 0 })
  const set = (p: Partial<Project>) => setForm((f) => ({ ...f, ...p }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Projektname</Label>
            <Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Always-On Meta" />
          </div>
          <div className="col-span-2">
            <Label>Kunde</Label>
            <Select value={form.customerId ?? ""} onChange={(e) => set({ customerId: e.target.value })}>
              <option value="">— wählen —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </Select>
          </div>
          <div>
            <Label>Budget (€)</Label>
            <Input type="number" value={form.budget ?? 0} onChange={(e) => set({ budget: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
              {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div>
            <Label>Fällig am</Label>
            <Input type="date" onChange={(e) => set({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          </div>
          <div>
            <Label>Farbe</Label>
            <div className="flex h-9 items-center gap-1.5">
              {COLORS.map((col) => (
                <button
                  key={col}
                  onClick={() => set({ color: col })}
                  className="size-6 rounded-full ring-offset-2 ring-offset-[#111114] transition-all"
                  style={{ background: col, boxShadow: form.color === col ? `0 0 0 2px ${col}` : "none" }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <Label>Beschreibung</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
          <Button variant="brand" disabled={!form.name || !form.customerId} onClick={() => onSave(form)}>Projekt anlegen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
