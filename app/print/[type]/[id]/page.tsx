"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Printer, ArrowLeft, Mail } from "lucide-react"
import { readDatabase } from "@/lib/store"
import { PrintableDoc } from "@/components/documents/printable"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Invoice, Quote } from "@/lib/types"

// A4-Breite 210mm ≈ 794px bei 96dpi — Referenz für die Mobile-Skalierung
const SHEET_WIDTH_PX = 794

export default function PrintPage() {
  const params = useParams<{ type: string; id: string }>()
  const kind = params.type === "quote" ? "quote" : "invoice"
  const [ready, setReady] = React.useState(false)
  const [scale, setScale] = React.useState(1)
  const [db] = React.useState(() => readDatabase())

  React.useEffect(() => setReady(true), [])

  // Mobile: Blatt proportional auf Viewport-Breite skalieren (CSS kann mm
  // nicht durch px teilen, daher JS). Im Druck wird der Scale zurückgesetzt.
  React.useEffect(() => {
    const compute = () =>
      setScale(Math.min(1, (window.innerWidth - 32) / SHEET_WIDTH_PX))
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [])

  const doc = (kind === "invoice" ? db.invoices : db.quotes).find(
    (d) => d.id === params.id,
  ) as Invoice | Quote | undefined
  const customer = db.customers.find((c) => c.id === doc?.customerId)
  const original =
    kind === "invoice" && (doc as Invoice)?.cancelsInvoiceId
      ? db.invoices.find((x) => x.id === (doc as Invoice).cancelsInvoiceId)
      : undefined

  if (!ready) return null

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
      : "Angebot"
  const gross = eur(computeTotals(doc.items).gross)
  const mailto = `mailto:${customer?.email ?? ""}?subject=${encodeURIComponent(
    `${docLabel} ${doc.number} — ${db.settings.name}`,
  )}&body=${encodeURIComponent(
    `Hallo ${customer?.contactName ?? ""},\n\nanbei erhalten Sie ${
      kind === "invoice" ? "die" : "das"
    } ${docLabel} ${doc.number} über ${gross}${
      kind === "invoice" && !(doc as Invoice).cancelsInvoiceId
        ? `.\nZahlbar bis ${dateDE((doc as Invoice).dueDate)}`
        : ""
    }.\n\nBeste Grüße\n${db.settings.ownerName ?? ""} — ${db.settings.name}`,
  )}`

  return (
    <div className="print-root min-h-screen bg-[#3a3a3e] pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-root { background: #fff !important; padding: 0 !important; }
          .doc-scale-wrap { height: auto !important; }
          .doc-scale { transform: none !important; }
          .doc-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
          @page { margin: 16mm; size: A4; }
          tr, li, .break-inside-avoid { break-inside: avoid; }
        }
        .doc-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          color: #16161a;
          padding: 16mm;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
          font-family: var(--font-sans), system-ui, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

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

      {/* Wrapper reserviert die skalierte Höhe, damit unter dem transformierten
          Blatt kein Leerraum entsteht. */}
      <div className="doc-scale-wrap" style={{ height: `calc(297mm * ${scale})` }}>
        <div
          className="doc-scale"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          <PrintableDoc
            kind={kind}
            doc={doc}
            customer={customer}
            settings={db.settings}
            originalNumber={original?.number}
          />
        </div>
      </div>
    </div>
  )
}
