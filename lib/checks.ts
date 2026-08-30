import type { Database, CompanySettings, Invoice } from "@/lib/types"
import { computeTotals } from "@/lib/format"

/**
 * Offene Punkte — was das Cockpit aus den eigenen Daten ableiten kann.
 *
 * Die Prüfungen sind bewusst nicht gespeichert, sondern werden bei jedem
 * Aufruf neu gerechnet: eine gespeicherte Aufgabe „Rechnung 431 überfällig"
 * wäre am Tag nach der Zahlung falsch, ohne dass jemand sie anfasst. Was
 * bleibt, sind die eigenen Aufgaben (Task) — die stehen daneben.
 *
 * Jede Regel ist einzeln abschaltbar und, wo eine Frist im Spiel ist, in
 * Tagen einstellbar. Die Werte liegen in den Firmeneinstellungen, nicht im
 * Code, damit sie eine Rechnungsstellung überleben.
 */

export type CheckSeverity = "critical" | "warning" | "info"

export type CheckArea =
  | "Rechnungen"
  | "Angebote"
  | "Kunden"
  | "Ausgaben"
  | "Stammdaten"

export interface CheckFinding {
  /** Stabil über Neuberechnungen hinweg: Regel + Datensatz. Genau deshalb
   *  lässt sich ein einzelner Punkt dauerhaft ausblenden. */
  id: string
  ruleId: string
  area: CheckArea
  severity: CheckSeverity
  title: string
  detail: string
  /** Ziel des „Öffnen"-Knopfes — das Modul, in dem der Punkt zu erledigen ist. */
  href: string
}

export interface CheckRule {
  id: string
  area: CheckArea
  label: string
  /** Was die Regel prüft — steht so in den Einstellungen. */
  description: string
  severity: CheckSeverity
  /** Regeln mit Frist bringen ihren einstellbaren Schwellwert mit. */
  threshold?: { label: string; suffix: string; min: number; max: number }
  defaultDays?: number
  run: (db: Database, days: number) => CheckFinding[]
}

const DAY = 86_400_000
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
/** Ganze Tage zwischen einem ISO-Datum und heute; negativ = liegt in der Zukunft. */
const daysAgo = (iso?: string) =>
  iso ? Math.floor((startOfToday() - new Date(iso).setHours(0, 0, 0, 0)) / DAY) : 0

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** Rechnungen, die überhaupt Pflichtangaben tragen müssen: alles außer Entwurf. */
const issued = (db: Database) => db.invoices.filter((i) => i.status !== "draft")
const gross = (i: Invoice) => computeTotals(i.items).gross

