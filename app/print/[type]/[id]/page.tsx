"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Printer, ArrowLeft, Mail } from "lucide-react"
import { readDatabase } from "@/lib/store"
import { PrintableDoc } from "@/components/documents/printable"
import { ProposalDoc } from "@/components/documents/proposal"
import { ContractDoc } from "@/components/documents/contract"
import { DocSheetStyles } from "@/components/documents/sheet-styles"
import { BriefDoc } from "@/components/onboarding/brief"
import { sessionLabel } from "@/lib/onboarding"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Invoice, Quote, Contract } from "@/lib/types"

// A4-Breite 210mm ≈ 794px bei 96dpi — Referenz für die Mobile-Skalierung
const SHEET_WIDTH_PX = 794

export default function PrintPage() {
  const params = useParams<{ type: string; id: string }>()
  // Das Gesprächsprotokoll nutzt das Belegraster — für @page-Ränder und
  // Blattmaße ist es eine „invoice", inhaltlich ein eigenes Dokument.
  const isBrief = params.type === "onboarding"
  const kind =
    params.type === "quote" ? "quote" : params.type === "contract" ? "contract" : "invoice"
  const [ready, setReady] = React.useState(false)
  const [scale, setScale] = React.useState(1)
  const [db] = React.useState(() => readDatabase())

  React.useEffect(() => setReady(true), [])

  // Mobile: Blatt proportional auf Viewport-Breite verkleinern (CSS kann mm
  // nicht durch px teilen, daher JS). Im Druck wird der Faktor zurückgesetzt.
  React.useEffect(() => {
    const compute = () =>
      setScale(Math.min(1, (window.innerWidth - 32) / SHEET_WIDTH_PX))
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [])

  const session = isBrief ? db.onboardings.find((o) => o.id === params.id) : undefined
  const collection =
    kind === "invoice" ? db.invoices : kind === "quote" ? db.quotes : db.contracts
  const doc = collection.find((d) => d.id === params.id) as
    | Invoice
    | Quote
    | Contract
    | undefined
  const customer = db.customers.find((c) => c.id === doc?.customerId)
  // Der Vertrag nennt sein Angebot im Kopf — ohne die Nummer steht die
  // Anlagenkette im Dokument, aber nicht in den Eckdaten.
  const linkedQuote =
    kind === "contract"
      ? db.quotes.find((q) => q.id === (doc as Contract | undefined)?.quoteId)
      : undefined
  const original =
    kind === "invoice" && (doc as Invoice)?.cancelsInvoiceId
      ? db.invoices.find((x) => x.id === (doc as Invoice).cancelsInvoiceId)
      : undefined

  if (!ready) return null

  if (isBrief) {
    if (!session) {
      return (
        <div className="grid min-h-screen place-items-center bg-white text-[#1a1a1a]">
          Protokoll nicht gefunden.
        </div>
      )
    }
    return (
      <div className="print-root min-h-screen bg-[#3a3a3e] pb-10">
        <style>{`html, body { background: #3a3a3e; }`}</style>
        <DocSheetStyles kind="invoice" />
        <div className="no-print sticky top-0 z-10 mb-6 border-b border-white/10 bg-[#3a3a3e]/90 backdrop-blur">
          <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 py-3">
            <button
              onClick={() => window.close()}
              className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              <ArrowLeft className="size-4" /> Schließen
            </button>
            <span className="text-sm text-white/60">{sessionLabel(session)}</span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1f7bf2] to-[#5b2eff] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              <Printer className="size-4" /> Als PDF speichern
            </button>
          </div>
        </div>
        <div className="doc-scale" style={{ zoom: scale }}>
          <BriefDoc session={session} settings={db.settings} />
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-[#1a1a1a]">
        Dokument nicht gefunden.
      </div>
    )
  }

  const docLabel =
    kind === "invoice"
      ? (doc as Invoice).cancelsInvoiceId
        ? "Stornorechnung"
        : "Rechnung"
      : kind === "contract"
        ? "Vertrag"
        : "Angebot"
  // Der Vertrag führt keine Positionen — sein Betrag steht als Auftragswert.
  const gross =
    kind === "contract"
      ? eur((doc as Contract).netValue ?? 0)
      : eur(computeTotals((doc as Invoice | Quote).items).gross)
  const mailto = `mailto:${customer?.email ?? ""}?subject=${encodeURIComponent(
    `${docLabel} ${doc.number} — ${db.settings.name}`,
  )}&body=${encodeURIComponent(
    `Hallo ${customer?.contactName ?? ""},\n\nanbei erhalten Sie ${
      kind === "quote" ? "das" : "die"
    } ${docLabel} ${doc.number} über ${gross}${
      kind === "invoice" && !(doc as Invoice).cancelsInvoiceId
        ? `.\nZahlbar bis ${dateDE((doc as Invoice).dueDate)}`
        : ""
    }.\n\nBeste Grüße\n${db.settings.ownerName ?? ""} — ${db.settings.name}`,
  )}`

  return (
    <div className="print-root min-h-screen bg-[#3a3a3e] pb-10">
      {/* Vorschau-Grund direkt auf das Dokument legen — sonst scheint bei
          mehrseitigen Belegen unter dem Blatt der dunkle App-Hintergrund durch. */}
      <style>{`html, body { background: #3a3a3e; }`}</style>
      <DocSheetStyles kind={kind} />

      <div className="no-print sticky top-0 z-10 mb-6 border-b border-white/10 bg-[#3a3a3e]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 py-3">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="size-4" /> Schließen
          </button>
          <div className="flex items-center gap-2">
            <a
              href={mailto}
              className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              <Mail className="size-4" /> Per E-Mail senden
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1f7bf2] to-[#5b2eff] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              <Printer className="size-4" /> Als PDF speichern
            </button>
          </div>
        </div>
      </div>

      {/* `zoom` statt `transform: scale()`: der Zoom wird vor dem Layout
          angewendet, das Blatt rechnet also weiter mit 210 mm und bringt seine
          Abschnitte im richtigen Verhältnis. Ein Transform verkleinert nur das
          fertige Bild — Höhe und Zentrierung müssten von Hand nachgeführt
          werden, und auf dem Telefon lief der Beleg dabei aus dem Viewport. */}
      <div className="doc-scale" style={{ zoom: scale }}>
        {kind === "contract" ? (
          <div className="contract-sheet">
            <ContractDoc
              doc={doc as Contract}
              customer={customer}
              settings={db.settings}
              quote={linkedQuote}
            />
          </div>
        ) : kind === "quote" ? (
          /* Das Angebot bringt eigene, feste A4-Seiten mit — Cover, Pakete,
             Prozess, Investition. Die Rechnung bleibt beim Belegraster. */
          <ProposalDoc doc={doc as Quote} customer={customer} settings={db.settings} />
        ) : (
          <PrintableDoc
            doc={doc as Invoice}
            customer={customer}
            settings={db.settings}
            originalNumber={original?.number}
          />
        )}
      </div>
    </div>
  )
}
