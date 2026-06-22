import { cn } from "@/lib/utils"

/**
 * Real Dynaamiq AI brand assets (in /public):
 *  - /logo-mark.png  → icon-only wave mark (transparent)
 *  - /logo-full.png  → full lockup incl. "DYNAAMIQ AI · Performance Marketing"
 */

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
      src="/logo-mark.png"
      alt="Dynaamiq AI"
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
}: {
  className?: string
  collapsed?: boolean
}) {
  if (collapsed) {
    return <DynaamiqMark size={36} className={className} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-full.png"
      alt="Dynaamiq AI — Performance Marketing"
      className={cn("h-9 w-auto object-contain", className)}
    />
  )
}
