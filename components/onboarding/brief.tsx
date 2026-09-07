"use client"

import type { CompanySettings, OnboardingSession } from "@/lib/types"
import { dateDE, eur } from "@/lib/format"
import {
  stepsFor,
  SESSION_KIND_LABEL,
  answerText,
  answerList,
  completeness,
  money,
} from "@/lib/onboarding"

/**
 * Gesprächsprotokoll als Blatt — dieselbe Bauform wie Angebot und Rechnung.
 *
 * Es ist bewusst ein Dokument und keine Bildschirmliste: was im Gespräch
 * aufgenommen wurde, geht danach an den Kunden („so habe ich Sie verstanden")
 * und in die eigene Akte. Ein Protokoll, das man mitschicken kann, wird
 * gelesen — ein Formular nicht.
 */
const C = {
  ink: "#16161a",
  body: "#3f3f46",
  muted: "#5c5c66",
  line: "#e6e6ea",
  soft: "#f6f7fa",
  brand: "#3416E8",
} as const

const GRAD = "linear-gradient(90deg,#00ffe6,#3416e8 55%,#5b2eff)"

export function BriefDoc({
  session,
  settings,
}: {
  session: OnboardingSession
  settings: CompanySettings
}) {
  const a = session.answers
  const company = answerText(a, "company")
  const budget = money(a, "budget")
  const pct = completeness(a)

  const facts: [string, string][] = [
    ["Datum", dateDE(session.createdAt)],
    ["Ansprechpartner", answerText(a, "contactName")],
    ["Aufgenommen von", settings.ownerName ?? settings.name],
    ["Erfasst", `${pct} %`],
  ]

  return (
    <div className="doc-sheet">
      {/* Kopf */}
      <div
        className="flex items-end justify-between gap-8 pb-4"
        style={{ borderBottom: `2px solid ${C.ink}` }}
      >
        <div>
          <div
            className="text-[10.5px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: C.muted }}
          >
            {settings.name}
          </div>
          <h1
            className="mt-1.5 text-[30px] leading-[1.1] font-bold tracking-tight"
            style={{ color: C.ink }}
          >
            Gesprächsprotokoll
            {company && (
              <>
                {" "}
                <span style={{ color: C.brand }}>{company}</span>
              </>
            )}
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-[10.5px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: C.muted }}
          >
            {SESSION_KIND_LABEL[session.kind ?? "onboarding"]}
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: C.ink }}>
            {dateDE(session.createdAt)}
          </div>
        </div>
      </div>
      <div className="mt-1 h-[3px] w-[24mm] rounded-full" style={{ background: GRAD }} />

      {/* Eckdaten */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        {facts.map(([k, v]) =>
          v ? (
            <div key={k} style={{ borderTop: `1px solid ${C.line}` }} className="pt-2">
              <div
                className="text-[9.5px] font-semibold tracking-[0.12em] uppercase"
                style={{ color: C.muted }}
              >
                {k}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold" style={{ color: C.ink }}>
                {v}
              </div>
            </div>
          ) : null,
        )}
      </div>

      {budget > 0 && (
        <div
          className="mt-5 flex items-center justify-between rounded-xl px-5 py-3.5"
          style={{ background: C.soft }}
        >
          <div>
            <div
              className="text-[9.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: C.muted }}
            >
              Genannter Rahmen
            </div>
            <div className="mt-0.5 text-[13px]" style={{ color: C.body }}>
              {answerText(a, "budgetType") || "Zahlungsweise noch offen"}
              {answerText(a, "deadline")
                ? ` · Wunschtermin ${dateDE(answerText(a, "deadline"))}`
                : ""}
            </div>
          </div>
          <div className="text-[26px] font-bold tabular-nums" style={{ color: C.ink }}>
            {eur(budget)}
          </div>
        </div>
      )}

      {/* Abschnitte */}
      <div className="mt-6 space-y-5">
        {stepsFor(session.kind).map((step, si) => {
          const rows = step.fields
            .map((f) => ({ f, v: answerText(a, f.key), list: answerList(a, f.key) }))
            .filter((r) => r.v)
          if (!rows.length) return null
          return (
            <section key={step.id} className="break-inside-avoid">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: C.brand }}
                >
                  {String(si + 1).padStart(2, "0")}
                </span>
                <h2
                  className="text-[15px] font-bold tracking-tight"
                  style={{ color: C.ink }}
                >
                  {step.title}
                </h2>
              </div>
              <div className="mt-2 space-y-2">
                {rows.map(({ f, v, list }) => (
                  <div
                    key={f.key}
                    className="grid grid-cols-[46mm_1fr] gap-4 pt-2"
                    style={{ borderTop: `1px solid ${C.line}` }}
                  >
                    <div className="text-[11.5px] leading-[1.45]" style={{ color: C.muted }}>
                      {f.label}
                    </div>
                    {f.type === "multi" && list.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((x) => (
                          <span
                            key={x}
                            className="rounded-md px-2 py-0.5 text-[11.5px] font-medium"
                            style={{ background: C.soft, color: C.ink }}
                          >
                            {x}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="text-[12.5px] leading-[1.5] whitespace-pre-line"
                        style={{ color: C.ink }}
                      >
                        {f.type === "date" ? dateDE(v) : v}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {session.notes && (
        <div className="mt-6 rounded-xl px-5 py-3.5" style={{ background: C.soft }}>
          <div
            className="text-[9.5px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: C.muted }}
          >
            Interner Vermerk
          </div>
          <p className="mt-1 text-[12.5px] leading-[1.55] whitespace-pre-line" style={{ color: C.body }}>
            {session.notes}
          </p>
        </div>
      )}

      {/* Fuß */}
      <div
        className="mt-auto flex items-center justify-between pt-5 text-[10.5px]"
        style={{ borderTop: `1px solid ${C.line}`, color: C.muted }}
      >
        <span>
          {settings.name}
          {settings.ownerName ? ` · ${settings.ownerName}` : ""}
        </span>
        <span>
          {settings.email} · {settings.phone}
        </span>
      </div>
    </div>
  )
}
