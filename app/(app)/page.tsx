"use client"

import Link from "next/link"
import {
  TrendingUp,
  Wallet,
  KanbanSquare,
  ReceiptEuro,
  ArrowUpRight,
  Sparkles,
  CircleDollarSign,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { kpis, monthlyRevenue, pipelineByStage, expenseBreakdown } from "@/lib/metrics"
import { eur, dateDE, relativeTime, computeTotals } from "@/lib/format"
import { KpiCard, SectionTitle } from "@/components/kpi-card"
import { RevenueArea, PipelineBars, DonutChart } from "@/components/charts"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, Progress } from "@/components/ui/misc"
import { Button } from "@/components/ui/button"

const ACTIVITY_TINT: Record<string, string> = {
  payment: "#2fd3a5",
  deal: "#ff2d7e",
  invoice: "#ff6a00",
  quote: "#8b5cf6",
  customer: "#e81ccb",
  project: "#ffb02e",
  email: "#8a8a93",
  ai: "#ff2d7e",
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Greeting hero */}
      <div className="animate-fade flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Willkommen zurück, Martin 👋
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

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Umsatz (Monat)"
          value={k.monthRevenue}
          format={(n) => eur(n)}
          delta={k.revDelta}
          spark={k.spark}
          accent="#ff6a00"
          icon={<TrendingUp className="size-4" />}
          delay={0}
        />
        <KpiCard
          label="Gewinn (Monat)"
          value={k.profit}
          format={(n) => eur(n)}
          delta={k.margin}
          accent="#2fd3a5"
          sparkColor="#2fd3a5"
          spark={rev.map((m) => m.revenue - m.expenses)}
          icon={<CircleDollarSign className="size-4" />}
          delay={80}
        />
        <KpiCard
          label="Pipeline (gewichtet)"
          value={k.weightedPipeline}
          format={(n) => eur(n)}
          accent="#ff2d7e"
          sparkColor="#ff2d7e"
          spark={pipe.map((p) => p.value)}
          icon={<KanbanSquare className="size-4" />}
          delay={160}
        />
        <KpiCard
          label="Offene Forderungen"
          value={k.open}
          format={(n) => eur(n)}
          accent="#e81ccb"
          sparkColor="#e81ccb"
          icon={<ReceiptEuro className="size-4" />}
          delay={240}
        />
      </div>

      {/* Revenue + pipeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <SectionTitle className="mb-0">Umsatz vs. Ausgaben</SectionTitle>
              <p className="text-xs text-muted-foreground">Letzte 12 Monate</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-brand-pink" /> Umsatz
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-[#6c7693]" /> Ausgaben
              </span>
            </div>
          </div>
          <div className="p-3 pt-4">
            <RevenueArea data={rev} />
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

        {/* Tasks + expenses */}
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
                    <Clock className="size-4 text-brand-orange" />
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
        </div>
      </div>

      {/* Top customers + expenses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-5 pb-2">
            <SectionTitle className="mb-0">Top-Kunden nach Umsatz</SectionTitle>
          </div>
          <div className="space-y-3 p-5 pt-2">
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

        <Card>
          <div className="p-5 pb-0">
            <SectionTitle className="mb-0">Ausgaben-Struktur</SectionTitle>
          </div>
          <div className="p-3">
            <DonutChart data={expenses} />
          </div>
          <div className="space-y-1.5 px-5 pb-5">
            {expenses.map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 rounded-full"
                  style={{ background: e.fill }}
                />
                <span className="flex-1 truncate text-muted-foreground">
                  {e.name}
                </span>
                <span className="font-medium tnum">{eur(e.value, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
