"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  ReceiptEuro,
  LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_MORE } from "./nav"
import { MoreSheet } from "./more-sheet"

const TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/invoices", label: "Rechnungen", icon: ReceiptEuro },
]

/** Icon mit animierter Aktiv-Pill (gleitet zwischen Tabs, analog Sidebar) */
function TabIcon({
  active,
  icon: Icon,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <span className="relative grid size-9 place-items-center">
      {active && (
        <motion.span
          layoutId="tab-active"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="absolute inset-0 rounded-xl bg-brand-cyan/15"
          style={{ boxShadow: "inset 0 0 0 1px rgba(0,255,230,0.25)" }}
        />
      )}
      <Icon className="relative size-5" />
    </span>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  // „Mehr" gilt als aktiv, sobald ein Sheet-Modul geöffnet ist
  const moreActive = NAV_MORE.some((item) => pathname.startsWith(item.href))

  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors",
      active ? "text-brand-cyan" : "text-muted-foreground",
    )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-[#0b0b0e]/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {TABS.map(({ href, label, icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className={tabClass(active)}>
              <TabIcon active={active} icon={icon} />
              {label}
            </Link>
          )
        })}
        <button onClick={() => setMoreOpen(true)} className={tabClass(moreActive)}>
          <TabIcon active={moreActive} icon={LayoutGrid} />
          Mehr
        </button>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}
