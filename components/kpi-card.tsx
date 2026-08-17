"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"
import { StatPill } from "@/components/ui/misc"
import { MiniSpark } from "@/components/charts"

export function KpiCard({
  label,
  hint,
  value,
  format,
  delta,
  deltaLabel = "vs. Vormonat",
  spark,
  sparkColor,
  icon,
  accent = "#1f7bf2",
  delay = 0,
}: {
  label: string
  /** Zeitbezug o. Ä. — steht klein unter dem Label statt es umbrechen zu lassen. */
  hint?: string
  value: number
  format: (n: number) => string
  delta?: number
  deltaLabel?: string
  spark?: number[]
  sparkColor?: string
  icon?: React.ReactNode
  accent?: string
  delay?: number
}) {
  const animated = useCountUp(value)
  // Eine Linie aus lauter gleichen Werten ist keine Information, sondern ein
  // Strich — in dem Fall lieber nichts zeigen.
  const sparkVaries = !!spark && spark.length > 1 && new Set(spark).size > 1

  return (
    <div
      className="glass glass-hover animate-rise group relative flex min-h-[172px] flex-col overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Akzentschimmer aus der oberen Ecke — gibt der Karte Tiefe, ohne Rahmen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 size-44 rounded-full opacity-[0.16] blur-[46px] transition-opacity duration-300 group-hover:opacity-[0.26]"
        style={{ background: accent }}
      />
      {/* Akzent-Hairline an der Oberkante — verankert die Karte farblich,
          auch wenn Wert und Sparkline (noch) nichts hergeben */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 68%)` }}
      />

      <div className="relative flex items-start gap-3">
        {icon && (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset [&>svg]:size-[18px]"
            style={{
              background: `${accent}16`,
              color: accent,
              boxShadow: `inset 0 0 0 1px ${accent}2e`,
            }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[11.5px] font-semibold uppercase leading-tight tracking-[0.13em] text-muted-foreground">
            {label}
          </p>
          {hint && (
            <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground/60">
              {hint}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-auto pt-6">
        {/* Nullwerte gedämpft: vier leuchtende 0,00 € nebeneinander sehen
            nach Fehler aus — der Blick soll zur Kennzahl mit Inhalt gehen. */}
        <div
          className={cn(
            "font-display text-[clamp(1.65rem,1.1rem+1.5vw,2.05rem)] font-bold leading-none tracking-tight tnum",
            value === 0 && "text-foreground/40",
          )}
        >
          {format(animated)}
        </div>

        {/* Zeile bleibt reserviert, auch ohne Delta — sonst sitzen die Beträge
            benachbarter Karten auf unterschiedlicher Höhe. */}
        <div className="mt-2.5 flex min-h-[22px] items-center gap-2">
          {typeof delta === "number" && (
            <>
              <StatPill delta={delta} />
              <span className="truncate text-[11.5px] text-muted-foreground">{deltaLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Verlauf randlos bis an die Kante — ersetzt die frühere Haarlinie */}
      {sparkVaries && (
        <div className={cn("relative -mx-5 -mb-5 mt-4 sm:-mx-6 sm:-mb-6")}>
          <MiniSpark data={spark!} color={sparkColor ?? accent} />
        </div>
      )}
    </div>
  )
}

export function SectionTitle({
  children,
  className,
  action,
}: {
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-foreground/95">
        {children}
      </h2>
      {action}
    </div>
  )
}
