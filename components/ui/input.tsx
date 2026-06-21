import * as React from "react"
import { cn } from "@/lib/utils"

const fieldBase =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus:border-brand-pink/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-brand-pink/15 disabled:opacity-50"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldBase, "h-9", className)}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, "min-h-20 resize-y leading-relaxed", className)}
      {...props}
    />
  )
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(fieldBase, "h-9 appearance-none pr-8 [&>option]:bg-[#16161a]", className)}
      {...props}
    >
      {children}
    </select>
  )
}

export { Input, Textarea, Label, Select }
