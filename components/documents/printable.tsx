"use client"

import { eur, dateDE, dateNum, computeTotals, lineNet } from "@/lib/format"
import { GirocodeQR } from "./girocode"
import type { GirocodeInput } from "@/lib/girocode"
import { REMINDER_LABEL } from "@/lib/types"
import type {
  Invoice,
  Customer,
  CompanySettings,
  LineItem,
  LineItemTask,
} from "@/lib/types"

/**
 * Rechnungsbeleg — dieselbe Komposition wie `tools/rechnung/rechnung.py`:
 * dunkles Kopfband, Kennzahlenleiste, Positionen, Zahlung neben der Summe,
 * GiroCode neben der Rechtszeile, dreispaltiger Blattfuß. Beide Wege sollen
 * dasselbe Dokument erzeugen; Abweichungen hier sind Fehler, keine Variante.
 *
 * Das Angebot hat mit `ProposalDoc` ein eigenes, mehrseitiges Format.
 */

// Farben aus dem PDF-Template. Navy statt Neutralgrau: der Beleg soll auf
// Papier zur Marke gehören, ohne dass Cyan aufs Weiße muss.
const C = {
  ink: "#141d2b",
  ink2: "#39445a",
  muted: "#66718a",
  line: "#e4e8f0",
  soft: "#f6f8fc",
  accent: "#1b64d8", // Brand-Blau, auf Weiß lesbar — Cyan wäre es nicht
  green: "#0a8f5b",
} as const

const GRAD = "linear-gradient(90deg,#00ffe6,#1f7bf2,#3d00ff)"
const NAVY = "linear-gradient(120deg,#070c1c 30%,#101a38)"

/** Blattrand innerhalb des Satzspiegels — im PDF 38–42 px, hier in mm. */
const PAD = "10mm"

