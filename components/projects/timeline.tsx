"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  PROJECT_STATUS_LABEL,
  type Project,
  type ProjectStatus,
  type Task,
} from "@/lib/types"

/** Badge-Varianten je Projektstatus — geteilt zwischen Karten- und Zeitstrahl-Ansicht. */
export const PROJECT_STATUS_VARIANT: Record<
  ProjectStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  planning: "violet",
  active: "success",
  on_hold: "warning",
  done: "muted",
  canceled: "danger",
}

const DAY = 86_400_000
const PX_PER_DAY = 5 // ≈ 150px pro Monat
const ROW_H = 56
const BAR_H = 28

/**
 * Projekt-Zeitstrahl im awork/Monday-Stil: horizontale Monatsachse,
 * ein Balken pro Projekt (Start → Fällig), Task-Fortschritt als Füllung,
 * Heute-Marker, sticky Projektspalte, horizontal scrollbar.
 */
export function ProjectTimeline({
  projects,
  tasks,
  customerName,
  onOpen,
}: {
  projects: Project[]
  tasks: Task[]
  customerName: (id: string) => string | undefined
  onOpen: (id: string) => void
}) {
  const reduceMotion = useReducedMotion()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const leftColRef = React.useRef<HTMLDivElement>(null)

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Zeilen chronologisch nach Start — ergibt die typische Kaskade
  const rows = React.useMemo(
    () =>
      [...projects].sort(
        (a, b) =>
          new Date(a.startDate ?? a.createdAt).getTime() -
          new Date(b.startDate ?? b.createdAt).getTime(),
      ),
    [projects],
  )

  // Zeitfenster: min(Start) → max(Fällig), auf volle Monate gerundet, min. 4 Monate
  const { winStart, months, weeks, chartW, todayX } = React.useMemo(() => {
    let min = today.getTime()
    let max = today.getTime()
    for (const p of rows) {
      min = Math.min(min, new Date(p.startDate ?? p.createdAt).getTime())
      if (p.dueDate) max = Math.max(max, new Date(p.dueDate).getTime())
    }
    const winStart = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1)
    let winEnd = new Date(new Date(max).getFullYear(), new Date(max).getMonth() + 1, 1)
    const monthCount =
      (winEnd.getFullYear() - winStart.getFullYear()) * 12 +
      winEnd.getMonth() -
      winStart.getMonth()
    if (monthCount < 4) {
      winEnd = new Date(winStart.getFullYear(), winStart.getMonth() + 4, 1)
    }

    const x = (t: number) => ((t - winStart.getTime()) / DAY) * PX_PER_DAY

    const months: { x: number; w: number; label: string }[] = []
    for (
      let m = new Date(winStart);
      m < winEnd;
      m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    ) {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const short = m.toLocaleDateString("de-DE", { month: "short" }).replace(".", "")
      const withYear = m.getMonth() === 0 || m.getTime() === winStart.getTime()
      months.push({
        x: x(m.getTime()),
        w: x(next.getTime()) - x(m.getTime()),
        label: withYear ? `${short} ${m.getFullYear()}` : short,
      })
    }

    // Wochenlinien (Montage), Monatsanfänge nicht doppeln
    const weeks: number[] = []
    const firstMonday = new Date(winStart)
    firstMonday.setDate(firstMonday.getDate() + (((8 - firstMonday.getDay()) % 7) || 7))
    for (let w = firstMonday; w < winEnd; w = new Date(w.getTime() + 7 * DAY)) {
      if (w.getDate() > 2) weeks.push(x(w.getTime()))
    }

    return {
      winStart,
      months,
      weeks,
      chartW: x(winEnd.getTime()),
      todayX: x(today.getTime()) + PX_PER_DAY / 2,
    }
  }, [rows, today])

  const xOf = React.useCallback(
    (iso: string) =>
      ((new Date(iso).setHours(0, 0, 0, 0) - winStart.getTime()) / DAY) * PX_PER_DAY,
    [winStart],
  )

  // Initial so scrollen, dass „Heute" gut sichtbar liegt
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const leftW = leftColRef.current?.offsetWidth ?? 200
    el.scrollLeft = Math.max(0, todayX - (el.clientWidth - leftW) * 0.38)
  }, [todayX])

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="w-max min-w-full">
          {/* Kopfzeile: Monate */}
          <div className="flex border-b border-white/8">
            <div
              ref={leftColRef}
              className="sticky left-0 z-30 flex h-10 w-[150px] shrink-0 items-center border-r border-white/8 bg-[#151519] px-4 md:w-[248px]"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Projekt
              </span>
            </div>
            <div className="relative h-10 shrink-0" style={{ width: chartW }}>
              {months.map((m) => (
                <span
                  key={m.x}
                  className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  style={{ left: m.x + 10 }}
                >
                  {m.label}
                </span>
              ))}
              <span
                className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c2b28] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-cyan ring-1 ring-[#00ffe6]/25"
                style={{ left: todayX }}
              >
                Heute
              </span>
            </div>
          </div>

          {/* Projektzeilen */}
          {rows.map((p, i) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id)
            const doneCount = pTasks.filter((t) => t.status === "done").length
            const pct = pTasks.length
              ? Math.round((doneCount / pTasks.length) * 100)
              : null
            const openEnd = !p.dueDate
            const startX = Math.max(xOf(p.startDate ?? p.createdAt), 0)
            const endX = openEnd
              ? chartW
              : Math.min(xOf(p.dueDate!) + PX_PER_DAY, chartW)
            const barW = Math.max(endX - startX, BAR_H)
            const overdue =
              !!p.dueDate &&
              new Date(p.dueDate) < today &&
              p.status !== "done" &&
              p.status !== "canceled"
            // Label sitzt links im Balken — dunkler Text, sobald es auf der Füllung liegt
            const labelOnFill = pct !== null && pct >= 22

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpen(p.id)
                  }
                }}
                className="group flex cursor-pointer border-b border-white/[0.05] outline-none transition-[background-color,transform] duration-150 last:border-b-0 hover:bg-white/[0.02] focus-visible:bg-white/[0.03] active:scale-[0.99]"
              >
                {/* Sticky Projektspalte */}
                <div
                  className="sticky left-0 z-20 flex w-[150px] shrink-0 items-center gap-2.5 border-r border-white/8 bg-[#151519] px-4 transition-colors group-hover:bg-[#18181d] md:w-[248px]"
                  style={{ height: ROW_H }}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {p.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {customerName(p.customerId) ?? "—"}
                    </p>
                  </div>
                  <Badge
                    variant={PROJECT_STATUS_VARIANT[p.status]}
                    className="hidden shrink-0 lg:inline-flex"
                  >
                    {PROJECT_STATUS_LABEL[p.status]}
                  </Badge>
                </div>

                {/* Chartbereich */}
                <div
                  className="relative shrink-0"
                  style={{ width: chartW, height: ROW_H }}
                >
                  {months.map((m) => (
                    <span
                      key={m.x}
                      className="absolute inset-y-0 w-px bg-white/[0.06]"
                      style={{ left: m.x }}
                    />
                  ))}
                  {weeks.map((w) => (
                    <span
                      key={w}
                      className="absolute inset-y-0 w-px bg-white/[0.025]"
                      style={{ left: w }}
                    />
                  ))}
                  <span
                    className="absolute inset-y-0 w-px bg-[#00ffe6]/55"
                    style={{ left: todayX }}
                  />

                  {/* Projektbalken */}
                  <motion.div
                    initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 300,
                            damping: 32,
                            delay: 0.05 + i * 0.05,
                          }
                    }
                    className="absolute overflow-hidden rounded-full"
                    style={{
                      left: startX,
                      width: barW,
                      height: BAR_H,
                      top: (ROW_H - BAR_H) / 2,
                      transformOrigin: "left center",
                      background: `${p.color}2e`,
                      boxShadow: `inset 0 0 0 1px ${p.color}45`,
                      ...(openEnd
                        ? {
                            maskImage:
                              "linear-gradient(90deg, black 55%, transparent 98%)",
                            WebkitMaskImage:
                              "linear-gradient(90deg, black 55%, transparent 98%)",
                          }
                        : null),
                    }}
                  >
                    {pct !== null && pct > 0 && (
                      <span
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${p.color}b8, ${p.color})`,
                          borderRadius:
                            pct >= 99 ? 9999 : "9999px 4px 4px 9999px",
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        "absolute left-3 top-1/2 max-w-[80%] -translate-y-1/2 truncate text-[11px] font-semibold tnum",
                        labelOnFill ? "text-[#08080a]" : "text-white/85",
                      )}
                    >
                      {pct !== null ? `${pct} %` : p.name}
                    </span>
                  </motion.div>

                  {/* Überfällig: dezenter roter Punkt am Balkenende */}
                  {overdue && (
                    <span
                      className="absolute z-10 size-2 rounded-full bg-[#ff5c5c] shadow-[0_0_0_3px_rgba(255,77,77,0.22)]"
                      style={{ left: endX - 4, top: ROW_H / 2 - 4 }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
