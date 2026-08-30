"use client"

import { girocodeMatrix, type GirocodeInput } from "@/lib/girocode"

/**
 * GiroCode auf dem Beleg — dunkle Module auf weißer Kachel. Umgekehrt (hell auf
 * dunkel) lesen viele Banking-Apps nicht, deshalb bekommt der Code seine eigene
 * weiße Fläche, auch wenn er auf einer dunklen Karte sitzt.
 *
 * Gezeichnet als ein einziger Pfad statt vieler Rechtecke: im Druck sitzt so
 * jedes Modul auf demselben Raster, statt dass Rundungsfehler feine weiße Fugen
 * zwischen benachbarten Modulen stehen lassen.
 */
export function GirocodeQR({
  input,
  size = 88,
}: {
  input: GirocodeInput
  size?: number
}) {
  const matrix = girocodeMatrix(input)
  const n = matrix.length
  // Ruhezone: die Spezifikation verlangt vier Module. Sie gehört in die Grafik,
  // nicht ins Layout — sonst schrumpft sie mit dem nächsten Abstands-Refactor weg.
  const quiet = 4
  const dim = n + quiet * 2

  let d = ""
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`
    }
  }

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      role="img"
      aria-label={`GiroCode: ${input.reference}, ${input.amount.toFixed(2)} Euro`}
      shapeRendering="crispEdges"
      className="block rounded-[4px]"
      style={{ background: "#ffffff" }}
    >
      <path d={d} fill="#16161a" />
    </svg>
  )
}
