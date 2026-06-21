"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("mb-6 flex flex-wrap items-center gap-3", className)}
    >
      {children}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Suchen…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 transition-colors focus-within:border-brand-pink/40 sm:max-w-sm">
      <Search className="size-[18px] shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  )
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-medium transition-all",
              active
                ? "bg-white/[0.08] text-foreground ring-1 ring-white/15"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] tnum",
                  active ? "bg-brand-pink/20 text-brand-pink" : "bg-white/10 text-muted-foreground",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
