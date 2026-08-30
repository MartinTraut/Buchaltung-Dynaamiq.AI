"use client"

import * as React from "react"
import Link from "next/link"
import {
  ListChecks,
  AlertTriangle,
  CircleAlert,
  Info,
  SlidersHorizontal,
  ArrowUpRight,
  EyeOff,
  Plus,
  Check,
  RotateCcw,
  CheckCircle2,
} from "lucide-react"
import { useStore } from "@/lib/store"
import {
  CHECK_RULES,
  RULE_BY_ID,
  runChecks,
  ruleActive,
  ruleDays,
  SEVERITY_LABEL,
  type CheckArea,
  type CheckFinding,
  type CheckSeverity,
} from "@/lib/checks"
import { dateDE, isOverdue } from "@/lib/format"
import type { Task } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/misc"
import { SectionTitle } from "@/components/kpi-card"
import { TaskDialog } from "@/components/tasks/task-dialog"
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

/** Farbwelt je Dringlichkeit — dieselbe Skala wie in den Badges der App. */
const TINT: Record<CheckSeverity, string> = {
  critical: "#ff4d4d",
  warning: "#ffb02e",
  info: "#1f7bf2",
}

const SEV_ICON: Record<CheckSeverity, React.ReactNode> = {
  critical: <CircleAlert className="size-4" />,
  warning: <AlertTriangle className="size-4" />,
  info: <Info className="size-4" />,
}

const AREA_ORDER: CheckArea[] = [
  "Rechnungen",
  "Angebote",
  "Kunden",
  "Ausgaben",
  "Stammdaten",
]

type View = "all" | "critical" | "checks" | "tasks"

