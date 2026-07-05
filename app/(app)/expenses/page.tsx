"use client"

import * as React from "react"
import {
  Plus,
  Download,
  Search,
  TrendingDown,
  CalendarDays,
  Receipt,
  Percent,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { expenseBreakdown, monthlyRevenue } from "@/lib/metrics"
import { eur, dateDE } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DonutChart } from "@/components/charts"
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
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown"
import { toast } from "sonner"

const CATEGORIES = [
  "Software & Tools",
  "Ad Spend / Media",
  "Hardware",
  "Subunternehmer",
  "Büro & Miete",
  "Reisekosten",
  "Marketing",
  "Weiterbildung",
  "Versicherungen",
  "Steuerberatung",
  "Sonstiges",
] as const

const net = (t: Transaction) => t.amount / (1 + t.taxRate)

export default function ExpensesPage() {
  const { db, addTransaction, update, add, remove } = useStore()
  const confirm = useConfirm()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Transaction | null>(null)
  const [query, setQuery] = React.useState("")
  const [cat, setCat] = React.useState("all")

  const all = React.useMemo(
    () =>
      db.transactions
        .filter((t) => t.type === "expense")
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [db.transactions],
  )

  // ---- KPIs (laufendes Jahr) ----
  const year = new Date().getFullYear()
  const month = new Date().getMonth()
  const ytd = all.filter((t) => new Date(t.date).getFullYear() === year)
  const ytdNet = ytd.reduce((s, t) => s + net(t), 0)
  const ytdVat = ytd.reduce((s, t) => s + (t.amount - net(t)), 0)
  const monthNet = ytd
    .filter((t) => new Date(t.date).getMonth() === month)
    .reduce((s, t) => s + net(t), 0)
  const avg = ytdNet / (month + 1)

  const breakdown = expenseBreakdown(db)
  const monthly = monthlyRevenue(db).slice(-6)
  const maxMonthly = Math.max(...monthly.map((m) => m.expenses), 1)

  // ---- Filter ----
  const filtered = all.filter((t) => {
    const okCat = cat === "all" || t.category === cat
    const q = query.trim().toLowerCase()
    const okQ =
      !q ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    return okCat && okQ
  })
  const filteredNet = filtered.reduce((s, t) => s + net(t), 0)

  const usedCats = ["all", ...Array.from(new Set(all.map((t) => t.category)))]

  function exportCsv() {
    const header = "Datum;Kategorie;Beschreibung;Brutto;Netto;USt-Satz;Vorsteuer\n"
    const body = filtered
      .map(
        (t) =>
          `${dateDE(t.date)};${t.category};${t.description};${t.amount.toFixed(2)};${net(t).toFixed(2)};${Math.round(t.taxRate * 100)}%;${(t.amount - net(t)).toFixed(2)}`,
      )
      .join("\n")
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "dynaamiq-ausgaben.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtered.length} Ausgaben exportiert`)
  }

  function openNew() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(t: Transaction) {
    setEditing(t)
    setOpen(true)
  }

  function save(form: Partial<Transaction>) {
    if (editing) {
      update("transactions", editing.id, { ...form, type: "expense" })
      toast.success("Ausgabe aktualisiert")
    } else {
      addTransaction({ ...form, type: "expense" })
      toast.success("Ausgabe erfasst")
    }
    setOpen(false)
  }

  async function del(t: Transaction) {
    const ok = await confirm({
      title: "Ausgabe löschen?",
      description: `${t.description || t.category} · ${eur(t.amount)} wird entfernt.`,
      confirmLabel: "Löschen",
      destructive: true,
    })
    if (!ok) return
    remove("transactions", t.id)
    toast.success("Ausgabe gelöscht", {
      action: { label: "Rückgängig", onClick: () => add("transactions", t) },
    })
  }

  return (
    <div className="mx-auto max-w-[1760px] space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ExpKpi label="Ausgaben (YTD)" value={eur(ytdNet)} hint="netto, laufendes Jahr" icon={<TrendingDown className="size-4" />} tint="#ff4d4d" />
        <ExpKpi label="Diesen Monat" value={eur(monthNet)} hint="netto" icon={<CalendarDays className="size-4" />} tint="#1f7bf2" />
        <ExpKpi label="Vorsteuer (YTD)" value={eur(ytdVat)} hint="abziehbar" icon={<Percent className="size-4" />} tint="#8b5cf6" />
        <ExpKpi label="Ø pro Monat" value={eur(avg)} hint="Durchschnitt" icon={<Receipt className="size-4" />} tint="#2fd3a5" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Verlauf */}
        <Card className="xl:col-span-2">
          <div className="p-5 pb-1">
            <SectionTitle className="mb-0">Ausgaben pro Monat</SectionTitle>
            <p className="text-xs text-muted-foreground">Netto, letzte 6 Monate</p>
          </div>
          <div className="flex items-end gap-3 px-5 pb-5 pt-6" style={{ height: 200 }}>
            {monthly.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {m.expenses > 0 ? eur(m.expenses).replace(" €", "") : ""}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#ff4d4d]/25 to-[#ff7a5c]/70 transition-all"
                    style={{ height: `${Math.max((m.expenses / maxMonthly) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Kategorien */}
        <Card>
          <div className="p-5 pb-0"><SectionTitle className="mb-0">Top-Kategorien</SectionTitle></div>
          <div className="p-5 pt-3">
            {breakdown.length > 0 ? (
              <>
                <DonutChart data={breakdown} />
                <div className="mt-4 space-y-2">
                  {breakdown.map((b) => (
                    <div key={b.name} className="flex items-center gap-2.5 text-sm">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: b.fill }} />
                      <span className="flex-1 truncate text-foreground/80">{b.name}</span>
                      <span className="font-medium tnum">{eur(b.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Noch keine Ausgaben erfasst.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ausgabe suchen…"
              className="pl-9"
            />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-52">
            {usedCats.map((c) => (
              <option key={c} value={c}>{c === "all" ? "Alle Kategorien" : c}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button variant="brand" size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="size-3.5" /> Ausgabe erfassen
          </Button>
        </div>
      </div>

      {/* Liste */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <SectionTitle className="mb-0">
            {filtered.length} {filtered.length === 1 ? "Ausgabe" : "Ausgaben"}
          </SectionTitle>
          <span className="text-sm text-muted-foreground">
            Summe netto: <span className="font-semibold text-foreground tnum">{eur(filteredNet)}</span>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-white/[0.04]">
              <Receipt className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              {all.length === 0 ? "Noch keine Ausgaben — erfasse deinen ersten Beleg." : "Keine Ausgabe passt zum Filter."}
            </p>
            {all.length === 0 && (
              <Button variant="brand" size="sm" className="mt-1 gap-1.5" onClick={openNew}>
                <Plus className="size-3.5" /> Erste Ausgabe
              </Button>
            )}
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="group flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5 last:border-0 hover:bg-white/[0.02]">
              <button onClick={() => openEdit(t)} className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#ff4d4d1f] text-[#ff7a7a]">
                <TrendingDown className="size-4" />
              </button>
              <button onClick={() => openEdit(t)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[15px] font-medium">{t.description || t.category}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {dateDE(t.date)}</p>
              </button>
              <Badge variant="muted" className="hidden sm:inline-flex">{Math.round(t.taxRate * 100)} % USt</Badge>
              <div className="text-right">
                <p className="text-[15px] font-semibold tnum">−{eur(t.amount)}</p>
                <p className="text-[11px] text-muted-foreground tnum">netto {eur(net(t))}</p>
              </div>
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownContent align="end">
                  <DropdownItem onSelect={() => openEdit(t)}>
                    <Pencil /> Bearbeiten
                  </DropdownItem>
                  <DropdownItem
                    className="text-destructive data-[highlighted]:text-destructive"
                    onSelect={() => del(t)}
                  >
                    <Trash2 /> Löschen
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          ))
        )}
      </div>

      <ExpenseDialog
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        expense={editing}
        onSave={save}
      />
    </div>
  )
}

function ExpKpi({ label, value, hint, icon, tint }: { label: string; value: string; hint: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${tint}1f`, color: tint }}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2.5 font-display text-xl font-bold tnum">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>
    </div>
  )
}

