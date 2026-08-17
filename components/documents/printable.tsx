"use client"

import { eur, dateDE, computeTotals, lineNet } from "@/lib/format"
import { REMINDER_LABEL } from "@/lib/types"
import type {
  Invoice,
  Quote,
  Customer,
  CompanySettings,
  LineItem,
  LineItemTask,
  DocValuation,
} from "@/lib/types"

const C = {
  ink: "#16161a",
  body: "#3f3f46",
  muted: "#6b6b74", // 4,6:1 auf Weiß — #8a8a93 war im Laserdruck zu schwach
  line: "#e6e6ea",
  soft: "#f5f6f9", // Flächen für Karten & Callouts
  brand: "#1f7bf2", // Brand-Blau — Cyan wäre auf weißem Papier unlesbar
} as const

// Cyan darf nur dort auftreten, wo es auf Dunkel oder als Hairline sitzt
const GRAD = "linear-gradient(90deg,#00ffe6,#1f7bf2 45%,#5b2eff)"
const HERO_BG = "linear-gradient(118deg,#08080d 0%,#101018 52%,#1a1a2e 100%)"

function qtyLabel(it: LineItem) {
  // Abzugszeilen haben keine Menge — „1 Nachlass" liest sich wie ein Stückpreis.
  if (it.qty === 1 && (it.unit === "Nachlass" || it.unit === "Rabatt")) return it.unit
  const n = it.qty.toLocaleString("de-DE", { maximumFractionDigits: 2 })
  return `${n} ${it.unit ?? "Stk."}`
}

/** Teilleistung auf die einheitliche Form bringen — Strings haben keine Stunden. */
function normalizeTask(t: LineItemTask): { text: string; hours?: number } {
  return typeof t === "string" ? { text: t } : t
}

/** Titel + Unterpunkte einer Position ableiten (aus details[] oder Newlines). */
function splitItem(it: LineItem) {
  if (it.details?.length)
    return { title: it.description, bullets: it.details.map(normalizeTask) }
  const lines = it.description.split("\n").map((s) => s.trim()).filter(Boolean)
  const [title, ...rest] = lines
  return {
    title: title ?? it.description,
    bullets: rest.map((r) => normalizeTask(r.replace(/^[•\-*]\s*/, ""))),
  }
}

