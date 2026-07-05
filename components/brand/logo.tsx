import { cn } from "@/lib/utils"

/**
 * DYNAAMIQ AI Brand-Assets (in /public, Vektor aus dem Original-Brandmark):
 *  - /logo-mark.svg      → Kreis-Wellen-Marke (Cyan-Verlauf, transparent)
 *  - /logo-wordmark.svg  → "DYNAAMIQ AI" Wordmark (Cyan → Blau → Indigo)
 */

export const BRAND_SUBLINE = "Webdesign & KI-Automatisierung"

export function DynaamiqMark({
  className,
  size = 32,
}: {
  className?: string
  size?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.svg"
      alt="DYNAAMIQ AI"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  )
}

export function DynaamiqLogo({
  className,
  collapsed = false,
  subline = true,
}: {
  className?: string
  collapsed?: boolean
  subline?: boolean
}) {
  if (collapsed) {
    return <DynaamiqMark size={36} className={className} />
  }
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <DynaamiqMark size={38} />
      <span className="flex min-w-0 flex-col gap-[3px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-wordmark.svg"
          alt="DYNAAMIQ AI"
          className="h-[13px] w-auto self-start object-contain"
        />
        {subline && (
          <span className="text-brand-gradient whitespace-nowrap text-[8.5px] font-medium uppercase tracking-[0.14em]">
            {BRAND_SUBLINE}
          </span>
        )}
      </span>
    </span>
  )
}