export default function TasksPage() {
  const { db, updateSettings, upsertTask, toggleTask, remove } = useStore()

  const [view, setView] = React.useState<View>("all")
  const [config, setConfig] = React.useState(false)
  const [taskOpen, setTaskOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<string | null>(null)
  const [quick, setQuick] = React.useState("")
  const [showDone, setShowDone] = React.useState(false)

  // Die Prüfungen laufen bei jeder Änderung neu — ein gespeicherter Befund
  // wäre am Tag nach der Zahlung falsch, ohne dass jemand ihn anfasst.
  const findings = React.useMemo(() => runChecks(db), [db])

  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  }

  const ownTasks = db.tasks
    .filter((t) => (t.kind ?? "task") === "task")
    .sort((a, b) => {
      const d = (t: Task) => (t.due ? +new Date(t.due) : Number.MAX_SAFE_INTEGER)
      return d(a) - d(b)
    })
  const openTasks = ownTasks.filter((t) => t.status !== "done")
  const doneTasks = ownTasks.filter((t) => t.status === "done")

  const shown =
    view === "critical"
      ? findings.filter((f) => f.severity === "critical")
      : findings
  const byArea = AREA_ORDER.map((area) => ({
    area,
    items: shown.filter((f) => f.area === area),
  })).filter((g) => g.items.length > 0)

  const hidden = db.settings.checksHidden ?? []

  function hide(f: CheckFinding) {
    updateSettings({ checksHidden: [...hidden, f.id] })
    toast.success("Punkt ausgeblendet", {
      description: "Bleibt aus, bis du ihn in den Prüfungen zurückholst.",
      action: {
        label: "Rückgängig",
        onClick: () => updateSettings({ checksHidden: hidden }),
      },
    })
  }

  /** Aus einem Befund eine eigene Aufgabe machen — der Befund selbst bleibt,
   *  bis die Ursache behoben ist; die Aufgabe hält nur die Absicht fest. */
  function adopt(f: CheckFinding) {
    upsertTask({ title: f.title, status: "todo", kind: "task" })
    toast.success("Als Aufgabe übernommen")
  }

  function addQuick(e: React.FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    upsertTask({ title, status: "todo", kind: "task" })
    setQuick("")
    toast.success("Aufgabe angelegt")
  }

  const total = counts.critical + counts.warning + counts.info

  return (
    <div className="mx-auto max-w-[1760px] space-y-6">
      {/* Zusammenfassung — die drei Stufen und die eigenen Aufgaben */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountCard
          label="Kritisch"
          value={counts.critical}
          hint="Pflichtangaben, Geld, Fristen"
          tint={TINT.critical}
          icon={<CircleAlert className="size-4" />}
        />
        <CountCard
          label="Offen"
          value={counts.warning}
          hint="sollte diese Woche weg"
          tint={TINT.warning}
          icon={<AlertTriangle className="size-4" />}
        />
        <CountCard
          label="Hinweise"
          value={counts.info}
          hint="kann warten"
          tint={TINT.info}
          icon={<Info className="size-4" />}
        />
        <CountCard
          label="Eigene Aufgaben"
          value={openTasks.length}
          hint={
            doneTasks.length
              ? `${doneTasks.length} erledigt`
              : "selbst angelegt"
          }
          tint="#2fd3a5"
          icon={<ListChecks className="size-4" />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Vier Segmente sind breiter als ein 390-px-Viewport. Ohne eigenen
            Scrollbereich schiebt das Control die ganze Seite auf. */}
        <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { id: "all", label: "Alles" },
            { id: "critical", label: `Kritisch${counts.critical ? ` · ${counts.critical}` : ""}` },
            { id: "checks", label: "Prüfungen" },
            { id: "tasks", label: "Aufgaben" },
          ]}
        />
        </div>
        <Button variant="outline" onClick={() => setConfig(true)}>
          <SlidersHorizontal className="size-4" /> Prüfungen einstellen
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ── Automatisch erkannte Punkte ─────────────────────────────── */}
        {view !== "tasks" && (
          <div className={cn("space-y-4", view === "checks" ? "xl:col-span-3" : "xl:col-span-2")}>
            {byArea.length === 0 ? (
              <Card className="p-0">
                <EmptyState
                  icon={<CheckCircle2 className="size-6" />}
                  title={
                    total === 0
                      ? "Nichts offen"
                      : "In dieser Ansicht ist nichts offen"
                  }
                  hint={
                    total === 0
                      ? "Alle aktiven Prüfungen laufen sauber durch. Neue Punkte erscheinen hier automatisch, sobald sie entstehen."
                      : "Wechsle auf „Alles“, um die übrigen Punkte zu sehen."
                  }
                />
              </Card>
            ) : (
              byArea.map((g) => (
                <Card key={g.area}>
                  <div className="flex items-center justify-between p-5 pb-0">
                    <SectionTitle className="mb-0">{g.area}</SectionTitle>
                    <Badge variant="muted">{g.items.length}</Badge>
                  </div>
                  <div className="divide-y divide-white/[0.06] px-5 pb-2 pt-3">
                    {g.items.map((f) => (
                      <FindingRow
                        key={f.id}
                        finding={f}
                        onAdopt={() => adopt(f)}
                        onHide={() => hide(f)}
                      />
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Eigene Aufgaben ─────────────────────────────────────────── */}
        {view !== "checks" && (
          <div className={cn("space-y-4", view === "tasks" && "xl:col-span-3")}>
            <Card>
              <div className="flex items-center justify-between p-5 pb-0">
                <SectionTitle className="mb-0">Meine Aufgaben</SectionTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTask(null)
                    setTaskOpen(true)
                  }}
                >
                  <Plus className="size-4" /> Mit Datum
                </Button>
              </div>

              <form onSubmit={addQuick} className="flex gap-2 px-5 pt-4">
                <Input
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder="Aufgabe notieren…"
                  aria-label="Neue Aufgabe"
                />
                <Button type="submit" variant="outline" disabled={!quick.trim()}>
                  <Plus className="size-4" />
                </Button>
              </form>

              <div className="px-5 pb-5 pt-3">
                {openTasks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Keine eigenen Aufgaben offen.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {openTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onToggle={() => toggleTask(t.id)}
                        onOpen={() => {
                          setEditingTask(t.id)
                          setTaskOpen(true)
                        }}
                      />
                    ))}
                  </ul>
                )}

                {doneTasks.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowDone((v) => !v)}
                      className="mt-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showDone ? "Erledigte ausblenden" : `${doneTasks.length} erledigt anzeigen`}
                    </button>
                    {showDone && (
                      <ul className="mt-2 space-y-1">
                        {doneTasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            onToggle={() => toggleTask(t.id)}
                            onOpen={() => {
                              setEditingTask(t.id)
                              setTaskOpen(true)
                            }}
                            onDelete={() => {
                              remove("tasks", t.id)
                              toast.success("Aufgabe gelöscht")
                            }}
                          />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        taskId={editingTask}
        defaults={{ kind: "task" }}
      />

      <ChecksDialog open={config} onOpenChange={setConfig} />
    </div>
  )
}

// ── Bausteine ──────────────────────────────────────────────────────────

function CountCard({
  label,
  value,
  hint,
  tint,
  icon,
}: {
  label: string
  value: number
  hint: string
  tint: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: `${tint}1f`, color: tint }}
        >
          {icon}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div
        className="mt-3 font-display text-3xl font-semibold tabular-nums"
        style={{ color: value > 0 ? tint : undefined }}
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}

function FindingRow({
  finding,
  onAdopt,
  onHide,
}: {
  finding: CheckFinding
  onAdopt: () => void
  onHide: () => void
}) {
  const tint = TINT[finding.severity]
  return (
    <div className="flex flex-wrap items-start gap-3 py-3">
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
        style={{ background: `${tint}1f`, color: tint }}
        title={SEVERITY_LABEL[finding.severity]}
      >
        {SEV_ICON[finding.severity]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium">{finding.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{finding.detail}</p>
      </div>
      <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
        <Button variant="ghost" size="sm" onClick={onAdopt} title="Als eigene Aufgabe übernehmen">
          <Plus className="size-3.5" /> Aufgabe
        </Button>
        <Button variant="ghost" size="sm" onClick={onHide} title="Diesen Punkt dauerhaft ausblenden">
          <EyeOff className="size-3.5" />
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={finding.href}>
            Öffnen <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onOpen,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onOpen: () => void
  onDelete?: () => void
}) {
  const done = task.status === "done"
  const overdue = !done && isOverdue(task.due)
  return (
    <li className="flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-white/[0.03]">
      <button
        onClick={onToggle}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
          done
            ? "border-[#2fd3a5]/40 bg-[#2fd3a5]/20 text-[#3ee3b5]"
            : task.status === "doing"
              ? "border-brand-cyan/50 bg-brand-cyan/15"
              : "border-white/15 hover:border-white/30",
        )}
      >
        {done && <Check className="size-3.5" />}
        {task.status === "doing" && (
          <span className="size-1.5 rounded-full bg-brand-cyan" />
        )}
      </button>
      <button
        onClick={onOpen}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm",
          done && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </button>
      {task.due && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            overdue ? "text-[#ff7a7a]" : "text-muted-foreground",
          )}
        >
          {dateDE(task.due)}
        </span>
      )}
      {onDelete && (
        <Button variant="ghost" size="xs" onClick={onDelete} aria-label="Aufgabe löschen">
          <RotateCcw className="size-3" />
        </Button>
      )}
    </li>
  )
}

/** Einstellungen: jede Prüfung an/aus, Fristen in Tagen, ausgeblendete
 *  Einzelpunkte zurückholen. Alles landet in den Firmeneinstellungen. */
function ChecksDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { db, updateSettings } = useStore()
  const s = db.settings
  const hidden = s.checksHidden ?? []

  function toggle(id: string) {
    updateSettings({ checks: { ...(s.checks ?? {}), [id]: !ruleActive(id, s) } })
  }
  function setDays(id: string, days: number) {
    updateSettings({ checkDays: { ...(s.checkDays ?? {}), [id]: days } })
  }

  const areas = AREA_ORDER.filter((a) => CHECK_RULES.some((r) => r.area === a))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prüfungen einstellen</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {areas.map((area) => (
            <div key={area}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {area}
              </p>
              <div className="space-y-2">
                {CHECK_RULES.filter((r) => r.area === area).map((r) => {
                  const on = ruleActive(r.id, s)
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          role="switch"
                          aria-checked={on}
                          aria-label={`${r.label} ${on ? "aktiv" : "aus"}`}
                          onClick={() => toggle(r.id)}
                          className={cn(
                            "mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors",
                            on ? "bg-brand-cyan/70" : "bg-white/12",
                          )}
                        >
                          <span
                            className={cn(
                              "block size-4 rounded-full bg-white transition-transform",
                              on && "translate-x-4",
                            )}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{r.label}</p>
                            <Badge
                              variant={
                                r.severity === "critical"
                                  ? "danger"
                                  : r.severity === "warning"
                                    ? "warning"
                                    : "muted"
                              }
                            >
                              {SEVERITY_LABEL[r.severity]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {r.description}
                          </p>
                          {r.threshold && on && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {r.threshold.label}
                              </span>
                              <Input
                                type="number"
                                min={r.threshold.min}
                                max={r.threshold.max}
                                value={ruleDays(r, s)}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  if (!Number.isFinite(v)) return
                                  setDays(
                                    r.id,
                                    Math.min(
                                      r.threshold!.max,
                                      Math.max(r.threshold!.min, Math.round(v)),
                                    ),
                                  )
                                }}
                                className="h-8 w-20 tabular-nums"
                              />
                              <span className="text-xs text-muted-foreground">
                                {r.threshold.suffix}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {hidden.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-sm font-medium">
                {hidden.length} ausgeblendete{hidden.length === 1 ? "r" : ""} Punkt
                {hidden.length === 1 ? "" : "e"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hidden
                  .map((id) => RULE_BY_ID.get(id.split(":")[0])?.label ?? id)
                  .join(" · ")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5"
                onClick={() => {
                  updateSettings({ checksHidden: [] })
                  toast.success("Ausgeblendete Punkte zurückgeholt")
                }}
              >
                <RotateCcw className="size-3.5" /> Alle zurückholen
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="brand">Fertig</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
