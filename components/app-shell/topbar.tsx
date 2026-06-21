"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Plus,
  Sparkles,
  Search,
  Users,
  FileText,
  ReceiptEuro,
  FolderKanban,
  KanbanSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
} from "@/components/ui/dropdown"
import { DynaamiqMark } from "@/components/brand/logo"

const TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "Dein Business auf einen Blick" },
  "/crm": { title: "CRM & Kontakte", sub: "Kunden, Leads & Beziehungen" },
  "/pipeline": { title: "Pipeline", sub: "Deals von Lead bis Abschluss" },
  "/quotes": { title: "Angebote", sub: "Erstellen, versenden, gewinnen" },
  "/projects": { title: "Projekte", sub: "Lieferung, Budget & Tasks" },
  "/invoices": { title: "Rechnungen", sub: "Fakturierung & Mahnwesen" },
  "/finance": { title: "Buchhaltung", sub: "Einnahmen, Ausgaben & USt" },
  "/assistant": { title: "KI-Assistent", sub: "Angebote & Mails in Sekunden" },
  "/emails": { title: "E-Mails", sub: "Entwürfe & Versand" },
  "/templates": { title: "Vorlagen", sub: "Wiederverwendbare Bausteine" },
  "/settings": { title: "Einstellungen", sub: "Firma, Steuer & Branding" },
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const key = Object.keys(TITLES)
    .filter((k) => (k === "/" ? pathname === "/" : pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0]
  const meta = TITLES[key] ?? { title: "Dynaamiq OS", sub: "" }

  const go = (path: string) => router.push(path)

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-white/[0.06] bg-[#08080a]/75 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 lg:hidden">
        <DynaamiqMark size={28} />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-bold tracking-tight">
          {meta.title}
        </h1>
        <p className="hidden truncate text-[13px] text-muted-foreground sm:block">
          {meta.sub}
        </p>
      </div>

      <button
        onClick={() => window.dispatchEvent(new Event("open-command"))}
        className="hidden items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/[0.04] md:flex"
      >
        <Search className="size-4" />
        <span className="text-[13px]">Springe zu…</span>
        <kbd className="ml-3 rounded bg-white/8 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <Button asChild variant="ghost" size="lg" className="gap-2 text-muted-foreground hover:text-foreground">
        <Link href="/assistant">
          <Sparkles className="size-[18px] text-brand-pink" />
          <span className="hidden sm:inline">KI-Assistent</span>
        </Link>
      </Button>

      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="brand" size="lg" className="gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Neu</span>
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownLabel>Schnell erstellen</DropdownLabel>
          <DropdownItem onSelect={() => go("/invoices?new=1")}>
            <ReceiptEuro /> Rechnung
          </DropdownItem>
          <DropdownItem onSelect={() => go("/quotes?new=1")}>
            <FileText /> Angebot
          </DropdownItem>
          <DropdownItem onSelect={() => go("/crm?new=1")}>
            <Users /> Kunde
          </DropdownItem>
          <DropdownItem onSelect={() => go("/pipeline?new=1")}>
            <KanbanSquare /> Deal
          </DropdownItem>
          <DropdownItem onSelect={() => go("/projects?new=1")}>
            <FolderKanban /> Projekt
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </header>
  )
}
