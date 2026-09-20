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
export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "active"
  | "terminated"
  | "expired"
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
  /** Eigenes Logo (URL) — überschreibt das aus der Domain abgeleitete Favicon. */
  logoUrl?: string
  address?: string
  city?: string
  zip?: string
  country?: string
  vatId?: string // USt-IdNr.
  customerNumber?: string // Kundennummer für Dokumente
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
  dealId?: ID // gesetzt, wenn das Projekt aus einem gewonnenen Deal entstanden ist
  createdAt: string
}

export type TaskKind = "task" | "event"

export interface Task {
  id: ID
  projectId?: ID // optional: freie Aufgaben/Termine ohne Projekt
  title: string
  status: TaskStatus
  kind?: TaskKind // "event" = Termin mit Uhrzeit, sonst To-do (fehlt → "task")
  assignee?: string
  due?: string // Kalender-Datum (ISO-Timestamp, Tages­auflösung)
  time?: string // Startuhrzeit "HH:MM" (nur relevant bei Terminen)
  endTime?: string // Enduhrzeit "HH:MM"; fehlt → Standarddauer (60 min)
  hours?: number
}

/**
 * Eine Teilleistung innerhalb einer Position. Als reiner String, wenn kein
 * Aufwand hinterlegt ist — als Objekt, sobald Stunden ausgewiesen werden sollen.
 */
/**
 * Teilleistung einer Position. `title` fasst sie im Angebot zu einem Modul
 * zusammen — welche Module ein Angebot hat, gehört zum Angebot, nicht ins
 * Layout; sonst zeigt ein neues Angebot die Gliederung des alten.
 * Beginnt `text` mit „NEU: ", markiert das Layout die Teilleistung als neu
 * gegenüber dem Vorgängerangebot.
 */
export type LineItemTask = string | { text: string; hours?: number; title?: string }

export interface LineItem {
  id: ID
  description: string
  details?: LineItemTask[] // optionale Unterpunkte (Bullets) für die PDF-Position
  /** Erläuternder Absatz unter dem Positionstitel — begründet den Aufwand,
   *  bevor die Teilleistungen aufgezählt werden. Ruhiger gesetzt als der Titel. */
  note?: string
  unit?: string // z. B. "Tag(e)", "Std.", "Stk." — Standard: Stk.
  /** Kalkulatorischer Aufwand der Position in Stunden — wird auf dem Beleg
   *  unter der Positionsbeschreibung ausgewiesen. Bei Festpreisen macht das
   *  nachvollziehbar, wofür der Betrag steht. */
  hours?: number
  qty: number
  unitPrice: number // € net
  taxRate: number // 0.19 | 0.07 | 0
}

/**
 * Preis-Einordnung für Angebot oder Rechnung: rechnet den Beleg auf einen
 * effektiven Stundensatz herunter und stellt ihn marktüblichen Sätzen gegenüber.
 * Optional — ohne dieses Feld bleibt das Dokument ein reiner Beleg.
 */
export interface DocValuation {
  hours: number // kalkulierter Aufwand hinter dem Preis
  netAmount: number // Nettopreis, auf den sich der Vergleich bezieht
  /** Marktübliche Stundensätze zum Vergleich (aufsteigend sortiert ausgeben) */
  benchmarks: { label: string; rate: number }[]
  /** Kurze Begründungen — zwei bis vier, je ein Satz. `stat`/`statLabel`
   *  tragen die Kernzahl des Arguments als visuellen Anker im Druck. */
  reasons: { title: string; text: string; stat?: string; statLabel?: string }[]
  bottomLine?: string
  /** Herkunft der Marktwerte; ohne Angabe erscheint der Standardhinweis */
  sourceNote?: string
  /** Belegte Quellen der Marktwerte — nummeriert unter der Einordnung */
  sources?: { name: string; detail: string; link?: string }[]
}

/**
 * Art des Belegs. Vor Erbringung der Leistung wird angezahlt („advance"),
 * nach Abnahme kommt die Schlussrechnung („final"), die alle Anzahlungen
 * mitsamt ihrer Umsatzsteuer wieder abzieht — §14 Abs. 5 UStG. Ohne diese
 * Unterscheidung stünde dieselbe Steuer zweimal ausgewiesen da, und das ist
 * nach §14c Abs. 1 UStG geschuldet, auch wenn es nur ein Versehen war.
 */
export type InvoiceKind = "standard" | "advance" | "final"

