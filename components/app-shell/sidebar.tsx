"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DynaamiqLogo } from "@/components/brand/logo"
import { NAV, NAV_BOTTOM } from "./nav"
import { useStore } from "@/lib/store"
import { eur, computeTotals } from "@/lib/format"

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all",
        active
          ? "font-semibold text-white"
          : "font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute inset-0 -z-10 rounded-xl bg-white/[0.07] ring-1 ring-brand-pink/15" />
      )}
      {active && (
        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-gradient" />
      )}
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-brand-pink" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
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
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b0e]/80 px-3 py-5 backdrop-blur-xl lg:flex">
      <div className="px-2 pb-6">
        <DynaamiqLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Open receivables mini-card */}
      <div className="my-4 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">
          Offene Forderungen
        </p>
        <p className="mt-1.5 flex items-center gap-2 font-display text-xl font-bold tnum">
          <span className="size-1.5 rounded-full bg-brand-pink" />
          {eur(open)}
        </p>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-white/[0.06] pt-3">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </aside>
  )
}
