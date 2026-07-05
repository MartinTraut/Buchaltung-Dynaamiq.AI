"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"
import { StatPill } from "@/components/ui/misc"
import { MiniSpark } from "@/components/charts"

export function KpiCard({
  label,
  value,
  format,
  delta,
  spark,
  sparkColor,
  icon,
  accent = "#1f7bf2",
  delay = 0,
}: {
  label: string
  value: number
  format: (n: number) => string
  delta?: number
  spark?: number[]
  sparkColor?: string
  icon?: React.ReactNode
  accent?: string
  delay?: number
}) {
  const animated = useCountUp(value)
  return (
    <div
      className="glass glass-hover animate-rise relative overflow-hidden rounded-2xl p-7"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className="grid size-11 place-items-center rounded-xl [&>svg]:size-5"
              style={{ background: `${accent}1a`, color: accent }}
            >
              {icon}
            </span>
          )}
          <span className="text-[13px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {label}
          </span>
        </div>
        {typeof delta === "number" && <StatPill delta={delta} />}
      </div>

      <div className="mt-5 font-display text-[40px] leading-none font-bold tracking-tight tnum">
        {format(animated)}
      </div>

      {spark && (
        <div className="mt-3 -mb-1">
          <MiniSpark data={spark} color={sparkColor ?? accent} />
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
