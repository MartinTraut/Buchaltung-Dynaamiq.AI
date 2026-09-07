import * as React from "react"
import { cn } from "@/lib/utils"

// text-base auf Phone (≥16px) verhindert den iOS-Auto-Zoom beim Fokussieren
const fieldBase =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus:border-brand-cyan/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-brand-cyan/15 disabled:opacity-50 md:text-sm"

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

/**
 * `autoGrow` lässt das Feld mit seinem Inhalt wachsen. In den Belegmasken
 * stehen mehrzeilige Texte — Leistungsbeschreibungen, Klauseln, Erläuterungen.
 * Mit fester Höhe ist genau der Teil abgeschnitten, den man prüfen will.
 */
function Textarea({
  className,
  autoGrow,
  ...props
}: React.ComponentProps<"textarea"> & { autoGrow?: boolean }) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || !autoGrow) return
    // Erst zurücksetzen, sonst wächst die Höhe nur, schrumpft aber nie.
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [autoGrow, props.value])

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        fieldBase,
        "min-h-20 leading-relaxed",
        autoGrow ? "resize-none overflow-hidden" : "resize-y",
        className,
      )}
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
