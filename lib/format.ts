import type { LineItem } from "./types"

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
