"use client"

import * as React from "react"
import { X, PenLine, Eye, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"

/**
 * Rahmen aller Beleg-Composer: links die Maske, rechts das fertige Dokument.
 *
 * Angebot, Rechnung und Vertrag teilen sich diesen Rahmen — sonst hätte jeder
 * Belegtyp seine eigene Kopfleiste, und die drei liefen mit der Zeit
 * auseinander. Was sich unterscheidet, steht im Formular, nicht im Rahmen.
 */
export function ComposerShell({
  eyebrow,
  onClose,
  actions,
  notice,
  locked,
  dock,
  preview,
  children,
}: {
  /** „Neu: Vertrag" oder „Vertrag V-1006-01". */
  eyebrow: string
  onClose: () => void
  /** Knöpfe rechts in der Kopfleiste (PDF, Entwurf, Ausstellen …). */
  actions: React.ReactNode
  /** Leiste unter dem Kopf — z. B. der Hinweis auf einen gesperrten Beleg. */
  notice?: React.ReactNode
  /** Formularspalte stilllegen. Ein gesperrter Beleg darf nicht bedienbar
   *  aussehen: wer tippt und nichts speichern kann, hält das für einen Fehler. */
  locked?: boolean
  /** Optionaler Fuß der Formularspalte — der KI-Zuruf. */
  dock?: React.ReactNode
  preview: React.ReactNode
  children: React.ReactNode
}) {
  const [view, setView] = React.useState<"form" | "preview">("form")

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0f]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/8 px-3 sm:gap-3 sm:px-4">
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="size-4.5" />
        </button>
        <div className="min-w-0 max-sm:hidden">
          <div className="truncate text-[13px] font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Segmented
            className="md:hidden max-sm:[&_button]:px-3"
            value={view}
            onChange={setView}
            options={[
              { id: "form", label: <PenLine className="size-4" />, ariaLabel: "Bearbeiten" },
              { id: "preview", label: <Eye className="size-4" />, ariaLabel: "Vorschau" },
            ]}
          />
          {actions}
        </div>
      </header>
      {notice}

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(400px,44%)_1fr]">
        <section
          className={`min-h-0 overflow-y-auto border-white/8 md:border-r ${
            view === "form" ? "" : "max-md:hidden"
          }`}
        >
          <fieldset disabled={locked} className="min-w-0 disabled:opacity-55">
            <div className="space-y-7 p-4 sm:p-6">{children}</div>
            {dock}
          </fieldset>
        </section>
        <div
          className={`min-h-0 overflow-auto bg-[#3a3a3e] p-6 ${
            view === "preview" ? "" : "max-md:hidden"
          }`}
        >
          {preview}
        </div>
      </div>
    </div>
  )
}

// ── Formular-Bausteine ──────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[10.5px] font-semibold tracking-[0.16em] text-muted-foreground/70 uppercase">
      {children}
    </div>
  )
}

export function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

export function Field({
  label,
  wide,
  hint,
  children,
}: {
  label: string
  wide?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Liste aus Paaren — Kurzübersicht, Konditionen und Vertragsabschnitte haben
 * dieselbe Bauform. Generisch über die beiden Feldnamen, damit nicht drei fast
 * gleiche Editoren nebeneinander stehen und getrennt altern.
 */
export function PairList<K extends string>({
  label,
  hint,
  rows,
  onChange,
  keys,
  placeholders,
  addLabel = "Eintrag",
  /** Zweispaltig (Schlagwort | Text) oder untereinander (Titel über Absatz). */
  stacked,
  numbered,
}: {
  label: string
  hint?: string
  rows: Record<K, string>[]
  onChange: (rows: Record<K, string>[]) => void
  keys: [K, K]
  placeholders: [string, string]
  addLabel?: string
  stacked?: boolean
  numbered?: boolean
}) {
  const [a, b] = keys
  const set = (i: number, key: K, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className={
              stacked
                ? "rounded-xl border border-white/8 bg-white/[0.02] p-3"
                : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_32px] gap-2"
            }
          >
            {stacked ? (
              <>
                <div className="mb-2 flex items-center gap-2">
                  {numbered && (
                    <span className="text-[11px] font-bold tabular-nums text-brand-cyan">
                      § {i + 1}
                    </span>
                  )}
                  <Input
                    className="h-8"
                    value={r[a]}
                    placeholder={placeholders[0]}
                    onChange={(e) => set(i, a, e.target.value)}
                  />
                  <button
                    onClick={() => move(i, -1)}
                    aria-label="nach oben"
                    className="shrink-0 rounded px-1 text-[11px] text-muted-foreground/60 hover:text-foreground"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    aria-label="nach unten"
                    className="shrink-0 rounded px-1 text-[11px] text-muted-foreground/60 hover:text-foreground"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                    aria-label="Abschnitt entfernen"
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <Textarea
                  autoGrow
                  className="min-h-16 text-[13px]"
                  rows={2}
                  value={r[b]}
                  placeholder={placeholders[1]}
                  onChange={(e) => set(i, b, e.target.value)}
                />
              </>
            ) : (
              <>
                <Input
                  value={r[a]}
                  placeholder={placeholders[0]}
                  onChange={(e) => set(i, a, e.target.value)}
                />
                <Textarea
                  autoGrow
                  className="min-h-9 py-2 text-[13.5px]"
                  rows={1}
                  value={r[b]}
                  placeholder={placeholders[1]}
                  onChange={(e) => set(i, b, e.target.value)}
                />
                <button
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                  aria-label="Zeile entfernen"
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...rows, { [a]: "", [b]: "" } as Record<K, string>])}
        >
          <Plus className="size-3.5" /> {addLabel}
        </Button>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/** Einfache Stringliste — Anlagen eines Vertrags. */
export function StringList({
  label,
  hint,
  rows,
  onChange,
  placeholder,
  addLabel = "Eintrag",
}: {
  label: string
  hint?: string
  rows: string[]
  onChange: (rows: string[]) => void
  placeholder?: string
  addLabel?: string
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_32px] gap-2">
            <Input
              value={r}
              placeholder={placeholder}
              onChange={(e) =>
                onChange(rows.map((x, idx) => (idx === i ? e.target.value : x)))
              }
            />
            <button
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              aria-label="Eintrag entfernen"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...rows, ""])}
        >
          <Plus className="size-3.5" /> {addLabel}
        </Button>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
