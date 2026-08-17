import * as React from "react"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"

export function Avatar({
  name,
  className,
  tint,
}: {
  name: string
  className?: string
  tint?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
        className,
      )}
      style={{
        background:
          tint ??
          "linear-gradient(135deg, var(--brand-cyan), var(--brand-indigo-deep))",
      }}
    >
      {initials(name) || "?"}
    </span>
  )
}

export function Progress({
  value,
  className,
  tint = "var(--brand-gradient)",
}: {
  value: number
  className?: string
  tint?: string
}) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-white/8",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background:
            tint === "var(--brand-gradient)"
              ? "linear-gradient(90deg, var(--brand-cyan), var(--brand-blue))"
              : tint,
        }}
      />
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/8", className)} />
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      {icon && (
        <div className="grid size-12 place-items-center rounded-2xl bg-white/[0.04] text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-sm font-semibold">{title}</p>
        {hint && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function StatPill({
  delta,
  className,
}: {
  delta: number
  className?: string
}) {
  // Bei ±0 ist weder ein grüner noch ein roter Pfeil ehrlich — neutral zeigen.
  const zero = Math.abs(delta) < 0.05
  const up = delta > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tnum",
        zero
          ? "bg-white/[0.07] text-muted-foreground"
          : up
            ? "bg-[#2fd3a5]/12 text-[#3ee3b5]"
            : "bg-[#ff4d4d]/12 text-[#ff7a7a]",
        className,
      )}
    >
      {zero ? "±" : up ? "▲" : "▼"}{" "}
      {Math.abs(delta).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
    </span>
  )
}
