"use client"

import * as React from "react"
import type {
  CompanySettings,
  Contract,
  Customer,
  Invoice,
  Quote,
} from "@/lib/types"
import { PrintableDoc } from "./printable"
import { ProposalDoc } from "./proposal"
import { ContractDoc } from "./contract"
import { DocSheetStyles, type SheetKind } from "./sheet-styles"

/** A4-Breite 210 mm ≈ 794 px bei 96 dpi — Bezugsgröße der Skalierung. */
const SHEET_WIDTH_PX = 794

/**
 * Live-Vorschau eines Belegs — dieselben Komponenten wie im Druck, nur auf die
 * verfügbare Breite herunterskaliert.
 *
 * `zoom` statt `transform: scale()`: der Zoom wirkt vor dem Layout, das Blatt
 * rechnet also weiter mit 210 mm und setzt seine Abschnitte im richtigen
 * Verhältnis. Ein Transform verkleinert nur das fertige Bild — Höhe und
 * Zentrierung müssten von Hand nachgeführt werden.
 */
export function DocPreview({
  kind,
  doc,
  customer,
  settings,
  originalNumber,
  quote,
  padding = 48,
  className,
}: {
  kind: SheetKind
  doc: Invoice | Quote | Contract
  customer?: Customer
  settings: CompanySettings
  /** Nur bei Stornorechnungen: Nummer der Originalrechnung. */
  originalNumber?: string
  /** Nur beim Vertrag: das Angebot, auf das er sich beruft. */
  quote?: Quote
  /** Luft links und rechts neben dem Blatt (px). */
  padding?: number
  className?: string
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const compute = () =>
      setScale(Math.min(1, (el.clientWidth - padding) / SHEET_WIDTH_PX))
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [padding])

  return (
    <div ref={wrapRef} className={className}>
      <DocSheetStyles kind={kind} screenOnly />
      {/* Vor der ersten Messung nichts zeichnen: ein Blatt in voller Breite,
          das eine Bildlaufleiste erzeugt und im nächsten Frame wieder
          verschwindet, liest sich als Ruckeln. */}
      {scale > 0 && (
        <div className="doc-scale" style={{ zoom: scale }}>
          {kind === "contract" ? (
            <div className="contract-sheet">
              <ContractDoc
                doc={doc as Contract}
                customer={customer}
                settings={settings}
                quote={quote}
              />
            </div>
          ) : kind === "quote" ? (
            <ProposalDoc doc={doc as Quote} customer={customer} settings={settings} />
          ) : (
            <PrintableDoc
              doc={doc as Invoice}
              customer={customer}
              settings={settings}
              originalNumber={originalNumber}
            />
          )}
        </div>
      )}
    </div>
  )
}
