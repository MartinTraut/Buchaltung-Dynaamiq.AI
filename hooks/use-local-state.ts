"use client"

import * as React from "react"

/**
 * useState, das seinen Wert in localStorage spiegelt (für Dashboard-Vorlieben
 * wie sichtbare KPIs / Chart-Serien). SSR-sicher: startet mit `initial`,
 * liest den gespeicherten Wert erst nach dem Mount.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(initial)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) setState(JSON.parse(raw) as T)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [key])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [key, state, hydrated])

  return [state, setState] as const
}