export const CHECK_RULES: CheckRule[] = [
  // ── Rechnungen ────────────────────────────────────────────────────────
  {
    id: "invoice-overdue",
    area: "Rechnungen",
    label: "Überfällige Rechnungen",
    description:
      "Versendete Rechnungen, deren Fälligkeit erreicht ist und die noch nicht als bezahlt markiert sind.",
    severity: "critical",
    run: (db) =>
      db.invoices
        .filter((i) => i.status === "sent" || i.status === "overdue")
        .filter((i) => daysAgo(i.dueDate) > 0)
        .map((i) => ({
          id: `invoice-overdue:${i.id}`,
          ruleId: "invoice-overdue",
          area: "Rechnungen" as const,
          severity: "critical" as const,
          title: `Rechnung ${i.number || "ohne Nummer"} ist überfällig`,
          detail: `seit ${plural(daysAgo(i.dueDate), "Tag", "Tagen")} · ${gross(i).toFixed(2)} € offen`,
          href: "/invoices",
        })),
  },
  {
    id: "invoice-reminder-due",
    area: "Rechnungen",
    label: "Mahnung fällig",
    description:
      "Überfällige Rechnungen, zu denen nach Ablauf der Frist noch keine Zahlungserinnerung raus ist.",
    severity: "warning",
    threshold: { label: "Karenz nach Fälligkeit", suffix: "Tage", min: 1, max: 60 },
    defaultDays: 10,
    run: (db, days) =>
      db.invoices
        .filter((i) => i.status === "sent" || i.status === "overdue")
        .filter((i) => daysAgo(i.dueDate) >= days && !i.reminderLevel)
        .map((i) => ({
          id: `invoice-reminder-due:${i.id}`,
          ruleId: "invoice-reminder-due",
          area: "Rechnungen" as const,
          severity: "warning" as const,
          title: `Zahlungserinnerung zu ${i.number || "Entwurf"} versenden`,
          detail: `überfällig seit ${plural(daysAgo(i.dueDate), "Tag", "Tagen")}, noch nicht gemahnt`,
          href: "/invoices",
        })),
  },
  {
    id: "invoice-draft-stale",
    area: "Rechnungen",
    label: "Liegengebliebene Entwürfe",
    description:
      "Rechnungsentwürfe, die länger als die eingestellte Frist nicht finalisiert wurden.",
    severity: "warning",
    threshold: { label: "Entwurf älter als", suffix: "Tage", min: 1, max: 90 },
    defaultDays: 7,
    run: (db, days) =>
      db.invoices
        .filter((i) => i.status === "draft" && daysAgo(i.createdAt) >= days)
        .map((i) => ({
          id: `invoice-draft-stale:${i.id}`,
          ruleId: "invoice-draft-stale",
          area: "Rechnungen" as const,
          severity: "warning" as const,
          title: `Rechnungsentwurf seit ${plural(daysAgo(i.createdAt), "Tag", "Tagen")} offen`,
          detail: `${i.items[0]?.description || "ohne Position"} · ${gross(i).toFixed(2)} €`,
          href: "/invoices",
        })),
  },
  {
    id: "invoice-missing-number",
    area: "Rechnungen",
    label: "Rechnungsnummer fehlt",
    description:
      "Versendete Rechnungen ohne fortlaufende Nummer — Pflichtangabe nach § 14 Abs. 4 Nr. 4 UStG.",
    severity: "critical",
    run: (db) =>
      issued(db)
        .filter((i) => !i.number.trim())
        .map((i) => ({
          id: `invoice-missing-number:${i.id}`,
          ruleId: "invoice-missing-number",
          area: "Rechnungen" as const,
          severity: "critical" as const,
          title: "Versendete Rechnung ohne Rechnungsnummer",
          detail: `${i.items[0]?.description || "ohne Position"} · Pflichtangabe nach § 14 UStG`,
          href: "/invoices",
        })),
  },
  {
    id: "invoice-customer-address",
    area: "Rechnungen",
    label: "Anschrift des Empfängers unvollständig",
    description:
      "Rechnungen an Kunden ohne vollständige Anschrift — Pflichtangabe nach § 14 Abs. 4 Nr. 1 UStG.",
    severity: "critical",
    run: (db) =>
      issued(db)
        .map((i) => ({ i, c: db.customers.find((c) => c.id === i.customerId) }))
        .filter(({ c }) => !c?.address?.trim() || !c?.city?.trim() || !c?.zip?.trim())
        .map(({ i, c }) => ({
          id: `invoice-customer-address:${i.id}`,
          ruleId: "invoice-customer-address",
          area: "Rechnungen" as const,
          severity: "critical" as const,
          title: `Anschrift fehlt bei ${c?.company || "unbekanntem Kunden"}`,
          detail: `betrifft Rechnung ${i.number || "ohne Nummer"} · Pflichtangabe nach § 14 UStG`,
          href: "/crm",
        })),
  },
  {
    id: "invoice-service-date",
    area: "Rechnungen",
    label: "Leistungsdatum nicht hinterlegt",
    description:
      "Rechnungen ohne eigenes Leistungsdatum. Der Beleg weist dann das Rechnungsdatum aus — zulässig, aber nur, wenn Leistung und Rechnung tatsächlich in denselben Monat fallen.",
    severity: "info",
    run: (db) =>
      issued(db)
        .filter((i) => !i.serviceDate && !i.cancelsInvoiceId)
        .map((i) => ({
          id: `invoice-service-date:${i.id}`,
          ruleId: "invoice-service-date",
          area: "Rechnungen" as const,
          severity: "info" as const,
          title: `Rechnung ${i.number || "ohne Nummer"} ohne Leistungsdatum`,
          detail: "Beleg weist das Rechnungsdatum als Leistungszeitpunkt aus",
          href: "/invoices",
        })),
  },
  {
    id: "invoice-empty",
    area: "Rechnungen",
    label: "Rechnung ohne Betrag",
    description: "Rechnungen ohne Position oder mit Bruttobetrag null.",
    severity: "warning",
    run: (db) =>
      db.invoices
        .filter((i) => !i.cancelsInvoiceId && (!i.items.length || gross(i) === 0))
        .map((i) => ({
          id: `invoice-empty:${i.id}`,
          ruleId: "invoice-empty",
          area: "Rechnungen" as const,
          severity: "warning" as const,
          title: `Rechnung ${i.number || "(Entwurf)"} hat keinen Betrag`,
          detail: i.items.length ? "Summe ist null" : "keine Position erfasst",
          href: "/invoices",
        })),
  },

  // ── Angebote ──────────────────────────────────────────────────────────
  {
    id: "quote-expiring",
    area: "Angebote",
    label: "Angebot läuft aus",
    description:
      "Versendete Angebote, deren Bindefrist innerhalb der eingestellten Frist endet.",
    severity: "warning",
    threshold: { label: "Vorlauf vor Ablauf", suffix: "Tage", min: 1, max: 60 },
    defaultDays: 7,
    run: (db, days) =>
      db.quotes
        .filter((q) => q.status === "sent")
        .filter((q) => daysAgo(q.validUntil) > -days && daysAgo(q.validUntil) <= 0)
        .map((q) => ({
          id: `quote-expiring:${q.id}`,
          ruleId: "quote-expiring",
          area: "Angebote" as const,
          severity: "warning" as const,
          title: `Angebot ${q.number} läuft in ${plural(-daysAgo(q.validUntil), "Tag", "Tagen")} ab`,
          detail: "noch keine Rückmeldung — nachfassen",
          href: "/quotes",
        })),
  },
  {
    id: "quote-expired",
    area: "Angebote",
    label: "Angebot abgelaufen",
    description:
      "Versendete Angebote, deren Bindefrist verstrichen ist, ohne dass der Status nachgezogen wurde.",
    severity: "warning",
    run: (db) =>
      db.quotes
        .filter((q) => q.status === "sent" && daysAgo(q.validUntil) > 0)
        .map((q) => ({
          id: `quote-expired:${q.id}`,
          ruleId: "quote-expired",
          area: "Angebote" as const,
          severity: "warning" as const,
          title: `Angebot ${q.number} ist seit ${plural(daysAgo(q.validUntil), "Tag", "Tagen")} abgelaufen`,
          detail: "Status pflegen oder Angebot erneuern",
          href: "/quotes",
        })),
  },
  {
    id: "quote-accepted-uninvoiced",
    area: "Angebote",
    label: "Angenommen, aber nicht fakturiert",
    description:
      "Angenommene Angebote, zu denen seither keine Rechnung an denselben Kunden entstanden ist.",
    severity: "critical",
    run: (db) =>
      db.quotes
        .filter((q) => q.status === "accepted")
        .filter(
          (q) =>
            !db.invoices.some(
              (i) =>
                i.customerId === q.customerId &&
                new Date(i.createdAt) >= new Date(q.issueDate),
            ),
        )
        .map((q) => ({
          id: `quote-accepted-uninvoiced:${q.id}`,
          ruleId: "quote-accepted-uninvoiced",
          area: "Angebote" as const,
          severity: "critical" as const,
          title: `Angebot ${q.number} ist angenommen, aber nicht abgerechnet`,
          detail: `${computeTotals(q.items).net.toFixed(2)} € netto ohne Rechnung`,
          href: "/quotes",
        })),
  },

  // ── Kunden ────────────────────────────────────────────────────────────
  {
    id: "customer-missing-email",
    area: "Kunden",
    label: "Kunde ohne E-Mail",
    description:
      "Kunden ohne E-Mail-Adresse — Belege lassen sich nicht versenden.",
    severity: "warning",
    run: (db) =>
      db.customers
        .filter((c) => !c.email.trim())
        .map((c) => ({
          id: `customer-missing-email:${c.id}`,
          ruleId: "customer-missing-email",
          area: "Kunden" as const,
          severity: "warning" as const,
          title: `${c.company} hat keine E-Mail-Adresse`,
          detail: "Rechnungs- und Angebotsversand nicht möglich",
          href: "/crm",
        })),
  },
  {
    id: "customer-missing-vatid",
    area: "Kunden",
    label: "USt-IdNr. fehlt",
    description:
      "Geschäftskunden ohne USt-IdNr. Für Leistungen ins EU-Ausland ist sie Voraussetzung des Reverse-Charge-Verfahrens.",
    severity: "info",
    run: (db) =>
      db.customers
        .filter((c) => c.health !== "lead" && !c.vatId?.trim())
        .map((c) => ({
          id: `customer-missing-vatid:${c.id}`,
          ruleId: "customer-missing-vatid",
          area: "Kunden" as const,
          severity: "info" as const,
          title: `${c.company} ohne USt-IdNr.`,
          detail: "nur relevant bei Leistungen ins EU-Ausland",
          href: "/crm",
        })),
  },

  // ── Ausgaben ──────────────────────────────────────────────────────────
  {
    id: "expense-uncategorized",
    area: "Ausgaben",
    label: "Ausgabe ohne Kategorie",
    description:
      "Erfasste Ausgaben ohne Kategorie — sie fehlen in der Auswertung und in der Vorsteuer.",
    severity: "warning",
    run: (db) =>
      db.transactions
        .filter((t) => t.type === "expense" && !t.category.trim())
        .map((t) => ({
          id: `expense-uncategorized:${t.id}`,
          ruleId: "expense-uncategorized",
          area: "Ausgaben" as const,
          severity: "warning" as const,
          title: `${t.description || "Ausgabe"} ohne Kategorie`,
          detail: `${t.amount.toFixed(2)} € brutto · fehlt in der Auswertung`,
          href: "/expenses",
        })),
  },

  // ── Stammdaten ────────────────────────────────────────────────────────
  {
    id: "settings-incomplete",
    area: "Stammdaten",
    label: "Pflichtangaben der eigenen Firma",
    description:
      "Angaben, die auf jeder Rechnung stehen müssen: Anschrift, Steuernummer oder USt-IdNr. und Bankverbindung.",
    severity: "critical",
    run: (db) => {
      const s = db.settings
      const missing: [keyof CompanySettings, string][] = [
        ["address", "Straße und Hausnummer"],
        ["zip", "Postleitzahl"],
        ["city", "Ort"],
        ["iban", "IBAN"],
      ]
      const out = missing
        .filter(([k]) => !String(s[k] ?? "").trim())
        .map(([k, label]) => ({
          id: `settings-incomplete:${k}`,
          ruleId: "settings-incomplete",
          area: "Stammdaten" as const,
          severity: "critical" as const,
          title: `${label} fehlt in den Firmendaten`,
          detail: "Pflichtangabe auf jeder Rechnung",
          href: "/settings",
        }))
      // Steuernummer ODER USt-IdNr. — eines von beiden genügt (§ 14 Abs. 4 Nr. 2).
      if (!s.taxNumber.trim() && !s.vatId.trim()) {
        out.push({
          id: "settings-incomplete:taxNumber",
          ruleId: "settings-incomplete",
          area: "Stammdaten" as const,
          severity: "critical" as const,
          title: "Steuernummer oder USt-IdNr. fehlt",
          detail: "Pflichtangabe nach § 14 Abs. 4 Nr. 2 UStG",
          href: "/settings",
        })
      }
      return out
    },
  },
]

