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
