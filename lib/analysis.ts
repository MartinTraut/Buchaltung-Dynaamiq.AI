import { answerText, money, type Answers } from "./onboarding"
import { parseDE } from "./format"

/**
 * Engpass-Rechenbeispiel aus dem Verkaufsgespräch.
 *
 * Das Vorbild (ScaleOS) rechnet den Schaden als eine Zahl und addiert am Ende
 * verlorene Arbeitszeit und entgangenen Umsatz zu einer Summe. Beides hält
 * dem ersten Nachbohren im Gespräch nicht stand:
 *
 *  - Eine Punktschätzung sagt „360 € im Monat", obwohl bei vier statt acht
 *    Stunden 180 € herauskommen. Die ganze Preisableitung hängt dann an einer
 *    Zahl, die um den Faktor zwei danebenliegen kann.
 *  - Zeit und Umsatz sind verschiedene Währungen. Wer sie addiert, verspricht
 *    dem Kunden Geld, das teils nur frei gewordene Stunden sind.
 *
 * Deshalb hier: Spannen statt Punkten, zwei getrennte Töpfe, und jede Annahme
 * trägt ihre Herkunft und die Frage mit, mit der man sie im Gespräch prüft.
 * Aus einer geprüften Annahme wird ein Befund — und die Rechnung wird enger,
 * statt dass eine neue Zahl daneben steht.
 */

export interface Range {
  min: number
  likely: number
  max: number
}

/** Woher eine Zahl stammt. Steht an jeder Annahme, damit man es später sieht. */
export type AssumptionSource = "genannt" | "geschätzt" | "bestätigt"

export const SOURCE_LABEL: Record<AssumptionSource, string> = {
  genannt: "vom Kunden genannt",
  geschätzt: "Erfahrungswert — ungeprüft",
  bestätigt: "im Gespräch bestätigt",
}

export interface Assumption {
  key: string
  label: string
  value: Range
  unit: string
  source: AssumptionSource
  /** Die Frage, mit der sich die Annahme im Gespräch prüfen lässt. */
  check: string
}

/**
 * Zeit oder Umsatz. Der Unterschied ist der Grund, warum es zwei Summen gibt
 * und keine dritte, die beide zusammenzählt.
 */
export type LossKind = "time" | "revenue"

export const LOSS_LABEL: Record<LossKind, string> = {
  time: "Gebundene Arbeitszeit",
  revenue: "Möglicher zusätzlicher Deckungsbeitrag",
}

export interface Bottleneck {
  id: string
  title: string
  kind: LossKind
  /** Monatlicher Betrag als Spanne — nie als eine Zahl. */
  monthly: Range
  /** Umsetzungsaufwand in Arbeitstagen. */
  days: number
  /**
   * Hebel in € je Umsetzungstag. Die Reihenfolge entsteht hieraus, nicht aus
   * der Schadenshöhe: ein Engpass mit 400 € Schaden, der an einem Tag behoben
   * ist, geht einem mit 900 € vor, der drei Wochen kostet.
   */
  leverage: number
  assumptions: Assumption[]
  /** Was im Gespräch tatsächlich gesagt wurde. Leer = nicht belegt. */
  evidence: string[]
  fix: string
}

/**
 * Der Satz, der neben jeder Auswertung stehen muss. Ohne ihn liest sich eine
 * Rechnung mit Spannen trotzdem wie eine Zusage — und eine Zusage über einen
 * Umsatzeffekt ist eine geschäftliche Handlung, die belegbar sein müsste.
 */
export const ANALYSIS_DISCLAIMER =
  "Rechenbeispiel, keine Zusicherung. Die Werte beruhen auf Ihren eigenen Angaben und auf Erfahrungswerten, die als geschätzt gekennzeichnet sind; sie sind weder gemessen noch prognostiziert. Ein bestimmter Umsatz-, Anfragen- oder Zeiteffekt wird nicht geschuldet. Zeit und Umsatz stehen getrennt und werden nicht addiert — gebundene Arbeitszeit ist kein Geld auf dem Konto."

