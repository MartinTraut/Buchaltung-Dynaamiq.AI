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
const isoIn = (days: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const settings: CompanySettings = {
  name: "Dynaamiq AI",
  legalName: "Dynaamiq AI — Performance Marketing",
  email: "hello@dynaamiq.ai",
  phone: "+49 151 23456789",
  website: "www.dynaamiq.ai",
  address: "Mediastraße 12",
  city: "Köln",
  zip: "50667",
  country: "Deutschland",
  vatId: "DE328441190",
  taxNumber: "215/5711/0420",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  bankName: "Commerzbank",
  defaultTaxRate: 0.19,
  invoicePrefix: "DYN-RE",
  quotePrefix: "DYN-AN",
  nextInvoiceNo: 1043,
  nextQuoteNo: 1027,
  paymentTermsDays: 14,
  invoiceFooter:
    "Vielen Dank für die Zusammenarbeit. Zahlbar innerhalb von 14 Tagen ohne Abzug.",
}

const customers: Customer[] = [
  {
    id: "c1",
    company: "Nordlicht Immobilien GmbH",
    contactName: "Sarah Brandt",
    email: "s.brandt@nordlicht-immo.de",
    phone: "+49 40 998877",
    website: "nordlicht-immo.de",
    city: "Hamburg",
    zip: "20095",
    country: "Deutschland",
    vatId: "DE221455901",
    tags: ["Immobilien", "Meta Ads", "Retainer"],
    health: "active",
    createdAt: iso(220),
  },
  {
    id: "c2",
    company: "VitalFit Studios",
    contactName: "Marco Kessler",
    email: "marco@vitalfit.de",
    phone: "+49 89 445566",
    website: "vitalfit.de",
    city: "München",
    zip: "80331",
    country: "Deutschland",
    tags: ["Fitness", "TikTok", "Lead Gen"],
    health: "active",
    createdAt: iso(180),
  },
  {
    id: "c3",
    company: "Aurelia Dental",
    contactName: "Dr. Lena Hofer",
    email: "praxis@aurelia-dental.de",
    phone: "+49 711 220033",
    website: "aurelia-dental.de",
    city: "Stuttgart",
    zip: "70173",
    country: "Deutschland",
    tags: ["Healthcare", "Google Ads", "Local"],
    health: "active",
    createdAt: iso(140),
  },
  {
    id: "c4",
    company: "Studio Vega Interior",
    contactName: "Tobias Reinhardt",
    email: "hello@studiovega.de",
    city: "Berlin",
    zip: "10115",
    country: "Deutschland",
    tags: ["Interior", "Branding"],
    health: "active",
    createdAt: iso(95),
  },
  {
    id: "c5",
    company: "EcoMove Mobility",
    contactName: "Janina Wolf",
    email: "j.wolf@ecomove.io",
    website: "ecomove.io",
    city: "Köln",
    zip: "50667",
    country: "Deutschland",
    tags: ["SaaS", "Performance", "B2B"],
    health: "lead",
    createdAt: iso(38),
  },
  {
    id: "c6",
    company: "Lumen Kosmetik",
    contactName: "Patricia Adler",
    email: "p.adler@lumen-kosmetik.de",
    city: "Düsseldorf",
    zip: "40213",
    country: "Deutschland",
    tags: ["E-Commerce", "Shopify", "Meta Ads"],
    health: "active",
    createdAt: iso(160),
  },
  {
    id: "c7",
    company: "Bergmann Rechtsanwälte",
    contactName: "Daniel Bergmann",
    email: "kanzlei@bergmann-recht.de",
    city: "Frankfurt",
    zip: "60311",
    country: "Deutschland",
    tags: ["Legal", "Google Ads"],
    health: "lead",
    createdAt: iso(18),
  },
  {
    id: "c8",
    company: "Solaris Energie AG",
    contactName: "Rebecca Stein",
    email: "r.stein@solaris-energie.de",
    city: "Leipzig",
    zip: "04109",
    country: "Deutschland",
    tags: ["Energy", "Lead Gen", "B2B"],
    health: "active",
    createdAt: iso(120),
  },
]

const deals: Deal[] = [
  { id: "d1", title: "Meta Ads Retainer 2026", customerId: "c5", stage: "negotiation", value: 4200, probability: 70, owner: "Martin", expectedClose: isoIn(9), createdAt: iso(20), notes: "Pilot über 3 Monate, dann Retainer." },
  { id: "d2", title: "Google Ads Setup + Betreuung", customerId: "c7", stage: "proposal", value: 2800, probability: 50, owner: "Martin", expectedClose: isoIn(14), createdAt: iso(12) },
  { id: "d3", title: "TikTok Creative Paket", customerId: "c2", stage: "qualified", value: 3600, probability: 35, owner: "Martin", expectedClose: isoIn(25), createdAt: iso(8) },
  { id: "d4", title: "Funnel Relaunch", customerId: "c6", stage: "won", value: 6900, probability: 100, owner: "Martin", expectedClose: iso(5), createdAt: iso(34) },
  { id: "d5", title: "Lead-Gen Kampagne Q3", customerId: "c8", stage: "lead", value: 5200, probability: 20, owner: "Martin", expectedClose: isoIn(40), createdAt: iso(4) },
  { id: "d6", title: "Branding + Performance Bundle", customerId: "c4", stage: "proposal", value: 8400, probability: 55, owner: "Martin", expectedClose: isoIn(18), createdAt: iso(15) },
  { id: "d7", title: "SEO + Content Retainer", customerId: "c1", stage: "negotiation", value: 3100, probability: 65, owner: "Martin", expectedClose: isoIn(7), createdAt: iso(22) },
  { id: "d8", title: "Onboarding Healthcare Local", customerId: "c3", stage: "won", value: 2400, probability: 100, owner: "Martin", expectedClose: iso(30), createdAt: iso(60) },
  { id: "d9", title: "Reels Produktion Paket", customerId: "c2", stage: "lead", value: 1800, probability: 15, owner: "Martin", expectedClose: isoIn(35), createdAt: iso(3) },
]

const projects: Project[] = [
  { id: "p1", name: "Nordlicht — Always-On Meta", customerId: "c1", status: "active", budget: 18000, spent: 11200, startDate: iso(90), dueDate: isoIn(120), color: "#ff6a00", description: "Laufende Performance-Kampagnen für Immobilien-Leads.", createdAt: iso(90) },
  { id: "p2", name: "VitalFit — TikTok Growth", customerId: "c2", status: "active", budget: 9600, spent: 4300, startDate: iso(45), dueDate: isoIn(60), color: "#ff2d7e", description: "Creative-Sprints + Paid TikTok.", createdAt: iso(45) },
  { id: "p3", name: "Aurelia — Local Google Ads", customerId: "c3", status: "active", budget: 7200, spent: 5100, startDate: iso(70), dueDate: isoIn(30), color: "#e81ccb", description: "Lokale Patientengewinnung.", createdAt: iso(70) },
  { id: "p4", name: "Lumen — Funnel Relaunch", customerId: "c6", status: "done", budget: 6900, spent: 6700, startDate: iso(80), dueDate: iso(6), color: "#8b5cf6", description: "Shopify Funnel + Creatives.", createdAt: iso(80) },
  { id: "p5", name: "Solaris — Lead Gen B2B", customerId: "c8", status: "planning", budget: 12000, spent: 800, startDate: iso(5), dueDate: isoIn(95), color: "#2fd3a5", description: "B2B Leadgenerierung Solar.", createdAt: iso(5) },
]

const tasks: Task[] = [
  { id: "t1", projectId: "p1", title: "Creatives Q2 briefen", status: "done", assignee: "Martin", due: iso(10), hours: 4 },
  { id: "t2", projectId: "p1", title: "Lookalike Audiences testen", status: "doing", assignee: "Martin", due: isoIn(3), hours: 6 },
  { id: "t3", projectId: "p1", title: "Monatsreport erstellen", status: "todo", assignee: "Martin", due: isoIn(6), hours: 3 },
  { id: "t4", projectId: "p2", title: "3 Hook-Varianten drehen", status: "doing", assignee: "Martin", due: isoIn(2), hours: 8 },
  { id: "t5", projectId: "p2", title: "Pixel-Setup prüfen", status: "todo", due: isoIn(5), hours: 2 },
  { id: "t6", projectId: "p3", title: "Keyword-Set erweitern", status: "todo", due: isoIn(4), hours: 3 },
  { id: "t7", projectId: "p5", title: "Kickoff-Call planen", status: "todo", due: isoIn(2), hours: 1 },
]

const mkItems = (rows: [string, number, number, number][]) =>
  rows.map(([description, qty, unitPrice, taxRate], i) => ({
    id: `li-${i}-${Math.round(unitPrice)}`,
    description,
    qty,
    unitPrice,
    taxRate,
  }))

const invoices: Invoice[] = [
  { id: "i1", number: "DYN-RE-1042", customerId: "c1", status: "paid", issueDate: iso(40), dueDate: iso(26), createdAt: iso(40), projectId: "p1", items: mkItems([["Meta Ads Betreuung — März", 1, 2400, 0.19], ["Creative Produktion (5 Assets)", 5, 180, 0.19]]) },
  { id: "i2", number: "DYN-RE-1041", customerId: "c3", status: "paid", issueDate: iso(35), dueDate: iso(21), createdAt: iso(35), projectId: "p3", items: mkItems([["Google Ads Management", 1, 1200, 0.19], ["Landingpage Optimierung", 1, 650, 0.19]]) },
  { id: "i3", number: "DYN-RE-1040", customerId: "c2", status: "paid", issueDate: iso(30), dueDate: iso(16), createdAt: iso(30), projectId: "p2", items: mkItems([["TikTok Creative Sprint", 1, 1800, 0.19]]) },
  { id: "i4", number: "DYN-RE-1043", customerId: "c6", status: "sent", issueDate: iso(8), dueDate: isoIn(6), createdAt: iso(8), projectId: "p4", items: mkItems([["Funnel Relaunch — Restzahlung", 1, 3450, 0.19], ["Performance Setup", 1, 900, 0.19]]) },
  { id: "i5", number: "DYN-RE-1039", customerId: "c8", status: "overdue", issueDate: iso(45), dueDate: iso(31), createdAt: iso(45), items: mkItems([["Strategie-Workshop B2B", 1, 1500, 0.19]]) },
  { id: "i6", number: "DYN-RE-1038", customerId: "c1", status: "paid", issueDate: iso(70), dueDate: iso(56), createdAt: iso(70), projectId: "p1", items: mkItems([["Meta Ads Betreuung — Februar", 1, 2400, 0.19]]) },
  { id: "i7", number: "DYN-RE-1037", customerId: "c6", status: "sent", issueDate: iso(4), dueDate: isoIn(10), createdAt: iso(4), items: mkItems([["E-Commerce Audit", 1, 780, 0.19], ["Shopify Tracking Setup", 1, 420, 0.19]]) },
]

const quotes: Quote[] = [
  { id: "q1", number: "DYN-AN-1026", customerId: "c5", status: "sent", issueDate: iso(6), validUntil: isoIn(14), createdAt: iso(6), items: mkItems([["Meta Ads Retainer (mtl.)", 1, 2400, 0.19], ["Onboarding & Setup (einmalig)", 1, 1200, 0.19], ["Creative Paket (10 Assets)", 1, 600, 0.19]]) },
  { id: "q2", number: "DYN-AN-1025", customerId: "c7", status: "sent", issueDate: iso(10), validUntil: isoIn(10), createdAt: iso(10), items: mkItems([["Google Ads Setup", 1, 980, 0.19], ["Monatliche Betreuung", 1, 1200, 0.19]]) },
  { id: "q3", number: "DYN-AN-1024", customerId: "c4", status: "draft", issueDate: iso(2), validUntil: isoIn(20), createdAt: iso(2), items: mkItems([["Brand Identity Sprint", 1, 4200, 0.19], ["Performance Kampagnen-Setup", 1, 2400, 0.19]]) },
  { id: "q4", number: "DYN-AN-1023", customerId: "c2", status: "accepted", issueDate: iso(28), validUntil: iso(7), createdAt: iso(28), items: mkItems([["TikTok Creative Paket", 1, 1800, 0.19]]) },
]

// Monthly transactions to give the dashboard a believable cashflow shape
const txCat = (m: number) => [
  { inc: 8200 + m * 420, exp: 2600 + m * 80 },
]
const transactions: Transaction[] = []
for (let m = 11; m >= 0; m--) {
  const base = 7600 + (11 - m) * 380
  transactions.push({
    id: `tx-in-${m}`,
    type: "income",
    category: "Dienstleistung",
    description: `Umsatz Monat`,
    amount: (base + (m % 3) * 600) * 1.19,
    taxRate: 0.19,
    date: iso(m * 30 + 4),
  })
  transactions.push({
    id: `tx-ad-${m}`,
    type: "expense",
    category: "Ad Spend (durchlaufend)",
    description: "Werbebudget Plattformen",
    amount: (1800 + (m % 4) * 300) * 1.19,
    taxRate: 0.19,
    date: iso(m * 30 + 6),
  })
  transactions.push({
    id: `tx-tool-${m}`,
    type: "expense",
    category: "Software & Tools",
    description: "SaaS Abos",
    amount: 340 * 1.19,
    taxRate: 0.19,
    date: iso(m * 30 + 8),
  })
}
void txCat

const templates: Template[] = [
  {
    id: "tpl1",
    kind: "invoice",
    name: "Meta Ads Retainer (Standard)",
    items: mkItems([["Meta Ads Betreuung (mtl.)", 1, 2400, 0.19], ["Creative Produktion", 5, 180, 0.19]]),
    createdAt: iso(60),
  },
  {
    id: "tpl2",
    kind: "quote",
    name: "Performance Onboarding Paket",
    items: mkItems([["Setup & Onboarding", 1, 1200, 0.19], ["Monatliche Betreuung", 1, 2400, 0.19]]),
    createdAt: iso(60),
  },
  {
    id: "tpl3",
    kind: "email",
    name: "Rechnung versenden",
    subject: "Ihre Rechnung {{invoice_number}} von Dynaamiq AI",
    body:
      "Hallo {{contact_name}},\n\nanbei erhalten Sie die Rechnung {{invoice_number}} über {{amount}}.\nZahlbar bis {{due_date}}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nBeste Grüße\nMartin — Dynaamiq AI",
    createdAt: iso(60),
  },
  {
    id: "tpl4",
    kind: "email",
    name: "Angebot Follow-up",
    subject: "Kurze Rückfrage zu Ihrem Angebot {{quote_number}}",
    body:
      "Hallo {{contact_name}},\n\nich wollte kurz nachfassen, ob Sie schon einen Blick auf das Angebot {{quote_number}} werfen konnten. Gerne bespreche ich offene Punkte in einem kurzen Call.\n\nBeste Grüße\nMartin — Dynaamiq AI",
    createdAt: iso(40),
  },
]

const emails: EmailDraft[] = [
  {
    id: "em1",
    to: "j.wolf@ecomove.io",
    customerId: "c5",
    subject: "Ihr Angebot DYN-AN-1026 — nächste Schritte",
    body:
      "Hallo Janina,\n\nvielen Dank für das gute Gespräch. Anbei das Angebot für den Meta Ads Retainer. Ich freue mich auf Ihr Feedback.\n\nBeste Grüße\nMartin",
    status: "draft",
    relatedType: "quote",
    relatedId: "q1",
    createdAt: iso(6),
  },
]

const activities: Activity[] = [
  { id: "a1", type: "payment", title: "Zahlung erhalten — DYN-RE-1042", meta: "Nordlicht Immobilien · 3.357,00 €", at: iso(2) },
  { id: "a2", type: "deal", title: "Deal gewonnen — Funnel Relaunch", meta: "Lumen Kosmetik · 6.900 €", at: iso(5) },
  { id: "a3", type: "invoice", title: "Rechnung versendet — DYN-RE-1043", meta: "Lumen Kosmetik", at: iso(8) },
  { id: "a4", type: "quote", title: "Angebot versendet — DYN-AN-1026", meta: "EcoMove Mobility", at: iso(6) },
  { id: "a5", type: "customer", title: "Neuer Lead — Bergmann Rechtsanwälte", meta: "Frankfurt · Legal", at: iso(18) },
  { id: "a6", type: "ai", title: "KI-Angebot generiert", meta: "Studio Vega Interior", at: iso(2) },
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
