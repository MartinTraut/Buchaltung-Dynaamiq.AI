"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  CircleDot,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useLocalState } from "@/hooks/use-local-state"
import { dayKey, fromDateInput, minutesOfTime, timeRange } from "@/lib/format"
import { TASK_KIND_LABEL, type Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Segmented } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/misc"
import { Toolbar } from "@/components/page-toolbar"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { TimeGrid, type TimedChange } from "@/components/calendar/time-grid"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const NEUTRAL = "#6c7693"
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

type View = "month" | "week" | "day" | "list"

/** Termine/Aufgaben eines Tages chronologisch: Einträge mit Uhrzeit zuerst. */
function sortEntries(a: Task, b: Task): number {
  const ta = minutesOfTime(a.time) ?? 24 * 60 + 1
  const tb = minutesOfTime(b.time) ?? 24 * 60 + 1
  return ta === tb ? a.title.localeCompare(b.title) : ta - tb
}

/** ISO-8601-Kalenderwoche (Woche mit dem ersten Donnerstag). */
function isoWeek(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const first = new Date(t.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7,
    )
  )
}

function isDesktop() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
}

export default function CalendarPage() {
  const { db, upsertTask } = useStore()
  const reduce = useReducedMotion()
  const [view, setView] = useLocalState<View>("dyn-calendar-view", "month")
  const [anchor, setAnchor] = React.useState<Date>(() => new Date())
  const [dialog, setDialog] = React.useState<{
    open: boolean
    taskId?: string | null
    defaults?: Partial<Task>
  }>({ open: false })
  const [sheetDay, setSheetDay] = React.useState<string | null>(null)

  const colorOf = React.useCallback(
    (t: Task) =>
      (t.projectId && db.projects.find((p) => p.id === t.projectId)?.color) || NEUTRAL,
    [db.projects],
  )

  const todayKey = dayKey(new Date())

  // Alle datierten Einträge nach Tag gruppieren.
  const byDay = React.useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of db.tasks) {
      if (!t.due) continue
      const k = dayKey(t.due)
      const arr = m.get(k)
      if (arr) arr.push(t)
      else m.set(k, [t])
    }
    for (const arr of m.values()) arr.sort(sortEntries)
    return m
  }, [db.tasks])

  const hasAny = byDay.size > 0

  // ---- Actions ----
  const openNew = (defaults?: Partial<Task>) =>
    setDialog({ open: true, taskId: null, defaults })
  const openEdit = (id: string) => setDialog({ open: true, taskId: id })
  const openDaySheet = (k: string) => setSheetDay(k)

  const onDayClick = (d: Date) => {
    const k = dayKey(d)
    if (isDesktop()) openNew({ due: fromDateInput(k) })
    else openDaySheet(k)
  }

  const shift = (dir: 1 | -1) =>
    setAnchor((a) => {
      const d = new Date(a)
      if (view === "week") d.setDate(d.getDate() + dir * 7)
      else if (view === "day") d.setDate(d.getDate() + dir)
      else d.setMonth(d.getMonth() + dir)
      return d
    })

  // Tastatur wie in gängigen Kalendern: ←/→ blättern, T = heute,
  // M/W/D/L wechseln die Ansicht. Nicht greifen, während getippt wird.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      const views: Record<string, View> = { m: "month", w: "week", d: "day", l: "list" }
      const v = views[e.key.toLowerCase()]
      if (v) return setView(v)
      if (e.key === "ArrowLeft") shift(-1)
      else if (e.key === "ArrowRight") shift(1)
      else if (e.key.toLowerCase() === "t") setAnchor(new Date())
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  /** Aufziehen im Raster: Dialog mit vorbelegter Spanne öffnen. */
  const onGridCreate = (c: TimedChange) =>
    openNew({
      kind: "event",
      due: fromDateInput(c.day),
      time: c.time,
      endTime: c.endTime,
    })

  /** Verschieben/Resize im Raster: direkt speichern, kein Dialog. */
  const onGridChange = (id: string, c: TimedChange) =>
    upsertTask({
      id,
      kind: "event",
      due: fromDateInput(c.day),
      time: c.time,
      endTime: c.endTime,
    })

  // ---- Titel je View ----
  const weekStart = React.useMemo(() => {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7))
    d.setHours(0, 0, 0, 0)
    return d
  }, [anchor])

  const weekDays = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        return d
      }),
    [weekStart],
  )

  const title =
    view === "list"
      ? "Agenda"
      : view === "day"
        ? anchor.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
      : view === "week"
        ? (() => {
            const end = new Date(weekStart)
            end.setDate(weekStart.getDate() + 6)
            const sameMonth = weekStart.getMonth() === end.getMonth()
            const m = (x: Date) => x.toLocaleDateString("de-DE", { month: "short" }).replace(".", "")
            return sameMonth
              ? `${weekStart.getDate()}.–${end.getDate()}. ${m(end)} ${end.getFullYear()}`
              : `${weekStart.getDate()}. ${m(weekStart)} – ${end.getDate()}. ${m(end)} ${end.getFullYear()}`
          })()
        : anchor.toLocaleDateString("de-DE", { month: "long", year: "numeric" })

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar className="mb-5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Zurück"
            onClick={() => shift(-1)}
            className={view === "list" ? "hidden" : ""}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Vor"
            onClick={() => shift(1)}
            className={view === "list" ? "hidden" : ""}
          >
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setAnchor(new Date())}>
            Heute
          </Button>
          <h2 className="ml-1 font-display text-[clamp(1.15rem,0.9rem+1vw,1.6rem)] font-bold capitalize leading-none tracking-tight">
            {title}
          </h2>
          {view === "week" && (
            <span className="hidden rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-medium tnum text-muted-foreground sm:inline">
              KW {isoWeek(weekStart)}
            </span>
          )}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <Segmented
            className="max-sm:min-w-0 max-sm:overflow-x-auto"
            value={view}
            onChange={setView}
            options={[
              { id: "month", label: "Monat" },
              { id: "week", label: "Woche" },
              { id: "day", label: "Tag" },
              { id: "list", label: "Liste" },
            ]}
          />
          <Button
            variant="brand"
            size="lg"
            aria-label="Termin anlegen"
            className="shrink-0 gap-1.5 max-sm:aspect-square max-sm:px-0"
            onClick={() => openNew({ kind: "event", due: fromDateInput(todayKey) })}
          >
            <Plus className="size-4" />
            <span className="max-sm:hidden">Termin</span>
          </Button>
        </div>
      </Toolbar>

      {!hasAny && view === "list" ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="Noch nichts geplant"
          hint="Lege deinen ersten Termin oder eine Aufgabe mit Datum an — sie erscheinen sofort im Kalender."
          action={
            <Button
              variant="brand"
              className="gap-1.5"
              onClick={() => openNew({ kind: "event", due: fromDateInput(todayKey) })}
            >
              <Plus className="size-4" /> Termin anlegen
            </Button>
          }
        />
      ) : view === "month" ? (
        <MonthView
          anchor={anchor}
          byDay={byDay}
          todayKey={todayKey}
          colorOf={colorOf}
          reduce={!!reduce}
          onDayClick={onDayClick}
          onEntry={openEdit}
          onMore={openDaySheet}
        />
      ) : view === "week" || view === "day" ? (
        <motion.div
          key={view}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <TimeGrid
            days={view === "week" ? weekDays : [anchor]}
            byDay={byDay}
            todayKey={todayKey}
            colorOf={colorOf}
            onOpenEntry={openEdit}
            onCreate={onGridCreate}
            onChange={onGridChange}
          />
        </motion.div>
      ) : (
        <AgendaView
          tasks={db.tasks}
          todayKey={todayKey}
          colorOf={colorOf}
          reduce={!!reduce}
          onEntry={openEdit}
        />
      )}

      <TaskDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        taskId={dialog.taskId}
        defaults={dialog.defaults}
      />

      <DaySheet
        dayK={sheetDay}
        entries={sheetDay ? byDay.get(sheetDay) ?? [] : []}
        colorOf={colorOf}
        onClose={() => setSheetDay(null)}
        onEntry={(id) => {
          setSheetDay(null)
          openEdit(id)
        }}
        onAdd={() => {
          const k = sheetDay
          setSheetDay(null)
          if (k) openNew({ due: fromDateInput(k) })
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chip / Dot                                                          */
/* ------------------------------------------------------------------ */

function EntryChip({
  t,
  color,
  onClick,
}: {
  t: Task
  color: string
  onClick: (e: React.MouseEvent) => void
}) {
  const done = t.status === "done"
  return (
    <button
      onClick={onClick}
      title={t.title}
      className="flex w-full items-center gap-1 rounded-md px-1.5 py-[3px] text-left text-[11px] leading-tight transition-[filter,transform] duration-150 hover:brightness-125 active:scale-[0.97]"
      style={{ background: `${color}20`, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {t.time && (
        <span className="shrink-0 tnum text-[10px] text-muted-foreground">{t.time}</span>
      )}
      <span
        className={cn(
          "truncate text-foreground/90",
          done && "text-muted-foreground line-through opacity-60",
        )}
      >
        {t.title}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Month                                                               */
/* ------------------------------------------------------------------ */

function MonthView({
  anchor,
  byDay,
  todayKey,
  colorOf,
  reduce,
  onDayClick,
  onEntry,
  onMore,
}: {
  anchor: Date
  byDay: Map<string, Task[]>
  todayKey: string
  colorOf: (t: Task) => string
  reduce: boolean
  onDayClick: (d: Date) => void
  onEntry: (id: string) => void
  onMore: (k: string) => void
}) {
  const days = React.useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [anchor])

  const month = anchor.getMonth()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="glass overflow-hidden rounded-2xl"
    >
      {/* Wochentage */}
      <div className="grid grid-cols-7 border-b border-white/8">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Tageszellen */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const k = dayKey(d)
          const entries = byDay.get(k) ?? []
          const inMonth = d.getMonth() === month
          const isToday = k === todayKey
          const shown = entries.slice(0, 3)
          const rest = entries.length - shown.length
          return (
            <div
              key={k}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(d)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onDayClick(d)
              }}
              className={cn(
                "group relative min-h-[92px] cursor-pointer border-b border-r border-white/[0.05] p-1.5 outline-none transition-colors sm:min-h-[116px]",
                "hover:bg-white/[0.025] focus-visible:bg-white/[0.03]",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "opacity-40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[12px] font-semibold tnum",
                    isToday
                      ? "bg-brand-cyan/15 text-brand-cyan ring-1 ring-brand-cyan/40"
                      : "text-foreground/80",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>

              {/* Desktop: Chips */}
              <div className="mt-1 hidden flex-col gap-1 sm:flex">
                {shown.map((t) => (
                  <EntryChip
                    key={t.id}
                    t={t}
                    color={colorOf(t)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEntry(t.id)
                    }}
                  />
                ))}
                {rest > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMore(k)
                    }}
                    className="px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{rest} mehr
                  </button>
                )}
              </div>

              {/* Mobile: farbige Punkte */}
              {entries.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
                  {entries.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        t.status === "done" && "opacity-40",
                      )}
                      style={{ background: colorOf(t) }}
                    />
                  ))}
                  {entries.length > 4 && (
                    <span className="text-[9px] leading-none text-muted-foreground">
                      +{entries.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Agenda / List                                                       */
/* ------------------------------------------------------------------ */

function AgendaView({
  tasks,
  todayKey,
  colorOf,
  reduce,
  onEntry,
}: {
  tasks: Task[]
  todayKey: string
  colorOf: (t: Task) => string
  reduce: boolean
  onEntry: (id: string) => void
}) {
  const { overdue, groups } = React.useMemo(() => {
    const withDue = tasks.filter((t) => t.due)
    const overdue = withDue
      .filter((t) => dayKey(t.due!) < todayKey && t.status !== "done")
      .sort((a, b) => (dayKey(a.due!) < dayKey(b.due!) ? -1 : 1))
    const upcoming = withDue
      .filter((t) => dayKey(t.due!) >= todayKey)
      .sort((a, b) => {
        const ka = dayKey(a.due!)
        const kb = dayKey(b.due!)
        return ka === kb ? sortEntries(a, b) : ka < kb ? -1 : 1
      })
    const groups: { k: string; date: Date; items: Task[] }[] = []
    for (const t of upcoming) {
      const k = dayKey(t.due!)
      const last = groups[groups.length - 1]
      if (last && last.k === k) last.items.push(t)
      else groups.push({ k, date: new Date(t.due!), items: [t] })
    }
    return { overdue, groups }
  }, [tasks, todayKey])

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="space-y-6"
    >
      {overdue.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#ff5c5c]" />
            <h3 className="text-[13px] font-semibold text-[#ff7a7a]">Überfällig</h3>
          </div>
          <div className="glass divide-y divide-white/[0.05] overflow-hidden rounded-2xl">
            {overdue.map((t) => (
              <AgendaRow key={t.id} t={t} color={colorOf(t)} onClick={() => onEntry(t.id)} overdue />
            ))}
          </div>
        </div>
      )}

      {groups.map(({ k, date, items }) => (
        <div key={k}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="font-display text-[15px] font-semibold capitalize">
              {k === todayKey
                ? "Heute"
                : date.toLocaleDateString("de-DE", { weekday: "long" })}
            </h3>
            <span className="text-[13px] text-muted-foreground">
              {date.toLocaleDateString("de-DE", { day: "numeric", month: "long" })}
            </span>
          </div>
          <div className="glass divide-y divide-white/[0.05] overflow-hidden rounded-2xl">
            {items.map((t) => (
              <AgendaRow key={t.id} t={t} color={colorOf(t)} onClick={() => onEntry(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

function AgendaRow({
  t,
  color,
  onClick,
  overdue,
}: {
  t: Task
  color: string
  onClick: () => void
  overdue?: boolean
}) {
  const done = t.status === "done"
  const isEvent = t.kind === "event"
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] active:scale-[0.995]"
    >
      <span
        className="grid w-14 shrink-0 justify-items-center gap-0.5 text-center"
        aria-hidden
      >
        {t.time ? (
          <span className="text-[12px] font-semibold leading-tight tnum text-foreground/90">
            {timeRange(t.time, t.endTime).replace("–", "–​")}
          </span>
        ) : (
          <span className="grid size-6 place-items-center rounded-lg bg-white/[0.05] text-muted-foreground">
            {isEvent ? <Clock className="size-3.5" /> : <CircleDot className="size-3.5" />}
          </span>
        )}
      </span>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
          {t.title}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {TASK_KIND_LABEL[t.kind ?? "task"]}
          {t.assignee ? ` · ${t.assignee}` : ""}
        </p>
      </div>
      {overdue ? (
        <Badge variant="danger">Überfällig</Badge>
      ) : done ? (
        <Badge variant="success">Erledigt</Badge>
      ) : (
        <Badge variant="muted">{t.status === "doing" ? "In Arbeit" : "Offen"}</Badge>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Day sheet (Mobile-Tap auf Tag)                                      */
/* ------------------------------------------------------------------ */

function DaySheet({
  dayK,
  entries,
  colorOf,
  onClose,
  onEntry,
  onAdd,
}: {
  dayK: string | null
  entries: Task[]
  colorOf: (t: Task) => string
  onClose: () => void
  onEntry: (id: string) => void
  onAdd: () => void
}) {
  const date = dayK ? new Date(`${dayK}T00:00:00`) : null
  return (
    <Dialog open={!!dayK} onOpenChange={(o) => !o && onClose()}>
      {date && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {date.toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {entries.length === 0 && (
              <p className="px-1 py-4 text-sm text-muted-foreground">
                Keine Einträge an diesem Tag.
              </p>
            )}
            {entries.map((t) => (
              <button
                key={t.id}
                onClick={() => onEntry(t.id)}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorOf(t) }} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      t.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {t.time ? `${timeRange(t.time, t.endTime)} · ` : ""}
                    {TASK_KIND_LABEL[t.kind ?? "task"]}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <Button variant="outline" className="mt-1 gap-1.5" onClick={onAdd}>
            <Plus className="size-4" /> Eintrag hinzufügen
          </Button>
        </DialogContent>
      )}
    </Dialog>
  )
}