export interface Analysis {
  bottlenecks: Bottleneck[]
  /** Getrennte Summen. Es gibt bewusst keine Gesamtsumme über beide. */
  totals: Record<LossKind, Range>
  /** Angaben, ohne die sich nichts rechnen lässt. */
  missing: string[]
}

const WEEKS_PER_MONTH = 4.33

function range(min: number, likely: number, max: number): Range {
  return { min: round(min), likely: round(likely), max: round(max) }
}

function round(n: number): number {
  return Math.round(n)
}

/**
 * Zahl aus einer Antwort. Über `parseDE`, weil „2.5" (Stunden) sonst zu 25
 * würde — und über die erste Zahlengruppe, weil im Gespräch Spannen genannt
 * werden („8-10 Stunden"). Ohne das ergäbe „8-10" NaN und der ganze Engpass
 * verschwände kommentarlos aus der Rechnung.
 */
function num(a: Answers, key: string): number {
  const text = answerText(a, key)
  const first = text.match(/-?\d+(?:[.,]\d+)*/)?.[0]
  if (!first) return 0
  const n = parseDE(first)
  return Number.isFinite(n) ? n : 0
}

/**
 * Stundensatz des Kunden. Nirgends erfasst, also eine offene Annahme mit
 * breiter Spanne — und einer Frage, die sie schließt. Das ist ehrlicher, als
 * einen Wert zu setzen und ihn wie eine Messung aussehen zu lassen.
 */
const HOURLY: Range = { min: 45, likely: 60, max: 85 }

/**
 * Wie viel mehr Anfragen ein neuer Auftritt bringt, ist vor dem Projekt nicht
 * messbar. Deshalb eine Spanne, die Kennzeichnung als ungeprüft und im
 * Gespräch die Frage nach der eigenen Erfahrung des Kunden.
 *
 * Die Untergrenze ist ausdrücklich 0 %: eine Untergrenze von 10 % wäre die
 * Behauptung, es komme mindestens ein Zehntel mehr herein — eine
 * Wirkungsaussage, die vor dem Projekt niemand belegen kann und für die im
 * Streitfall wir die Beweislast trügen (§ 5 UWG).
 */
const UPLIFT: Range = { min: 0, likely: 0.15, max: 0.35 }

