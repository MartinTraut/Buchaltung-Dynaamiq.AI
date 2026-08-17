"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  DEFAULT_EVENT_MINUTES,
  dayKey,
  minutesOfTime,
  timeOfMinutes,
  timeRange,
} from "@/lib/format"
import { type Task } from "@/lib/types"

/** Höhe einer Stundenzeile in px — bestimmt die gesamte Rastergeometrie. */
const HOUR_H = 56
const DAY_MIN = 24 * 60
/** Raster, auf das Zeiten beim Ziehen einrasten. */
const SNAP = 15
/** Kürzeste Termindauer, damit ein Block greifbar bleibt. */
const MIN_DURATION = 15
/** Ab dieser Zugstrecke (px) ist es ein Aufziehen und kein Klick. */
const DRAG_THRESHOLD = 4

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export interface TimedChange {
  /** Tag als „YYYY-MM-DD" — Spaltenwechsel beim Verschieben inbegriffen. */
  day: string
  time: string
  endTime: string
}

/** Termin mit gültiger Startzeit — alles andere landet in der Ganztags-Zeile. */
interface Positioned {
  task: Task
  start: number
  end: number
  /** Spalte innerhalb einer Überlappungsgruppe. */
  col: number
  cols: number
}

function isWeekend(d: Date): boolean {
  const wd = d.getDay()
  return wd === 0 || wd === 6
}

function isTimed(t: Task): boolean {
  return minutesOfTime(t.time) !== null
}

function endOf(t: Task, start: number): number {
  const end = minutesOfTime(t.endTime)
  return end !== null && end > start
    ? Math.min(end, DAY_MIN)
    : Math.min(start + DEFAULT_EVENT_MINUTES, DAY_MIN)
}

/**
 * Überlappende Termine nebeneinander legen: Einträge nach Start sortieren,
 * zusammenhängende Gruppen bilden und innerhalb einer Gruppe die erste freie
 * Spalte vergeben. Alle Einträge einer Gruppe teilen sich die Breite.
 */
