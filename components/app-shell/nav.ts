import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FolderKanban,
  CalendarDays,
  ListChecks,
  FileText,
  FileSignature,
  ReceiptEuro,
  ReceiptText,
  Wallet,
  LayoutTemplate,
  Mail,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: "Übersicht",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Offene Punkte", icon: ListChecks },
    ],
  },
  {
    label: "Vertrieb",
    items: [
      { href: "/crm", label: "CRM & Kontakte", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/quotes", label: "Angebote", icon: FileText },
      { href: "/contracts", label: "Verträge", icon: FileSignature },
    ],
  },
  {
    label: "Lieferung",
    items: [
      { href: "/projects", label: "Projekte", icon: FolderKanban },
      { href: "/calendar", label: "Kalender", icon: CalendarDays },
    ],
  },
  {
    label: "Finanzen",
    items: [
      { href: "/invoices", label: "Rechnungen", icon: ReceiptEuro },
      { href: "/expenses", label: "Ausgaben", icon: ReceiptText },
      { href: "/finance", label: "Buchhaltung", icon: Wallet },
    ],
  },
  {
    label: "Automatisierung",
    items: [
      { href: "/assistant", label: "KI-Assistent", icon: Sparkles },
      { href: "/emails", label: "E-Mails", icon: Mail },
      { href: "/templates", label: "Vorlagen", icon: LayoutTemplate },
    ],
  },
]

export const NAV_BOTTOM: NavItem[] = [
  { href: "/settings", label: "Einstellungen", icon: Settings },
]

/** Module, die auf dem Phone im „Mehr"-Sheet statt in der Tab-Bar liegen */
export const NAV_MORE: NavItem[] = [
  { href: "/tasks", label: "Offene Punkte", icon: ListChecks },
  { href: "/quotes", label: "Angebote", icon: FileText },
  { href: "/contracts", label: "Verträge", icon: FileSignature },
  { href: "/projects", label: "Projekte", icon: FolderKanban },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/expenses", label: "Ausgaben", icon: ReceiptText },
  { href: "/finance", label: "Buchhaltung", icon: Wallet },
  { href: "/assistant", label: "KI-Assistent", icon: Sparkles },
  { href: "/emails", label: "E-Mails", icon: Mail },
  { href: "/templates", label: "Vorlagen", icon: LayoutTemplate },
  { href: "/settings", label: "Einstellungen", icon: Settings },
]
