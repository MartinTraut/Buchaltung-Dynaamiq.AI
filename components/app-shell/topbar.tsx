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
  "/tasks": { title: "Offene Punkte", sub: "Was noch zu erledigen ist" },
  "/onboarding": { title: "Onboarding", sub: "Erstgespräch aufnehmen & verwerten" },
  "/crm": { title: "CRM & Kontakte", sub: "Kunden, Leads & Beziehungen" },
  "/pipeline": { title: "Pipeline", sub: "Deals von Lead bis Abschluss" },
  "/quotes": { title: "Angebote", sub: "Erstellen, versenden, gewinnen" },
  "/contracts": { title: "Verträge", sub: "Rechtlicher Rahmen zu Angebot & Rechnung" },
  "/projects": { title: "Projekte", sub: "Lieferung, Budget & Tasks" },
  "/calendar": { title: "Kalender", sub: "Aufgaben & Termine im Blick" },
  "/invoices": { title: "Rechnungen", sub: "Fakturierung & Mahnwesen" },
  "/expenses": { title: "Ausgaben", sub: "Belege, Kategorien & Vorsteuer" },
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
  const meta = TITLES[key] ?? { title: "DYNAAMIQ AI", sub: "" }

  const go = (path: string) => router.push(path)

  // Frosted Glass wie eine iOS-Nav-Bar: transluzent + Blur + Hairline unten
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/[0.06] bg-[#08080a]/70 px-4 backdrop-blur-xl sm:h-[84px] sm:gap-4 sm:px-6">
      <div className="flex items-center gap-2.5 lg:hidden">
        <DynaamiqMark size={28} />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[20px] font-bold leading-tight tracking-tight sm:text-[26px]">
          {meta.title}
        </h1>
        <p className="hidden truncate text-sm text-muted-foreground sm:block">
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

      {/* Phone: Suche als Icon-Button (Desktop hat den ⌘K-Trigger oben) */}
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-11 md:hidden"
        aria-label="Suche"
        onClick={() => window.dispatchEvent(new Event("open-command"))}
      >
        <Search className="size-5" />
      </Button>

      <Button asChild variant="ghost" size="lg" className="gap-2 px-3 text-muted-foreground hover:text-foreground sm:px-5">
        <Link href="/assistant">
          <Sparkles className="size-[18px] text-brand-cyan" />
          <span className="hidden sm:inline">KI-Assistent</span>
        </Link>
      </Button>

      <Dropdown>
        <DropdownTrigger asChild>
          <Button
            variant="brand"
            size="lg"
            aria-label="Neu erstellen"
            className="gap-1.5 px-3.5 sm:px-5"
          >
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
