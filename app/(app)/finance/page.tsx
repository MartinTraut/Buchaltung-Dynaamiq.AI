"use client"

import * as React from "react"
import { Plus, TrendingUp, TrendingDown, Scale, Download } from "lucide-react"
import { useStore } from "@/lib/store"
import { kpis, monthlyRevenue, expenseBreakdown, vatSummary } from "@/lib/metrics"
import { eur, dateDE } from "@/lib/format"
import type { Transaction, TxType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RevenueArea, DonutChart } from "@/components/charts"
import { SectionTitle } from "@/components/kpi-card"
import { Input, Label, Select } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function FinancePage() {
  const { db, addTransaction } = useStore()
  const k = kpis(db)
  const rev = monthlyRevenue(db)
  const expenses = expenseBreakdown(db)
  const vat = vatSummary(db)
  const [open, setOpen] = React.useState(false)

  const tx = [...db.transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 30)

  function exportCsv() {
    const header = "Datum;Typ;Kategorie;Beschreibung;Brutto;USt-Satz\n"
    const body = db.transactions
      .map((t) => `${dateDE(t.date)};${t.type === "income" ? "Einnahme" : "Ausgabe"};${t.category};${t.description};${t.amount.toFixed(2)};${Math.round(t.taxRate * 100)}%`)
      .join("\n")
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "dynaamiq-buchhaltung.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exportiert")
  }

  return (
    <div className="mx-auto max-w-[1760px] space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FinKpi label="Einnahmen (YTD)" value={eur(k.ytdRevenue)} icon={<TrendingUp className="size-4" />} tint="#2fd3a5" />
        <FinKpi label="Ausgaben (YTD)" value={eur(k.ytdExpenses)} icon={<TrendingDown className="size-4" />} tint="#ff4d4d" />
        <FinKpi label="Gewinn (YTD)" value={eur(k.ytdRevenue - k.ytdExpenses)} icon={<Scale className="size-4" />} tint="#1f7bf2" />
        <FinKpi label="USt-Zahllast" value={eur(vat.balance)} icon={<Scale className="size-4" />} tint="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="p-5 pb-0">
            <SectionTitle className="mb-0">Einnahmen vs. Ausgaben</SectionTitle>
            <p className="text-xs text-muted-foreground">Netto, letzte 12 Monate</p>
          </div>
          <div className="p-3 pt-4"><RevenueArea data={rev} /></div>
        </Card>

        <Card>
          <div className="p-5 pb-0"><SectionTitle className="mb-0">USt-Übersicht</SectionTitle></div>
          <div className="space-y-3 p-5">
            <VatRow label="Vereinnahmte USt" value={vat.collected} />
            <VatRow label="Vorsteuer (gezahlt)" value={-vat.paid} />
            <div className="h-px bg-white/8" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zahllast ans Finanzamt</span>
              <span className="font-display text-lg font-bold tnum text-brand-gradient">{eur(vat.balance)}</span>
            </div>
          </div>
          <div className="border-t border-white/8 p-5 pt-4">
            <SectionTitle className="mb-3">Ausgaben-Kategorien</SectionTitle>
            <DonutChart data={expenses} />
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle className="mb-0">Transaktionen</SectionTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button variant="brand" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Buchung
            </Button>
          </div>
        </div>

        <div className="glass overflow-hidden rounded-2xl">
          {tx.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3 last:border-0">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{ background: t.type === "income" ? "#2fd3a51f" : "#ff4d4d1f" }}
              >
                {t.type === "income" ? (
                  <TrendingUp className="size-4 text-[#3ee3b5]" />
                ) : (
                  <TrendingDown className="size-4 text-[#ff7a7a]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {dateDE(t.date)}</p>
              </div>
              <Badge variant="muted" className="hidden sm:inline-flex">{Math.round(t.taxRate * 100)} % USt</Badge>
              <span className={`text-sm font-semibold tnum ${t.type === "income" ? "text-[#3ee3b5]" : "text-foreground"}`}>
                {t.type === "income" ? "+" : "−"}{eur(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <TxDialog open={open} onOpenChange={setOpen} onSave={(d) => { addTransaction(d); toast.success("Buchung erfasst"); setOpen(false) }} />
    </div>
  )
}

function FinKpi({ label, value, icon, tint }: { label: string; value: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${tint}1f`, color: tint }}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2.5 font-display text-xl font-bold tnum">{value}</p>
    </div>
  )
}

function VatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tnum">{eur(value)}</span>
    </div>
  )
}

function TxDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (d: Partial<Transaction>) => void
}) {
  const [form, setForm] = React.useState<Partial<Transaction>>({ type: "expense", taxRate: 0.19, amount: 0, date: new Date().toISOString() })
  const set = (p: Partial<Transaction>) => setForm((f) => ({ ...f, ...p }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Neue Buchung</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Typ</Label>
            <Select value={form.type} onChange={(e) => set({ type: e.target.value as TxType })}>
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </Select>
          </div>
          <div>
            <Label>Betrag (€ brutto)</Label>
            <Input type="number" value={form.amount ?? 0} onChange={(e) => set({ amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Input value={form.category ?? ""} onChange={(e) => set({ category: e.target.value })} placeholder="z. B. Software & Tools" />
          </div>
          <div>
            <Label>USt-Satz</Label>
            <Select value={form.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })}>
              <option value={0.19}>19 %</option>
              <option value={0.07}>7 %</option>
              <option value={0}>0 %</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Beschreibung</Label>
            <Input value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Datum</Label>
            <Input type="date" value={form.date ? new Date(form.date).toISOString().slice(0, 10) : ""} onChange={(e) => set({ date: new Date(e.target.value).toISOString() })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
          <Button variant="brand" disabled={!form.amount || !form.category} onClick={() => onSave(form)}>Buchen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
