"use client"

import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { useStore } from "@/lib/store"
import { dateDE } from "@/lib/format"
import type { OnboardingSession } from "@/lib/types"

type Slot = keyof NonNullable<OnboardingSession["created"]>

/**
 * Verweis auf das Gespräch, aus dem ein Datensatz entstanden ist.
 *
 * Vorher stand in Kundennotiz, Deal-Vermerk und Projektbeschreibung das
 * vollständige Frage-Antwort-Protokoll — dreimal dieselbe Liste, an Stellen,
 * an denen man wissen will, worum es geht, nicht, welche Fragen gestellt
 * wurden. Jetzt steht dort die Zusammenfassung, und dieser Verweis führt zum
 * vollständigen Protokoll.
 *
 * Die Zuordnung wird gesucht statt gespeichert: sie steht bereits in der
 * Gesprächsakte (`created`). Ein zweites Feld am Datensatz wäre eine zweite
 * Wahrheit, die auseinanderlaufen kann.
 */
export function ProtocolLink({ slot, id }: { slot: Slot; id?: string }) {
  const { db } = useStore()
  if (!id) return null
  const session = db.onboardings.find((s) => s.created?.[slot] === id)
  if (!session) return null
  return (
    <Link
      href={`/onboarding?doc=${session.id}`}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
    >
      <ClipboardList className="size-3.5 shrink-0" />
      Gesprächsprotokoll vom {dateDE(session.createdAt)}
    </Link>
  )
}
