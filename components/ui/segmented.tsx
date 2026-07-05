"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * iOS-Segmented-Control mit gleitender Pill (motion layoutId).
 * Für View-Umschalter — Status-Filter bleiben FilterChips.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: React.ReactNode; ariaLabel?: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  // Pro Instanz eindeutige layoutId — sonst springt die Pill zwischen Instanzen
  const id = React.useId()
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-white/[0.06] p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative h-9 rounded-full px-4 text-[13.5px] font-medium transition-[color,transform] duration-150 ease-out active:scale-95",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-pill-${id}`}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 40 }
                }
                className="absolute inset-0 rounded-full bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
