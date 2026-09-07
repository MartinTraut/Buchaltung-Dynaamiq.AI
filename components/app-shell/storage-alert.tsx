"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useStore } from "@/lib/store"

/**
 * Warnleiste, wenn der Browserspeicher das Schreiben ablehnt.
 *
 * Vorher wurde dieser Fall stillschweigend verworfen — man hätte einen halben
 * Tag lang Rechnungen erfasst und beim Neuladen nichts davon wiedergefunden.
 * Die Leiste steht deshalb über allem, ist nicht wegklickbar und führt direkt
 * zur Sicherung.
 */
export function StorageAlert() {
  const { storageError } = useStore()
  if (!storageError) return null
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 border-b border-[#ff4d4d]/30 bg-[#ff4d4d]/12 px-4 py-2.5 text-[13px] text-[#ffb3b3] sm:px-5 lg:px-8"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{storageError}</span>
      <Link
        href="/settings"
        className="shrink-0 rounded-md border border-[#ff4d4d]/40 px-2.5 py-1 font-semibold text-white transition hover:bg-[#ff4d4d]/20"
      >
        Jetzt sichern
      </Link>
    </div>
  )
}