function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  expense: Transaction | null
  onSave: (d: Partial<Transaction>) => void
}) {
  const [form, setForm] = React.useState<Partial<Transaction>>(
    expense ?? { type: "expense", taxRate: 0.19, amount: 0, category: CATEGORIES[0], date: new Date().toISOString() },
  )
  const set = (p: Partial<Transaction>) => setForm((f) => ({ ...f, ...p }))
  const knownCat = CATEGORIES.includes((form.category ?? "") as (typeof CATEGORIES)[number])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Beschreibung</Label>
            <Input value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="z. B. Figma Jahresabo" autoFocus />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select value={knownCat ? form.category : "__custom"} onChange={(e) => set({ category: e.target.value === "__custom" ? "" : e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Andere…</option>
            </Select>
            {!knownCat && (
              <Input className="mt-2" value={form.category ?? ""} onChange={(e) => set({ category: e.target.value })} placeholder="Eigene Kategorie" />
            )}
          </div>
          <div>
            <Label>Betrag (€ brutto)</Label>
            <Input type="number" step="0.01" value={form.amount ?? 0} onChange={(e) => set({ amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>USt-Satz</Label>
            <Select value={form.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })}>
              <option value={0.19}>19 %</option>
              <option value={0.07}>7 %</option>
              <option value={0}>0 % / keine</option>
            </Select>
          </div>
          <div>
            <Label>Datum</Label>
            <Input type="date" value={form.date ? new Date(form.date).toISOString().slice(0, 10) : ""} onChange={(e) => set({ date: new Date(e.target.value).toISOString() })} />
          </div>
          {!!form.amount && (
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Netto / enthaltene Vorsteuer</span>
              <span className="font-medium tnum">
                {eur((form.amount ?? 0) / (1 + (form.taxRate ?? 0)))} · {eur((form.amount ?? 0) - (form.amount ?? 0) / (1 + (form.taxRate ?? 0)))}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
          <Button variant="brand" disabled={!form.amount || !form.category} onClick={() => onSave(form)}>
            {expense ? "Speichern" : "Ausgabe erfassen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
