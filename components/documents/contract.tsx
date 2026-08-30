import * as React from "react"
import { dateDE } from "@/lib/format"
import type { Contract, Customer, CompanySettings, Quote } from "@/lib/types"

/* Farben und Marke wie im Angebot — der Vertrag ist kein zweites Design,
   sondern dasselbe Haus in nüchtern. Grafik tritt hier bewusst zurück:
   ein Vertrag wird gelesen, nicht überflogen. */
const C = {
  ink: "#16161a",
  body: "#3d3d47",
  muted: "#79798a",
  line: "#e6e6ea",
  soft: "#f6f6f9",
  brand: "#1f7bf2",
}
const GRAD = "linear-gradient(90deg,#00ffe6,#3d00ff)"
const HERO_BG = "linear-gradient(135deg,#111119 0%,#1b1b2c 55%,#241a3d 100%)"
const R = "10px"

/** Römische Zahl für die Absatznummerierung innerhalb eines Paragrafen. */
function abs(n: number) {
  return `(${n})`
}

export function ContractDoc({
  doc,
  customer,
  settings,
  quote,
}: {
  doc: Contract
  customer?: Customer
  settings: CompanySettings
  quote?: Quote
}) {
  const senderLine = [
    settings.ownerName ? `${settings.ownerName} · ${settings.name}` : settings.name,
    settings.address,
    `${settings.zip} ${settings.city}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="contract-doc">
      {/* ── Kopf ───────────────────────────────────────────────────── */}
      <div
        className="relative flex items-stretch justify-between overflow-hidden px-[8mm] py-[6mm]"
        style={{ background: HERO_BG, borderRadius: R }}
      >
        <div className="absolute bottom-0 left-0 h-[2px] w-[62%]" style={{ background: GRAD }} />
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-light.svg" alt={settings.name} width={34} height={34} />
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark-light.svg" alt="" style={{ height: 11, width: "auto" }} />
            <div
              className="mt-[4px] text-[9.5px] font-medium uppercase tracking-[0.16em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Webdesign &amp; KI-Automatisierung
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Vertrag
          </div>
          <div className="mt-1 font-mono text-[15px] font-bold text-white tabular-nums">
            {doc.number}
          </div>
        </div>
      </div>

      {/* ── Titel und Parteien ─────────────────────────────────────── */}
      <div className="mt-[9mm]">
        <h1 className="text-[27px] font-bold leading-[1.15]" style={{ color: C.ink }}>
          {doc.title}
          {doc.titleAccent && (
            <>
              {" "}
              <span style={{ color: C.brand }}>{doc.titleAccent}</span>
            </>
          )}
        </h1>
        {doc.lead && (
          <p className="mt-2.5 max-w-[150mm] text-[13px] leading-[1.6]" style={{ color: C.body }}>
            {doc.lead}
          </p>
        )}
        <div className="mt-[4mm] h-[2px] w-[26%]" style={{ background: GRAD }} />
      </div>

      <p className="mt-[7mm] text-[13px]" style={{ color: C.body }}>
        Zwischen den nachstehenden Parteien wird der folgende Vertrag geschlossen:
      </p>

      <div className="mt-[4mm] grid grid-cols-2 gap-[6mm] break-inside-avoid">
        <Party
          role="Auftragnehmer"
          lines={[
            settings.legalName || settings.name,
            settings.address,
            `${settings.zip} ${settings.city}`,
            settings.country,
            settings.vatId ? `USt-IdNr. ${settings.vatId}` : "",
            settings.email,
          ]}
          suffix="— nachfolgend „Auftragnehmer“ —"
        />
        <Party
          role="Auftraggeber"
          lines={[
            customer?.company ?? "—",
            customer?.contactName ? `vertreten durch ${customer.contactName}` : "",
            customer?.address ?? "",
            customer ? `${customer.zip ?? ""} ${customer.city ?? ""}`.trim() : "",
            customer?.country ?? "",
            customer?.vatId ? `USt-IdNr. ${customer.vatId}` : "",
            customer?.email ?? "",
          ]}
          suffix="— nachfolgend „Auftraggeber“ —"
        />
      </div>

      {/* Eckdaten: was ein Prüfer zuerst sucht. */}
      <div
        className="mt-[6mm] flex flex-wrap gap-x-[10mm] gap-y-[3mm] break-inside-avoid px-[6mm] py-[4mm]"
        style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
      >
        <Fact label="Vertragsdatum" value={dateDE(doc.issueDate)} />
        {quote && <Fact label="Zugehöriges Angebot" value={quote.number} />}
        {doc.netValue != null && (
          <Fact
            label="Auftragswert"
            value={`${doc.netValue.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
            })} € netto`}
          />
        )}
        {doc.startDate && <Fact label="Projektstart" value={dateDE(doc.startDate)} />}
      </div>

      {/* ── Paragrafen ─────────────────────────────────────────────── */}
      <div className="mt-[9mm]">
        {doc.clauses.map((cl, i) => (
          <section key={cl.title} className={i ? "mt-[7mm]" : ""}>
            <h2
              className="text-[14px] font-bold leading-tight break-after-avoid"
              style={{ color: C.ink }}
            >
              <span style={{ color: C.brand }}>§ {i + 1}</span> {cl.title}
            </h2>
            <div className="mt-[2.5mm] space-y-[2.5mm]">
              {cl.body.map((b, j) => (
                <p
                  key={j}
                  className="flex gap-2 text-[12px] leading-[1.65]"
                  style={{ color: C.body }}
                >
                  {cl.body.length > 1 && (
                    <span
                      className="w-[7mm] shrink-0 font-semibold tabular-nums"
                      style={{ color: C.muted }}
                    >
                      {abs(j + 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">{b}</span>
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Anlagen ────────────────────────────────────────────────── */}
      {doc.attachments?.length ? (
        <div
          className="mt-[8mm] break-inside-avoid px-[6mm] py-[5mm]"
          style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
        >
          <div className="text-[13px] font-bold" style={{ color: C.ink }}>
            Anlagen
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.6]" style={{ color: C.muted }}>
            Die Anlagen sind Bestandteil dieses Vertrags.
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {doc.attachments.map((a) => (
              <li key={a} className="flex gap-2.5 text-[12px] leading-[1.6]" style={{ color: C.body }}>
                <span className="mt-[7px] size-[4px] shrink-0 rounded-full" style={{ background: C.brand }} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Unterschriften ─────────────────────────────────────────── */}
      <div className="mt-[10mm] break-inside-avoid">
        <p className="text-[12px] leading-[1.65]" style={{ color: C.body }}>
          Die Parteien haben diesen Vertrag gelesen, seine Regelungen einzeln erörtert und
          erklären sich mit ihnen einverstanden. Der Vertrag wird in zwei gleichlautenden
          Ausfertigungen geschlossen; jede Partei erhält eine.
        </p>
        <div className="mt-[12mm] grid grid-cols-2 gap-[12mm]">
          <SignatureField
            place={settings.city}
            name={settings.ownerName ?? settings.name}
            role="Auftragnehmer"
          />
          <SignatureField
            place={customer?.city ?? ""}
            name={customer?.contactName ?? ""}
            role="Auftraggeber"
          />
        </div>
      </div>

      {/* ── Abbinder ───────────────────────────────────────────────── */}
      <div className="mt-[10mm] pt-[3mm]" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="text-[11.5px] leading-[1.5]" style={{ color: C.body }}>
            {senderLine}
          </div>
          <div className="text-[11.5px]" style={{ color: C.body }}>
            {settings.website}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[9.5px]" style={{ color: C.muted }}>
          {settings.vatId && <span>USt-ID {settings.vatId}</span>}
          <span style={{ whiteSpace: "nowrap" }}>IBAN {settings.iban}</span>
          <span>Vertrag {doc.number}</span>
        </div>
      </div>
    </div>
  )
}

function Party({
  role,
  lines,
  suffix,
}: {
  role: string
  lines: (string | undefined)[]
  suffix: string
}) {
  return (
    <div className="px-[5mm] py-[4mm]" style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}>
      <div
        className="text-[9.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: C.muted }}
      >
        {role}
      </div>
      <div className="mt-2 space-y-[2px] text-[12px] leading-[1.5]" style={{ color: C.ink }}>
        {lines.filter(Boolean).map((l, i) => (
          <div key={i} className={i === 0 ? "font-semibold" : ""} style={i ? { color: C.body } : undefined}>
            {l}
          </div>
        ))}
      </div>
      <div className="mt-2.5 text-[10.5px]" style={{ color: C.muted }}>
        {suffix}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[9.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: C.muted }}
      >
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold tabular-nums" style={{ color: C.ink }}>
        {value}
      </div>
    </div>
  )
}

function SignatureField({ place, name, role }: { place: string; name: string; role: string }) {
  return (
    <div>
      <div className="h-[16mm]" />
      <div style={{ borderTop: `1px solid ${C.ink}` }} />
      <div className="mt-1.5 text-[11px] leading-[1.5]" style={{ color: C.muted }}>
        {place ? `${place}, den ` : "Ort, Datum "}
        <span style={{ color: C.line }}>___________</span>
      </div>
      <div className="mt-3 text-[12px] font-semibold" style={{ color: C.ink }}>
        {name || "—"}
      </div>
      <div className="text-[11px]" style={{ color: C.muted }}>
        {role}
      </div>
    </div>
  )
}