export const RULE_BY_ID = new Map(CHECK_RULES.map((r) => [r.id, r]))

/** Eingestellte Frist einer Regel — ohne Eintrag gilt ihr Standard. */
export function ruleDays(rule: CheckRule, settings: CompanySettings): number {
  return settings.checkDays?.[rule.id] ?? rule.defaultDays ?? 0
}

/** Eine Regel ist aktiv, solange sie nicht ausdrücklich abgeschaltet wurde —
 *  eine neue Prüfung greift dadurch sofort, ohne Eintrag in den Einstellungen. */
export function ruleActive(ruleId: string, settings: CompanySettings): boolean {
  return settings.checks?.[ruleId] !== false
}

export const SEVERITY_ORDER: Record<CheckSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/** Alle offenen Punkte, gefiltert um abgeschaltete Regeln und ausgeblendete
 *  Einzelpunkte, sortiert nach Dringlichkeit. */
export function runChecks(db: Database): CheckFinding[] {
  const s = db.settings
  const hidden = new Set(s.checksHidden ?? [])
  return CHECK_RULES.filter((r) => ruleActive(r.id, s))
    .flatMap((r) => {
      try {
        return r.run(db, ruleDays(r, s))
      } catch {
        // Eine defekte Regel darf nicht die ganze Liste kippen.
        return []
      }
    })
    .filter((f) => !hidden.has(f.id))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export const SEVERITY_LABEL: Record<CheckSeverity, string> = {
  critical: "Kritisch",
  warning: "Offen",
  info: "Hinweis",
}
