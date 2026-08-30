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
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
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

export function computeTotals(items: LineItem[]): DocTotals {
  const byRate = new Map<number, { base: number; tax: number }>()
  let net = 0
  for (const it of items) {
    const base = lineNet(it)
    net += base
    const cur = byRate.get(it.taxRate) ?? { base: 0, tax: 0 }
    cur.base += base
    cur.tax += base * it.taxRate
    byRate.set(it.taxRate, cur)
  }
  const taxBreakdown = [...byRate.entries()]
    .filter(([rate]) => rate > 0)
    .map(([rate, v]) => ({ rate, base: v.base, tax: v.tax }))
    .sort((a, b) => b.rate - a.rate)
  const tax = taxBreakdown.reduce((s, t) => s + t.tax, 0)
  return { net, tax, gross: net + tax, taxBreakdown }
}
