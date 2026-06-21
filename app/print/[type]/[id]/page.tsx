"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Printer, ArrowLeft } from "lucide-react"
import { readDatabase } from "@/lib/store"
import { PrintableDoc } from "@/components/documents/printable"
import type { Invoice, Quote } from "@/lib/types"

export default function PrintPage() {
  const params = useParams<{ type: string; id: string }>()
  const kind = params.type === "quote" ? "quote" : "invoice"
  const [ready, setReady] = React.useState(false)
  const [db] = React.useState(() => readDatabase())

  React.useEffect(() => setReady(true), [])

  const doc = (kind === "invoice" ? db.invoices : db.quotes).find(
    (d) => d.id === params.id,
  ) as Invoice | Quote | undefined
  const customer = db.customers.find((c) => c.id === doc?.customerId)

  if (!ready) return null

  if (!doc) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-[#1a1a1a]">
        Dokument nicht gefunden.
      </div>
    )
  }

  return (
    <div className="print-root min-h-screen bg-[#3a3a3e] py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-root { background: #fff !important; padding: 0 !important; }
          .doc-sheet { box-shadow: none !important; margin: 0 !important; }
          @page { margin: 14mm; size: A4; }
        }
        .doc-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          color: #1a1a1a;
          padding: 18mm;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          font-family: var(--font-sans), system-ui, sans-serif;
        }
      `}</style>

      <div className="no-print mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-2">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          <ArrowLeft className="size-4" /> Schließen
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ff6a00] to-[#e81ccb] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          <Printer className="size-4" /> Drucken / Als PDF speichern
        </button>
      </div>

      <PrintableDoc
        kind={kind}
        doc={doc}
        customer={customer}
        settings={db.settings}
      />
    </div>
  )
}
