// ============================================================
// DYNAAMIQ OS — Domain Model
// ============================================================

export type ID = string

export type DealStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled"
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired"
export type ProjectStatus = "planning" | "active" | "on_hold" | "done" | "canceled"
export type TaskStatus = "todo" | "doing" | "done"
export type TxType = "income" | "expense"
export type TemplateKind = "invoice" | "quote" | "email"

export interface Customer {
  id: ID
  company: string
  contactName: string
  email: string
  phone?: string
  website?: string
  address?: string
  city?: string
  zip?: string
  country?: string
  vatId?: string // USt-IdNr.
  tags: string[]
  notes?: string
  health: "active" | "lead" | "churned"
  createdAt: string
}

export interface Deal {
  id: ID
  title: string
  customerId: ID
  stage: DealStage
  value: number // € net
  probability: number // 0-100
  owner: string
  expectedClose?: string
  notes?: string
  createdAt: string
}

export interface Project {
  id: ID
  name: string
  customerId: ID
  status: ProjectStatus
  budget: number
  spent: number
  startDate?: string
  dueDate?: string
  color: string
  description?: string
  createdAt: string
}

export interface Task {
  id: ID
  projectId: ID
  title: string
  status: TaskStatus
  assignee?: string
  due?: string
  hours?: number
}

export interface LineItem {
  id: ID
  description: string
  qty: number
  unitPrice: number // € net
  taxRate: number // 0.19 | 0.07 | 0
}

export interface Invoice {
  id: ID
  number: string
  customerId: ID
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  items: LineItem[]
  notes?: string
  projectId?: ID
  reminderLevel?: number // 0/undef = keine, 1 = Erinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung
  lastReminderAt?: string
  recurring?: boolean // monatlich wiederkehrender Retainer
  createdAt: string
}

export const REMINDER_LABEL: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
  4: "Letzte Mahnung",
}

export interface Quote {
  id: ID
  number: string
  customerId: ID
  status: QuoteStatus
  issueDate: string
  validUntil: string
  items: LineItem[]
  notes?: string
  createdAt: string
}

export interface Template {
  id: ID
  kind: TemplateKind
  name: string
  subject?: string // for email
  body?: string // email/text
  items?: LineItem[] // invoice/quote presets
  createdAt: string
}

export interface EmailDraft {
  id: ID
  to: string
  customerId?: ID
  subject: string
  body: string
  status: "draft" | "sent"
  relatedType?: "invoice" | "quote" | "deal"
  relatedId?: ID
  createdAt: string
}

export interface Transaction {
  id: ID
  type: TxType
  category: string
  description: string
  amount: number // € gross
  taxRate: number
  date: string
  customerId?: ID
  invoiceId?: ID
}

export interface Activity {
  id: ID
  type:
    | "invoice"
    | "quote"
    | "deal"
    | "customer"
    | "project"
    | "email"
    | "payment"
    | "ai"
  title: string
  meta?: string
  at: string
}

export interface CompanySettings {
  name: string
  legalName: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  zip: string
  country: string
  vatId: string
  taxNumber: string
  iban: string
  bic: string
  bankName: string
  defaultTaxRate: number
  invoicePrefix: string
  quotePrefix: string
  nextInvoiceNo: number
  nextQuoteNo: number
  paymentTermsDays: number
  invoiceFooter: string
}

export interface Database {
  customers: Customer[]
  deals: Deal[]
  projects: Project[]
  tasks: Task[]
  invoices: Invoice[]
  quotes: Quote[]
  templates: Template[]
  emails: EmailDraft[]
  transactions: Transaction[]
  activities: Activity[]
  settings: CompanySettings
}

// ---------- Stage / status display metadata ----------

export const DEAL_STAGES: { id: DealStage; label: string; tint: string }[] = [
  { id: "lead", label: "Lead", tint: "#8a8a93" },
  { id: "qualified", label: "Qualifiziert", tint: "#8b5cf6" },
  { id: "proposal", label: "Angebot", tint: "#ff6a00" },
  { id: "negotiation", label: "Verhandlung", tint: "#ff2d7e" },
  { id: "won", label: "Gewonnen", tint: "#2fd3a5" },
  { id: "lost", label: "Verloren", tint: "#ff4d4d" },
]

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  canceled: "Storniert",
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  accepted: "Angenommen",
  declined: "Abgelehnt",
  expired: "Abgelaufen",
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planung",
  active: "Aktiv",
  on_hold: "Pausiert",
  done: "Abgeschlossen",
  canceled: "Abgebrochen",
}
