import type {
  Database,
  Customer,
  Deal,
  Project,
  Invoice,
  Quote,
  Transaction,
  Activity,
  Task,
  Template,
  EmailDraft,
  CompanySettings,
} from "./types"

const now = new Date()
const iso = (daysAgo: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}
const isoIn = (days: number) => iso(-days)

// ============================================================
// Echte Stammdaten — DYNAAMIQ AI / Martin Traut
// ============================================================

const settings: CompanySettings = {
  name: "DYNAAMIQ AI",
  legalName: "Martin Traut · DYNAAMIQ AI — Webdesign & KI-Automatisierung",
  email: "rechnung@dynaamiq.ai",
  phone: "",
  website: "dynaamiq.ai",
  address: "Graf-von-Düren-Straße 31",
  city: "Neuenstadt am Kocher",
  zip: "74196",
  country: "Deutschland",
  vatId: "DE366566010",
  taxNumber: "",
  iban: "DE78 1001 1001 2306 8288 39",
  bic: "",
  bankName: "",
  management: "Martin Traut",
  ownerName: "Martin Traut",
  smallBusiness: false,
  reminderFee: 5,
  defaultTaxRate: 0.19,
  invoicePrefix: "2026",
  quotePrefix: "AN-2026",
  nextInvoiceNo: 432,
  nextQuoteNo: 43,
  paymentTermsDays: 14,
  invoiceFooter:
    "Vielen Dank für die Zusammenarbeit. Zahlbar innerhalb von 14 Tagen ohne Abzug.",
}

// ============================================================
// Echte Kunden
// ============================================================

const customers: Customer[] = [
  {
    id: "c1",
    company: "Hospital Equipment",
    contactName: "Enes Türedi",
    email: "",
    phone: "",
    website: "hospital-equipment.de",
    address: "Lindenweg 30",
    city: "Igersheim",
    zip: "97999",
    country: "Deutschland",
    customerNumber: "K-1004",
    tags: ["Medizintechnik", "Website", "Betreuung"],
    health: "active",
    createdAt: iso(4),
  },
]

const deals: Deal[] = []
const projects: Project[] = []
const tasks: Task[] = []

const invoices: Invoice[] = [
  {
    id: "inv-2026-431",
    number: "2026-431",
    customerId: "c1",
    // Feste Daten der real ausgestellten & versendeten Rechnung (nicht relativ):
    status: "sent",
    issueDate: "2026-07-07T10:00:00.000Z",
    dueDate: "2026-07-10T10:00:00.000Z",
    serviceDate: "2026-07-07T10:00:00.000Z",
    createdAt: "2026-07-07T10:00:00.000Z",
    pdfPath: "/rechnungen/Rechnung-2026-431-Website-Kalender.pdf",
    items: [
      { id: "p-web", description: "Website-Relaunch hospital-equipment.de — zweisprachige Katalog-Plattform, 539 Seiten, Geräte-/Sonden-/Ersatzteil-/Fehlermeldungs-Kataloge, Suchmaschinenoptimierung & strukturierte Daten, 736 aufbereitete Bilder, Kontakt & DSGVO", unit: "Paket", qty: 1, unitPrice: 7700, taxRate: 0.19 },
      { id: "p-kal", description: "Individualsoftware Wartungs- & Terminkalender (PWA) — eigenes, sicheres Backend mit geschütztem Login, Termine mit Prüfzyklen & Überfälligkeit, Kundenübersicht, Echtzeit-Synchronisation (2 Nutzer), Foto-/Datei-Doku, installierbar wie eine native App", unit: "Paket", qty: 1, unitPrice: 1500, taxRate: 0.19 },
      { id: "p-rab", description: "Paket- & Verhandlungsrabatt (Komplettpaket)", unit: "Rabatt", qty: 1, unitPrice: -2900, taxRate: 0.19 },
    ],
    notes: "Komplettpaket Website + Wartungskalender — regulär 9.200 € netto, verhandelter Paketpreis 6.300 € netto (Ersparnis 2.900 € / 32 %). Eigentums- und Rechtevorbehalt: Alle Nutzungs- und Verwertungsrechte an Website und Software gehen erst mit vollständiger Bezahlung auf den Auftraggeber über.",
  },
]

const quotes: Quote[] = []
const transactions: Transaction[] = []
const emails: EmailDraft[] = []
const activities: Activity[] = []

// Wiederverwendbare E-Mail-Vorlagen (keine Kundendaten)
const templates: Template[] = [
  {
    id: "tpl-rechnung",
    kind: "email",
    name: "Rechnung versenden",
    subject: "Ihre Rechnung {{invoice_number}} von DYNAAMIQ AI",
    body:
      "Hallo {{contact_name}},\n\nanbei erhalten Sie die Rechnung {{invoice_number}} über {{amount}}.\nZahlbar bis {{due_date}}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nBeste Grüße\nMartin — DYNAAMIQ AI",
    createdAt: iso(4),
  },
  {
    id: "tpl-angebot",
    kind: "email",
    name: "Angebot Follow-up",
    subject: "Kurze Rückfrage zu Ihrem Angebot {{quote_number}}",
    body:
      "Hallo {{contact_name}},\n\nich wollte kurz nachfassen, ob Sie schon einen Blick auf das Angebot {{quote_number}} werfen konnten. Gerne bespreche ich offene Punkte in einem kurzen Call.\n\nBeste Grüße\nMartin — DYNAAMIQ AI",
    createdAt: iso(4),
  },
]

export function seedDatabase(): Database {
  return {
    customers,
    deals,
    projects,
    tasks,
    invoices,
    quotes,
    templates,
    emails,
    transactions,
    activities,
    settings,
  }
}
