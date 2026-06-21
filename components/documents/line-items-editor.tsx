"use client"

import { Plus, Trash2 } from "lucide-react"
import { nanoid } from "nanoid"
import type { LineItem } from "@/lib/types"
import { eur, lineNet, computeTotals } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"

const TAX_OPTIONS = [
  { value: 0.19, label: "19 %" },
  { value: 0.07, label: "7 %" },
  { value: 0, label: "0 %" },
]

export function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}) {
  const totals = computeTotals(items)

  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const add = () =>
    onChange([
      ...items,
      { id: nanoid(6), description: "", qty: 1, unitPrice: 0, taxRate: 0.19 },
    ])
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id))

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_70px_110px_80px_100px_32px] gap-2 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase sm:grid">
        <span>Beschreibung</span>
        <span className="text-right">Menge</span>
        <span className="text-right">Einzelpreis</span>
        <span>USt</span>
        <span className="text-right">Netto</span>
        <span />
      </div>

      {items.map((it) => (
        <div
          key={it.id}
          className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2 sm:grid-cols-[1fr_70px_110px_80px_100px_32px] sm:border-0 sm:bg-transparent sm:p-0"
        >
          <div className="col-span-2 sm:col-span-1">
            <Input
              value={it.description}
              onChange={(e) => update(it.id, { description: e.target.value })}
              placeholder="Leistung / Position"
            />
          </div>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={it.qty}
            onChange={(e) => update(it.id, { qty: Number(e.target.value) })}
            className="text-right tnum"
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            value={it.unitPrice}
            onChange={(e) => update(it.id, { unitPrice: Number(e.target.value) })}
            className="text-right tnum"
          />
          <Select
            value={it.taxRate}
            onChange={(e) => update(it.id, { taxRate: Number(e.target.value) })}
          >
            {TAX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <div className="flex h-9 items-center justify-end pr-1 text-sm font-medium tnum">
            {eur(lineNet(it))}
          </div>
          <button
            onClick={() => remove(it.id)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="size-3.5" /> Position hinzufügen
      </Button>

      <div className="mt-3 ml-auto w-full max-w-xs space-y-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm">
        <Row label="Netto" value={eur(totals.net)} />
        {totals.taxBreakdown.map((t) => (
          <Row
            key={t.rate}
            label={`USt ${Math.round(t.rate * 100)} %`}
            value={eur(t.tax)}
            muted
          />
        ))}
        <div className="my-1 h-px bg-white/8" />
        <Row label="Gesamt" value={eur(totals.gross)} strong />
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span
        className={
          strong
            ? "font-display text-base font-bold tnum text-brand-gradient"
            : "font-medium tnum"
        }
      >
        {value}
      </span>
    </div>
  )
}
