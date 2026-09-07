import type { Database } from "./types"
import { DEAL_STAGES } from "./types"
import { computeTotals, eur, dateDE } from "./format"
import { kpis } from "./metrics"

/**
 * Der eigene Bestand als kurzer Zahlenauszug für den Assistenten.
 *
 * Ohne ihn beantwortet der Assistent Fragen wie „woran soll ich heute
 * arbeiten" aus dem Nichts — er kennt weder die offenen Rechnungen noch die
 * Deals, die seit Wochen stillstehen. Ein Rat ohne Befund ist eine Meinung.
 *
 * Bewusst knapp und aggregiert: es gehen Summen, Anzahlen und die Namen der
 * betroffenen Vorgänge hinaus, keine vollständigen Datensätze. Was
 * herangezogen wurde, steht in `sources` und wird in der Oberfläche über der
 * Antwort angezeigt — man soll sehen, worauf sie beruht, bevor man sie liest.
 */
export interface Briefing {
  text: string
  sources: string[]
}

/** Vorgänge, die seit `days` Tagen unverändert sind. */
function stale(iso: string | undefined, days: number): boolean {
  if (!iso) return false
  return Date.now() - +new Date(iso) > days * 86_400_000
}

export function businessBriefing(db: Database): Briefing {
  const k = kpis(db)
  const sources: string[] = []
  const lines: string[] = []

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const openDeals = db.deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
  if (openDeals.length) {
    sources.push("Pipeline")
    const byStage = DEAL_STAGES.filter((s) => s.id !== "won" && s.id !== "lost")
      .map((s) => {
        const n = openDeals.filter((d) => d.stage === s.id).length
        return n ? `${n}× ${s.label}` : ""
      })
      .filter(Boolean)
    lines.push(
      `Pipeline: ${openDeals.length} offene Deals über ${eur(k.pipelineValue)} netto (gewichtet ${eur(k.weightedPipeline)}) — ${byStage.join(", ")}.`,
    )
    const stuck = openDeals.filter((d) => stale(d.createdAt, 21))
    if (stuck.length) {
      lines.push(
        `Seit über drei Wochen unverändert: ${stuck.slice(0, 5).map((d) => d.title).join("; ")}${stuck.length > 5 ? ` und ${stuck.length - 5} weitere` : ""}.`,
      )
    }
  }

  // ── Rechnungen ───────────────────────────────────────────────────────────
  const openInv = db.invoices.filter((i) => i.status === "sent" || i.status === "overdue")
  if (openInv.length) {
    sources.push("Rechnungen")
    lines.push(
      `Rechnungen: ${openInv.length} offen über ${eur(k.open)} brutto, davon ${eur(k.overdue)} überfällig.`,
    )
    const late = db.invoices
      .filter((i) => i.status === "overdue")
      .slice(0, 5)
      .map((i) => `${i.number} (${eur(computeTotals(i.items).gross)}, fällig war ${dateDE(i.dueDate)})`)
    if (late.length) lines.push(`Überfällig: ${late.join("; ")}.`)
  }

  // ── Angebote ─────────────────────────────────────────────────────────────
  const sentQuotes = db.quotes.filter((q) => q.status === "sent")
  if (sentQuotes.length) {
    sources.push("Angebote")
    const expiring = sentQuotes.filter(
      (q) => +new Date(q.validUntil) - Date.now() < 7 * 86_400_000,
    )
    lines.push(
      `Angebote: ${sentQuotes.length} versendet und noch offen${
        expiring.length ? `, davon ${expiring.length} in den nächsten sieben Tagen ablaufend` : ""
      }.`,
    )
  }

  // ── Aufgaben ─────────────────────────────────────────────────────────────
  const openTasks = db.tasks.filter((t) => t.status !== "done")
  if (openTasks.length) {
    sources.push("Aufgaben")
    const overdue = openTasks.filter((t) => t.due && +new Date(t.due) < Date.now())
    lines.push(
      `Aufgaben: ${openTasks.length} offen${overdue.length ? `, ${overdue.length} davon über der Fälligkeit` : ""}.`,
    )
  }

  // ── Zahlen des Monats ────────────────────────────────────────────────────
  sources.push("Zahlen")
  lines.push(
    `Laufender Monat: ${eur(k.monthRevenue)} Umsatz netto, ${eur(k.profit)} Ergebnis. Jahr bisher: ${eur(k.ytdRevenue)} Umsatz, ${eur(k.ytdExpenses)} Ausgaben.`,
  )
  lines.push(`Kunden: ${k.activeCustomers} aktiv, ${k.leads} Leads.`)

  return { text: lines.join("\n"), sources }
}

/**
 * Startpunkte für den Assistenten — aus dem echten Bestand formuliert.
 *
 * „Leads bearbeiten" ist eine Überschrift; „Aus 19 offenen Deals einen
 * Abschluss machen" ist eine Aufgabe. Deshalb entstehen die Vorschläge aus den
 * Zahlen und erscheinen nur, wenn es die Zahl auch gibt.
 */
export function briefingPrompts(db: Database): string[] {
  const out: string[] = []
  const openDeals = db.deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
  const overdue = db.invoices.filter((i) => i.status === "overdue")
  const sentQuotes = db.quotes.filter((q) => q.status === "sent")
  const openTasks = db.tasks.filter((t) => t.status !== "done")

  if (openDeals.length)
    out.push(
      `Aus meinen ${openDeals.length} offenen Deals: welcher hat den größten Hebel und was ist der nächste Schritt?`,
    )
  if (overdue.length)
    out.push(`Welche der ${overdue.length} überfälligen Rechnungen mahne ich zuerst an — und wie formuliere ich es?`)
  if (sentQuotes.length)
    out.push(`Bei welchem der ${sentQuotes.length} versendeten Angebote soll ich nachfassen?`)
  if (openTasks.length)
    out.push(`Welche meiner ${openTasks.length} offenen Aufgaben bringt diese Woche am meisten?`)
  out.push("Wie steht der laufende Monat im Vergleich zum Vormonat — und was folgt daraus?")
  return out.slice(0, 5)
}
