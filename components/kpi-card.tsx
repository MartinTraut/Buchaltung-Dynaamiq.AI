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
  accent = "#ff6a00",
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
      className="glass glass-hover animate-rise relative overflow-hidden rounded-2xl p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span
              className="grid size-9 place-items-center rounded-xl"
              style={{ background: `${accent}1a`, color: accent }}
            >
              {icon}
            </span>
          )}
          <span className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </span>
        </div>
        {typeof delta === "number" && <StatPill delta={delta} />}
      </div>

      <div className="mt-4 font-display text-[34px] leading-none font-bold tracking-tight tnum">
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
      <h2 className="font-display text-sm font-semibold tracking-wide text-foreground/90">
        {children}
      </h2>
      {action}
    </div>
  )
}
