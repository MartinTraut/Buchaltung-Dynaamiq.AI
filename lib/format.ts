import type { CompanySettings, LineItem } from "./types"

export function eur(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1000) {
    // Intls Kurznotation lässt im Deutschen unterhalb von 10.000 die Tausender-
    // gruppierung weg — „5000 €" stünde dann neben „11.000 €" in derselben Zeile.
    // Deshalb selbst kürzen: ganze Euro mit Gruppierung, abgekürzt erst ab einer
    // Million, wo die volle Ziffernfolge tatsächlich zu lang wird.
    const short =
      Math.abs(n) >= 1_000_000
        ? `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`
        : `${Math.round(n).toLocaleString("de-DE")} €`
    return short.replace("-", "−")
  }
  // Echtes Minuszeichen statt Bindestrich: nur U+2212 hat Ziffernbreite und
  // -höhe, sonst fällt jede Abzugszeile aus dem Zahlenraster.
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })
    .format(n)
    .replace("-", "−")
}

export function num(n: number, digits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

/**
 * Auf Cent runden. Beträge, die aus einer Zielgröße zurückgerechnet werden
 * (Nachlass auf einen glatten Bruttopreis), tragen sonst Bruchteile eines
 * Cents durch die Eingabemaske — im Feld steht dann „−672,161", was nach
 * einem Fehler aussieht, obwohl der gedruckte Beleg richtig rundet.
 */
export function cents(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Deutsche Zahleingabe lesen: „1.234,56", „1234,56", „1234.56", „1 234,56 €".
 * Gibt NaN zurück, wenn nichts Sinnvolles übrig bleibt — der Aufrufer
 * verwirft die Eingabe dann, statt eine 0 zu speichern.
 */
export function parseDE(input: string): number {
  const raw = input.replace(/[\s€]/g, "")
  if (!raw) return NaN
  const hasComma = raw.includes(",")
  const hasDot = raw.includes(".")
  // Beide Zeichen: der Punkt gruppiert, das Komma trennt die Nachkommastellen.
  // Nur Punkte: eine einzelne Gruppe mit genau drei Ziffern ist eine
  // Tausendergruppe („1.900"), alles andere ein Dezimalpunkt („1234.56").
  const normalized =
    hasComma && hasDot
      ? raw.replace(/\./g, "").replace(",", ".")
      : hasComma
        ? raw.replace(",", ".")
        : /^-?\d{1,3}(\.\d{3})+$/.test(raw)
          ? raw.replace(/\./g, "")
          : raw
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

/** Zahl für ein Eingabefeld: deutsche Schreibweise ohne Währungszeichen. */
export function numInput(n: number, minDigits = 0, maxDigits = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(n)
}

export function pct(n: number, digits = 1): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)} %`
}

export function dateDE(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Numerisch „18.08.2026" — für Belege, wo die Datumsspalte ins Raster muss. */
export function dateNum(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function dateShort(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  })
}

/** Lokaler Tages-Schlüssel „YYYY-MM-DD" — konsistent für Kalender-Gruppierung
 *  und `type=date`-Inputs (arbeitet in lokaler Zeit, nicht UTC). */
export function dayKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  const p = (n: number) => String(n).padStart(2, "0")
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** ISO-Timestamp → Wert für ein `type=date`-Input (lokaler Tag). */
export function toDateInput(iso?: string): string {
  return iso ? dayKey(iso) : ""
}

/** `type=date`-Wert („YYYY-MM-DD") → ISO-Timestamp der lokalen Mitternacht. */
export function fromDateInput(value?: string): string | undefined {
  if (!value) return undefined
  return new Date(`${value}T00:00:00`).toISOString()
}

/** Standarddauer eines Termins ohne Endzeit (Minuten). */
export const DEFAULT_EVENT_MINUTES = 60

/** „HH:MM" → Minuten seit Mitternacht. Ungültig/leer → null. */
export function minutesOfTime(time?: string): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Minuten seit Mitternacht → „HH:MM" (auf den Tag begrenzt). */
export function timeOfMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(Math.floor(clamped / 60) % 24)}:${p(clamped % 60)}`
}

/** Zeitspanne eines Termins als Text, z. B. „09:00–10:30". */
export function timeRange(time?: string, endTime?: string): string {
  const start = minutesOfTime(time)
  if (start === null) return ""
  const end = minutesOfTime(endTime)
  return end !== null && end > start
    ? `${timeOfMinutes(start)}–${timeOfMinutes(end)}`
    : timeOfMinutes(start)
}

/** Fällig­keitsprüfung für Aufgaben: alles vor dem heutigen Tagesende ist
 *  überfällig. Steht hier statt in der Komponente, weil eine Uhrzeit im
 *  Renderpfad die Ausgabe von Render zu Render wandern lässt. */
