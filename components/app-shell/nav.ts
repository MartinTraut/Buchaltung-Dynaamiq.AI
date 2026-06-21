import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FolderKanban,
  FileText,
  ReceiptEuro,
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
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Vertrieb",
    items: [
      { href: "/crm", label: "CRM & Kontakte", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/quotes", label: "Angebote", icon: FileText },
    ],
  },
  {
    label: "Lieferung",
    items: [{ href: "/projects", label: "Projekte", icon: FolderKanban }],
  },
  {
    label: "Finanzen",
    items: [
      { href: "/invoices", label: "Rechnungen", icon: ReceiptEuro },
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