export interface Invoice {
  id: ID
  number: string
  customerId: ID
  /** Ohne Angabe: „standard" — eine Rechnung über eine erbrachte Leistung. */
  kind?: InvoiceKind
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  serviceDate?: string // Leistungsdatum (§14 UStG) — Fallback: Rechnungsdatum
  servicePeriodEnd?: string // optionales Ende bei Leistungszeitraum
  cancelsInvoiceId?: string // gesetzt bei Stornorechnung → ID der Originalrechnung
  items: LineItem[]
  /** Überschrift des Belegs. Ohne Angabe: „Rechnung <Nr.>". */
  title?: string
  /** Zweiter, farbig gesetzter Teil der Überschrift — z. B. das Zielsystem. */
  titleAccent?: string
  /** Ein Satz unter der Überschrift: worum es in dieser Rechnung geht. */
  lead?: string
  /**
   * Rechtszeile neben dem GiroCode. Software und Ware brauchen verschiedene
   * Vorbehalte, deshalb je Rechnung setzbar; ohne Angabe greift der
   * Rechtevorbehalt für Software.
   */
  legalNote?: string
  notes?: string
  projectId?: ID
  reminderLevel?: number // 0/undef = keine, 1 = Erinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung
  lastReminderAt?: string
  recurring?: boolean // monatlich wiederkehrender Retainer
  valuation?: DocValuation // optionale Preis-Einordnung
  pdfPath?: string // Pfad zur final gerenderten Original-PDF (z. B. /rechnungen/…​.pdf)
  createdAt: string
}

export const REMINDER_LABEL: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
  4: "Letzte Mahnung",
}

/**
 * Betreuung nach dem Livegang. Ohne dieses Feld zeigt das Angebot die
 * erfolgsabhängige Betreuung (Anteil am Deckungsbeitrag). Projekte mit fester
 * Monatspauschale beschreiben sie hier — Layout und Text bleiben dieselben,
 * nur die Zahlen und die Marginalien kommen aus dem Datensatz.
 */
export interface CareTerms {
  eyebrow?: string
  /** Seitentitel; ohne Angabe „Betreuung ohne Monatspauschale". */
  title?: string
  /** Fette Zeile im dunklen Kasten — der Kern der Vereinbarung in einem Satz. */
  headline: string
  text: string
  /** Kernzahl rechts im Kasten, z. B. „70 €" oder „15 %". */
  stat: string
  statLabel: string
  /** Marginalien der Absätze, in ihrer Reihenfolge. */
  labels?: string[]
  /** Zeile im Beauftragungsblock der Schlussseite. */
  summaryLabel?: string
  summaryValue?: string
}

/**
 * Zahlungsplan des Angebots. Ohne dieses Feld greift 40/30/30 auf den
 * Festpreis — Angebote mit Einmalzahlung oder Ratenmodell setzen es.
 */
export interface PaymentTerms {
  intro: string
  /**
   * Überschrift der Zahlungsseite in der kompakten Fassung. Ohne Angabe
   * „Zwei Zahlungsmodelle" — was nur stimmt, wenn es zwei sind. Angebote mit
   * einem vereinbarten Plan setzen hier ihre eigene Überschrift.
   */
  title?: string
  /**
   * Eine Karte je Zahlungsweg oder Rate. `label` beschriftet den Block im
   * Preiskasten der ersten Seite; ohne Angabe steht dort „Ratenzahlung ·
   * 12 Monate", was nur für Laufzeiten von zwölf Monaten zutrifft.
   */
  cards: { head: string; when: string; value?: string; label?: string }[]
  note?: string
  /**
   * Nachvollziehbare Rechnung je Zahlungsweg: netto, Umsatzsteuer, brutto —
   * eine Zeile je Bestandteil. Ohne sie steht neben „230,00 € monatlich" nur
   * eine Zahl, die der Auftraggeber selbst nachrechnen müsste.
   */
  tables?: {
    title: string
    sub?: string
    /** `head` setzt eine Zwischenüberschrift — Website und Pflege bleiben so getrennte Blöcke. */
    rows: { k: string; v: string; strong?: boolean; muted?: boolean; rule?: boolean; head?: boolean }[]
    foot?: string
  }[]
  /** Gegenüberstellung der Varianten unter dem Plan. */
  compare?: {
    title: string
    text?: string
    rows: { k: string; v: string; strong?: boolean }[]
    foot?: string
  }
}