export function analyze(a: Answers): Analysis {
  const bottlenecks: Bottleneck[] = []
  const missing: string[] = []

  const leads = num(a, "leadsPerMonth")
  const deal = money(a, "dealValue")
  const closeRate = num(a, "closeRate")
  const hours = num(a, "manualHours")

  // ── Entgangener Deckungsbeitrag ──────────────────────────────────────────
  if (leads > 0 && deal > 0) {
    // „30" meint 30 %, „0,3" meint dasselbe — und „300" ist ein Vertipper,
    // der sonst den dreifachen Deckungsbeitrag je Anfrage ins Kundengespräch
    // trägt. Beides abfangen, statt der Eingabe zu vertrauen.
    const close =
      closeRate <= 0 ? 0.3 : closeRate <= 1 ? closeRate : Math.min(1, closeRate / 100)
    const perExtraLead = deal * close
    const monthly = range(
      leads * UPLIFT.min * perExtraLead,
      leads * UPLIFT.likely * perExtraLead,
      leads * UPLIFT.max * perExtraLead,
    )
    const days = 12
    bottlenecks.push({
      id: "anfragen",
      title: "Anfragen, die der Auftritt heute nicht auslöst",
      kind: "revenue",
      monthly,
      days,
      leverage: round(monthly.likely / days),
      assumptions: [
        {
          key: "leadsPerMonth",
          label: "Anfragen pro Monat",
          value: range(leads, leads, leads),
          unit: "Anfragen",
          source: "genannt",
          check: "Ist das ein normaler Monat — oder war der letzte besonders gut oder schlecht?",
        },
        {
          key: "dealValue",
          label: "Deckungsbeitrag je Auftrag",
          value: range(deal, deal, deal),
          unit: "€",
          source: "genannt",
          check: "Ist das der Umsatz oder das, was nach Einkauf und Material übrig bleibt?",
        },
        {
          key: "closeRate",
          label: "Abschlussquote",
          value: range(close * 100, close * 100, close * 100),
          unit: "%",
          source: closeRate > 0 ? "genannt" : "geschätzt",
          check: "Von zehn Anfragen — wie viele werden am Ende Kunde?",
        },
        {
          key: "uplift",
          label: "Zuwachs an Anfragen (nicht zugesichert)",
          value: range(UPLIFT.min * 100, UPLIFT.likely * 100, UPLIFT.max * 100),
          unit: "%",
          source: "geschätzt",
          check:
            "Was hat sich beim letzten Mal geändert, als Sie am Auftritt etwas gemacht haben?",
        },
      ],
      evidence: [answerText(a, "currentSite"), answerText(a, "pain")].filter(Boolean),
      fix: "Auftritt, Struktur und Auffindbarkeit so aufbauen, dass Anfragen entstehen statt verloren gehen.",
    })
  } else {
    if (leads <= 0) missing.push("Anfragen pro Monat")
    if (deal <= 0) missing.push("Wert eines Auftrags")
  }

  // ── Gebundene Arbeitszeit ────────────────────────────────────────────────
  if (hours > 0) {
    const monthlyHours = hours * WEEKS_PER_MONTH
    const monthly = range(
      monthlyHours * HOURLY.min,
      monthlyHours * HOURLY.likely,
      monthlyHours * HOURLY.max,
    )
    const days = 5
    bottlenecks.push({
      id: "handarbeit",
      title: "Zeit, die jede Woche in dieselben Handgriffe geht",
      kind: "time",
      monthly,
      days,
      leverage: round(monthly.likely / days),
      assumptions: [
        {
          key: "manualHours",
          label: "Stunden pro Woche",
          value: range(hours, hours, hours),
          unit: "Std.",
          source: "genannt",
          check: "Sind das Ihre Stunden oder die eines Mitarbeiters — und in einer normalen Woche?",
        },
        {
          key: "hourly",
          label: "Angesetzter Stundensatz",
          value: HOURLY,
          unit: "€/Std.",
          source: "geschätzt",
          check: "Was kostet eine Arbeitsstunde bei Ihnen im Betrieb inklusive Nebenkosten?",
        },
      ],
      evidence: [answerText(a, "triedBefore")].filter(Boolean),
      fix: "Die wiederkehrenden Schritte automatisieren, statt sie schneller von Hand zu machen.",
    })
  } else {
    missing.push("Stunden pro Woche für Wiederkehrendes")
  }

  bottlenecks.sort((x, y) => y.leverage - x.leverage)

  // Zwei Summen, keine dritte: Zeit und Umsatz werden nicht addiert.
  const totals: Record<LossKind, Range> = {
    time: sum(bottlenecks.filter((b) => b.kind === "time")),
    revenue: sum(bottlenecks.filter((b) => b.kind === "revenue")),
  }

  return { bottlenecks, totals, missing }
}

function sum(list: Bottleneck[]): Range {
  return list.reduce<Range>(
    (acc, b) => range(acc.min + b.monthly.min, acc.likely + b.monthly.likely, acc.max + b.monthly.max),
    { min: 0, likely: 0, max: 0 },
  )
}

/** Offene Prüffragen — die Annahmen, die noch niemand bestätigt hat. */
export function openChecks(analysis: Analysis): Assumption[] {
  return analysis.bottlenecks
    .flatMap((b) => b.assumptions)
    .filter((x) => x.source === "geschätzt")
}
