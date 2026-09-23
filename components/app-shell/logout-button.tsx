"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Abmelden — löscht die Sitzung auf dem Server.
 *
 * Das Cookie ist `httpOnly` und lässt sich vom Browser aus nicht anfassen;
 * deshalb muss der Server es löschen. Anschließend `refresh()`, sonst zeigt
 * der Routen-Zwischenspeicher das Cockpit weiter an, obwohl die Sitzung weg ist.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
        router.replace("/login")
        router.refresh()
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="size-[18px] shrink-0" />
      <span>{busy ? "Wird abgemeldet…" : "Abmelden"}</span>
    </button>
  )
}