export interface Quote {
  id: ID
  number: string
  customerId: ID
  status: QuoteStatus
  issueDate: string
  validUntil: string
  items: LineItem[]
  /** Überschrift des Belegs. Ohne Angabe: „Rechnung <Nr.>". */
  title?: string
  /** Zweiter, farbig gesetzter Teil der Überschrift — z. B. das Zielsystem. */
  titleAccent?: string
  /** Ein Satz unter der Überschrift: worum es in dieser Rechnung geht. */
  lead?: string
  /**
   * Rechtszeile neben dem GiroCode. Software und Ware brauchen verschiedene
   * Vorbehalte, deshalb je Rechnung setzbar; ohne Angabe greift der
   * Rechtevorbehalt für Software.
   */
  legalNote?: string
  notes?: string
  projectId?: ID
  valuation?: DocValuation // optionale Preis-Einordnung
  /** Einzeiliger Hinweis auf der Titelseite — z. B. welches Angebot ersetzt wird. */
  notice?: string
  /**
   * Schrittfolge für die Systemübersicht des Angebots. Ohne Angabe zeigt das
   * Layout den Standardablauf.
   */
  process?: { title: string; detail: string }[]
  /**
   * Bauform des Angebotsdokuments. „both" trägt beide Pakete (Altbestand
   * AN-2026-512/513), „web" nur die Website, „system" nur die Warenwirtschaft.
   * Das Feld steuert, welche Seiten gesetzt werden — ohne Angabe: „both".
   */
  pack?: "both" | "web" | "system"
  /** Betreuung nach dem Livegang — ohne Angabe die erfolgsabhängige Fassung. */
  care?: CareTerms
  /** Zahlungsplan — ohne Angabe 40/30/30 auf den Festpreis. */
  payment?: PaymentTerms
  /**
   * Was nach der Freigabe passiert. Ohne Angabe verweist das Angebot auf den
   * Projektvertrag — bei Vorhaben ohne eigenen Vertrag wäre das eine Zusage
   * auf ein Dokument, das nicht existiert.
   */
  orderNote?: string
  /**
   * Grobe Leistungsübersicht für die kompakte Fassung — je Punkt ein
   * Schlagwort und eine Zeile Erklärung. Bewusst ohne Stunden: das Angebot
   * soll den Umfang zeigen, nicht die Kalkulation.
   */
  summary?: { k: string; v: string }[]
  /**
   * Angaben, die mit der Zusage mitkommen — als Stichpunkt-Karten gesetzt
   * statt im Fließtext versteckt: der Auftraggeber sieht auf einen Blick,
   * was noch fehlt.
   */
  orderItems?: { k: string; v?: string }[]
  /** Schlusszeile unter den Stichpunkten — was nach der Zusage passiert. */
  orderFoot?: string
  /**
   * Bauform des Dokuments. „full" ist die ausgeschriebene Fassung mit
   * Prozess-, Wert- und Rahmenseiten (SKOPE-Angebote ab 19.000 €). „compact"
   * setzt dieselben Inhalte auf drei Seiten — bei einem Vorhaben um 1.900 €
   * wirkt ein siebenseitiges Dokument nicht gründlich, sondern aufgeblasen.
   * Ohne Angabe: „full".
   */
  layout?: "full" | "compact"
  /**
   * Kurzklauseln der kompakten Fassung. Die Langtexte in `notes` erklären,
   * diese Sätze verpflichten — deshalb ein eigenes Feld statt eines
   * automatischen Kürzens, das genau die Zusicherung wegschneiden würde,
   * auf die es ankommt.
   */
  terms?: { title: string; text: string }[]
  createdAt: string
}

/**
 * Ein Abschnitt des Vertrags. Die §-Nummer erzeugt das Dokument aus der
 * Reihenfolge — so verschiebt ein eingefügter Abschnitt nicht die Verweise
 * im Datensatz, sondern nur die Darstellung.
 */
export interface ContractClause {
  title: string
  /** Absätze. Ein führendes „- " setzt den Absatz als Aufzählungspunkt. */
  body: string[]
}

/**
 * Vertrag zum Angebot. Das Angebot beschreibt Leistung, Preis und Zeit; der
 * Vertrag regelt Abnahme, Rechte, Haftung, Datenschutz und Laufzeit. Beide
 * bleiben getrennt und sind über `quoteId` verbunden — geändert wird immer
 * nur das Dokument, in das die Änderung gehört.
 */
export interface Contract {
  id: ID
  number: string
  customerId: ID
  status: ContractStatus
  /** Vertragsdatum. */
  issueDate: string
  /** Projektstart bzw. Livegang — Beginn der Betreuungslaufzeit. */
  startDate?: string
  /** Ende der Mindestlaufzeit der erfolgsabhängigen Betreuung. */
  termEndDate?: string
  title: string
  titleAccent?: string
  lead?: string
  /** Zugehöriges Angebot — Leistungsumfang, Preise und Termine stammen dort her. */
  quoteId?: ID
  /** Rechnungen, die auf diesem Vertrag beruhen. */
  invoiceIds?: ID[]
  projectId?: ID
  /** Auftragswert netto; ohne Angabe rechnet die Ansicht ihn aus dem Angebot. */
  netValue?: number
  clauses: ContractClause[]
  /** Anlagen, die Vertragsbestandteil sind (Angebot, AVV …). */
  attachments?: string[]
  notes?: string
  signedAt?: string
  createdAt: string
}

