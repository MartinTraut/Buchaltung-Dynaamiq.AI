import type { CompanySettings, LineItem } from "./types"

export function eur(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n)
  }
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
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
