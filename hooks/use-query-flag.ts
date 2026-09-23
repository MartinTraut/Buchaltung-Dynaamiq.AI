"use client"

import * as React from "react"

/**
 * Einmaliges Auslesen von Werten aus der Adresszeile (Deep-Links wie
 * `/crm?c=abc` oder `/invoices?new=1`), ohne eine Suspense-Grenze zu erzwingen.
 *
 * Gelesen wird über `useSyncExternalStore`, nicht über einen Effekt mit
 * `setState`: Beim Serverrendern gibt es keine Adresszeile, beim Hydrieren
 * schon. Genau diesen Fall kennt `useSyncExternalStore` — es rendert erst den
 * Serverwert und wechselt anschließend in einem Zug auf den echten. Ein Effekt
 * hätte stattdessen einen zweiten Renderdurchlauf ausgelöst, bei dem der
 * Dialog sichtbar aufspringt.
 *
 * Das Aufräumen der Adresszeile bleibt im Effekt — es ändert keinen Zustand,
 * sondern die Umgebung, und genau dafür ist ein Effekt da.
 */

/** Der Wert ändert sich nach dem Mount nicht mehr — nichts zu abonnieren. */
const noSubscribe = () => () => {}

/** Parameter aus der Adresszeile entfernen, damit ein Neuladen nicht erneut auslöst. */
function stripParam(key: string) {
  const params = new URLSearchParams(window.location.search)
  if (!params.has(key)) return
  params.delete(key)
  const qs = params.toString()
  window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""))
}

/**
 * Den Wert beim ersten Zugriff festhalten.
 *
 * `getSnapshot` muss bei jedem Aufruf dasselbe liefern. Da die Adresszeile
 * gleich darauf bereinigt wird, läse ein zweiter Aufruf `null` — React sähe
 * eine Änderung und renderte erneut, in einer Schleife.
 */
function useFrozenParam(key: string): string | null {
  const frozen = React.useRef<{ key: string; value: string | null } | null>(null)
  const getSnapshot = React.useCallback(() => {
    if (!frozen.current || frozen.current.key !== key) {
      frozen.current = {
        key,
        value: new URLSearchParams(window.location.search).get(key),
      }
    }
    return frozen.current.value
  }, [key])
  return React.useSyncExternalStore(noSubscribe, getSnapshot, () => null)
}

/** Liest ein Schalter-Flag (`?new=1`) einmalig aus der Adresszeile. */
export function useQueryFlag(key: string, expected = "1"): boolean {
  const raw = useFrozenParam(key)
  const active = raw === expected
  React.useEffect(() => {
    if (active) stripParam(key)
  }, [key, active])
  return active
}

/** Liest einen beliebigen Wert (`?c=<id>`) einmalig aus der Adresszeile. */
export function useQueryValue(key: string): string | null {
  const value = useFrozenParam(key)
  React.useEffect(() => {
    if (value) stripParam(key)
  }, [key, value])
  return value
}