/**
 * Erstgespräch mit einem (potenziellen) Kunden. Die Antworten stehen als
 * flaches Feld-Wörterbuch — welche Fragen es gibt, steht in `lib/onboarding.ts`
 * und darf sich ändern, ohne dass alte Protokolle unlesbar werden.
 *
 * `created` merkt sich, was aus dem Gespräch schon entstanden ist: ohne diese
 * Spur legt ein zweiter Klick einen zweiten Kunden an.
 */
export interface OnboardingSession {
  id: ID
  /**
   * Onboarding oder Verkaufsgespräch. Beide laufen durch dieselbe Akte, aber
   * nicht durch denselben Leitfaden: im Onboarding steht der Auftrag fest und
   * es geht um Umfang und Zugänge, im Verkaufsgespräch entscheidet sich, ob es
   * überhaupt ein Angebot gibt. Ohne Angabe: Onboarding — so bleiben die
   * bestehenden Protokolle lesbar.
   */
  kind?: "onboarding" | "sales"
  status: "open" | "done"
  answers: Record<string, string | string[]>
  /** Rohmitschrift aus Diktat oder Zuruf — die KI liest daraus die Felder. */
  transcript?: string
  /** Freier Vermerk, der nicht ins Protokoll gehört. */
  notes?: string
  created?: {
    customerId?: ID
    dealId?: ID
    quoteId?: ID
    invoiceId?: ID
    contractId?: ID
    projectId?: ID
  }
  createdAt: string
  updatedAt?: string
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
  customerId?: ID // optional: verknüpfter Kunde für den CRM-Verlauf
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
  accountNumber?: string // Kontonummer
  registerCourt?: string // Amtsgericht
  registerNumber?: string // HR-Nr.
  management?: string // Geschäftsführung
  ownerName?: string // Standard-Ansprechpartner
  smallBusiness: boolean // §19 UStG Kleinunternehmer — keine USt auf Dokumenten
  reminderFee: number // € Mahngebühr je Mahnstufe (ab 1. Mahnung)
  defaultTaxRate: number
  invoicePrefix: string
  quotePrefix: string
  contractPrefix: string
  nextInvoiceNo: number
  nextQuoteNo: number
  nextContractNo: number
  paymentTermsDays: number
  invoiceFooter: string
  /** Abgeschaltete Prüfungen der offenen Punkte (Regel-ID → false). Fehlt ein
   *  Schlüssel, ist die Prüfung aktiv — eine neue Regel greift dadurch sofort. */
  checks?: Record<string, boolean>
  /** Fristen der Prüfungen in Tagen (Regel-ID → Tage). Ohne Eintrag gilt der
   *  Standardwert der Regel. */
  checkDays?: Record<string, number>
  /** Dauerhaft ausgeblendete Einzelpunkte (Regel-ID + Datensatz-ID). Damit
   *  lässt sich ein bewusst hingenommener Fall stummschalten, ohne die ganze
   *  Prüfung abzuschalten. */
  checksHidden?: string[]
  /** Zeitpunkt der letzten exportierten Datensicherung. Grundlage der
   *  Erinnerung unter den offenen Punkten — der Bestand liegt nur lokal. */
  lastBackupAt?: string
}

export interface Database {
  customers: Customer[]
  deals: Deal[]
  projects: Project[]
  tasks: Task[]
  invoices: Invoice[]
  quotes: Quote[]
  contracts: Contract[]
  templates: Template[]
  emails: EmailDraft[]
  transactions: Transaction[]
  activities: Activity[]
  onboardings: OnboardingSession[]
  settings: CompanySettings
}

// ---------- Stage / status display metadata ----------

export const DEAL_STAGES: { id: DealStage; label: string; tint: string }[] = [
  { id: "lead", label: "Lead", tint: "#8a8a93" },
  { id: "qualified", label: "Qualifiziert", tint: "#8b5cf6" },
  { id: "proposal", label: "Angebot", tint: "#1f7bf2" },
  { id: "negotiation", label: "Verhandlung", tint: "#00ffe6" },
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

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  signed: "Unterzeichnet",
  active: "Laufend",
  terminated: "Gekündigt",
  expired: "Beendet",
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planung",
  active: "Aktiv",
  on_hold: "Pausiert",
  done: "Abgeschlossen",
  canceled: "Abgebrochen",
}

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  task: "Aufgabe",
  event: "Termin",
}
