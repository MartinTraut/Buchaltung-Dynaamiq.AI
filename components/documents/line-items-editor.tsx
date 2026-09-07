"use client"

import * as React from "react"
import { Plus, Trash2, ChevronRight } from "lucide-react"
import { nanoid } from "nanoid"
import type { LineItem, LineItemTask } from "@/lib/types"
import { eur, lineNet, computeTotals, cents, parseDE, numInput } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input, Select, Textarea } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TAX_OPTIONS = [
  { value: 0.19, label: "19 %" },
  { value: 0.07, label: "7 %" },
  { value: 0, label: "0 %" },
]

const UNITS = ["Std.", "Tag(e)", "Pauschal", "Stk.", "Monat", "Nachlass"]

/**
 * Positionen eines Belegs.
 *
 * Eine Zeile pro Position hat sich nicht bewährt: im Composer steht der Editor
 * in einer 550 px schmalen Spalte, dort blieben für die Beschreibung neben
 * sechs festen Spalten keine 60 px übrig — genau der Text, auf den es ankommt,
 * war abgeschnitten. Deshalb Karten: Beschreibung über die volle Breite, die
 * Zahlen darunter in beschrifteten Feldern.
 */
export function LineItemsEditor({
  items,
  onChange,
  taxLocked = false,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  /** §19 UStG Kleinunternehmer: USt-Satz fest 0 %, Selector deaktiviert */
  taxLocked?: boolean
}) {
  const totals = computeTotals(items)

  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const add = () =>
    onChange([
      ...items,
      {
        id: nanoid(6),
        description: "",
        qty: 1,
        unitPrice: 0,
        taxRate: taxLocked ? 0 : 0.19,
      },
    ])

  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <ItemCard
          key={it.id}
          index={i}
          item={it}
          taxLocked={taxLocked}
          onChange={(patch) => update(it.id, patch)}
          onRemove={() => onChange(items.filter((x) => x.id !== it.id))}
        />
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

function ItemCard({
  index,
  item,
  taxLocked,
  onChange,
  onRemove,
}: {
  index: number
  item: LineItem
  taxLocked: boolean
  onChange: (patch: Partial<LineItem>) => void
  onRemove: () => void
}) {
  const [openDetails, setOpenDetails] = React.useState(false)
  const net = lineNet(item)
  const detailCount = item.details?.length ?? 0

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold tabular-nums text-brand-cyan">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="ml-auto text-sm font-semibold tabular-nums">{eur(net)}</span>
        <button
          onClick={onRemove}
          aria-label={`Position ${index + 1} entfernen`}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <Textarea
        autoGrow
        className="min-h-16 text-[13.5px]"
        rows={2}
        value={item.description}
        placeholder="Leistung — der Titel, der auf dem Beleg steht"
        onChange={(e) => onChange({ description: e.target.value })}
      />

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-2 sm:grid-cols-[74px_minmax(0,1fr)_66px_minmax(0,1.2fr)_78px]">
        <Mini label="Menge">
          <NumField
            value={item.qty}
            onCommit={(n) => onChange({ qty: n ?? 1 })}
            align="right"
          />
        </Mini>
        <Mini label="Einheit">
          <Input
            list="unit-options"
            value={item.unit ?? ""}
            placeholder="Stk."
            onChange={(e) => onChange({ unit: e.target.value || undefined })}
          />
          <datalist id="unit-options">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Mini>
        <Mini label="Std." hint="Aufwand; leer = erscheint nicht auf dem Beleg">
          <NumField
            value={item.hours}
            placeholder="—"
            allowEmpty
            onCommit={(n) => onChange({ hours: n })}
            align="right"
          />
        </Mini>
        <Mini label="Einzelpreis netto">
          <NumField
            value={item.unitPrice}
            minDigits={2}
            onCommit={(n) => onChange({ unitPrice: n ?? 0 })}
            align="right"
          />
        </Mini>
        <Mini label="USt">
          <Select
            value={taxLocked ? 0 : item.taxRate}
            disabled={taxLocked}
            onChange={(e) => onChange({ taxRate: Number(e.target.value) })}
          >
            {TAX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Mini>
      </div>

      <button
        onClick={() => setOpenDetails((o) => !o)}
        className="mt-2.5 flex items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform", openDetails && "rotate-90")}
        />
        Erläuterung & Teilleistungen
        {detailCount > 0 && (
          <span className="ml-1 rounded-full bg-white/8 px-1.5 py-px text-[10px] tabular-nums">
            {detailCount}
          </span>
        )}
      </button>

      {openDetails && (
        <div className="mt-2.5 space-y-2.5 border-t border-white/8 pt-2.5">
          <div>
            <MiniLabel>Erläuternder Absatz</MiniLabel>
            <Textarea
              autoGrow
              className="min-h-14 text-[13px]"
              rows={2}
              value={item.note ?? ""}
              placeholder="Warum dieser Aufwand — ein bis zwei Sätze unter dem Titel."
              onChange={(e) => onChange({ note: e.target.value || undefined })}
            />
          </div>
          <TaskList
            tasks={item.details ?? []}
            onChange={(details) => onChange({ details: details.length ? details : undefined })}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Teilleistungen einer Position. Trägt eine Zeile einen Titel oder Stunden,
 * wird sie als Objekt gespeichert, sonst als schlichter String — so bleibt der
 * Datensatz so einfach, wie der Inhalt es zulässt.
 */
function TaskList({
  tasks,
  onChange,
}: {
  tasks: LineItemTask[]
  onChange: (tasks: LineItemTask[]) => void
}) {
  const rows = tasks.map((t) =>
    typeof t === "string"
      ? { text: t, hours: undefined as number | undefined, title: undefined as string | undefined }
      : { text: t.text, hours: t.hours, title: t.title },
  )

  const pack = (r: { text: string; hours?: number; title?: string }): LineItemTask =>
    r.title || r.hours
      ? {
          text: r.text,
          ...(r.title ? { title: r.title } : {}),
          ...(r.hours ? { hours: r.hours } : {}),
        }
      : r.text

  const set = (i: number, patch: Partial<(typeof rows)[number]>) =>
    onChange(rows.map((r, idx) => pack(idx === i ? { ...r, ...patch } : r)))
  const hasTitles = rows.some((r) => r.title)
  // Ein leeres Titelfeld wird nicht gespeichert — sonst stünde in jeder
  // titellosen Teilleistung ein leerer Schlüssel. Welche Zeile gerade eines
  // zeigt, ist deshalb reiner Bedienzustand.
  const [titleRows, setTitleRows] = React.useState<number[]>([])

  return (
    <div>
      <MiniLabel>Teilleistungen</MiniLabel>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_56px_28px] gap-1.5">
            <div className="space-y-1.5">
              {/* Der Modultitel eröffnet im Angebot eine Gruppe. Elf leere
                  Titelfelder über elf Teilleistungen sind aber vor allem
                  Rauschen — deshalb erscheint das Feld erst, wenn die Liste
                  Module führt oder eine Zeile eines bekommen soll. */}
              {(hasTitles || titleRows.includes(i)) && (
                <Input
                  className="h-7 text-[12.5px]"
                  value={r.title ?? ""}
                  placeholder="Modultitel"
                  onChange={(e) => set(i, { title: e.target.value || undefined })}
                />
              )}
              <Textarea
                autoGrow
                className="min-h-8 py-1.5 text-[13px]"
                rows={1}
                value={r.text}
                placeholder="Teilleistung"
                onChange={(e) => set(i, { text: e.target.value })}
              />
            </div>
            <NumField
              className="h-8"
              value={r.hours}
              placeholder="Std."
              allowEmpty
              align="right"
              onCommit={(n) => set(i, { hours: n })}
            />
            <button
              onClick={() => onChange(rows.filter((_, idx) => idx !== i).map(pack))}
              aria-label="Teilleistung entfernen"
              className="grid size-8 place-items-center self-start rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onChange([...tasks, ""])}
          >
            <Plus className="size-3.5" /> Teilleistung
          </Button>
          {!hasTitles && rows.length > 0 && titleRows.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setTitleRows(rows.map((_, i) => i))}
            >
              <Plus className="size-3.5" /> Module gliedern
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Zahlenfeld in deutscher Schreibweise.
 *
 * `type=number` zeigte den gespeicherten Rohwert — bei einem Nachlass, der aus
 * einem glatten Bruttopreis zurückgerechnet wird, stand dort „−672,161". Hier
 * wird angezeigt, was auch auf dem Beleg steht, und beim Verlassen des Feldes
 * auf Cent gerundet. Unlesbare Eingaben werden verworfen, nicht zu 0 gemacht.
 */
function NumField({
  value,
  onCommit,
  placeholder,
  allowEmpty,
  minDigits = 0,
  align,
  className,
}: {
  value: number | undefined
  onCommit: (n: number | undefined) => void
  placeholder?: string
  allowEmpty?: boolean
  minDigits?: number
  align?: "right"
  className?: string
}) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const initial = React.useRef("")

  const display = value === undefined ? "" : numInput(value, minDigits, 2)

  return (
    <Input
      inputMode="decimal"
      className={cn(align === "right" && "text-right tabular-nums", className)}
      placeholder={placeholder}
      value={draft ?? display}
      onFocus={() => {
        // Beim Bearbeiten die Gruppierung weglassen — „1.900,00" ist zum Lesen
        // gedacht, zum Tippen steht sie im Weg.
        const raw = value === undefined ? "" : String(value).replace(".", ",")
        initial.current = raw
        setDraft(raw)
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const text = draft ?? ""
        setDraft(null)
        // Unverändert durchgetabbt: nichts anfassen. Sonst würde ein Wert mit
        // Bruchteilen eines Cents allein durch den Fokus überschrieben.
        if (text === initial.current) return
        if (!text.trim()) {
          if (allowEmpty) onCommit(undefined)
          return
        }
        const n = parseDE(text)
        if (Number.isNaN(n)) return
        onCommit(cents(n))
      }}
    />
  )
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/70 uppercase">
      {children}
    </div>
  )
}

function Mini({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0" title={hint}>
      <MiniLabel>{label}</MiniLabel>
      {children}
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
