import { cn } from "@/lib/utils"

/**
 * Dynaamiq AI mark — nested, offset rings that spiral into a single node,
 * echoing the original "dynamic wave" emblem. Pure SVG so it stays crisp.
 *
 * To use the EXACT brand file instead: drop it at public/dynaamiq-mark.png
 * (or .svg) and set `useImage` — see DynaamiqLogo below.
 */
export function DynaamiqMark({
  className,
  size = 32,
}: {
  className?: string
  size?: number
}) {
  const id = "dyn-grad"
  // concentric rings, each tangent near the right edge → vortex / wave swirl
  const rings = [
    { cx: 50, cy: 50, r: 45 },
    { cx: 57, cy: 50, r: 38 },
    { cx: 63, cy: 50, r: 31 },
    { cx: 68, cy: 51, r: 24 },
    { cx: 72, cy: 52, r: 17 },
    { cx: 75, cy: 53, r: 10.5 },
  ]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="6" y1="14" x2="92" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6A00" />
          <stop offset="0.5" stopColor="#FF2D7E" />
          <stop offset="1" stopColor="#E81CCB" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id})`} strokeWidth="2.3">
        {rings.map((r, i) => (
          <circle key={i} cx={r.cx} cy={r.cy} r={r.r} opacity={1 - i * 0.04} />
        ))}
      </g>
      {/* the dynamic node */}
      <circle cx="30.5" cy="52" r="6.6" fill={`url(#${id})`} />
    </svg>
  )
}

export function DynaamiqLogo({
  className,
  collapsed = false,
}: {
  className?: string
  collapsed?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <DynaamiqMark size={36} />
      {!collapsed && (
        <div className="leading-none">
          <div className="font-display text-[16px] font-bold tracking-[0.13em]">
            <span className="text-brand-gradient">DYNAAMIQ</span>{" "}
            <span className="text-foreground">AI</span>
          </div>
          <div className="mt-1.5 text-[9px] font-semibold tracking-[0.34em] text-muted-foreground/80 uppercase">
            Performance Marketing
          </div>
        </div>
      )}
    </div>
  )
}
