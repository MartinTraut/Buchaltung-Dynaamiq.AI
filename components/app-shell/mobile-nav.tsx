"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  ReceiptEuro,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/invoices", label: "Rechnung", icon: ReceiptEuro },
  { href: "/assistant", label: "KI", icon: Sparkles },
]

export function MobileNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-[#0b0b0e]/90 px-2 py-2 backdrop-blur-xl lg:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
              active ? "text-brand-cyan" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
