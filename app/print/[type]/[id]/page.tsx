"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Printer, ArrowLeft, Mail } from "lucide-react"
import { readDatabase } from "@/lib/store"
import { PrintableDoc } from "@/components/documents/printable"
import { ProposalDoc } from "@/components/documents/proposal"
import { ContractDoc } from "@/components/documents/contract"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Invoice, Quote, Contract } from "@/lib/types"

// A4-Breite 210mm ≈ 794px bei 96dpi — Referenz für die Mobile-Skalierung
const SHEET_WIDTH_PX = 794

export default function PrintPage() {
  const params = useParams<{ type: string; id: string }>()
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
      <style>{`
        /* Vorschau-Grund direkt auf das Dokument legen — sonst scheint bei
           mehrseitigen Belegen unter dem Blatt der dunkle App-Hintergrund durch. */
        html, body { background: #3a3a3e; }
        @media print {
          /* Ohne diese Zeile malt Chrome den Seitengrund in der dunklen
             App-Farbe — jedes Blatt bekäme einen 16 mm breiten schwarzen
             Rahmen um den Satzspiegel. */
          :root { color-scheme: light; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-root { background: #fff !important; padding: 0 !important; }
          .doc-scale { zoom: 1 !important; }
          .doc-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
          ${kind === "contract"
            ? `@page { margin: 16mm 16mm 18mm; size: A4; }
          .contract-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; }
          /* Überschrift nie als letzte Zeile einer Seite, Absatz nicht mit
             einer Waisenzeile beginnen — bei einem Vertrag entscheidet das
             über die Lesbarkeit der Paragrafen. */
          h2 { break-after: avoid; }
          section, p, li { orphans: 3; widows: 3; }`
            : kind === "quote"
            ? `/* Das Angebot bringt seine Ränder selbst mit. */
          @page { margin: 0; size: A4; }
          .prop-page { box-shadow: none !important; margin: 0 !important; break-after: page; }
          .prop-page.prop-last { break-after: auto; }`
            : `/* Wie im PDF-Template: 10 mm Blattrand, den Rest setzt der Beleg
             selbst — nur so reicht das Kopfband bis an den Satzspiegelrand. */
          @page { margin: 10mm; size: A4; }
          /* Satzspiegel = A4 minus @page-Rand. Reicht der Inhalt nicht bis
             unten, schiebt mt-auto den Blattfuß an die Kante; ist er länger,
             gewinnt der Inhalt — min-height bleibt dann wirkungslos. */
          .doc-sheet { min-height: 277mm !important; }
          /* Am Bildschirm darf der Beleg atmen, auf dem Blatt muss er auf eine
             Seite. Dieselbe Verdichtung nimmt das PDF-Template vor. */
          .doc-head { padding-top: 4mm !important; }
          .doc-head-in { padding-bottom: 3mm !important; }
          .doc-specs > div { padding-top: 7px !important; padding-bottom: 6px !important; }
          .doc-body { padding-top: 4mm !important; padding-bottom: 0 !important; }
          .doc-top { margin-top: 6px !important; padding-bottom: 9px !important; }
          .doc-title { margin-top: 8px !important; }
          .doc-items { margin-top: 8px !important; }
          .doc-items thead { display: table-header-group; }
          .doc-items td { padding-top: 8px !important; padding-bottom: 8px !important; }
          .doc-bottom { margin-top: 9px !important; }
          .doc-thanks { margin-top: 6px !important; }
          .doc-legalrow { margin-top: 4px !important; padding-top: 6px !important; }
          .doc-foot { padding-top: 6px !important; }`}
          /* Einzelne Aufgaben und Karten bleiben zusammen. Ganze Positionen
             nicht: mit langer Aufgabenliste passen sie sonst auf keine Seite
             mehr und schieben eine halbleere Seite davor. */
          li, .break-inside-avoid { break-inside: avoid; }
        }
        /* ── Angebot: feste A4-Seiten mit eigener Fußzeile ──────────────
           Der Seitenrand liegt im Element, nicht in @page — nur so lassen
           sich Fußzeile und Seitenzahl an einer definierten Stelle setzen. */
        .prop-page {
          position: relative;
          width: 210mm;
          height: 297mm;
          padding: 15mm 16mm 13mm;
          margin: 0 auto 8mm;
          background: #fff;
          color: #16161a;
          /* Im Druck muss der Beschnitt bleiben, sonst schiebt ein Überlauf
             eine Geisterseite nach. Am Bildschirm bliebe ein abgeschnittener
             Preisblock dagegen unbemerkt — dort läuft der Inhalt sichtbar über
             und der Rahmen schlägt Alarm. */
          overflow: visible;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
          font-family: var(--font-sans), system-ui, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* Die Fußzeile sitzt unterhalb des Satzspiegels: der Inhaltskasten
           endet 13 mm über der Blattkante, die Trennlinie 12,4 mm — eine volle
           Seite stößt damit an die Linie, läuft aber nicht durch sie hindurch. */
        @media print { .prop-page { overflow: hidden; } }
        .prop-foot {
          position: absolute;
          left: 16mm;
          right: 16mm;
          bottom: 7mm;
          padding-top: 2mm;
          border-top: 0.5pt solid #e6e6ea;
        }
        /* Der Vertrag ist ein fließendes Dokument: er bringt keine festen
           Seiten mit, sondern läuft über so viele, wie er braucht. Am
           Bildschirm liegt er trotzdem auf einem A4-breiten Bogen. */
        .contract-sheet {
          width: 210mm;
          margin: 0 auto;
          background: #fff;
          color: #16161a;
          padding: 16mm 16mm 14mm;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
          font-family: var(--font-sans), system-ui, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .doc-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          color: #141d2b;
          padding: 10mm;
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