export function isOverdue(due?: string): boolean {
  if (!due) return false
  return new Date(due).setHours(23, 59, 59, 999) < Date.now()
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "gerade eben"
  if (min < 60) return `vor ${min} Min.`
  const h = Math.round(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.round(h / 24)
  if (d < 30) return `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`
  return dateDE(iso)
}

export function initials(name: string): string {
  // Gedankenstriche und Klammern in Firmierungen („Wrapcut – Ihr Folienexperte")
  // sind keine Wörter: ohne den Filter stünde „W–" im Kürzel.
  return name
    .split(/\s+/)
    .filter((w) => /\p{L}|\d/u.test(w))
    .slice(0, 2)
    .map((w) => w.match(/[\p{L}\d]/u)?.[0].toUpperCase() ?? "")
    .join("")
}

// ---------- Settings-abgeleitete Helfer ----------

/** Vorname des Inhabers aus den Settings (Fallback: Firmenname). */
export function ownerFirstName(
  settings: Pick<CompanySettings, "ownerName" | "name">,
): string {
  const first = (settings.ownerName ?? "").trim().split(/\s+/)[0]
  return first || settings.name
}

/** E-Mail-Grußformel „Beste Grüße\n<Vorname> — <Firma>". */
export function emailSignature(
  settings: Pick<CompanySettings, "ownerName" | "name">,
): string {
  return `Beste Grüße\n${ownerFirstName(settings)} — ${settings.name}`
}

// ---------- Invoice / quote math ----------

export interface DocTotals {
  net: number
  tax: number
  gross: number
  taxBreakdown: { rate: number; base: number; tax: number }[]
}

export function lineNet(item: LineItem): number {
  return item.qty * item.unitPrice
}

/** Dokumentnummer „PREFIX-431" — Laufnummer mindestens dreistellig aufgefüllt,
 *  damit Rechnungs-/Angebotsnummern einheitlich und professionell aussehen. */
export function formatDocNumber(prefix: string, no: number): string {
  return `${prefix}-${String(no).padStart(3, "0")}`
}

/**
 * Vertragsnummer „V-1006-01" — Kundennummer plus laufende Nummer je Kunde.
 *
 * Anders als Rechnung und Angebot gehört ein Vertrag nicht zu einem Vorgang im
 * Jahr, sondern zu einer Geschäftsbeziehung, und ein Kunde kann mehrere haben
 * (SKOPE: Website und Warenwirtschaft). Eine jahresweise Zählung zeigt weder
 * den Kunden noch das wievielte Paket. Fehlt dem Kunden eine Nummer, fällt die
 * Vergabe auf die reine Laufnummer zurück, damit nie eine leere Stelle im
 * Nummernkreis entsteht.
 */
export function contractNumberFor(
  prefix: string,
  customerNumber: string | undefined,
  existingNumbers: string[],
): string {
  const digits = /\d+/.exec(customerNumber ?? "")?.[0]
  if (!digits) return formatDocNumber(prefix, existingNumbers.length + 1)
  const base = `${prefix}-${digits}`
  const seq = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`)
  let highest = 0
  for (const number of existingNumbers) {
    const m = seq.exec(number)
    if (m) highest = Math.max(highest, parseInt(m[1], 10))
  }
  return `${base}-${String(highest + 1).padStart(2, "0")}`
}

/**
 * Summen eines Belegs — durchgehend auf Cent gerundet.
 *
 * Zwei Fallen stecken darin, und beide fallen erst auf dem gedruckten Beleg
 * auf. Erstens rundet die Anzeige jede Positionszeile für sich: summiert man
 * ungerundet weiter, steht unter drei Zeilen eine Zwischensumme, die um einen
 * Cent von den darüberstehenden Zahlen abweicht — der Kunde rechnet nach und
 * findet einen Fehler. Zweitens ist Gleitkomma nicht exakt (1899 × 0,19 ergibt
 * 360,81000000000006); jeder Vergleich auf Gleichheit, jede Zahlungsabgleichung
 * und der Betrag im GiroCode erben diesen Rest. Deshalb: Position auf Cent,
 * Steuer je Steuersatz auf Cent, und alles Weitere aus diesen festen Werten.
 *
 * Die Steuer wird je Steuersatz aus der gerundeten Bemessungsgrundlage
 * berechnet, nicht je Zeile — so verlangt es §14 UStG für den Steuerausweis.
 */
export function computeTotals(items: LineItem[]): DocTotals {
  const byRate = new Map<number, number>()
  let net = 0
  for (const it of items) {
    const base = cents(lineNet(it))
    net = cents(net + base)
    byRate.set(it.taxRate, cents((byRate.get(it.taxRate) ?? 0) + base))
  }
  const taxBreakdown = [...byRate.entries()]
    .filter(([rate]) => rate > 0)
    .map(([rate, base]) => ({ rate, base, tax: cents(base * rate) }))
    .sort((a, b) => b.rate - a.rate)
  const tax = cents(taxBreakdown.reduce((s, t) => s + t.tax, 0))
  return { net, tax, gross: cents(net + tax), taxBreakdown }
}