function qtyLabel(it: LineItem) {
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

/** Gleicher Tag? Für die Frage, ob Leistungs- und Rechnungsdatum zusammenfallen. */
function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export function PrintableDoc({
  doc,
  customer,
  settings,
  originalNumber,
}: {
  doc: Invoice
  customer?: Customer
  settings: CompanySettings
  /** Nummer der Originalrechnung, wenn dieses Dokument eine Stornorechnung ist */
  originalNumber?: string
}) {
  const isStorno = Boolean(doc.cancelsInvoiceId)
  const reminderLevel = doc.reminderLevel ?? 0
  const hasReminderFee = doc.items.some((it) => it.description.startsWith("Mahngebühr"))
  const smallBusiness = settings.smallBusiness
  const totals = computeTotals(doc.items)
  const isAdvance = doc.kind === "advance"
  const docLabel = isStorno
    ? "Stornorechnung"
    : isAdvance
      ? "Anzahlungsrechnung"
      : doc.kind === "final"
        ? "Schlussrechnung"
        : "Rechnung"

  // Negative Positionen sind Nachlässe und gehören zwischen Zwischensumme und
  // Netto, nicht in die Leistungstabelle — sonst liest sich der Abzug wie eine
  // erbrachte Leistung. Auf einer Stornorechnung sind ALLE Positionen negativ:
  // das ist eine Umkehrung, kein Nachlass, und bleibt in der Tabelle stehen.
  const hasPositive = doc.items.some((it) => lineNet(it) > 0)
  const deductions = hasPositive ? doc.items.filter((it) => lineNet(it) < 0) : []
  const rows = doc.items.filter((it) => !deductions.includes(it))
  const subtotal = rows.reduce((s, it) => s + lineNet(it), 0)
  const discount = deductions.reduce((s, it) => s + lineNet(it), 0)

  // Menge und Einzelpreis nur, wenn die Stückzahl etwas aussagt. Bei lauter
  // Pauschalen („1 Paket · 7.700 €") stünde dieselbe Zahl dreimal in der Zeile.
  const showQty = rows.some((it) => it.qty !== 1)

  const serviceStart = doc.serviceDate || doc.issueDate
  // Bei einer Anzahlung gibt es kein Leistungsdatum zu nennen — die Leistung
  // steht ja noch aus. Das Feld trägt deshalb den Zeitpunkt, der hier zählt.
  const serviceLabel = isAdvance
    ? "Leistung"
    : doc.servicePeriodEnd
      ? "Leistungszeitraum"
      : "Leistungsdatum"
  const serviceValue = isAdvance
    ? "nach Abnahme"
    : doc.servicePeriodEnd
      ? `${dateNum(serviceStart)} – ${dateNum(doc.servicePeriodEnd)}`
      : dateNum(serviceStart)

  // Leistungsdatum ist Pflichtangabe (§14 Abs. 4 Nr. 6 UStG). Fällt es auf das
  // Rechnungsdatum, genügt der Hinweis darauf (UStAE 14.5 Abs. 16).
  // Bei einer Anzahlung ist die Leistung noch nicht erbracht — ein
  // Leistungsdatum gäbe es hier nicht zu nennen, ohne zu lügen. §14 Abs. 4
  // Nr. 6 UStG verlangt stattdessen den Zeitpunkt der Vereinnahmung, und der
  // steht erst fest, wenn das Geld da ist.
  const serviceNote = isAdvance
    ? "Anzahlung vor Ausführung der Leistung; der Leistungszeitpunkt steht noch nicht fest"
    : doc.servicePeriodEnd
      ? `Leistungszeitraum ${serviceValue}`
      : sameDay(serviceStart, doc.issueDate)
        ? "Leistungsdatum entspricht Rechnungsdatum"
        : `Leistungsdatum ${dateNum(serviceStart)}`

  const legalNote =
    doc.legalNote ??
    "<b>Eigentums- und Rechtevorbehalt:</b> Gemäß Vereinbarung gehen alle Nutzungs- und Verwertungsrechte an Website und Software erst mit vollständiger Bezahlung auf den Auftraggeber über."

  const legal = isStorno
    ? `Diese Stornorechnung hebt die Rechnung ${originalNumber ?? "—"} vollständig auf; der Betrag wird verrechnet bzw. erstattet. Übermittlung als elektronische Rechnung (PDF) mit Zustimmung des Empfängers gemäß §27 Abs. 38 UStG.`
    : `${serviceNote}. Zahlbar ohne Abzug bis ${dateNum(doc.dueDate)}. ${legalNote} Übermittlung als elektronische Rechnung (PDF) mit Zustimmung des Empfängers gemäß §27 Abs. 38 UStG.`

  // GiroCode nur dort, wo tatsächlich noch Geld fließen soll: keine
  // Stornorechnung (der Betrag geht zurück), nichts Bezahltes oder Storniertes
  // — ein scanbarer Code auf einer stornierten Rechnung fordert zur Zahlung
  // einer Forderung auf, die es nicht mehr gibt. Ohne IBAN ebenfalls nicht.
  const open = doc.status !== "paid" && doc.status !== "canceled"
  const payable = !isStorno && open && totals.gross > 0
  const girocode: GirocodeInput | null =
    payable && settings.iban
      ? {
          name: settings.ownerName || settings.legalName || settings.name,
          iban: settings.iban,
          amount: totals.gross,
          reference: `Rechnung ${doc.number}`,
        }
      : null

  // Kurzform in einer Zeile über der Anschrift — zweizeilig rutscht sie aus
  // dem Kuvertfenster.
  const senderLine = [
    settings.ownerName ? `${settings.ownerName} · ${settings.name}` : settings.name,
    settings.address,
    `${settings.zip} ${settings.city}`,
  ]
    .filter(Boolean)
    .join(" · ")

  const specs: [string, string, boolean?][] = [
    ["Rechnungsdatum", dateNum(doc.issueDate)],
    [serviceLabel, serviceValue],
    [
      "Kunden-Nr.",
      customer?.customerNumber ?? customer?.id?.slice(0, 6).toUpperCase() ?? "—",
    ],
    isStorno
      ? ["Bezug", originalNumber ?? "—"]
      : ["Zahlbar bis", dateNum(doc.dueDate), true],
  ]

  return (
    <div className="doc-sheet">
      {/* ── Kopfband ─────────────────────────────────────────────────────────
          Reicht bis an den Satzspiegelrand: das Blatt bringt keinen eigenen
          Innenabstand mit, jeder Abschnitt setzt ihn selbst. */}
      <header
        className="doc-head relative overflow-hidden"
        style={{
          background: NAVY,
          padding: `7mm ${PAD} 0`,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Lichter und Raster wie im PDF — ohne sie wirkt das Band als Fläche
            flach und der Verlauf darunter beliebig. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 420px 200px at 88% -10%, rgba(0,255,230,.16), transparent 65%), radial-gradient(ellipse 380px 220px at 8% 120%, rgba(61,0,255,.22), transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.028) 0 1px, transparent 1px 46px), repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 46px)",
          }}
        />
        <div className="doc-head-in relative flex items-center justify-between pb-[6mm]">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark-light.svg" alt={settings.name} width={50} height={50} />
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-wordmark-light.svg"
                alt={settings.name}
                style={{ height: 20, width: "auto", display: "block" }}
              />
              <div
                className="mt-[6px] text-[10.5px] uppercase tracking-[0.26em]"
                style={{ color: "#dde5f8" }}
              >
                Webdesign &amp; KI-Automatisierung
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className="text-[10.5px] font-bold uppercase tracking-[0.3em]"
              style={{ color: "#7ee7db" }}
            >
              {docLabel}
            </div>
            <div className="font-display mt-[4px] text-[25px] font-bold leading-none tracking-[0.04em] text-white">
              {doc.number}
            </div>
            <div
              className="ml-auto mt-[7px] h-[2px] w-[120px] rounded-[2px]"
              style={{ background: GRAD }}
            />
          </div>
        </div>
        <div
          className="relative h-[3px]"
          style={{ background: GRAD, marginLeft: `-${PAD}`, marginRight: `-${PAD}` }}
        />
      </header>

      {/* ── Kennzahlenleiste ── */}
      <div
        className="doc-specs flex"
        style={{
          background: C.soft,
          borderBottom: `1px solid ${C.line}`,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {specs.map(([label, value, hot], i) => (
          <div
            key={label}
            className="flex-1 px-5 pb-[11px] pt-[12px]"
            style={{
              borderLeft: i === 0 ? undefined : `1px solid ${C.line}`,
              paddingLeft: i === 0 ? PAD : undefined,
              paddingRight: i === specs.length - 1 ? PAD : undefined,
            }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: C.muted }}
            >
              {label}
            </div>
            <div
              className="mt-[4px] text-[13.5px] font-bold tabular-nums"
              style={{ color: hot ? C.accent : C.ink }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Körper: füllt das Blatt, damit die Fußzeile unten steht ── */}
      <div
        className="doc-body flex flex-1 flex-col"
        style={{ padding: `7mm ${PAD} 6mm` }}
      >
        <div className="text-[10px]" style={{ color: "#8b95aa" }}>
          {senderLine}
        </div>

        {/* Empfänger + Rechnungssteller */}
        <div
          className="doc-top mt-[14px] flex items-end justify-between gap-10 pb-5"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div>
            <div
              className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: C.muted }}
            >
              {docLabel} an
            </div>
            <div className="text-[17px] font-extrabold tracking-[-0.01em]" style={{ color: C.ink }}>
              {customer?.company ?? customer?.contactName ?? "—"}
            </div>
            <div className="mt-[3px] text-[13.5px] leading-[1.55]" style={{ color: C.ink2 }}>
              {customer?.company && customer.contactName && <div>{customer.contactName}</div>}
              {customer?.address && <div>{customer.address}</div>}
              <div>{[customer?.zip, customer?.city].filter(Boolean).join(" ")}</div>
              {/* Land nur bei Auslandspost — im Inland ist die Zeile überflüssig. */}
              {customer?.country && customer.country !== "Deutschland" && (
                <div>{customer.country}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: C.muted }}
            >
              Rechnungssteller
            </div>
            <div className="text-[14px] font-extrabold tracking-[-0.01em]" style={{ color: C.ink }}>
              {settings.name}
              {settings.ownerName ? ` · ${settings.ownerName}` : ""}
            </div>
            <div className="mt-[3px] text-[13.5px] leading-[1.55]" style={{ color: C.ink2 }}>
              <div>{settings.address}</div>
              <div>
                {settings.zip} {settings.city}
              </div>
              {settings.vatId && <div>USt-IdNr. {settings.vatId}</div>}
            </div>
          </div>
        </div>

        {/* Überschrift + Einordnung */}
        <div className="doc-title mt-[22px]">
          <h1
            className="font-display text-[23px] font-bold leading-tight tracking-[-0.01em]"
            style={{ color: C.ink }}
          >
            {doc.title ?? `${docLabel} ${doc.number}`}
            {doc.titleAccent && (
              <>
                {" — "}
                <span style={{ color: C.accent }}>{doc.titleAccent}</span>
              </>
            )}
          </h1>
          {isStorno && (
            <p className="mt-[6px] max-w-[620px] text-[13.5px] leading-[1.55]" style={{ color: C.ink2 }}>
              Die Rechnung <strong style={{ color: C.ink }}>{originalNumber ?? "—"}</strong> wird
              hiermit vollständig storniert. Der Betrag wird verrechnet bzw. erstattet.
            </p>
          )}
          {doc.lead && (
            <p className="mt-[6px] max-w-[620px] text-[13.5px] leading-[1.55]" style={{ color: C.ink2 }}>
              {doc.lead}
            </p>
          )}
        </div>

        {/* Mahnstufe: gehört über die Positionen, nicht ins Kleingedruckte */}
        {reminderLevel > 0 && !isStorno && (
          <div
            className="mt-5 break-inside-avoid rounded-[10px] px-5 py-3.5"
            style={{ background: C.soft, borderLeft: `4px solid ${C.accent}` }}
          >
            <div
              className="text-[9.5px] font-bold uppercase tracking-[0.22em]"
              style={{ color: C.accent }}
            >
              {REMINDER_LABEL[reminderLevel]}
            </div>
            <p className="mt-[5px] text-[12px] leading-[1.55]" style={{ color: C.ink2 }}>
              Trotz Fälligkeit am {dateDE(doc.dueDate)} ist der Rechnungsbetrag noch offen.{" "}
              {hasReminderFee ? "Die angefallene Mahngebühr ist als eigene Position ausgewiesen. " : ""}
              Wir bitten um umgehenden Ausgleich.
            </p>
          </div>
        )}

        {/* ── Positionen ── */}
        <table className="doc-items mt-5 w-full border-collapse">
          <thead>
            <tr>
              <Th style={{ paddingLeft: 0, width: 36 }}>Pos.</Th>
              {/* Feste Breite für die Leistung: sonst teilt die Tabelle den Platz
                  nach Textmenge auf, und der Erläuterungssatz bricht neben zwei
                  kurzen Zahlenspalten auf doppelt so viele Zeilen um. */}
              <Th style={{ width: showQty ? "56%" : "72%" }}>Leistung</Th>
              {showQty && (
                <>
                  <Th right>Menge</Th>
                  <Th right>Einzelpreis</Th>
                </>
              )}
              <Th right last>
                Betrag (netto)
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, idx) => {
              const { title: itemTitle, bullets } = splitItem(it)
              const bulletHours = bullets.reduce((s, b) => s + (b.hours ?? 0), 0)
              const totalHours = bulletHours > 0 ? bulletHours : it.hours
              // Wird nach Stunden abgerechnet, steht der Aufwand schon in der
              // Mengenspalte — dann keine zweite Zeile.
              const hoursAreQty = it.unit === "Std." && it.qty === totalHours
              return (
                <tr
                  key={it.id}
                  className="break-inside-avoid align-top"
                  style={{ borderBottom: `1px solid ${C.line}` }}
                >
                  <td className="py-3.5 pr-2.5" style={{ paddingLeft: 0, width: 36 }}>
                    <span
                      className="font-display text-[12.5px] font-bold tabular-nums"
                      style={{ color: "#1f7bf2" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-2.5 py-3.5">
                    <span className="block text-[14px] font-bold" style={{ color: C.ink }}>
                      {itemTitle}
                    </span>
                    {it.note && (
                      <span
                        className="mt-[4px] block max-w-[640px] text-[12.5px] leading-[1.55]"
                        style={{ color: C.muted }}
                      >
                        {it.note}
                      </span>
                    )}
                    {totalHours != null && !hoursAreQty && (
                      <span
                        className="mt-[4px] block text-[11px] font-bold tracking-[0.02em]"
                        style={{ color: C.accent }}
                      >
                        Aufwand {totalHours.toLocaleString("de-DE")} Std.
                      </span>
                    )}
                    {bullets.length > 0 && (
                      <ul className="mt-2 space-y-[5px]">
                        {bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[11.5px] leading-[1.5]"
                            style={{ color: C.ink2 }}
                          >
                            <span
                              className="mt-[5px] h-[3px] w-[3px] shrink-0 rounded-full"
                              style={{ background: C.accent }}
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
                  </td>
                  {showQty && (
                    <>
                      <td
                        className="whitespace-nowrap px-2.5 py-3.5 text-right text-[12.5px] font-semibold tabular-nums"
                        style={{ color: C.ink2 }}
                      >
                        {qtyLabel(it)}
                      </td>
                      <td
                        className="whitespace-nowrap px-2.5 py-3.5 text-right text-[12.5px] font-semibold tabular-nums"
                        style={{ color: C.ink2 }}
                      >
                        {eur(it.unitPrice)}
                      </td>
                    </>
                  )}
                  <td
                    className="whitespace-nowrap py-3.5 pl-2.5 text-right text-[14px] font-bold tabular-nums"
                    style={{ color: C.ink, paddingRight: 0 }}
                  >
                    {eur(lineNet(it))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ── Zahlung + Summen ── */}
        <div className="doc-bottom mt-6 flex break-inside-avoid items-stretch gap-7">
          {payable && settings.iban && (
            <div
              className="relative flex-1 overflow-hidden rounded-[12px] px-5 pb-3.5 pt-4"
              style={{
                background: "#fbfcfe",
                border: `1px solid ${C.line}`,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: GRAD }} />
              <div
                className="mb-[9px] text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color: C.muted }}
              >
                Zahlung
              </div>
              <Kv k="Betrag" v={eur(totals.gross)} hot />
              <Kv k="IBAN" v={settings.iban} />
              <Kv
                k="Bank"
                v={[settings.bankName, settings.bic && `BIC ${settings.bic}`]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Kv k="Kontoinhaber" v={settings.ownerName ?? settings.legalName} />
              <Kv k="Verwendungszweck" v={`Rechnung ${doc.number}`} />
              <Kv k="Fällig bis" v={dateNum(doc.dueDate)} hot />
            </div>
          )}

          {/* Ohne Zahlungsblock (storniert, bezahlt, keine IBAN) rückt die
              Aufstellung nach rechts, statt sich über das ganze Blatt zu
              ziehen — Bezeichnung und Betrag sollen nah beieinander stehen. */}
          <div
            className={`flex flex-col justify-end${payable && settings.iban ? "" : " ml-auto"}`}
            style={{ width: payable && settings.iban ? 300 : "58%" }}
          >
            {discount < 0 && (
              <>
                <Trow label="Zwischensumme (netto)" value={eur(subtotal)} />
                {deductions.map((it) => (
                  <Trow
                    key={it.id}
                    label={it.description}
                    value={eur(lineNet(it))}
                    accent={C.green}
                  />
                ))}
              </>
            )}
            <Trow label="Netto gesamt" value={eur(totals.net)} />
            {!smallBusiness &&
              totals.taxBreakdown.map((t) => (
                <Trow
                  key={t.rate}
                  label={`zzgl. ${Math.round(t.rate * 100)} % USt`}
                  value={eur(t.tax)}
                />
              ))}
            {smallBusiness && (
              <p className="mt-2 text-[11.5px] leading-snug" style={{ color: C.muted }}>
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
              </p>
            )}

            <div
              className="relative mt-3.5 overflow-hidden rounded-[12px] px-5 pb-[15px] pt-4"
              style={{
                background: NAVY,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: GRAD }} />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 240px 120px at 100% 0%, rgba(0,255,230,.14), transparent 70%)",
                }}
              />
              <div className="relative flex items-baseline justify-between gap-3.5">
                <div
                  className="text-[11px] font-bold uppercase leading-[1.5] tracking-[0.15em]"
                  style={{ color: "#e6ecfb" }}
                >
                  {isStorno ? "Gutschriftsbetrag" : "Gesamtbetrag"}
                  <em
                    className="block text-[10px] not-italic tracking-[0.1em]"
                    style={{ color: "#b9c4e4" }}
                  >
                    {smallBusiness
                      ? "ohne USt (§ 19 UStG)"
                      : `inkl. ${eur(totals.gross - totals.net)} USt`}
                  </em>
                </div>
                <div className="font-display whitespace-nowrap text-[28px] font-bold tabular-nums text-white">
                  {eur(totals.gross)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Anmerkungen: alles, was zum Beleg gehört, aber keine Position ist */}
        {doc.notes && (
          <div
            className="mt-4 break-inside-avoid rounded-r-[8px] py-3 pl-4 pr-5"
            style={{ background: C.soft, borderLeft: `3px solid ${C.accent}` }}
          >
            <div
              className="text-[9.5px] font-bold uppercase tracking-[0.22em]"
              style={{ color: C.accent }}
            >
              Anmerkungen
            </div>
            <div className="mt-1.5 text-[11.5px] leading-[1.55]" style={{ color: C.ink2 }}>
              {paragraphs(doc.notes).map((p, i) =>
                // „## " davor macht einen Absatz zur Zwischenüberschrift — ohne
                // sie wird ein langer Anmerkungsblock zur Textwüste.
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

        {!isStorno && settings.invoiceFooter && (
          <div className="doc-thanks mt-[18px] text-[12.5px] font-semibold" style={{ color: C.ink2 }}>
            {settings.invoiceFooter}
          </div>
        )}

        {/* ── GiroCode + Rechtszeile ── */}
        <div
          className="doc-legalrow mt-2.5 flex break-inside-avoid items-center gap-[18px] pt-3"
          style={{ borderTop: `1px solid ${C.line}` }}
        >
          {girocode && (
            <div className="flex shrink-0 flex-col items-center gap-[5px]">
              <GirocodeQR input={girocode} size={92} />
              <div
                className="text-center text-[8.5px] font-bold uppercase leading-[1.4] tracking-[0.08em]"
                style={{ color: C.muted }}
              >
                GiroCode — mit
                <br />
                Banking-App scannen
              </div>
            </div>
          )}
          {/* legalNote trägt Auszeichnungen (<b>) aus den Belegdaten. Der Text
              stammt aus der eigenen Datenbank, nicht aus einer Eingabe Dritter. */}
          <div
            className="flex-1 text-[11px] leading-[1.6]"
            style={{ color: C.muted }}
            dangerouslySetInnerHTML={{ __html: legal }}
          />
        </div>

        {/* ── Blattfuß: Anbieter, Kontakt, Steuer & Bank getrennt auffindbar ── */}
        <div
          className="doc-foot mt-auto flex gap-[34px] pt-3.5"
          style={{ borderTop: `1px solid ${C.line}` }}
        >
          <FootCol title="Anbieter">
            <b style={{ color: C.ink }}>{settings.name}</b>
            <br />
            {settings.ownerName ?? settings.legalName}
            <br />
            <span style={{ color: C.muted }}>
              {settings.address}
              <br />
              {settings.zip} {settings.city}
            </span>
            {settings.registerCourt && (
              <>
                <br />
                <span style={{ color: C.muted }}>
                  {settings.registerCourt}
                  {settings.registerNumber ? ` · ${settings.registerNumber}` : ""}
                </span>
              </>
            )}
          </FootCol>
          <FootCol title="Kontakt">
            {settings.phone}
            <br />
            {settings.email}
            <br />
            {settings.website}
          </FootCol>
          <FootCol title="Steuer & Bankverbindung">
            {settings.vatId && (
              <>
                USt-IdNr. {settings.vatId}
                <br />
              </>
            )}
            {settings.taxNumber && (
              <>
                Steuer-Nr. {settings.taxNumber}
                <br />
              </>
            )}
            <span style={{ color: C.muted }}>
              {settings.iban}
              <br />
              {[settings.bankName, settings.bic && `BIC ${settings.bic}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </FootCol>
        </div>
      </div>
    </div>
  )
}

function Th({
  children,
  right,
  last,
  style,
}: {
  children: React.ReactNode
  right?: boolean
  last?: boolean
  style?: React.CSSProperties
}) {
  return (
    <th
      className={`pb-[9px] text-[10px] font-bold uppercase tracking-[0.15em] ${
        right ? "whitespace-nowrap text-right" : "text-left"
      }`}
      style={{
        color: C.muted,
        borderBottom: `2px solid ${C.ink}`,
        padding: `0 10px 9px`,
        ...(last ? { paddingRight: 0 } : null),
        ...style,
      }}
    >
      {children}
    </th>
  )
}

/** Zeile im Zahlungsblock — Bezeichnung links, Wert rechts, nie umbrechend. */
function Kv({ k, v, hot }: { k: string; v?: string; hot?: boolean }) {
  if (!v) return null
  return (
    <div className="flex justify-between gap-3.5 py-[4.5px] text-[12.5px]">
      <span style={{ color: C.muted }}>{k}</span>
      <span
        className="whitespace-nowrap text-right font-bold tabular-nums"
        style={{ color: hot ? C.accent : C.ink }}
      >
        {v}
      </span>
    </div>
  )
}

/** Summenzeile über der Gesamtbetrags-Karte. */
function Trow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  /** Abzugszeile — in Grün, damit sie nicht wie ein Aufschlag liest. */
  accent?: string
}) {
  return (
    <div
      className="flex justify-between gap-4 py-[7px] text-[13.5px]"
      style={{ borderBottom: `1px solid ${C.line}` }}
    >
      <span style={{ color: C.ink2 }}>{label}</span>
      <span
        className="shrink-0 font-bold tabular-nums"
        style={{ color: accent ?? C.ink }}
      >
        {value}
      </span>
    </div>
  )
}

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className="mb-1.5 text-[8.5px] font-bold uppercase tracking-[0.15em]"
        style={{ color: C.muted }}
      >
        {title}
      </div>
      <div className="text-[11.5px] leading-[1.65]" style={{ color: C.ink2 }}>
        {children}
      </div>
    </div>
  )
}
