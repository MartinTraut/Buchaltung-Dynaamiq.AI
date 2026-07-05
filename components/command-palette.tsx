"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  Search,
  Users,
  ReceiptEuro,
  FileText,
  KanbanSquare,
  FolderKanban,
  Plus,
  CornerDownLeft,
  LayoutDashboard,
  Wallet,
  Sparkles,
  Mail,
  Settings,
  LayoutTemplate,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { eur, computeTotals } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Item {
  id: string
  group: string
  label: string
  sub?: string
  icon: React.ElementType
  run: () => void
}

const PAGES: { label: string; href: string; icon: React.ElementType }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM & Kontakte", href: "/crm", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Angebote", href: "/quotes", icon: FileText },
  { label: "Projekte", href: "/projects", icon: FolderKanban },
  { label: "Rechnungen", href: "/invoices", icon: ReceiptEuro },
  { label: "Buchhaltung", href: "/finance", icon: Wallet },
  { label: "KI-Assistent", href: "/assistant", icon: Sparkles },
  { label: "E-Mails", href: "/emails", icon: Mail },
  { label: "Vorlagen", href: "/templates", icon: LayoutTemplate },
  { label: "Einstellungen", href: "/settings", icon: Settings },
]

export function CommandPalette() {
  const router = useRouter()
  const { db } = useStore()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("open-command", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command", onOpen)
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setActive(0)
    }
  }, [open])

  const go = React.useCallback(
    (href: string) => {
      router.push(href)
      setOpen(false)
    },
    [router],
  )

  const items = React.useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const out: Item[] = []

    if (!q) {
      out.push(
        { id: "new-invoice", group: "Schnellaktionen", label: "Neue Rechnung", icon: Plus, run: () => go("/invoices?new=1") },
        { id: "new-quote", group: "Schnellaktionen", label: "Neues Angebot", icon: Plus, run: () => go("/quotes?new=1") },
        { id: "new-customer", group: "Schnellaktionen", label: "Neuer Kunde", icon: Plus, run: () => go("/crm?new=1") },
        { id: "ai", group: "Schnellaktionen", label: "Mit KI erstellen", icon: Sparkles, run: () => go("/assistant") },
      )
      PAGES.forEach((p) =>
        out.push({ id: `page-${p.href}`, group: "Navigation", label: p.label, icon: p.icon, run: () => go(p.href) }),
      )
      return out
    }

    const match = (s?: string) => s?.toLowerCase().includes(q)

    db.customers.filter((c) => match(c.company) || match(c.contactName) || c.tags.some(match)).slice(0, 5).forEach((c) =>
      out.push({ id: `c-${c.id}`, group: "Kunden", label: c.company, sub: c.contactName, icon: Users, run: () => go("/crm") }),
    )
    db.invoices.filter((i) => match(i.number) || match(db.customers.find((c) => c.id === i.customerId)?.company)).slice(0, 5).forEach((i) => {
      const c = db.customers.find((x) => x.id === i.customerId)
      out.push({ id: `i-${i.id}`, group: "Rechnungen", label: i.number, sub: `${c?.company ?? ""} · ${eur(computeTotals(i.items).gross)}`, icon: ReceiptEuro, run: () => go("/invoices") })
    })
    db.quotes.filter((quo) => match(quo.number) || match(db.customers.find((c) => c.id === quo.customerId)?.company)).slice(0, 5).forEach((quo) => {
      const c = db.customers.find((x) => x.id === quo.customerId)
      out.push({ id: `q-${quo.id}`, group: "Angebote", label: quo.number, sub: `${c?.company ?? ""} · ${eur(computeTotals(quo.items).gross)}`, icon: FileText, run: () => go("/quotes") })
    })
    db.deals.filter((d) => match(d.title)).slice(0, 4).forEach((d) =>
      out.push({ id: `d-${d.id}`, group: "Deals", label: d.title, sub: eur(d.value), icon: KanbanSquare, run: () => go("/pipeline") }),
    )
    db.projects.filter((p) => match(p.name)).slice(0, 4).forEach((p) =>
      out.push({ id: `p-${p.id}`, group: "Projekte", label: p.name, icon: FolderKanban, run: () => go("/projects") }),
    )

    PAGES.filter((p) => match(p.label)).forEach((p) =>
      out.push({ id: `page-${p.href}`, group: "Navigation", label: p.label, icon: p.icon, run: () => go(p.href) }),
    )
    return out
  }, [query, db, go])

  React.useEffect(() => setActive(0), [query])

  const grouped = React.useMemo(() => {
    const map = new Map<string, Item[]>()
    items.forEach((it) => {
      const arr = map.get(it.group) ?? []
      arr.push(it)
      map.set(it.group, arr)
    })
    return [...map.entries()]
  }, [items])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      items[active]?.run()
    }
  }

  let flatIndex = -1

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[8dvh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:data-[state=open]:animate-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Suche</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-white/8 px-4">
            <Search className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Springe zu Kunde, Rechnung, Angebot, Deal…"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60 md:text-[15px]"
            />
            <kbd className="hidden rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
          </div>

          <div ref={listRef} className="max-h-[52dvh] overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nichts gefunden für „{query}"
              </p>
            ) : (
              grouped.map(([group, groupItems]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/50 uppercase">
                    {group}
                  </p>
                  {groupItems.map((it) => {
                    flatIndex++
                    const idx = flatIndex
                    const Icon = it.icon
                    return (
                      <button
                        key={it.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => it.run()}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          active === idx ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{it.label}</span>
                          {it.sub && <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>}
                        </span>
                        {active === idx && (
                          <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
