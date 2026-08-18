import * as React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Leerzustand für Karten, deren Inhalt datenabhängig ist.
 *
 * Ein junges Konto hat naturgemäß leere Listen — die Karte darf dann nicht in
 * sich zusammenfallen oder ein Loch ins Raster reißen. Der Baustein zentriert
 * sich in der verbleibenden Höhe, benennt sachlich, was fehlt, und sagt, wodurch
 * der Zustand endet. Keine Werbesprache, kein „Ups".
 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
  action?: { label: string; href: string }
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center",
        className,
      )}
    >
      {icon && (
        <span className="grid size-11 place-items-center rounded-2xl bg-white/[0.04] text-muted-foreground/60 ring-1 ring-inset ring-white/8 [&>svg]:size-[19px]">
          {icon}
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        {hint && (
          <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-cyan transition-colors hover:bg-white/[0.05]"
        >
          {action.label} <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
