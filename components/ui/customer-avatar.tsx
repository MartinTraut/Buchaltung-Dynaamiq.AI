"use client"

import * as React from "react"
import { Avatar } from "@/components/ui/misc"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/types"

/**
 * Kundenlogo statt Initialen: Eine Liste echter Firmenmarken ist auf einen
 * Blick lesbar, zwei Buchstaben im Farbverlauf sind es nicht.
 *
 * Quelle in dieser Reihenfolge:
 *  1. `logoUrl` am Kunden — manuell gesetzt, schlägt alles andere
 *  2. Favicon der Firmendomain (Website, sonst E-Mail-Domain)
 *  3. Initialen wie bisher — wenn keine Domain da ist oder das Bild nicht lädt
 */

// Freemailer verraten keine Firma — deren Logo wäre das von GMX, nicht das des Kunden.
const FREEMAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "web.de",
  "gmx.de",
  "gmx.net",
  "t-online.de",
  "outlook.com",
  "outlook.de",
  "hotmail.com",
  "hotmail.de",
  "live.de",
  "yahoo.de",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "freenet.de",
  "posteo.de",
  "mail.de",
])

export function customerDomain(c?: Partial<Customer> | null): string | undefined {
  const raw = c?.website?.trim()
  if (raw) {
    try {
      const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname
      if (host.includes(".")) return host.replace(/^www\./, "").toLowerCase()
    } catch {
      // Unbrauchbare Eingabe („noch keine Website") — dann die E-Mail versuchen.
    }
  }
  const mail = c?.email?.split("@")[1]?.trim().toLowerCase()
  return mail && mail.includes(".") && !FREEMAIL.has(mail) ? mail : undefined
}

export function customerLogo(c?: Partial<Customer> | null): string | undefined {
  const own = c?.logoUrl?.trim()
  if (own) return own
  const domain = customerDomain(c)
  // 128 px, damit die Marke auch im 44-px-Kreis der Listen scharf bleibt.
  return domain
    ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
    : undefined
}

export function CustomerAvatar({
  customer,
  customerId,
  name,
  className,
}: {
  customer?: Partial<Customer> | null
  /** Alternative zum Kunden selbst — wird aus der Kartei nachgeschlagen. */
  customerId?: string
  /** Ersatzname, wenn der Kunde (noch) nicht in der Kartei steht. */
  name?: string
  className?: string
}) {
  const { customerById } = useStore()
  const c = customer ?? customerById(customerId)
  const label = c?.company ?? name ?? "?"
  const src = customerLogo(c)
  if (!src) return <Avatar name={label} className={className} />
  // `key`: Wechselt die Quelle, startet der Ladeversuch neu — ohne Effekt,
  // der den Fehlerzustand zurücksetzt.
  return <LogoAvatar key={src} src={src} name={label} className={className} />
}

function LogoAvatar({
  src,
  name,
  className,
}: {
  src: string
  name: string
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return <Avatar name={name} className={className} />
  return (
    <span
      className={cn(
        // Heller Grund: Die meisten Logos sind für Weiß gezeichnet und
        // verschwinden sonst im dunklen Interface.
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        className,
      )}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        /* Größe in Prozent statt Padding: Prozent-Padding rechnet gegen die
           Breite des Elternblocks, nicht gegen den Kreis — der Avatar wurde
           damit so groß wie die Karte. */
        className="h-[76%] w-[76%] object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
