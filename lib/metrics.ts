import type { Database, DealStage } from "./types"
import { computeTotals } from "./format"
import { DEAL_STAGES } from "./types"

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]

export function monthlyRevenue(db: Database) {
  const buckets = new Map<string, { revenue: number; expenses: number; key: number }>()
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    buckets.set(key, { revenue: 0, expenses: 0, key: d.getMonth() })
  }
  for (const t of db.transactions) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const b = buckets.get(key)
    if (!b) continue
    const net = t.amount / (1 + t.taxRate)
    if (t.type === "income") b.revenue += net
    else b.expenses += net
  }
  return [...buckets.values()].map((b) => ({
    label: MONTHS[b.key],
    revenue: Math.round(b.revenue),
    expenses: Math.round(b.expenses),
  }))
}

export function kpis(db: Database) {
  const rev = monthlyRevenue(db)
  const thisMonth = rev[rev.length - 1]
  const lastMonth = rev[rev.length - 2] ?? { revenue: 0, expenses: 0 }
  const ytdRevenue = rev.reduce((s, m) => s + m.revenue, 0)
  const ytdExpenses = rev.reduce((s, m) => s + m.expenses, 0)

  const open = db.invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + computeTotals(i.items).gross, 0)
  const overdue = db.invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + computeTotals(i.items).gross, 0)

  const pipelineValue = db.deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((s, d) => s + d.value, 0)
  const weightedPipeline = db.deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((s, d) => s + (d.value * d.probability) / 100, 0)

  const wonThisCycle = db.deals
    .filter((d) => d.stage === "won")
    .reduce((s, d) => s + d.value, 0)

  const revDelta =
    lastMonth.revenue > 0
      ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100
      : 0
  const profit = thisMonth.revenue - thisMonth.expenses
  const margin = thisMonth.revenue > 0 ? (profit / thisMonth.revenue) * 100 : 0

  return {
    monthRevenue: thisMonth.revenue,
    revDelta,
    ytdRevenue,
    ytdExpenses,
    profit,
    margin,
    open,
    overdue,
    pipelineValue,
    weightedPipeline,
    wonThisCycle,
    activeCustomers: db.customers.filter((c) => c.health === "active").length,
    leads: db.customers.filter((c) => c.health === "lead").length,
    spark: rev.map((m) => m.revenue),
  }
}

export function pipelineByStage(db: Database) {
  return DEAL_STAGES.filter((s) => s.id !== "won" && s.id !== "lost").map((s) => {
    const deals = db.deals.filter((d) => d.stage === (s.id as DealStage))
    return {
      label: s.label,
      value: deals.reduce((sum, d) => sum + d.value, 0),
      count: deals.length,
      fill: s.tint,
    }
  })
}

export function expenseBreakdown(db: Database) {
  const map = new Map<string, number>()
  for (const t of db.transactions) {
    if (t.type !== "expense") continue
    const net = t.amount / (1 + t.taxRate)
    map.set(t.category, (map.get(t.category) ?? 0) + net)
  }
  const palette = ["#ff6a00", "#ff2d7e", "#e81ccb", "#8b5cf6", "#2fd3a5"]
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], i) => ({
      name,
      value: Math.round(value),
      fill: palette[i % palette.length],
    }))
}

export function vatSummary(db: Database) {
  let collected = 0
  let paid = 0
  for (const t of db.transactions) {
    const tax = t.amount - t.amount / (1 + t.taxRate)
    if (t.type === "income") collected += tax
    else paid += tax
  }
  return { collected, paid, balance: collected - paid }
}
