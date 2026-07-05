"use client"

import * as React from "react"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  KanbanSquare,
  ReceiptEuro,
  ArrowUpRight,
  Sparkles,
  CircleDollarSign,
  CheckCircle2,
  Circle,
  Clock,
  SlidersHorizontal,
  Check,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { kpis, monthlyRevenue, pipelineByStage, expenseBreakdown } from "@/lib/metrics"
import { eur, dateDE, relativeTime, computeTotals, ownerFirstName } from "@/lib/format"
import { useLocalState } from "@/hooks/use-local-state"
import { KpiCard, SectionTitle } from "@/components/kpi-card"
import { RevenueArea, PipelineBars, DonutChart } from "@/components/charts"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, Progress } from "@/components/ui/misc"
import { Button } from "@/components/ui/button"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
} from "@/components/ui/dropdown"

const ACTIVITY_TINT: Record<string, string> = {
  payment: "#2fd3a5",
  deal: "#00ffe6",
  invoice: "#1f7bf2",
  quote: "#8b5cf6",
  customer: "#5b2eff",
  project: "#ffb02e",
  email: "#8a8a93",
  ai: "#00ffe6",
}

export default function DashboardPage() {
  const { db, customerById } = useStore()
  const k = kpis(db)
  const rev = monthlyRevenue(db)
  const pipe = pipelineByStage(db)
  const expenses = expenseBreakdown(db)

  const openInvoices = db.invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
    .slice(0, 4)

  const openTasks = db.tasks.filter((t) => t.status !== "done").slice(0, 5)

  const topCustomers = [...db.customers]
    .map((c) => {
      const revenue = db.invoices
        .filter((i) => i.customerId === c.id && i.status === "paid")
        .reduce((s, i) => s + computeTotals(i.items).gross, 0)
      return { c, revenue }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4)
  const maxRev = Math.max(...topCustomers.map((t) => t.revenue), 1)

  // ---- Konfigurierbare KPIs (Auswahl wird gespeichert) ----
  const monthExpenses = rev[rev.length - 1]?.expenses ?? 0
  const profitSpark = rev.map((m) => m.revenue - m.expenses)
  const KPI_DEFS = [
    { key: "umsatz", label: "Umsatz (Monat)", value: k.monthRevenue, delta: k.revDelta, spark: k.spark, accent: "#1f7bf2", sparkColor: "#1f7bf2", icon: <TrendingUp className="size-4" /> },
    { key: "gewinn", label: "Gewinn (Monat)", value: k.profit, delta: k.margin, spark: profitSpark, accent: "#2fd3a5", sparkColor: "#2fd3a5", icon: <CircleDollarSign className="size-4" /> },
    { key: "ausgaben", label: "Ausgaben (Monat)", value: monthExpenses, spark: rev.map((m) => m.expenses), accent: "#ff4d4d", sparkColor: "#ff7a7a", icon: <TrendingDown className="size-4" /> },
    { key: "pipeline", label: "Pipeline (gewichtet)", value: k.weightedPipeline, spark: pipe.map((p) => p.value), accent: "#00ffe6", sparkColor: "#00ffe6", icon: <KanbanSquare className="size-4" /> },
    { key: "offen", label: "Offene Forderungen", value: k.open, accent: "#5b2eff", sparkColor: "#5b2eff", icon: <ReceiptEuro className="size-4" /> },
  ] as const

  const [visibleKpis, setVisibleKpis] = useLocalState<string[]>("dyn-dash-kpis", [
    "umsatz",
    "gewinn",
    "pipeline",
    "offen",
  ])
  const toggleKpi = (key: string) =>
    setVisibleKpis((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const shownKpis = KPI_DEFS.filter((d) => visibleKpis.includes(d.key))

  const [revSeries, setRevSeries] = useLocalState<Record<string, boolean>>("dyn-rev-series", {
    revenue: true,
    expenses: true,
    profit: false,
  })
  const toggleSeries = (key: string) =>
    setRevSeries((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="mx-auto max-w-[1760px] space-y-6">
      {/* Greeting hero */}
      <div className="animate-fade flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Willkommen zurück, {ownerFirstName(db.settings)} 👋
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-[34px]">
            Dein Business-Cockpit
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {dateDE(new Date().toISOString())} · Alles Wichtige auf einen Blick
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-11 gap-2 px-5 text-[15px]">
          <Link href="/assistant">
            <Sparkles className="size-4" /> Mit KI erstellen
          </Link>
        </Button>
      </div>

      {/* KPI strip — konfigurierbar */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle className="mb-0">Kennzahlen</SectionTitle>
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="size-3.5" /> Anpassen
              </Button>
            </DropdownTrigger>
            <DropdownContent align="end" className="w-56">
              <DropdownLabel>Kennzahlen anzeigen</DropdownLabel>
              {KPI_DEFS.map((d) => {
                const on = visibleKpis.includes(d.key)
                return (
                  <DropdownItem
                    key={d.key}
                    onSelect={(e) => {
                      e.preventDefault()
                      toggleKpi(d.key)
                    }}
                    className="justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: d.accent }} />
                      {d.label}
                    </span>
                    {on && <Check className="size-4 text-brand-cyan" />}
                  </DropdownItem>
                )
              })}
            </DropdownContent>
          </Dropdown>
        </div>

        {shownKpis.length === 0 ? (
          <button
            onClick={() => setVisibleKpis(["umsatz", "gewinn", "pipeline", "offen"])}
            className="glass flex w-full items-center justify-center gap-2 rounded-2xl p-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" /> Keine Kennzahl aktiv — Standard wiederherstellen
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shownKpis.map((d, i) => (
              <KpiCard
                key={d.key}
                label={d.label}
                value={d.value}
                format={(n) => eur(n)}
                delta={"delta" in d ? d.delta : undefined}
                spark={"spark" in d ? d.spark : undefined}
                accent={d.accent}
                sparkColor={d.sparkColor}
                icon={d.icon}
                delay={i * 80}
              />
            ))}
          </div>
        )}
      </div>

      {/* Revenue + pipeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <SectionTitle className="mb-0">Umsatz · Ausgaben · Gewinn</SectionTitle>
              <p className="text-xs text-muted-foreground">Letzte 12 Monate · Serien anklickbar</p>
            </div>
          </div>
          <div className="p-3 pt-4">
            <RevenueArea data={rev} visible={revSeries} onToggle={toggleSeries} />
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <SectionTitle className="mb-0">Pipeline nach Phase</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Offenes Volumen · {eur(k.pipelineValue, { compact: true })}
            </p>
          </div>
          <div className="p-3 pt-4">
            <PipelineBars data={pipe} />
          </div>
        </Card>
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Activity */}
        <Card className="lg:col-span-1">
          <div className="p-5 pb-2">
            <SectionTitle className="mb-0">Aktivität</SectionTitle>
          </div>
          <div className="flex flex-col gap-1 p-3 pt-0">
            {db.activities.slice(0, 7).map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: ACTIVITY_TINT[a.type] ?? "#8a8a93" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground/90">{a.title}</p>
                  {a.meta && (
                    <p className="truncate text-xs text-muted-foreground">
                      {a.meta}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground/70">
                  {relativeTime(a.at)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Open invoices */}
        <Card>
          <div className="flex items-center justify-between p-5 pb-2">
            <SectionTitle className="mb-0">Offene Rechnungen</SectionTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/invoices">
                Alle <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-1 p-3 pt-0">
            {openInvoices.map((inv) => {
              const c = customerById(inv.customerId)
              const overdue = inv.status === "overdue"
              return (
                <Link
                  href="/invoices"
                  key={inv.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <Avatar name={c?.company ?? "?"} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c?.company}</p>
                    <p className="text-xs text-muted-foreground">{inv.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tnum">
                      {eur(computeTotals(inv.items).gross)}
                    </p>
                    <Badge
                      variant={overdue ? "danger" : "warning"}
                      className="mt-0.5 text-[10px]"
                    >
                      {overdue ? "Überfällig" : `bis ${dateDE(inv.dueDate)}`}
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        {/* Tasks + expenses gestapelt → füllt die Spaltenhöhe aus */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="p-5 pb-2">
              <SectionTitle className="mb-0">Anstehende Aufgaben</SectionTitle>
            </div>
            <div className="flex flex-col gap-1 p-3 pt-0">
              {openTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                >
                  {t.status === "doing" ? (
                    <Clock className="size-4 text-brand-blue" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/50" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {t.title}
                  </span>
                  {t.due && (
                    <span className="text-[11px] text-muted-foreground">
                      {dateDE(t.due)}
                    </span>
                  )}
                </div>
              ))}
              {openTasks.length === 0 && (
                <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-[#2fd3a5]" /> Alles erledigt!
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <SectionTitle className="mb-0">Ausgaben-Struktur</SectionTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  Alle <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="p-3 pb-1">
              <DonutChart data={expenses} />
            </div>
            <div className="space-y-1.5 px-5 pb-5">
              {expenses.map((e) => (
                <div key={e.name} className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full" style={{ background: e.fill }} />
                  <span className="flex-1 truncate text-muted-foreground">{e.name}</span>
                  <span className="font-medium tnum">{eur(e.value, { compact: true })}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Top customers — volle Breite */}
      <Card>
        <div className="p-5 pb-2">
          <SectionTitle className="mb-0">Top-Kunden nach Umsatz</SectionTitle>
        </div>
        <div className="grid gap-x-8 gap-y-3 p-5 pt-2 md:grid-cols-2">
          {topCustomers.map(({ c, revenue }) => (
            <div key={c.id} className="flex items-center gap-3">
              <Avatar name={c.company} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.company}</p>
                  <p className="text-sm font-semibold tnum">{eur(revenue)}</p>
                </div>
                <Progress value={(revenue / maxRev) * 100} className="mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