function layoutDay(tasks: Task[]): Positioned[] {
  const items = tasks
    .filter(isTimed)
    .map((task) => {
      const start = minutesOfTime(task.time)!
      return { task, start, end: endOf(task, start), col: 0, cols: 1 }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  let group: Positioned[] = []
  let groupEnd = -1
  const flush = () => {
    for (const it of group) it.cols = group.length ? Math.max(...group.map((g) => g.col + 1)) : 1
    group = []
    groupEnd = -1
  }

  for (const it of items) {
    if (group.length && it.start >= groupEnd) flush()
    const taken = new Set(group.filter((g) => g.end > it.start).map((g) => g.col))
    let col = 0
    while (taken.has(col)) col++
    it.col = col
    group.push(it)
    groupEnd = Math.max(groupEnd, it.end)
  }
  flush()
  return items
}

type Drag =
  | { mode: "create"; dayIdx: number; anchor: number; cur: number; moved: boolean }
  | { mode: "move"; id: string; dayIdx: number; start: number; duration: number; grab: number }
  | { mode: "resize"; id: string; dayIdx: number; start: number; end: number }

/**
 * Zeitraster für Tages- und Wochenansicht: 24-Stunden-Gitter, Termine nach
 * Uhrzeit und Dauer positioniert, Ganztags-Zeile darüber. Ziehen auf freier
 * Fläche legt einen Termin an, Ziehen eines Blocks verschiebt ihn (auch über
 * Tagesgrenzen), die Unterkante ändert die Dauer.
 */
export function TimeGrid({
  days,
  byDay,
  todayKey,
  colorOf,
  onOpenEntry,
  onCreate,
  onChange,
}: {
  days: Date[]
  byDay: Map<string, Task[]>
  todayKey: string
  colorOf: (t: Task) => string
  onOpenEntry: (id: string) => void
  onCreate: (change: TimedChange) => void
  onChange: (id: string, change: TimedChange) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<Drag | null>(null)
  const [now, setNow] = React.useState(() => new Date())

  const keys = React.useMemo(() => days.map(dayKey), [days])

  // Jetzt-Linie minütlich nachführen.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Beim Öffnen dorthin scrollen, wo etwas passiert: auf die aktuelle Stunde,
  // wenn heute sichtbar ist — sonst an den Beginn der Arbeitszeit.
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const showsToday = keys.includes(todayKey)
    const hour = showsToday ? new Date().getHours() - 1 : 7
    el.scrollTop = Math.max(0, hour * HOUR_H - 12)
    // Nur beim Wechsel des sichtbaren Zeitraums neu ausrichten.
  }, [keys, todayKey])

  const positioned = React.useMemo(
    () => keys.map((k) => layoutDay(byDay.get(k) ?? [])),
    [keys, byDay],
  )
  const allDay = React.useMemo(
    () => keys.map((k) => (byDay.get(k) ?? []).filter((t) => !isTimed(t))),
    [keys, byDay],
  )
  const hasAllDay = allDay.some((l) => l.length > 0)

  /** Zeigergeometrie → Spalte und auf SNAP gerundete Minute. */
  const pointToSlot = (e: React.PointerEvent | PointerEvent) => {
    const el = gridRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const colW = r.width / days.length
    const dayIdx = Math.max(0, Math.min(days.length - 1, Math.floor((e.clientX - r.left) / colW)))
    const raw = ((e.clientY - r.top) / r.height) * DAY_MIN
    return { dayIdx, minute: Math.max(0, Math.min(DAY_MIN, raw)) }
  }

  const snap = (m: number) => Math.round(m / SNAP) * SNAP

  const commit = (d: Drag) => {
    if (d.mode === "create") {
      const a = snap(Math.min(d.anchor, d.cur))
      const b = snap(Math.max(d.anchor, d.cur))
      const start = Math.min(a, DAY_MIN - MIN_DURATION)
      const end = Math.max(b, start + (d.moved ? MIN_DURATION : DEFAULT_EVENT_MINUTES))
      onCreate({
        day: keys[d.dayIdx],
        time: timeOfMinutes(start),
        endTime: timeOfMinutes(Math.min(end, DAY_MIN)),
      })
      return
    }
    if (d.mode === "move") {
      const start = Math.max(0, Math.min(snap(d.start), DAY_MIN - d.duration))
      onChange(d.id, {
        day: keys[d.dayIdx],
        time: timeOfMinutes(start),
        endTime: timeOfMinutes(start + d.duration),
      })
      return
    }
    const end = Math.max(snap(d.end), d.start + MIN_DURATION)
    onChange(d.id, {
      day: keys[d.dayIdx],
      time: timeOfMinutes(d.start),
      endTime: timeOfMinutes(Math.min(end, DAY_MIN)),
    })
  }

  // Ein gemeinsamer Pointer-Handler für Aufziehen, Verschieben und Resize.
  const startDrag = (e: React.PointerEvent, init: Drag) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    let state = init
    setDrag(state)

    const move = (ev: PointerEvent) => {
      const slot = pointToSlot(ev)
      if (!slot) return
      setDrag((prev) => {
        if (!prev) return prev
        const next: Drag =
          prev.mode === "create"
            ? { ...prev, cur: slot.minute, moved: prev.moved || Math.abs(slot.minute - prev.anchor) * (HOUR_H / 60) > DRAG_THRESHOLD }
            : prev.mode === "move"
              ? { ...prev, dayIdx: slot.dayIdx, start: slot.minute - prev.grab }
              : { ...prev, end: slot.minute }
        state = next
        return next
      })
    }
    const cleanup = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      window.removeEventListener("keydown", onKey)
      setDrag(null)
    }
    const up = () => {
      cleanup()
      commit(state)
    }
    // Escape verwirft den Zug, ohne zu speichern.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cleanup()
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    window.addEventListener("keydown", onKey)
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowCol = keys.indexOf(todayKey)

  return (
    // select-none auf dem ganzen Block: sonst markiert das Ziehen im Raster
    // die Wochentags- und Stundenbeschriftungen.
    <div className="glass select-none overflow-x-auto rounded-2xl">
      {/* Bei mehreren Tagen eine Mindestbreite erzwingen: auf dem Phone wird
          die Woche horizontal gescrollt statt auf 45-px-Spalten gequetscht. */}
      <div style={{ minWidth: days.length > 1 ? 56 + days.length * 104 : undefined }}>
      {/* Kopfzeile: Wochentage — bleibt beim Scrollen stehen */}
      <div className="flex border-b border-white/8">
        <div className="w-14 shrink-0 border-r border-white/[0.06]" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
          {days.map((d) => {
            const k = dayKey(d)
            const isToday = k === todayKey
            return (
              <div key={k} className="flex flex-col items-center gap-0.5 py-2">
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide",
                    isWeekend(d) ? "text-muted-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {WEEKDAYS[(d.getDay() + 6) % 7]}
                </span>
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[13px] font-semibold tnum",
                    isToday
                      ? "bg-brand-cyan/15 text-brand-cyan ring-1 ring-brand-cyan/40"
                      : "text-foreground/85",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ganztägig / ohne Uhrzeit */}
      {hasAllDay && (
        <div className="flex border-b border-white/8 bg-white/[0.015]">
          <div className="grid w-14 shrink-0 place-items-center border-r border-white/[0.06] text-[10px] uppercase tracking-wide text-muted-foreground">
            ganztags
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
            {allDay.map((list, i) => (
              <div key={keys[i]} className="flex flex-col gap-1 border-r border-white/[0.05] p-1 last:border-r-0">
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpenEntry(t.id)}
                    title={t.title}
                    className="truncate rounded-md px-1.5 py-[3px] text-left text-[11px] leading-tight transition-[filter] duration-150 hover:brightness-125"
                    style={{
                      background: `${colorOf(t)}20`,
                      boxShadow: `inset 0 0 0 1px ${colorOf(t)}33`,
                    }}
                  >
                    <span className={cn(t.status === "done" && "line-through opacity-60")}>{t.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stundenraster */}
      <div ref={scrollRef} className="max-h-[calc(100dvh-19rem)] min-h-[26rem] overflow-y-auto overscroll-contain">
        <div className="flex">
          {/* Stundenbeschriftung */}
          <div className="w-14 shrink-0 border-r border-white/[0.06]">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative" style={{ height: HOUR_H }}>
                {h > 0 && (
                  <span className="absolute -top-2 right-2 text-[11px] tnum text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Spalten */}
          <div
            ref={gridRef}
            data-calendar-grid=""
            className="relative grid flex-1 touch-pan-y select-none"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`,
              height: 24 * HOUR_H,
            }}
          >
            {/* Stundenlinien über die volle Breite */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {days.map((d, i) =>
                isWeekend(d) || keys[i] === todayKey ? (
                  <div
                    key={keys[i]}
                    className={cn(
                      "absolute inset-y-0",
                      keys[i] === todayKey ? "bg-brand-cyan/[0.035]" : "bg-white/[0.015]",
                    )}
                    style={{ left: `${(i * 100) / days.length}%`, width: `${100 / days.length}%` }}
                  />
                ) : null,
              )}
              {Array.from({ length: 24 }, (_, h) => (
                <React.Fragment key={h}>
                  <div
                    className="absolute inset-x-0 border-t border-white/[0.06]"
                    style={{ top: h * HOUR_H }}
                  />
                  {/* Halbe Stunde nur angedeutet — hilft beim Zielen, ohne zu lärmen */}
                  <div
                    className="absolute inset-x-0 border-t border-white/[0.025]"
                    style={{ top: h * HOUR_H + HOUR_H / 2 }}
                  />
                </React.Fragment>
              ))}
            </div>

            {days.map((d, i) => {
              const k = keys[i]
              const items = positioned[i]
              return (
                <div
                  key={k}
                  className="relative border-r border-white/[0.05] last:border-r-0"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    const slot = pointToSlot(e)
                    if (!slot) return
                    startDrag(e, {
                      mode: "create",
                      dayIdx: i,
                      anchor: slot.minute,
                      cur: slot.minute,
                      moved: false,
                    })
                  }}
                >
                  {items.map(({ task, start, end, col, cols }) => {
                    const color = colorOf(task)
                    const dragging = drag && "id" in drag && drag.id === task.id
                    // Der gezogene Block wird als Vorschau separat gezeichnet.
                    const top = (start / DAY_MIN) * (24 * HOUR_H)
                    const height = Math.max(((end - start) / DAY_MIN) * (24 * HOUR_H), 18)
                    const width = `calc(${100 / cols}% - 4px)`
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "absolute overflow-hidden rounded-lg text-left transition-opacity",
                          dragging && "opacity-30",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${(col * 100) / cols}% + 2px)`,
                          width,
                          background: `${color}22`,
                          boxShadow: `inset 0 0 0 1px ${color}44`,
                        }}
                      >
                        <button
                          onClick={() => onOpenEntry(task.id)}
                          onPointerDown={(e) => {
                            if (e.button !== 0) return
                            e.stopPropagation()
                            const slot = pointToSlot(e)
                            if (!slot) return
                            startDrag(e, {
                              mode: "move",
                              id: task.id,
                              dayIdx: i,
                              start,
                              duration: end - start,
                              grab: slot.minute - start,
                            })
                          }}
                          className="size-full cursor-grab px-1.5 py-1 text-left active:cursor-grabbing"
                        >
                          <span
                            className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg"
                            style={{ background: color }}
                            aria-hidden
                          />
                          <span
                            className={cn(
                              "ml-1.5 block truncate text-[11.5px] font-medium leading-tight",
                              task.status === "done" && "line-through opacity-60",
                            )}
                          >
                            {task.title}
                          </span>
                          {height > 32 && (
                            <span className="ml-1.5 block truncate text-[10.5px] tnum text-muted-foreground">
                              {timeRange(task.time, task.endTime)}
                            </span>
                          )}
                        </button>
                        {/* Unterkante: Dauer ändern */}
                        <div
                          onPointerDown={(e) => {
                            if (e.button !== 0) return
                            e.stopPropagation()
                            startDrag(e, { mode: "resize", id: task.id, dayIdx: i, start, end })
                          }}
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                          aria-hidden
                        />
                      </div>
                    )
                  })}

                  {/* Vorschau während des Ziehens */}
                  {drag && drag.dayIdx === i && <DragPreview drag={drag} />}
                </div>
              )
            })}

            {/* Jetzt-Linie */}
            {nowCol >= 0 && (
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  top: (nowMinutes / DAY_MIN) * (24 * HOUR_H),
                  left: `${(nowCol * 100) / days.length}%`,
                  width: `${100 / days.length}%`,
                }}
                aria-hidden
              >
                <div className="relative h-px bg-brand-cyan/70">
                  <span className="absolute -left-[3px] -top-[3px] size-[7px] rounded-full bg-brand-cyan" />
                  <span className="absolute -top-[9px] right-1 rounded bg-brand-cyan/15 px-1 text-[10px] font-semibold leading-[16px] tnum text-brand-cyan">
                    {timeOfMinutes(nowMinutes)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

/** Halbtransparenter Block, der dem Zeiger folgt, bevor gespeichert wird. */
function DragPreview({ drag }: { drag: Drag }) {
  const [start, end] =
    drag.mode === "create"
      ? [Math.min(drag.anchor, drag.cur), Math.max(drag.anchor, drag.cur)]
      : drag.mode === "move"
        ? [drag.start, drag.start + drag.duration]
        : [drag.start, Math.max(drag.end, drag.start + MIN_DURATION)]

  const snapped = {
    start: Math.round(start / SNAP) * SNAP,
    end: Math.round(end / SNAP) * SNAP,
  }
  const height = Math.max(((snapped.end - snapped.start) / DAY_MIN) * (24 * HOUR_H), 18)

  return (
    <div
      className="pointer-events-none absolute inset-x-[2px] z-20 rounded-lg bg-brand-cyan/20 px-1.5 py-1 ring-1 ring-brand-cyan/50"
      style={{ top: (snapped.start / DAY_MIN) * (24 * HOUR_H), height }}
    >
      <span className="block text-[11px] font-semibold tnum text-brand-cyan">
        {timeOfMinutes(snapped.start)}–{timeOfMinutes(Math.max(snapped.end, snapped.start + MIN_DURATION))}
      </span>
    </div>
  )
}
