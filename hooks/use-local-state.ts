"use client"

import * as React from "react"

/**
 * useState, das seinen Wert in localStorage spiegelt (für Dashboard-Vorlieben
 * wie sichtbare KPIs / Chart-Serien).
 *
 * Umgesetzt über `useSyncExternalStore` statt über einen Effekt, der nach dem
 * Mount nachträglich `setState` ruft. Das hat zwei Gründe: React rendert sonst
 * zweimal hintereinander — erst die Vorgabe, dann den gespeicherten Wert, was
 * als Aufblitzen sichtbar ist — und derselbe Schlüssel in zwei Komponenten
 * lief auseinander, weil jede ihren eigenen Zustand hielt. Über den Store
 * sehen alle Aufrufer denselben Wert, und das Serverrendern bekommt sauber die
 * Vorgabe.
 */

type Listener = () => void

/** Wer auf welchen Schlüssel hört — für den Gleichlauf innerhalb des Tabs. */
const listeners = new Map<string, Set<Listener>>()

/**
 * Zuletzt gelesener Rohwert samt Ergebnis des Parsens.
 *
 * `getSnapshot` muss bei unverändertem Speicher dasselbe Objekt zurückgeben.
 * Ohne diesen Zwischenspeicher lieferte jedes `JSON.parse` ein neues Objekt,
 * React sähe bei jedem Durchlauf eine Änderung und renderte endlos.
 */
const parsedCache = new Map<string, { raw: string | null; value: unknown }>()

/**
 * Werte, die nicht gespeichert werden konnten (privater Modus, volles
 * Kontingent). Sie gelten für diese Sitzung, damit ein Klick auf „Zeitstrahl"
 * nicht wirkungslos bleibt — nur überleben sie das Neuladen nicht.
 */
const overrides = new Map<string, unknown>()

function notify(key: string) {
  for (const l of listeners.get(key) ?? []) l()
}

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key)
  if (!set) listeners.set(key, (set = new Set()))
  set.add(listener)
  // Ein zweiter Tab schreibt denselben Schlüssel — `storage` feuert nur dort,
  // wo nicht geschrieben wurde, und hält die Ansicht damit aktuell.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listeners.delete(key)
    window.removeEventListener("storage", onStorage)
  }
}

function readSnapshot<T>(key: string, fallback: T): T {
  if (overrides.has(key)) return overrides.get(key) as T
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    // Privater Modus / gesperrter Speicher — die Vorgabe ist dann die Wahrheit.
    return fallback
  }
  if (raw === null) return fallback
  const hit = parsedCache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  try {
    const value = JSON.parse(raw) as T
    parsedCache.set(key, { raw, value })
    return value
  } catch {
    // Unbrauchbarer Eintrag: als Rohwert merken, damit nicht bei jedem
    // Durchlauf erneut vergeblich geparst wird.
    parsedCache.set(key, { raw, value: fallback })
    return fallback
  }
}

export function useLocalState<T>(key: string, initial: T) {
  // Aufrufer übergeben die Vorgabe oft als Literal (`[]`, `{ … }`), das bei
  // jedem Durchlauf neu entsteht. Als Snapshot wäre das eine Dauer-Änderung,
  // deshalb wird der erste Wert festgehalten.
  const fallback = React.useRef(initial).current

  const value = React.useSyncExternalStore(
    React.useCallback((l: Listener) => subscribe(key, l), [key]),
    React.useCallback(() => readSnapshot(key, fallback), [key, fallback]),
    React.useCallback(() => fallback, [fallback]),
  )

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(readSnapshot(key, fallback))
          : next
      try {
        const raw = JSON.stringify(resolved)
        localStorage.setItem(key, raw)
        parsedCache.set(key, { raw, value: resolved })
        overrides.delete(key)
      } catch {
        // Speichern nicht möglich: Der Wert gilt trotzdem für diese Sitzung.
        overrides.set(key, resolved)
      }
      notify(key)
    },
    [key, fallback],
  )

  return [value, setValue] as const
}
