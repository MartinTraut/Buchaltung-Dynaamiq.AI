"use client"

import { eur, dateDE, computeTotals } from "@/lib/format"
import { DynaamiqMark } from "@/components/brand/logo"
import type { Invoice, Quote, Customer, CompanySettings } from "@/lib/types"

export function PrintableDoc({
  kind,
  doc,
  customer,
  settings,
}: {
  kind: "invoice" | "quote"
  doc: Invoice | Quote
  customer?: Customer
  settings: CompanySettings
}) {
  const isInvoice = kind === "invoice"
  const totals = computeTotals(doc.items)
  const secondDate = isInvoice
    ? (doc as Invoice).dueDate
    : (doc as Quote).validUntil

  return (
    <div className="doc-sheet">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <DynaamiqMark size={48} />
          <div>
            <div className="text-[17px] font-bold tracking-[0.12em] text-[#1a1a1a]">
              DYNAAMIQ AI
            </div>
            <div className="text-[10px] tracking-[0.25em] text-[#ff6a00]">
              PERFORMANCE MARKETING
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] leading-relaxed text-[#555]">
          <div className="font-semibold text-[#1a1a1a]">{settings.legalName}</div>
          <div>{settings.address}</div>
          <div>{settings.zip} {settings.city}</div>
          <div>{settings.email}</div>
          <div>{settings.website}</div>
        </div>
      </div>

      <div className="my-8 h-1 w-full rounded-full bg-gradient-to-r from-[#ff6a00] via-[#ff2d7e] to-[#e81ccb]" />

      {/* Recipient + meta */}
      <div className="flex items-start justify-between gap-8">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Rechnungsempfänger
          </div>
          <div className="text-[13px] font-semibold text-[#1a1a1a]">
            {customer?.company}
          </div>
          {customer?.contactName && (
            <div className="text-[12px] text-[#555]">{customer.contactName}</div>
          )}
          {customer?.address && (
            <div className="text-[12px] text-[#555]">{customer.address}</div>
          )}
          <div className="text-[12px] text-[#555]">
            {[customer?.zip, customer?.city].filter(Boolean).join(" ")}
          </div>
          {customer?.vatId && (
            <div className="mt-1 text-[11px] text-[#888]">
              USt-IdNr.: {customer.vatId}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <h1 className="text-[26px] font-bold tracking-tight text-[#1a1a1a]">
            {isInvoice ? "Rechnung" : "Angebot"}
          </h1>
          <div className="mt-2 space-y-0.5 text-[12px] text-[#555]">
            <div>
              <span className="text-[#999]">Nr.: </span>
              <span className="font-semibold text-[#1a1a1a]">{doc.number}</span>
            </div>
            <div>
              <span className="text-[#999]">Datum: </span>
              {dateDE(doc.issueDate)}
            </div>
            <div>
              <span className="text-[#999]">
                {isInvoice ? "Fällig: " : "Gültig bis: "}
              </span>
              {dateDE(secondDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="mt-10 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b-2 border-[#1a1a1a] text-left text-[10px] uppercase tracking-wider text-[#999]">
            <th className="py-2">Pos.</th>
            <th className="py-2">Beschreibung</th>
            <th className="py-2 text-right">Menge</th>
            <th className="py-2 text-right">Einzelpreis</th>
            <th className="py-2 text-right">USt</th>
            <th className="py-2 text-right">Netto</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, idx) => (
            <tr key={it.id} className="border-b border-[#eee]">
              <td className="py-2.5 text-[#999]">{idx + 1}</td>
              <td className="py-2.5 font-medium text-[#1a1a1a]">{it.description}</td>
              <td className="py-2.5 text-right text-[#555]">{it.qty}</td>
              <td className="py-2.5 text-right text-[#555]">{eur(it.unitPrice)}</td>
              <td className="py-2.5 text-right text-[#555]">
                {Math.round(it.taxRate * 100)} %
              </td>
              <td className="py-2.5 text-right font-medium text-[#1a1a1a]">
                {eur(it.qty * it.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-1.5 text-[12px]">
          <div className="flex justify-between text-[#555]">
            <span>Zwischensumme (netto)</span>
            <span>{eur(totals.net)}</span>
          </div>
          {totals.taxBreakdown.map((t) => (
            <div key={t.rate} className="flex justify-between text-[#555]">
              <span>zzgl. {Math.round(t.rate * 100)} % USt</span>
              <span>{eur(t.tax)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t-2 border-[#1a1a1a] pt-2 text-[15px] font-bold text-[#1a1a1a]">
            <span>Gesamtbetrag</span>
            <span>{eur(totals.gross)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {doc.notes && (
        <p className="mt-10 max-w-xl text-[11px] leading-relaxed text-[#666]">
          {doc.notes}
        </p>
      )}

      {isInvoice && (
        <p className="mt-4 text-[11px] text-[#666]">
          Bitte überweisen Sie den Betrag bis zum {dateDE(secondDate)} unter
          Angabe der Rechnungsnummer {doc.number}.
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto grid grid-cols-3 gap-4 border-t border-[#eee] pt-4 text-[9.5px] leading-relaxed text-[#888]">
        <div>
          <div className="font-semibold text-[#555]">{settings.legalName}</div>
          <div>{settings.address}</div>
          <div>{settings.zip} {settings.city}</div>
        </div>
        <div>
          <div className="font-semibold text-[#555]">Kontakt</div>
          <div>{settings.email}</div>
          <div>{settings.phone}</div>
          <div>USt-IdNr.: {settings.vatId}</div>
        </div>
        <div>
          <div className="font-semibold text-[#555]">Bankverbindung</div>
          <div>{settings.bankName}</div>
          <div>IBAN: {settings.iban}</div>
          <div>BIC: {settings.bic}</div>
        </div>
      </div>
    </div>
  )
}
