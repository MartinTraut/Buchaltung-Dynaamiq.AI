"use client"

import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Invoice, Quote, Customer, CompanySettings, LineItem } from "@/lib/types"

const C = {
  ink: "#16161a",
  body: "#3f3f46",
  muted: "#8a8a93",
  faint: "#b6b6bd",
  line: "#e6e6ea",
  zebra: "#f7f7f9",
  brand: "#ff2d7e",
} as const

function qtyLabel(it: LineItem) {
  const n = it.qty.toLocaleString("de-DE", { maximumFractionDigits: 2 })
  return `${n} ${it.unit ?? "Stk."}`
}

/** Titel + Unterpunkte einer Position ableiten (aus details[] oder Newlines). */
function splitItem(it: LineItem) {
  if (it.details?.length) return { title: it.description, bullets: it.details }
  const lines = it.description.split("\n").map((s) => s.trim()).filter(Boolean)
  const [title, ...rest] = lines
  return {
    title: title ?? it.description,
    bullets: rest.map((r) => r.replace(/^[•\-*]\s*/, "")),
  }
}

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
  const secondDate = isInvoice ? (doc as Invoice).dueDate : (doc as Quote).validUntil
  const validityDays = settings.paymentTermsDays || 14

  const senderLine = [settings.legalName, settings.address, `${settings.zip} ${settings.city}`]
    .filter(Boolean)
    .join("  ·  ")

  return (
    <div className="doc-sheet">
      {/* ── Kopf: Logo oben rechts ── */}
      <div className="flex items-start justify-between">
        <div className="pt-1 text-[10.5px] font-semibold tracking-wide" style={{ color: C.body }}>
          {senderLine}
        </div>
        <div className="logo-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt={settings.name} width={40} height={40} />
        </div>
      </div>

      {/* ── Empfänger + Meta ── */}
      <div className="mt-10 flex items-start justify-between gap-10">
        <div className="text-[12.5px] leading-[1.5]" style={{ color: C.body }}>
          <div className="font-semibold" style={{ color: C.ink }}>{customer?.company}</div>
          {customer?.contactName && <div>{customer.contactName}</div>}
          {customer?.address && <div>{customer.address}</div>}
          <div>{[customer?.zip, customer?.city].filter(Boolean).join(" ")}</div>
          <div>{customer?.country ?? "Deutschland"}</div>
        </div>

        <table className="shrink-0 text-[11.5px]">
          <tbody>
            {[
              [isInvoice ? "Rechnungs-Nr." : "Angebots-Nr.", doc.number],
              ["Datum", dateDE(doc.issueDate)],
              ["Ihre Kundennummer", customer?.customerNumber ?? customer?.id?.slice(0, 6).toUpperCase()],
              ["Ihr Ansprechpartner", settings.ownerName ?? settings.management],
            ].map(([label, value]) =>
              value ? (
                <tr key={label as string}>
                  <td className="pr-8 py-[2px] uppercase tracking-[0.08em]" style={{ color: C.muted }}>
                    {label}
                  </td>
                  <td className="py-[2px] text-right font-semibold" style={{ color: C.ink }}>
                    {value}
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>

      {/* ── Titel ── */}
      <div className="mt-12 flex items-end justify-between">
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: C.brand }}>
          {isInvoice ? "Rechnung" : "Angebot"} {doc.number}
        </h1>
        <div className="text-[12px]" style={{ color: C.body }}>{dateDE(doc.issueDate)}</div>
      </div>

      {/* ── Intro ── */}
      <div className="mt-5 space-y-2.5 text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
        {isInvoice ? (
          <p>
            Vielen Dank für die Zusammenarbeit. Hiermit stellen wir Ihnen die folgenden Leistungen in
            Rechnung. Bitte begleichen Sie den Betrag bis zum{" "}
            <strong style={{ color: C.ink }}>{dateDE(secondDate)}</strong> unter Angabe der
            Rechnungsnummer <strong style={{ color: C.ink }}>{doc.number}</strong>.
          </p>
        ) : (
          <>
            <p>
              Vielen Dank für Ihre Anfrage und Ihr Interesse an einer Zusammenarbeit mit der{" "}
              <strong style={{ color: C.ink }}>{settings.legalName}</strong>.
            </p>
            <p>
              Im Folgenden finden Sie unser unverbindliches Angebot basierend auf den besprochenen
              Anforderungen. Unser Ziel ist es, digitale Lösungen zu entwickeln, die nicht nur
              funktionieren – sondern begeistern.
            </p>
          </>
        )}
        {customer?.company && (
          <p style={{ color: C.muted }}>
            Kunde: <strong style={{ color: C.ink }}>{customer.company}</strong>
          </p>
        )}
      </div>

      {/* ── Positionstabelle ── */}
      <table className="mt-7 w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: C.zebra }}>
            <th className="w-[52%] rounded-l-md px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: C.ink }}>
              Beschreibung
            </th>
            <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: C.ink }}>
              Menge
            </th>
            <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: C.ink }}>
              Einzelpreis
            </th>
            <th className="rounded-r-md px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: C.ink }}>
              Gesamtpreis
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, idx) => {
            const { title, bullets } = splitItem(it)
            return (
              <tr key={it.id} className="align-top break-inside-avoid" style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <span className="tabular-nums" style={{ color: C.muted }}>{idx + 1}.</span>
                    <div>
                      <div className="font-semibold" style={{ color: C.ink }}>{title}</div>
                      {bullets.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {bullets.map((b, i) => (
                            <li key={i} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: C.body }}>
                              <span style={{ color: C.brand }}>•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums" style={{ color: C.body }}>
                  {qtyLabel(it)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums" style={{ color: C.body }}>
                  {eur(it.unitPrice)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums" style={{ color: C.ink }}>
                  {eur(it.qty * it.unitPrice)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Summen ── */}
      <div className="mt-5 break-inside-avoid">
        <Row label="Gesamtbetrag netto" value={eur(totals.net)} />
        {totals.taxBreakdown.map((t) => (
          <Row key={t.rate} label={`Umsatzsteuer ${Math.round(t.rate * 100)} %`} value={eur(t.tax)} muted />
        ))}
        <Row label="Gesamtbetrag brutto" value={eur(totals.gross)} strong />
      </div>

      {/* ── Bedingungen ── */}
      <div className="mt-9 space-y-4 break-inside-avoid text-[11px] leading-[1.6]" style={{ color: C.body }}>
        {!isInvoice && (
          <p>
            Dieses Angebot ist <strong style={{ color: C.ink }}>{validityDays} Tage gültig</strong> (bis{" "}
            {dateDE(secondDate)}). Bei Rückfragen oder Anpassungswünschen stehen wir Ihnen jederzeit
            gerne zur Verfügung – telefonisch, per Mail oder im persönlichen Gespräch.
          </p>
        )}

        {doc.notes && (
          <div>
            <div className="mb-1 font-bold" style={{ color: C.ink }}>Anmerkungen</div>
            <p className="whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}

        <div>
          <div className="mb-1 font-bold" style={{ color: C.ink }}>Zahlungsbedingungen</div>
          <p>
            Sofern nicht anders vereinbart, beträgt das Zahlungsziel{" "}
            <strong style={{ color: C.ink }}>{validityDays} Tage nach Rechnungsdatum ohne Abzug</strong>.
            Bei laufenden oder wiederkehrenden Leistungen (z. B. Hosting, Wartung, Retainer) erfolgt die
            Abrechnung quartalsweise im Voraus. Alle Preise verstehen sich zuzüglich der gesetzlichen
            Mehrwertsteuer.
          </p>
        </div>

        <div>
          <div className="mb-1 font-bold" style={{ color: C.ink }}>Lieferbedingungen</div>
          <p>
            Die Leistungen werden digital erbracht und gelten mit Bereitstellung, Freigabe oder Übergabe
            der entsprechenden Dateien, Zugänge oder Systeme als geliefert. Lieferzeiten richten sich nach
            Projektumfang und werden individuell abgestimmt.
          </p>
        </div>

        <p className="pt-1" style={{ color: C.ink }}>
          Wir freuen uns auf die Zusammenarbeit und die gemeinsame Umsetzung Ihres Projekts.
        </p>
      </div>

      {/* ── Footer (Rechtsangaben) ── */}
      <div
        className="mt-auto grid grid-cols-4 gap-5 pt-5 text-[8.5px] leading-[1.5]"
        style={{ borderTop: `1px solid ${C.line}`, color: C.muted }}
      >
        <FootCol>
          <b style={{ color: C.body }}>{settings.legalName}</b>
          <div>{settings.address}</div>
          <div>{settings.zip} {settings.city}</div>
          <div>{settings.country}</div>
        </FootCol>
        <FootCol>
          <FootRow k="Tel." v={settings.phone} />
          <FootRow k="E-Mail" v={settings.email} />
          <FootRow k="Web" v={settings.website} />
        </FootCol>
        <FootCol>
          {settings.registerCourt && <FootRow k="Amtsgericht" v={settings.registerCourt} />}
          {settings.registerNumber && <FootRow k="HR-Nr." v={settings.registerNumber} />}
          <FootRow k="USt.-ID" v={settings.vatId} />
          <FootRow k="Steuer-Nr." v={settings.taxNumber} />
          {settings.management && <FootRow k="Geschäftsf." v={settings.management} />}
        </FootCol>
        <FootCol>
          <FootRow k="Bank" v={settings.bankName} />
          {settings.accountNumber && <FootRow k="Konto" v={settings.accountNumber} />}
          <FootRow k="IBAN" v={settings.iban} />
          <FootRow k="BIC" v={settings.bic} />
        </FootCol>
      </div>
    </div>
  )
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-md px-3 py-2.5"
      style={{
        background: strong ? "#f0eef1" : C.zebra,
        marginBottom: 4,
      }}
    >
      <span className={strong ? "text-[13px] font-bold" : "text-[12px]"} style={{ color: strong ? C.ink : muted ? C.muted : C.body }}>
        {label}
      </span>
      <span
        className={strong ? "text-[15px] font-bold tabular-nums" : "text-[12.5px] tabular-nums"}
        style={{ color: strong ? C.brand : C.ink }}
      >
        {value}
      </span>
    </div>
  )
}

function FootCol({ children }: { children: React.ReactNode }) {
  return <div className="space-y-[2px]">{children}</div>
}

function FootRow({ k, v }: { k: string; v?: string }) {
  if (!v) return null
  return (
    <div>
      <span className="uppercase tracking-[0.06em]">{k} </span>
      <b style={{ color: C.body }}>{v}</b>
    </div>
  )
}
