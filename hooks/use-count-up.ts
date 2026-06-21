"use client"

import * as React from "react"

/** Animates from 0 → value once mounted, easing out. */
export function useCountUp(value: number, duration = 900) {
  const [display, setDisplay] = React.useState(0)
  const raf = React.useRef<number | null>(null)

  React.useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [value, duration])

  return display
}
