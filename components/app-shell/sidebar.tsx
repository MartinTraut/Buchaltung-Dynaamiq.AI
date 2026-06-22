"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { DynaamiqLogo } from "@/components/brand/logo"
import { NAV, NAV_BOTTOM } from "./nav"
import { useStore } from "@/lib/store"
import { eur, computeTotals } from "@/lib/format"

// Akzentfarbe je Bereich → bringt Farbe & klare Trennung in die Navigation
const GROUP_ACCENT: Record<string, string> = {
  Übersicht: "#ff2d7e",
  Vertrieb: "#ff6a00",
  Lieferung: "#2fd3a5",
  Finanzen: "#8b5cf6",
  Automatisierung: "#e81ccb",
}

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
        "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15.5px] transition-colors duration-200",
        active
          ? "font-semibold text-white"
          : "font-medium text-foreground/60 hover:text-foreground",
      )}
    >
      {/* Animierter Aktiv-Hintergrund (gleitet zwischen Einträgen) */}
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="absolute inset-0 -z-10 rounded-xl"
          style={{
            background: `linear-gradient(100deg, ${accent}22, rgba(255,255,255,0.05))`,
            boxShadow: `inset 0 0 0 1px ${accent}33, 0 8px 24px -12px ${accent}88`,
          }}
        >
          <span
            className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full"
            style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
          />
        </motion.span>
      )}
      {/* Hover-Schimmer (nur inaktiv) */}
      {!active && (
        <span className="absolute inset-0 -z-10 rounded-xl bg-white/0 transition-colors duration-200 group-hover:bg-white/[0.05]" />
      )}
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg transition-all duration-200",
          active ? "" : "group-hover:bg-white/[0.04]",
        )}
        style={active ? { background: `${accent}26`, color: accent } : undefined}
      >
        <Icon
          className={cn(
            "size-[20px] transition-colors duration-200",
            active ? "" : "text-foreground/45 group-hover:text-foreground/80",
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
    <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 flex-col overflow-hidden border-r border-white/[0.08] px-4 py-6 backdrop-blur-xl lg:flex">
      {/* Heller, leicht erhöhter Panel-Verlauf + Brand-Glow oben */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#17171d] via-[#131318] to-[#0d0d11]" />
      <div className="absolute -top-24 left-1/2 -z-10 h-48 w-72 -translate-x-1/2 rounded-full bg-brand-pink/12 blur-3xl" />

      <div className="px-2 pb-6">
        <DynaamiqLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
        {NAV.map((group, gi) => {
          const accent = GROUP_ACCENT[group.label] ?? "#ff2d7e"
          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * gi, duration: 0.32, ease: "easeOut" }}
              className={cn(gi > 0 && "border-t border-white/[0.05] pt-4")}
            >
              <p className="mb-2.5 flex items-center gap-2 px-3 text-[11.5px] font-semibold tracking-[0.14em] text-foreground/45 uppercase">
                <span className="size-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
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

      {/* Offene Forderungen — Premium-Mini-Card mit Glow */}
      <div className="relative my-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="absolute -right-6 -top-8 size-24 rounded-full bg-brand-pink/15 blur-2xl" />
        <p className="text-[11.5px] font-semibold tracking-[0.1em] text-foreground/55 uppercase">
          Offene Forderungen
        </p>
        <p className="mt-2 flex items-center gap-2 font-display text-[26px] font-bold tnum text-brand-gradient">
          {eur(open)}
        </p>
      </div>

      <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-3">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} {...item} accent="#8e8e98" active={isActive(item.href)} />
        ))}
      </div>
    </aside>
  )
}
