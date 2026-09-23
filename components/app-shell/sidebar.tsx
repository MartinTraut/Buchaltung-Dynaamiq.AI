"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { DynaamiqLogo } from "@/components/brand/logo"
import { NAV, NAV_BOTTOM } from "./nav"
import { useStore } from "@/lib/store"
import { eur, computeTotals } from "@/lib/format"
import { LogoutButton } from "@/components/app-shell/logout-button"

// Akzentfarbe je Bereich → bringt Farbe & klare Trennung in die Navigation
const GROUP_ACCENT: Record<string, string> = {
  Übersicht: "#00ffe6",
  Vertrieb: "#1f7bf2",
  Lieferung: "#2fd3a5",
  Finanzen: "#8b5cf6",
  Automatisierung: "#5b2eff",
}

/**
 * Zeilenhöhe atmet mit der Fensterhöhe: Auf dem 27-Zoll-Monitor stehen die
 * Einträge luftig, auf dem 13-Zoll-MacBook rücken sie zusammen — beides ohne
 * Scrollen, weil alle 16 Module gleichzeitig sichtbar bleiben müssen.
 */
const ROW_PAD = "py-[clamp(3px,0.55vh,9px)]"

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  accent,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  accent: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 text-[clamp(13px,0.7vh+0.6rem,14.5px)] transition-colors duration-200",
        ROW_PAD,
        active
          ? "font-semibold text-white"
          : "font-medium text-foreground/65 hover:text-foreground",
      )}
    >
      {/* Animierter Aktiv-Hintergrund (gleitet zwischen Einträgen) */}
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="absolute inset-0 -z-10 rounded-lg"
          style={{
            background: `linear-gradient(100deg, ${accent}2e, rgba(255,255,255,0.05))`,
            boxShadow: `inset 0 0 0 1px ${accent}3d, 0 8px 24px -12px ${accent}88`,
          }}
        />
      )}
      {/* Hover-Schimmer (nur inaktiv) */}
      {!active && (
        <span className="absolute inset-0 -z-10 rounded-lg bg-white/0 transition-colors duration-200 group-hover:bg-white/[0.05]" />
      )}
      <span
        className="grid size-[clamp(22px,2.85vh,26px)] shrink-0 place-items-center rounded-md transition-all duration-200"
        style={{
          background: active ? `${accent}30` : "transparent",
          color: accent,
        }}
      >
        {/* Auch inaktiv in der Bereichsfarbe, nur gedämpft: So liest man die
            Zugehörigkeit am Icon, ohne die Überschrift zu suchen. */}
        <Icon
          className={cn(
            "size-[clamp(15px,1.9vh,17.5px)] transition-opacity duration-200",
            active ? "opacity-100" : "opacity-55 group-hover:opacity-95",
          )}
        />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { db } = useStore()

  const open = db.invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + computeTotals(i.items).gross, 0)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col overflow-hidden border-r border-white/[0.08] px-3.5 py-[clamp(8px,1.9vh,24px)] backdrop-blur-xl lg:flex">
      {/* Heller, leicht erhöhter Panel-Verlauf + Brand-Glow oben */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#17171d] via-[#131318] to-[#0d0d11]" />
      <div className="absolute -top-24 left-1/2 -z-10 h-48 w-72 -translate-x-1/2 rounded-full bg-brand-cyan/12 blur-3xl" />

      <div className="px-1.5 pb-[clamp(6px,1.7vh,22px)]">
        <DynaamiqLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-[clamp(4px,1vh,14px)]">
        {NAV.map((group, gi) => {
          const accent = GROUP_ACCENT[group.label] ?? "#00ffe6"
          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * gi, duration: 0.32, ease: "easeOut" }}
              className="relative rounded-xl py-[clamp(1px,0.4vh,4px)] pl-2.5"
              // Sehr flache Einfärbung: trennt die Bereiche als Fläche, ohne
              // dass fünf Blöcke miteinander um Aufmerksamkeit streiten.
              style={{ background: `linear-gradient(100deg, ${accent}0d, transparent 70%)` }}
            >
              {/* Farbschiene: markiert den Bereich über seine ganze Höhe */}
              <span
                className="absolute inset-y-1 left-0 w-[2px] rounded-full"
                style={{ background: `linear-gradient(${accent}, ${accent}26)` }}
              />
              <p
                className="mb-0.5 px-2 text-[10.5px] font-semibold tracking-[0.16em] uppercase"
                style={{ color: `${accent}b8` }}
              >
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    accent={accent}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            </motion.div>
          )
        })}
      </nav>

      {/* Offene Forderungen — eine Zeile, damit die Navigation der Platzherr bleibt */}
      <div className="relative mt-[clamp(6px,1.3vh,16px)] flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-[clamp(6px,1vh,11px)]">
        <div className="absolute -right-6 -top-8 size-20 rounded-full bg-brand-cyan/15 blur-2xl" />
        <p className="whitespace-nowrap text-[10px] font-semibold tracking-[0.09em] text-foreground/55 uppercase">
          Offene Forderungen
        </p>
        <p className="font-display text-[clamp(16px,1vh+0.7rem,19px)] font-bold tnum text-brand-gradient">
          {eur(open)}
        </p>
      </div>

      <div className="mt-[clamp(5px,1vh,12px)] flex flex-col gap-1 border-t border-white/[0.06] pt-1.5">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} {...item} accent="#9aa0ac" active={isActive(item.href)} />
        ))}
        <LogoutButton />
      </div>
    </aside>
  )
}