/** Freitext in Absätze zerlegen — Leerzeile trennt, wie im Editor getippt. */
function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
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
  // Negative Positionen sind Nachlässe. Sind welche dabei, wird im Summenblock
  // die Zwischensumme vor Abzug ausgewiesen — sonst wäre nicht erkennbar,
  // worauf sich der Nachlass bezieht.
  // Auf einer Stornorechnung sind ALLE Positionen negativ — das ist eine
  // Umkehrung, kein Nachlass. Nur zählen, wenn auch etwas Positives dagegensteht.
  const discountNet = doc.items.some((it) => lineNet(it) > 0)
    ? doc.items.reduce((s, it) => s + Math.min(0, lineNet(it)), 0)
    : 0
  const secondDate = isInvoice ? (doc as Invoice).dueDate : (doc as Quote).validUntil
  const paymentDays = settings.paymentTermsDays || 14
  // Angebotsbindung ergibt sich aus dem Dokument selbst, nicht aus dem
  // Zahlungsziel — sonst steht „14 Tage gültig" unter einem Datum 30 Tage später.
  const quoteValidityDays = Math.max(
    1,
    Math.round(
      (new Date(secondDate).getTime() - new Date(doc.issueDate).getTime()) / 86400000,
    ),
  )

  // Leistungsdatum (§14 UStG) — Fallback: Rechnungsdatum ist Leistungsdatum
  const serviceStart = inv?.serviceDate || doc.issueDate
  const serviceLabel = inv?.servicePeriodEnd ? "Leistungszeitraum" : "Leistungsdatum"
  const serviceValue = inv?.servicePeriodEnd
    ? `${dateDE(serviceStart)} – ${dateDE(inv.servicePeriodEnd)}`
    : dateDE(serviceStart)

  const title = isStorno ? "Stornorechnung" : isInvoice ? "Rechnung" : "Angebot"

  // Kurzform ohne Leistungszusatz — die Zeile muss vollständig in eine Zeile
  // über der Anschrift passen, sonst rutscht sie aus dem Kuvertfenster.
  const senderLine = [
    settings.ownerName ? `${settings.ownerName} · ${settings.name}` : settings.name,
    settings.address,
    `${settings.zip} ${settings.city}`,
  ]
    .filter(Boolean)
    .join("  ·  ")

  // Belegnummer steht bereits im Kopfband und in der Überschrift — im
  // Info-Block würde sie ein drittes Mal auftauchen.
  const metaRows: [string, string | undefined][] = [
    ["Datum", dateDE(doc.issueDate)],
    ...(isInvoice ? ([[serviceLabel, serviceValue]] as [string, string][]) : []),
    ["Ihre Kundennummer", customer?.customerNumber ?? customer?.id?.slice(0, 6).toUpperCase()],
    ["Ihr Ansprechpartner", settings.ownerName ?? settings.management],
  ]

  return (
    <div className="doc-sheet">
      {/* ── Kopf: dunkles Markenband ──────────────────────────────────────────
          Gesamthöhe bleibt bei 29mm, damit der Empfängerblock weiterhin bei
          ~45mm ab Blattoberkante beginnt (DIN 5008 / Fensterkuvert). */}
      <header style={{ height: "29mm" }}>
        <div
          className="relative flex h-[26mm] items-stretch justify-between overflow-hidden rounded-[10px] px-[7mm] py-[5mm]"
          style={{ background: HERO_BG }}
        >
          {/* Markenlinie im Band statt darunter — unter dem Band beginnt direkt
              die Absenderzeile des Fensterkuverts. */}
          <div
            className="absolute bottom-0 left-0 h-[2px] w-[62%]"
            style={{ background: GRAD }}
          />
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark-light.svg" alt={settings.name} width={34} height={34} />
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-wordmark-light.svg"
                alt={settings.name}
                style={{ height: 11, width: "auto" }}
              />
              <div
                className="mt-[4px] text-[9px] font-medium uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                Webdesign &amp; KI-Automatisierung
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center text-right">
            <div
              className="text-[9.5px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              {title}
            </div>
            <div className="mt-[3px] text-[22px] font-bold leading-none text-white">
              {doc.number}
            </div>
            <div className="mt-[5px] text-[10px]" style={{ color: "rgba(255,255,255,0.68)" }}>
              {dateDE(doc.issueDate)}
            </div>
          </div>
        </div>
      </header>

      {/* ── Empfänger (Fensterkuvert) + Meta ── */}
      <div className="flex items-start justify-between gap-10">
        <div style={{ width: "85mm" }}>
          {/* Absenderzeile im Kuvertfenster: bewusst klein, damit sie einzeilig
              bleibt — zweizeilig verschiebt sie die Anschrift aus dem Fenster. */}
          <div
            className="mb-2 truncate pb-[3px] text-[7.5px] tracking-[0.02em]"
            style={{ color: C.muted, borderBottom: `0.5pt solid ${C.line}` }}
          >
            {senderLine}
          </div>
          <div className="text-[13px] leading-[1.5]" style={{ color: C.body }}>
            <div className="font-semibold" style={{ color: C.ink }}>{customer?.company}</div>
            {customer?.contactName && <div>{customer.contactName}</div>}
            {customer?.address && <div>{customer.address}</div>}
            <div>{[customer?.zip, customer?.city].filter(Boolean).join(" ")}</div>
            {/* Land nur bei Auslandspost. Im Inland ist die Zeile überflüssig
                und schiebt die Anschrift über das Ende des Kuvertfensters. */}
            {customer?.country && customer.country !== "Deutschland" && (
              <div>{customer.country}</div>
            )}
          </div>
        </div>

        <table className="shrink-0 text-[11.5px]">
          <tbody>
            {metaRows.map(([label, value]) =>
              value ? (
                <tr key={label}>
                  <td
                    className="py-[2px] pr-8 text-[10px] uppercase tracking-[0.16em]"
                    style={{ color: C.muted }}
                  >
                    {label}
                  </td>
                  <td className="py-[2.5px] text-right font-semibold whitespace-nowrap" style={{ color: C.ink }}>
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
        <h1 className="text-[30px] font-bold leading-[1.1] tracking-tight" style={{ color: C.ink }}>
          {title} <span style={{ color: C.brand }}>{doc.number}</span>
        </h1>
        {isStorno && (
          <div className="mt-1 text-[14px] font-medium" style={{ color: C.muted }}>
            zu Rechnung {originalNumber ?? "—"}
          </div>
        )}
      </div>

      {/* ── Intro ── */}
      <div className="mt-3.5 space-y-2 text-[13px] leading-[1.6]" style={{ color: C.body }}>
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
            {/* Anrede ohne Geschlechtsannahme — der Name allein sagt nichts über
                die Anrede aus, und „Sehr geehrter Herr" ins Blaue ist peinlicher
                als die neutrale Form. */}
            <p style={{ color: C.ink }}>
              {customer?.contactName
                ? `Guten Tag ${customer.contactName},`
                : "Sehr geehrte Damen und Herren,"}
            </p>
            <p>
              vielen Dank für Ihre Anfrage und Ihr Interesse an einer Zusammenarbeit mit{" "}
              <strong style={{ color: C.ink }}>{settings.name}</strong>.
            </p>
            <p>
              Im Folgenden finden Sie unser Angebot zu den besprochenen Anforderungen:
              Leistungsumfang, kalkulierter Aufwand und Festpreis je Paket — damit
              nachvollziehbar ist, wofür der Preis steht.
            </p>
          </>
        )}
        {customer?.company && (
          <p style={{ color: C.muted }}>
            Kunde: <strong style={{ color: C.ink }}>{customer.company}</strong>
          </p>
        )}
      </div>

      {/* ── Positionen ── */}
      <table className="mt-7 w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {["Position", "Menge", "Einzelpreis", "Gesamtpreis"].map((h, i) => (
              <th
                key={h}
                className={`pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  i === 0 ? "w-[62%] pr-3 text-left" : "px-3 text-right"
                } ${i === 3 ? "pr-0" : ""}`}
                style={{ color: C.muted, borderBottom: `1px solid ${C.ink}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, idx) => {
            const { title: itemTitle, bullets } = splitItem(it)
            // Sind die Teilleistungen einzeln bemessen, ist ihre Summe der
            // Positionsaufwand — so können Einzelwerte und Gesamtwert nicht
            // auseinanderlaufen. Sonst zählt der Wert an der Position selbst.
            const bulletHours = bullets.reduce((s, b) => s + (b.hours ?? 0), 0)
            const totalHours = bulletHours > 0 ? bulletHours : it.hours
            // Wird die Position ohnehin nach Stunden abgerechnet, steht der
            // Aufwand bereits in der Mengenspalte — dann keine zweite Zeile.
            const hoursAreQty = it.unit === "Std." && it.qty === totalHours
            return (
              <tr
                key={it.id}
                className="align-top"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <td className="py-3.5 pr-3">
                  <div className="flex gap-2.5">
                    <span
                      className="text-[11px] font-semibold tabular-nums leading-[1.6]"
                      style={{ color: C.brand }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold leading-snug" style={{ color: C.ink }}>
                        {itemTitle}
                      </div>
                      {it.note && (
                        <p
                          className="mt-1.5 text-[11.5px] leading-[1.55]"
                          style={{ color: C.body }}
                        >
                          {it.note}
                        </p>
                      )}
                      {totalHours != null && !hoursAreQty && (
                        <div
                          className="mt-1 text-[11px] font-semibold tracking-[0.02em]"
                          style={{ color: C.brand }}
                        >
                          Aufwand {totalHours.toLocaleString("de-DE")} Std.
                        </div>
                      )}
                      {bullets.length > 0 && (
                        <ul className="mt-2 space-y-[5px]">
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[11.5px] leading-[1.5]"
                              style={{ color: C.body }}
                            >
                              <span
                                className="mt-[5px] h-[3px] w-[3px] shrink-0 rounded-full"
                                style={{ background: C.brand }}
                              />
                              <span className="flex-1">{b.text}</span>
                              {b.hours != null && (
                                <span
                                  className="shrink-0 pl-2 text-right tabular-nums"
                                  style={{ color: C.muted }}
                                >
                                  {b.hours.toLocaleString("de-DE")} Std.
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums" style={{ color: C.body }}>
                  {qtyLabel(it)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums" style={{ color: C.body }}>
                  {eur(it.unitPrice)}
                </td>
                <td
                  className="whitespace-nowrap py-3.5 pl-3 text-right font-semibold tabular-nums"
                  style={{ color: it.qty * it.unitPrice < 0 ? C.brand : C.ink }}
                >
                  {eur(it.qty * it.unitPrice)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Nachlass: eigener Block über den Summen. Ein Abzug, der nur als
             Zeile im Kleingedruckten steht, wird nicht als Vorteil gelesen —
             hier steht er in der Größe, die ihm zusteht. ── */}
      {discountNet < 0 && (
        <div
          className="mt-7 flex break-inside-avoid items-center justify-between gap-6 rounded-[10px] px-5 py-4"
          style={{ background: C.soft, borderLeft: `4px solid ${C.brand}` }}
        >
          <div>
            <div
              className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: C.brand }}
            >
              {isInvoice ? "Berücksichtigter Nachlass" : "Ihr Nachlass"}
            </div>
            <div className="mt-1.5 text-[12px] leading-snug" style={{ color: C.body }}>
              Regulär {eur(totals.net - discountNet)} netto — berechnet werden{" "}
              <strong style={{ color: C.ink }}>{eur(totals.net)} netto</strong>.
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="text-[30px] font-bold leading-none tabular-nums"
              style={{ color: C.brand }}
            >
              {eur(discountNet)}
            </div>
            <div
              className="mt-1 text-[11px] font-semibold tabular-nums"
              style={{ color: C.muted }}
            >
              {Math.round((-discountNet / (totals.net - discountNet)) * 100)} % gespart
            </div>
          </div>
        </div>
      )}

      {/* ── Summen: Aufschlüsselung hell, Endbetrag als dunkle Karte ── */}
      <div className="mt-4 grid break-inside-avoid grid-cols-2 gap-4">
        <div
          className="rounded-[10px] px-5 py-4"
          style={{ background: C.soft, border: `1px solid ${C.line}` }}
        >
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: C.muted }}
          >
            Zusammensetzung
          </div>
          <div className="mt-2.5">
            {discountNet < 0 && (
              <>
                <SumRow label="Zwischensumme" value={eur(totals.net - discountNet)} muted />
                <SumRow label="Nachlass" value={eur(discountNet)} accent />
              </>
            )}
            <SumRow label="Nettobetrag" value={eur(totals.net)} />
            {!smallBusiness &&
              totals.taxBreakdown.map((t) => (
                <SumRow
                  key={t.rate}
                  label={`Umsatzsteuer ${Math.round(t.rate * 100)} % auf ${eur(t.base)}`}
                  value={eur(t.tax)}
                  muted
                />
              ))}
          </div>
          {smallBusiness && (
            <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: C.muted }}>
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-[10px] px-5 py-4" style={{ background: HERO_BG }}>
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            {isInvoice
              ? isStorno
                ? "Gutschriftsbetrag"
                : "Zahlbar bis " + dateDE(secondDate)
              : "Angebotssumme"}
          </div>
          <div className="mt-2 text-[27px] font-bold leading-none tabular-nums text-white">
            {eur(totals.gross)}
          </div>
          <div className="mt-1.5 text-[11.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            {smallBusiness
              ? "ohne Umsatzsteuer (§ 19 UStG)"
              : `brutto · enthält ${eur(totals.gross - totals.net)} Umsatzsteuer`}
          </div>
          <div className="mt-3 h-[2px] w-[52%]" style={{ background: GRAD }} />
        </div>
      </div>

      {/* ── Preis-Einordnung — nur im Angebot. Eine Rechnung ist ein Beleg über
             eine bereits erbrachte Leistung; Marktvergleiche gehören in die
             Entscheidungsphase davor, nicht auf das Zahlungsdokument. ── */}
      {!isInvoice && doc.valuation && <Valuation v={doc.valuation} />}

      {/* ── Bedingungen ── */}
      <div className="mt-8 space-y-4">
        {!isInvoice && (
          <p className="text-[12px] leading-[1.6]" style={{ color: C.body }}>
            Dieses Angebot ist{" "}
            <strong style={{ color: C.ink }}>{quoteValidityDays} Tage gültig</strong> (bis{" "}
            {dateDE(secondDate)}). Bei Rückfragen oder Anpassungswünschen stehen wir Ihnen jederzeit
            gerne zur Verfügung – telefonisch, per Mail oder im persönlichen Gespräch.
          </p>
        )}

        {doc.notes && (
          <div
            className="rounded-r-[8px] py-3 pl-4 pr-5"
            style={{ background: C.soft, borderLeft: `3px solid ${C.brand}` }}
          >
            <div
              className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: C.brand }}
            >
              Anmerkungen
            </div>
            <div className="mt-2 text-[11.5px] leading-[1.55]" style={{ color: C.body }}>
              {paragraphs(doc.notes).map((p, i) =>
                // Ein Absatz mit „## " davor ist eine Zwischenüberschrift. Ohne
                // sie wird ein langer Anmerkungsblock zur Textwüste, die niemand
                // liest — und genau dort stehen die Vertragsinhalte.
                p.startsWith("## ") ? (
                  <div
                    key={i}
                    className={`break-after-avoid text-[11px] font-bold${i === 0 ? "" : " mt-3"}`}
                    style={{ color: C.ink }}
                  >
                    {p.slice(3)}
                  </div>
                ) : (
                  <p key={i} className="mt-[6px] break-inside-avoid">
                    {p}
                  </p>
                ),
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!isStorno && (
            <InfoCard title="Zahlungsbedingungen">
              Sofern nicht anders vereinbart, beträgt das Zahlungsziel{" "}
              <strong style={{ color: C.ink }}>{paymentDays} Tage nach Rechnungsdatum ohne Abzug</strong>.
              Abweichende Zahlungspläne und erfolgsabhängige Vergütungen richten sich
              ausschließlich nach den Anmerkungen zu diesem Beleg.
              {smallBusiness
                ? " Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
                : " Alle Preise verstehen sich zuzüglich der gesetzlichen Mehrwertsteuer."}
            </InfoCard>
          )}
          <InfoCard title="Lieferbedingungen">
            Die Leistungen werden digital erbracht und gelten mit Bereitstellung, Freigabe oder Übergabe
            der entsprechenden Dateien, Zugänge oder Systeme als geliefert. Genannte Zeiträume sind
            Planwerte; sie setzen die rechtzeitige Bereitstellung von Zugängen, Daten und Freigaben voraus.
          </InfoCard>
        </div>

        {!isStorno && (
          <p className="pt-1 text-[12px]" style={{ color: C.ink }}>
            Wir freuen uns auf die Zusammenarbeit und die gemeinsame Umsetzung Ihres Projekts.
          </p>
        )}
      </div>

      {/* ── Footer (Rechtsangaben) ── */}
      <div
        className="mt-auto grid grid-cols-4 gap-5 pt-5 text-[10.5px] leading-[1.55]"
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

/**
 * Preis-Einordnung: derselbe Aufwand zu verschiedenen Stundensätzen, damit
 * nachvollziehbar wird, wo der Preis im Markt liegt. Bewusst knapp — Balken,
 * vier Gründe, ein Fazit.
 */
function Valuation({ v }: { v: DocValuation }) {
  const own = { label: "Dieses Angebot", amount: v.netAmount }
  const marks = [...v.benchmarks]
    .map((b) => ({ label: b.label, rate: b.rate, amount: b.rate * v.hours }))
    .sort((a, b) => a.amount - b.amount)
  const max = Math.max(own.amount, ...marks.map((m) => m.amount))
  const effective = v.netAmount / v.hours

  return (
    <div className="mt-9 break-inside-avoid">
      <SectionHead
        eyebrow="Preis-Einordnung"
        title="Rechnerische Einordnung des kalkulierten Projektumfangs"
      />
      <p className="mt-1.5 text-[12px] leading-[1.55]" style={{ color: C.body }}>
        {v.hours.toLocaleString("de-DE")} Std. kalkulierte Arbeit, hochgerechnet auf marktübliche
        Sätze. Effektiv entspricht der Preis{" "}
        <strong style={{ color: C.ink }}>
          {effective.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €/Std.
        </strong>
      </p>

      <div className="mt-3 space-y-[7px]">
        <Bar label={own.label} sub={`${Math.round(effective)} €/h`} amount={own.amount} max={max} own />
        {marks.map((m) => (
          <Bar
            key={m.label}
            label={m.label}
            sub={`${m.rate} €/h`}
            amount={m.amount}
            max={max}
          />
        ))}
      </div>

      {v.reasons.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {v.reasons.map((r) => (
            <div
              key={r.title}
              className="break-inside-avoid rounded-[8px] px-3.5 py-3"
              style={{ border: `1px solid ${C.line}` }}
            >
              <div className="text-[12px] font-bold leading-snug" style={{ color: C.ink }}>
                {r.title}
              </div>
              <p className="mt-1 text-[11.5px] leading-[1.5]" style={{ color: C.body }}>
                {r.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {v.bottomLine && (
        <div
          className="mt-4 break-inside-avoid rounded-r-[8px] py-3 pl-4 pr-5"
          style={{ background: C.soft, borderLeft: `3px solid ${C.brand}` }}
        >
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: C.brand }}
          >
            Auf den Punkt
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.55]" style={{ color: C.body }}>
            {v.bottomLine}
          </p>
        </div>
      )}

      {v.sources?.length ? (
        <div className="mt-4 break-inside-avoid">
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: C.muted }}
          >
            Quellen der Marktwerte
          </div>
          <ol className="mt-1.5 space-y-1">
            {v.sources.map((s, i) => (
              <li key={s.name} className="flex gap-2 text-[10.5px] leading-[1.5]">
                <span className="font-bold tabular-nums" style={{ color: C.brand }}>
                  {i + 1}
                </span>
                <span style={{ color: C.body }}>
                  <strong style={{ color: C.ink }}>{s.name}</strong> {s.detail}
                  {s.link && <span style={{ color: C.brand }}> {s.link}</span>}
                </span>
              </li>
            ))}
          </ol>
          {v.sourceNote && (
            <p className="mt-1.5 text-[10.5px] leading-snug" style={{ color: C.muted }}>
              {v.sourceNote}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2.5 text-[10.5px] leading-snug" style={{ color: C.muted }}>
          {v.sourceNote ??
            "Marktwerte sind Orientierungsgrößen aus dem deutschen Markt (Freelancer- und Agentursätze), keine Zusicherung."}
        </p>
      )}
    </div>
  )
}

function Bar({
  label,
  sub,
  amount,
  max,
  own,
}: {
  label: string
  sub: string
  amount: number
  max: number
  own?: boolean
}) {
  const pct = Math.max(6, Math.round((amount / max) * 100))
  return (
    <div className="flex items-center gap-3 text-[11.5px]">
      {/* Bezeichnung und Satz stehen bewusst untereinander: einzeilig brechen
          die langen Labels zufällig um und die Balkenabstände werden ungleich. */}
      <div className="w-[52mm] shrink-0 leading-tight" style={{ color: own ? C.ink : C.body }}>
        <span className={`block${own ? " font-bold" : " font-medium"}`}>{label}</span>
        <span className="block text-[10px]" style={{ color: C.muted }}>
          {sub}
        </span>
      </div>
      <div className="h-[9px] flex-1 overflow-hidden rounded-full" style={{ background: "#eff0f4" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: own ? GRAD : "#c9ccd6" }}
        />
      </div>
      <div
        className="w-[22mm] shrink-0 text-right font-semibold tabular-nums"
        style={{ color: own ? C.brand : C.ink }}
      >
        {eur(amount)}
      </div>
    </div>
  )
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div
        className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: C.muted }}
      >
        {eyebrow}
      </div>
      <h2 className="mt-1 text-[16px] font-bold tracking-tight" style={{ color: C.ink }}>
        {title}
      </h2>
    </div>
  )
}

function SumRow({
  label,
  value,
  muted,
  accent,
}: {
  label: string
  value: string
  muted?: boolean
  /** Abzugszeile — in der Akzentfarbe, damit sie nicht wie ein Aufschlag liest. */
  accent?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[5px]">
      <span
        className={`text-[11.5px] leading-snug${accent ? " font-semibold" : ""}`}
        style={{ color: accent ? C.brand : muted ? C.muted : C.body }}
      >
        {label}
      </span>
      <span
        className={`shrink-0 text-[12.5px] tabular-nums${accent ? " font-semibold" : ""}`}
        style={{ color: accent ? C.brand : C.ink }}
      >
        {value}
      </span>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="break-inside-avoid rounded-[10px] px-4 py-3.5"
      style={{ border: `1px solid ${C.line}` }}
    >
      <div className="text-[12px] font-bold" style={{ color: C.ink }}>
        {title}
      </div>
      <p className="mt-1 text-[11.5px] leading-[1.55]" style={{ color: C.body }}>
        {children}
      </p>
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
      <span className="uppercase tracking-[0.12em]">{k} </span>
      <b style={{ color: C.body }}>{v}</b>
    </div>
  )
}
