"use client"

import * as React from "react"

/** Reads a URL query flag once on mount without forcing a Suspense boundary. */
export function useQueryFlag(key: string, expected = "1") {
  const [active, setActive] = React.useState(false)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get(key) === expected) {
      setActive(true)
      // clean the URL so a refresh doesn't re-trigger
      params.delete(key)
      const qs = params.toString()
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      )
    }
  }, [key, expected])
  return active
}

/**
 * Reads an arbitrary URL query value once on mount (e.g. ?c=<id>) and cleans it
 * from the URL, so Deep-Links wie /crm?c=abc oder /invoices?doc=xyz einmalig greifen.
 */
export function useQueryValue(key: string) {
  const [value, setValue] = React.useState<string | null>(null)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const v = params.get(key)
    if (v) {
      setValue(v)
      params.delete(key)
      const qs = params.toString()
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      )
    }
  }, [key])
  return value
}
