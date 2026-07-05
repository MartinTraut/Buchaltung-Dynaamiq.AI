"use client"

import { eur, dateDE, computeTotals } from "@/lib/format"
import { REMINDER_LABEL } from "@/lib/types"
import type { Invoice, Quote, Customer, CompanySettings, LineItem } from "@/lib/types"

const C = {
  ink: "#16161a",
  body: "#3f3f46",
  muted: "#8a8a93",
  faint: "#b6b6bd",
  line: "#e6e6ea",
  brand: "#1f7bf2", // Brand-Blau — Cyan wäre auf weißem Papier unlesbar
} as const

// Einziger Cyan-Einsatz auf Papier: die Gradient-Hairline
const GRAD = "linear-gradient(90deg,#00ffe6,#1f7bf2 45%,#5b2eff)"

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
  originalNumber,
}: {
  kind: "invoice" | "quote"
  doc: Invoice | Quote
  customer?: Customer
  settings: CompanySettings
  /** Nummer der Originalrechnung, wenn dieses Dokument eine Stornorechnung ist */
  originalNumber?: string
}) {
  const isInvoice = kind === "invoice"
  const inv = isInvoice ? (doc as Invoice) : null
  const isStorno = Boolean(inv?.cancelsInvoiceId)
  const reminderLevel = inv?.reminderLevel ?? 0
  const hasReminderFee = doc.items.some((it) => it.description.startsWith("Mahngebühr"))
  const smallBusiness = settings.smallBusiness
  const totals = computeTotals(doc.items)
  const secondDate = isInvoice ? (doc as Invoice).dueDate : (doc as Quote).validUntil
  const validityDays = settings.paymentTermsDays || 14

  // Leistungsdatum (§14 UStG) — Fallback: Rechnungsdatum ist Leistungsdatum
  const serviceStart = inv?.serviceDate || doc.issueDate
  const serviceLabel = inv?.servicePeriodEnd ? "Leistungszeitraum" : "Leistungsdatum"
  const serviceValue = inv?.servicePeriodEnd
    ? `${dateDE(serviceStart)} – ${dateDE(inv.servicePeriodEnd)}`
    : dateDE(serviceStart)

  const title = isStorno ? "Stornorechnung" : isInvoice ? "Rechnung" : "Angebot"

  const senderLine = [settings.legalName, settings.address, `${settings.zip} ${settings.city}`]
    .filter(Boolean)
    .join("  ·  ")

  const metaRows: [string, string | undefined][] = [
    [isInvoice ? "Rechnungs-Nr." : "Angebots-Nr.", doc.number],
    ["Datum", dateDE(doc.issueDate)],
    ...(isInvoice ? ([[serviceLabel, serviceValue]] as [string, string][]) : []),
    ["Ihre Kundennummer", customer?.customerNumber ?? customer?.id?.slice(0, 6).toUpperCase()],
    ["Ihr Ansprechpartner", settings.ownerName ?? settings.management],
  ]

  return (
    <div className="doc-sheet">
      {/* ── Kopf: Marke + Wordmark inline auf Weiß, darunter Gradient-Hairline ──
          Feste Höhe in mm → Empfängerblock beginnt bei ~45mm ab Blattoberkante
          (16mm Seitenrand + 29mm Kopf), DIN-5008 / Fensterkuvert-kompatibel. */}
      <header style={{ height: "29mm" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt={settings.name} width={38} height={38} />
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-wordmark.svg" alt={settings.name} style={{ height: 11, width: "auto" }} />
              <div
                className="mt-[4px] text-[7.5px] font-medium uppercase tracking-[0.18em]"
                style={{ color: C.muted }}
              >
                Webdesign &amp; KI-Automatisierung
              </div>
            </div>
          </div>
          <div className="text-right text-[9.5px] leading-[1.65]" style={{ color: C.muted }}>
            <div className="font-semibold" style={{ color: C.body }}>{settings.legalName}</div>
            <div>{settings.address} · {settings.zip} {settings.city}</div>
            <div>{settings.email} · {settings.website}</div>
          </div>
        </div>
        <div className="mt-5 h-[2px] w-full" style={{ background: GRAD }} />
      </header>

      {/* ── Empfänger (Fensterkuvert) + Meta ── */}
      <div className="flex items-start justify-between gap-10">
        <div style={{ width: "85mm" }}>
          <div
            className="mb-2 pb-[3px] text-[7.5px] tracking-[0.02em]"
            style={{ color: C.muted, borderBottom: `0.5pt solid ${C.line}` }}
          >
            {senderLine}
          </div>
          <div className="text-[12.5px] leading-[1.5]" style={{ color: C.body }}>
            <div className="font-semibold" style={{ color: C.ink }}>{customer?.company}</div>
            {customer?.contactName && <div>{customer.contactName}</div>}
            {customer?.address && <div>{customer.address}</div>}
            <div>{[customer?.zip, customer?.city].filter(Boolean).join(" ")}</div>
            <div>{customer?.country ?? "Deutschland"}</div>
          </div>
        </div>

        <table className="shrink-0 text-[11px]">
          <tbody>
            {metaRows.map(([label, value]) =>
              value ? (
                <tr key={label}>
                  <td className="py-[2px] pr-8 uppercase tracking-[0.08em]" style={{ color: C.muted }}>
                    {label}
                  </td>
                  <td className="py-[2px] text-right font-semibold whitespace-nowrap" style={{ color: C.ink }}>
                    {value}
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>

      {/* ── Titel ── */}
      <div className="mt-11">
        <h1 className="text-[27px] font-bold tracking-tight" style={{ color: C.ink }}>
          {title} <span style={{ color: C.brand }}>{doc.number}</span>
        </h1>
        {isStorno && (
          <div className="mt-0.5 text-[12px] font-medium" style={{ color: C.muted }}>
            zu Rechnung {originalNumber ?? "—"}
          </div>
        )}
      </div>

      {/* ── Intro ── */}
      <div className="mt-5 space-y-2.5 text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
        {isStorno ? (
          <p>
            Hiermit stornieren wir die Rechnung{" "}
            <strong style={{ color: C.ink }}>{originalNumber ?? "—"}</strong>. Der Betrag wird
            verrechnet bzw. erstattet.
          </p>
        ) : isInvoice ? (
          <>
            <p>
              Vielen Dank für die Zusammenarbeit. Hiermit stellen wir Ihnen die folgenden Leistungen in
              Rechnung. Bitte begleichen Sie den Betrag bis zum{" "}
              <strong style={{ color: C.ink }}>{dateDE(secondDate)}</strong> unter Angabe der
              Rechnungsnummer <strong style={{ color: C.ink }}>{doc.number}</strong>.
            </p>
            {reminderLevel > 0 && (
              <p style={{ color: C.ink }}>
                <strong>{REMINDER_LABEL[reminderLevel]}:</strong> Trotz Fälligkeit am{" "}
                {dateDE(secondDate)} ist der Rechnungsbetrag noch offen.{" "}
                {hasReminderFee
                  ? "Die angefallene Mahngebühr ist als eigene Position ausgewiesen. "
                  : ""}
                Wir bitten um umgehenden Ausgleich.
              </p>
            )}
          </>
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

      {/* ── Positionstabelle: ruhig, ohne Zebra, nur Hairlines ── */}
      <table className="mt-7 w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {["Beschreibung", "Menge", "Einzelpreis", "Gesamtpreis"].map((h, i) => (
              <th
                key={h}
                className={`pb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                  i === 0 ? "w-[52%] pr-3 text-left" : "px-3 text-right"
                } ${i === 3 ? "pr-0" : ""}`}
                style={{ color: C.muted, borderBottom: `1.5px solid ${C.ink}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, idx) => {
            const { title: itemTitle, bullets } = splitItem(it)
            return (
              <tr key={it.id} className="align-top break-inside-avoid" style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-3 pr-3">
                  <div className="flex gap-2">
                    <span className="tabular-nums" style={{ color: C.muted }}>{idx + 1}.</span>
                    <div>
                      <div className="font-semibold" style={{ color: C.ink }}>{itemTitle}</div>
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
                <td className="whitespace-nowrap py-3 pl-3 text-right font-semibold tabular-nums" style={{ color: C.ink }}>
                  {eur(it.qty * it.unitPrice)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Summen: rechtsbündig, Hairlines statt Flächen ── */}
      <div className="ml-auto mt-6 break-inside-avoid" style={{ width: "80mm" }}>
        <SumRow label="Gesamtbetrag netto" value={eur(totals.net)} />
        {!smallBusiness &&
          totals.taxBreakdown.map((t) => (
            <SumRow
              key={t.rate}
              label={`Umsatzsteuer ${Math.round(t.rate * 100)} % auf ${eur(t.base)}`}
              value={eur(t.tax)}
              muted
            />
          ))}
        <div className="mt-1 h-[2px] w-full" style={{ background: GRAD }} />
        <div className="flex items-center justify-between pt-2.5">
          <span className="text-[13px] font-bold" style={{ color: C.ink }}>
            Gesamtbetrag {smallBusiness ? "" : "brutto"}
          </span>
          <span className="text-[16px] font-bold tabular-nums" style={{ color: C.brand }}>
            {eur(totals.gross)}
          </span>
        </div>
        {smallBusiness && (
          <p className="mt-2 text-right text-[10px]" style={{ color: C.muted }}>
            Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
          </p>
        )}
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

        {!isStorno && (
          <div>
            <div className="mb-1 font-bold" style={{ color: C.ink }}>Zahlungsbedingungen</div>
            <p>
              Sofern nicht anders vereinbart, beträgt das Zahlungsziel{" "}
              <strong style={{ color: C.ink }}>{validityDays} Tage nach Rechnungsdatum ohne Abzug</strong>.
              Bei laufenden oder wiederkehrenden Leistungen (z. B. Hosting, Wartung, Retainer) erfolgt die
              Abrechnung quartalsweise im Voraus.
              {smallBusiness
                ? " Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
                : " Alle Preise verstehen sich zuzüglich der gesetzlichen Mehrwertsteuer."}
            </p>
          </div>
        )}

        <div>
          <div className="mb-1 font-bold" style={{ color: C.ink }}>Lieferbedingungen</div>
          <p>
            Die Leistungen werden digital erbracht und gelten mit Bereitstellung, Freigabe oder Übergabe
            der entsprechenden Dateien, Zugänge oder Systeme als geliefert. Lieferzeiten richten sich nach
            Projektumfang und werden individuell abgestimmt.
          </p>
        </div>

        {!isStorno && (
          <p className="pt-1" style={{ color: C.ink }}>
            Wir freuen uns auf die Zusammenarbeit und die gemeinsame Umsetzung Ihres Projekts.
          </p>
        )}
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

function SumRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2"
      style={{ borderBottom: `1px solid ${C.line}` }}
    >
      <span className="text-[11.5px]" style={{ color: muted ? C.muted : C.body }}>
        {label}
      </span>
      <span className="text-[12.5px] tabular-nums" style={{ color: C.ink }}>
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
