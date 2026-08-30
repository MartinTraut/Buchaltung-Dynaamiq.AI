"use client"

import { eur, dateDE, computeTotals, lineNet } from "@/lib/format"
import type { Quote, Customer, CompanySettings, LineItem, LineItemTask } from "@/lib/types"

/**
 * Angebots-Layout — eigenes Dokument, nicht das Rechnungsraster.
 *
 * Eine Rechnung ist ein Beleg: Tabelle, Menge, Einzelpreis, Summe. Ein Angebot
 * über 16.000 € muss dagegen erklären, was gebaut wird — deshalb feste Seiten
 * mit eigener Dramaturgie (Cover, Paket 1, Prozess, Module, Investition,
 * Rahmen, Betreuung) statt einer durchlaufenden Positionsliste.
 *
 * Die Seiten sind bewusst auf A4 fixiert: nur so lassen sich Seitenzahl,
 * Fußzeile und Weißraum kontrollieren. Läuft eine Seite über, ist das ein
 * Fehler im Inhalt, kein automatischer Umbruch.
 *
 * Schriftgrößen stehen in px, gedruckt wird bei 96 dpi: 12,5 px ≈ 9,4 pt,
 * 13 px ≈ 9,8 pt. Fließtext liegt deshalb nie unter 12,5 px — darunter wird
 * ein A4-Ausdruck unangenehm zu lesen.
 */

const C = {
  ink: "#16161a",
  body: "#3f3f46",
  muted: "#6b6b74",
  line: "#e6e6ea",
  soft: "#f6f7fa",
  /** Indigo-Ende des Markenverlaufs. Ein Standard-Blau lässt acht sauber
   *  gesetzte Seiten nach Vorlage aussehen; Cyan bleibt den dunklen Flächen
   *  vorbehalten, auf Weiß trägt es keinen Kontrast. */
  brand: "#3416E8",
  /** Neutraler Balken-/Punktton für inaktive Vergleichswerte. */
  neutral: "#c4c8d2",
} as const

const GRAD = "linear-gradient(90deg,#00ffe6,#3416e8 55%,#5b2eff)"
const HERO_BG = "linear-gradient(118deg,#08080d 0%,#101018 52%,#1a1a2e 100%)"

/** Ein Radius für alle Karten und Preisboxen. */
const R = 12

/** Teilleistung vereinheitlichen — Strings haben weder Stunden noch Titel.
 *  „NEU: " am Anfang wird zur Markierung, nicht zum Fließtext. */
function task(t: LineItemTask): { text: string; hours: number; title?: string; isNew: boolean } {
  const raw = typeof t === "string" ? { text: t } : t
  const isNew = raw.text.startsWith("NEU: ")
  return {
    text: isNew ? raw.text.slice(5) : raw.text,
    hours: typeof t === "string" ? 0 : (t.hours ?? 0),
    title: typeof t === "string" ? undefined : t.title,
    isNew,
  }
}

/** Sichtbare Stundenangaben: ganze Stunden mit „ca.". Der Kunde kauft einen
 *  Festpreis, keine Stunden — Viertelstunden im Angebot wirken kleinteiliger,
 *  als die Kalkulation ist. Intern (Positionen, Nachlassbeträge) bleibt exakt. */
const std = (h: number) => `ca. ${Math.round(h).toLocaleString("de-DE")} Std.`

/**
 * Gliederung der Teilleistungen für dieses Angebot. Die Texte selbst stehen im
 * Datensatz — hier steht nur, welche davon visuell zusammengehören und unter
 * welcher Überschrift. Fehlt eine Zuordnung, wird schlicht die Liste gezeigt.
 */
const PAKET_1_GRUPPEN: { title: string; idx: number[] }[] = [
  { title: "Marke", idx: [0] },
  { title: "Website", idx: [1, 7] },
  { title: "Verkaufskanal & Anfragen", idx: [2, 6] },
  { title: "Sichtbarkeit", idx: [3, 4, 5] },
]

/** Fallback-Gliederung für Angebote ohne Modultitel im Datensatz (AN-2026-512). */
const PAKET_2_MODULE: { no: string; title: string; idx: number[] }[] = [
  { no: "01", title: "Warenwirtschaft & Datenmodell", idx: [0] },
  { no: "02", title: "Bedienoberfläche", idx: [1] },
  { no: "03", title: "Kanalabgleich", idx: [2] },
  { no: "04", title: "Bildverarbeitung", idx: [3] },
  { no: "05", title: "KI-Automatisierungen", idx: [4] },
  { no: "06", title: "Kleinanzeigen", idx: [5] },
  { no: "07", title: "Reporting & Auswertung", idx: [6] },
  { no: "08", title: "Einführung, Sicherung & Schulung", idx: [7, 8] },
]

/**
 * Gliederung der zwölf Module für die Titelseite des Systemangebots. Alle zwölf
 * einzeln aufzuführen macht aus der Übersicht ein Inhaltsverzeichnis — die
 * Modulseite leistet das ohnehin. Hier stehen die vier Themen, aus denen das
 * System besteht; die Zuordnung folgt der Reihenfolge im Datensatz.
 */
const PAKET_2_THEMEN: { title: string; idx: number[] }[] = [
  { title: "Warenwirtschaft, Lager & Inventur", idx: [0, 1] },
  { title: "Werkstatt, Kategorien & Prüfkataloge", idx: [2, 3] },
  { title: "Bedienung & Verkaufskanäle", idx: [4, 5, 8] },
  { title: "Bilder, KI, Auswertung & Einführung", idx: [6, 7, 9, 10, 11] },
]

/** Standard-Werkstattablauf für Angebote ohne eigene Schrittfolge — die
 *  Beisätze benennen nur, was im jeweiligen Schritt im System entsteht. */
const PROZESS: { t: string; d: string }[] = [
  { t: "Ankauf", d: "Gerät angelegt, Rahmennummer und Ankaufspreis erfasst" },
  { t: "Prüfung", d: "Zustand, Akku, Zulassung, Prüfprotokoll" },
  { t: "Instandsetzung", d: "Arbeiten und Material dem Gerät zugeordnet" },
  { t: "Bilder & Gerätedaten", d: "Fotos hochgeladen, Texte erzeugt, Preis gesetzt" },
  { t: "Veröffentlichung", d: "Website und Shop automatisch, Kleinanzeigen auf Freigabe" },
  { t: "Anfrage / Reservierung", d: "Alle Kanäle laufen in einer Vorgangsliste auf" },
  { t: "Verkauf", d: "Bestand aktualisiert, Gerät überall gesperrt" },
  { t: "Auswertung", d: "Liegezeit, Verkäufe und Spanne im Zeitraum" },
]

/** Anmerkungen in Abschnitte zerlegen — „## " kennzeichnet eine Überschrift. */
function sections(notes?: string): { title: string; body: string[] }[] {
  if (!notes) return []
  const out: { title: string; body: string[] }[] = []
  for (const p of notes.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    if (p.startsWith("## ")) out.push({ title: p.slice(3), body: [] })
    else if (out.length) out[out.length - 1].body.push(p)
  }
  return out
}

/**
 * Zeitangaben aus dem Rahmen-Abschnitt ziehen („rund 3 bis 5 Wochen"). Der
 * Zeitrahmen steht als Satz im Datensatz; die Grafik liest ihn aus, statt ihn
 * ein zweites Mal fest zu verdrahten. Findet sie nichts, bleibt es beim Text.
 */
function weeks(text?: string): [number, number][] {
  const out: [number, number][] = []
  for (const m of (text ?? "").matchAll(/(\d+)\s*bis\s*(\d+)\s*(?:weitere\s*)?Wochen/g)) {
    out.push([Number(m[1]), Number(m[2])])
  }
  // Nur die beiden Paketspannen gehören auf die Schiene — nennt der Satz
  // zusätzlich die Gesamtdauer, ist das dieselbe Zeit ein drittes Mal.
  return out.slice(0, 2)
}

/** Beispielrechnung aus dem Provisions-Absatz lösen — Satz und Zahlen. */
function example(text: string): { intro: string; values: string[] } | null {
  const i = text.indexOf("Beispiel:")
  if (i < 0) return null
  const values = [...text.slice(i).matchAll(/([\d.]+,\d{2})\s*€/g)].map((m) => `${m[1]} €`)
  return values.length === 4 ? { intro: text.slice(0, i).trim(), values } : null
}

export function ProposalDoc({
  doc,
  customer,
  settings,
}: {
  doc: Quote
  customer?: Customer
  settings: CompanySettings
}) {
  const totals = computeTotals(doc.items)
  const positive = doc.items.filter((it) => lineNet(it) > 0)
  const discount = doc.items.reduce((s, it) => s + Math.min(0, lineNet(it)), 0)
  // Ein Angebot trägt entweder beide Pakete (Altbestand AN-2026-512/513) oder
  // genau eines. Welche Seiten gesetzt werden, entscheidet allein dieses Feld;
  // die Positionen im Datensatz bleiben davon unberührt.
  const pack = doc.pack ?? "both"
  const p1 = pack === "system" ? undefined : positive[0]
  const p2 = pack === "system" ? positive[0] : pack === "web" ? undefined : positive[1]
  const packs = [p1, p2].filter(Boolean) as LineItem[]
  /** Festpreis eines Pakets = Position plus der darauf folgende Nachlass. */
  const fixed = (it?: LineItem) => {
    if (!it) return 0
    const i = doc.items.indexOf(it)
    const next = doc.items[i + 1]
    return lineNet(it) + (next && lineNet(next) < 0 ? lineNet(next) : 0)
  }
  /** Kalkulationswert einer Position — fehlt sie, ist er 0. */
  const reg = (it?: LineItem) => (it ? lineNet(it) : 0)
  const sec = sections(doc.notes)
  // Die Abschnitte der Anmerkungen liegen auf drei Seiten. Zugeordnet wird
  // über den Titel, nicht über den Index: ein neuer Abschnitt im Datensatz
  // verschöbe sonst alle folgenden auf die falsche Seite.
  const iPflege = sec.findIndex((x) => /Pflege und Betreuung/i.test(x.title))
  // Das Systemangebot kennt keinen Betreuungsabschnitt — dort trennt die
  // Beauftragung den Rahmen von den Konditionen. Ohne diesen zweiten Anker
  // liefen alle Abschnitte auf eine Seite.
  const iBeauftragung = sec.findIndex((x) => /Beauftragung und Preisbindung/i.test(x.title))
  const pflegeIdx = iPflege >= 0 ? iPflege : iBeauftragung >= 0 ? iBeauftragung : 5
  const secIntro = sec.slice(0, pflegeIdx)
  // Seit die rechtlichen Abschnitte im Projektvertrag stehen, trägt das
  // Angebot hinter der Betreuung nur noch wenig Text. Nennt es einen Abschnitt
  // „Vertragsgrundlage", ist es diese schlanke Fassung: dann stehen alle
  // Abschnitte auf der Konditionenseite und die Schlussseite gehört allein der
  // Beauftragung. Ältere Angebote behalten die frühere Aufteilung — sonst
  // liefe ihr Rechtsteil über den Satzspiegel.
  const schlank = sec.some((x) => /Vertragsgrundlage/i.test(x.title))
  const secEnd = schlank
    ? sec.slice(iPflege >= 0 ? pflegeIdx + 1 : pflegeIdx)
    : sec.slice(pflegeIdx + 1, -1)
  const secFinal =
    !schlank && sec.length > pflegeIdx + 1 ? sec[sec.length - 1] : undefined
  const val = doc.valuation
  // Die Seitenfolge steht einmal an einer Stelle: Auswahl, Nummerierung und
  // Fußzeile können dadurch nicht auseinanderlaufen.
  const order = [
    "cover",
    pack !== "system" && "paket1",
    pack !== "web" && "system",
    pack !== "web" && "module",
    "invest",
    "rahmen",
    pack !== "system" && "pflege",
    "zahlung",
    "abschluss",
  ].filter((k): k is string => typeof k === "string")
  const pageNo = (k: string) => order.indexOf(k) + 1
  /** Beschriftung der Zeitschiene — ein Paket trägt seinen Namen, nicht „Paket 1". */
  const planLabels =
    pack === "web" ? ["Website"] : pack === "system" ? ["Warenwirtschaft"] : ["Paket 1", "Paket 2"]

  // Module und Ablauf stehen im Angebot, nicht im Layout: trägt eine
  // Teilleistung einen Titel, ist sie ein eigenes Modul. Sonst greift die
  // Gliederung des Vorgängerangebots.
  const p2Tasks = (p2?.details ?? []).map(task)
  const module2 = p2Tasks.some((t) => t.title)
    ? p2Tasks.map((t, i) => ({
        no: String(i + 1).padStart(2, "0"),
        title: t.title ?? "",
        idx: [i],
      }))
    : PAKET_2_MODULE
  // `??` würde ein leeres Array durchlassen — daraus wird ein Raster mit null
  // Spalten und die Schiene verschwindet lautlos.
  const prozess = doc.process?.length
    ? doc.process.map((p) => ({ t: p.title, d: p.detail }))
    : PROZESS
  // Der Kanalblock hängt am Veröffentlichungsschritt — Nummer und Titel
  // kommen aus dem Ablauf, damit sie beim nächsten Angebot mitwandern.
  const freigabeSchritt = Math.max(
    0,
    prozess.findIndex((p) => /veröffentlich/i.test(p.t)),
  )
  // Zwei gleich lange Reihen — bei ungerader Zahl trägt die erste den Rest.
  const prozessReihen = [
    prozess.slice(0, Math.ceil(prozess.length / 2)),
    prozess.slice(Math.ceil(prozess.length / 2)),
  ]

  // Titelseite eines Einzelpakets: statt zweier Paketkarten die Gliederung des
  // Leistungsteils mit ihren Stunden — dieselbe Quelle wie die Detailseite,
  // damit Übersicht und Aufstellung nicht auseinanderlaufen können.
  const coverRows = (
    pack === "system"
      ? PAKET_2_THEMEN.map((g) => ({
          title: g.title,
          hours: g.idx.reduce((sum, i) => sum + task((p2?.details ?? [])[i] ?? "").hours, 0),
        }))
      : PAKET_1_GRUPPEN.map((g) => ({
          title: g.title,
          hours: g.idx.reduce((sum, i) => sum + task((p1?.details ?? [])[i] ?? "").hours, 0),
        }))
  ).filter((r) => r.hours > 0)

  const senderLine = [
    settings.ownerName ? `${settings.ownerName} · ${settings.name}` : settings.name,
    settings.address,
    `${settings.zip} ${settings.city}`,
  ]
    .filter(Boolean)
    .join("  ·  ")

  return (
    <div className="prop-doc">
      {/* ── 1 · Cover ─────────────────────────────────────────────────── */}
      <Page no={pageNo("cover")} total={order.length} number={doc.number} settings={settings}>
        <Brandbar number={doc.number} settings={settings} />

        {/* Anschrift bleibt im Fensterausschnitt (45–72 mm ab Blattoberkante) —
            Abstände und Schriftgrößen dieses Blocks nicht verändern. */}
        <div className="mt-[4mm] flex shrink-0 items-start justify-between gap-10">
          <div style={{ width: "85mm" }}>
            <div
              className="mb-2 truncate pb-[3px] text-[7.5px] tracking-[0.02em]"
              style={{ color: C.muted, borderBottom: `0.5pt solid ${C.line}` }}
            >
              {senderLine}
            </div>
            <div className="text-[13px] leading-[1.5]" style={{ color: C.body }}>
              <div className="font-semibold" style={{ color: C.ink }}>
                {customer?.company}
              </div>
              {customer?.contactName && <div>{customer.contactName}</div>}
              {customer?.address && <div>{customer.address}</div>}
              <div>{[customer?.zip, customer?.city].filter(Boolean).join(" ")}</div>
            </div>
          </div>
          <div
            className="shrink-0 pl-6"
            style={{ borderLeft: `1px solid ${C.line}`, width: "62mm" }}
          >
            {(
              [
                ["Datum", dateDE(doc.issueDate)],
                ["Gültig bis", dateDE(doc.validUntil)],
                ["Kundennummer", customer?.customerNumber],
                ["Ansprechpartner", settings.ownerName],
              ] as [string, string | undefined][]
            ).map(([k, v]) =>
              v ? (
                <div key={k} className="flex items-baseline justify-between gap-4 py-[2.5px]">
                  <span
                    className="text-[10.5px] uppercase tracking-[0.12em]"
                    style={{ color: C.muted }}
                  >
                    {k}
                  </span>
                  <span
                    className="whitespace-nowrap text-[12.5px] font-semibold"
                    style={{ color: C.ink }}
                  >
                    {v}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </div>

        <div className="mt-[15mm] shrink-0">
          <Eyebrow>Projekt {customer?.company?.split(" ")[0]}</Eyebrow>
          <h1
            className="mt-2.5 text-[44px] font-bold leading-[1.05] tracking-tight"
            style={{ color: C.ink }}
          >
            {doc.title ?? "Digitalisierung"}
            <br />
            {doc.titleAccent ?? customer?.company}
          </h1>
          <p className="mt-3.5 max-w-[150mm] text-[14px] leading-[1.55]" style={{ color: C.body }}>
            {doc.lead ??
              "Website, Verkaufskanäle und automatisierte Warenwirtschaft — in zwei Paketen, einzeln beauftragbar."}
          </p>
          {/* Ersetzt dieses Angebot ein früheres, muss das auf der Titelseite
              stehen — sonst liegen beim Kunden zwei gültige Angebote. */}
          {doc.notice && (
            <p
              className="mt-3 max-w-[150mm] border-l-[2px] pl-3 text-[11.5px] leading-[1.5]"
              style={{ color: C.muted, borderColor: C.brand }}
            >
              {doc.notice}
            </p>
          )}
        </div>

        {/* Die Kartenreihe nimmt den verbleibenden Raum auf: beide Karten sind
            dadurch exakt gleich hoch, und unter dem Fließtext bleibt keine
            zufällige Lücke stehen. Trägt das Angebot nur ein Paket, stünde eine
            einzelne Karte in halber Blattbreite — dann übernimmt die
            Übersichtskarte die volle Breite. */}
        {packs.length > 1 ? (
          <div className="mt-[11mm] grid flex-1 grid-cols-2 items-stretch gap-6">
            <CoverCard
              no="01"
              title="Website & Marke"
              text="Neues Erscheinungsbild, vollständiger Webauftritt mit eigener Seite je Gerät, Shopify-Anbindung und Auffindbarkeit bei Google, in der Umkreissuche und in KI-Assistenten."
              regular={reg(p1)}
              price={fixed(p1)}
              hours={sumHours(p1)}
            />
            <CoverCard
              no="02"
              title="System & Automatisierung"
              text="Eigene Warenwirtschaft für Geräte, Vorgänge und Anfragen, zentraler Abgleich der angebundenen Verkaufskanäle, KI-gestützte Texte und Anfragebearbeitung, Auswertung."
              regular={reg(p2)}
              price={fixed(p2)}
              hours={sumHours(p2)}
            />
          </div>
        ) : (
          <CoverOverview
            title={
              pack === "system"
                ? "System & Automatisierung"
                : "Website, Marke & Verkaufskanal"
            }
            text={packs[0]?.note ?? ""}
            rows={coverRows}
            hours={sumHours(packs[0])}
          />
        )}

        <div className="mt-[9mm] shrink-0">
          <div
            className="relative overflow-hidden px-[9mm] py-[7mm]"
            style={{ background: HERO_BG, borderRadius: R }}
          >
            <div className="absolute bottom-0 left-0 h-[2px] w-[46%]" style={{ background: GRAD }} />
            <div className="flex items-end justify-between gap-8">
              <div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "rgba(255,255,255,0.62)" }}
                >
                  Gesamtinvestition
                </div>
                {/* Der Ausgangswert steht direkt über dem Festpreis — die
                    Reihenfolge Kalkulation → Preis erzählt den Nachlass,
                    ohne dass der Leser die rechte Spalte lesen muss. */}
                {discount < 0 && (
                  <div className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Kalkulation{" "}
                    <span style={{ textDecoration: "line-through" }}>
                      {eur(totals.net - discount)}
                    </span>{" "}
                    netto
                  </div>
                )}
                <div className="mt-2 text-[36px] font-bold leading-none text-white">
                  {eur(totals.net)}
                  <span className="pl-2 text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                    netto
                  </span>
                </div>
                <div className="mt-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.62)" }}>
                  {eur(totals.gross)} brutto · enthält {eur(totals.gross - totals.net)} Umsatzsteuer
                </div>
              </div>
              {discount < 0 && (
                <div
                  className="shrink-0 pl-8 text-right"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.14)" }}
                >
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "#00ffe6" }}
                  >
                    Ihr Nachlass
                  </div>
                  <div className="mt-2.5 text-[28px] font-bold leading-none" style={{ color: "#00ffe6" }}>
                    {eur(discount)}
                  </div>
                  <div className="mt-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.62)" }}>
                    {Math.round((-discount / Math.max(1, totals.net - discount)) * 100)} % unter der
                    Kalkulation
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Page>

      {/* ── 2 · Paket 1 ───────────────────────────────────────────────── */}
      {order.includes("paket1") && (
        <Page no={pageNo("paket1")} total={order.length} number={doc.number} settings={settings}>
          <PackHead no="01" title="Website, Marke & digitaler Verkaufskanal" intro={p1?.note} />
          {/* Vier Leistungsgruppen über die freie Höhe verteilt — gleicher
              Rhythmus statt Inhalt oben und Leere unten. */}
          <div className="mt-[5mm] flex flex-1 flex-col justify-between">
            {PAKET_1_GRUPPEN.map((g, gi) => {
              const rows = g.idx.map((i) => task((p1?.details ?? [])[i] ?? "")).filter((r) => r.text)
              if (!rows.length) return null
              return (
                <div
                  key={g.title}
                  className={gi ? "pt-[6mm]" : ""}
                  style={gi ? { borderTop: `1px solid ${C.line}` } : undefined}
                >
                  <GroupHead
                    no={String(gi + 1).padStart(2, "0")}
                    title={g.title}
                    hours={rows.reduce((s, r) => s + r.hours, 0)}
                  />
                  <div className="mt-3 space-y-[9px] pl-[30px]">
                    {rows.map((r, ri) => (
                      /* Trägt die Gruppe nur eine Teilleistung, ist ihre
                         Stundenzahl die Gruppensumme — sonst steht derselbe
                         Wert zweimal untereinander. */
                      <Row key={`${gi}-${ri}`} text={r.text} hours={rows.length > 1 ? r.hours : 0} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <PriceFoot
            regular={reg(p1)}
            price={fixed(p1)}
            label={pack === "web" ? "Festpreis" : "Paket 1 — Festpreis"}
          />
        </Page>
      )}

      {/* ── 3 · Paket 2, Systemübersicht ──────────────────────────────── */}
      {order.includes("system") && (
        <Page no={pageNo("system")} total={order.length} number={doc.number} settings={settings}>
          <PackHead
            no={pack === "system" ? "01" : "02"}
            title="Business Cockpit & Automatisierung"
            intro={p2?.note}
          />

          <div className="mt-[10mm] flex flex-1 flex-col">
            <Eyebrow>Ein Gerät, ein Vorgang</Eyebrow>
            {/* Zwei Reihen auf einer durchgehenden Schiene — die Linie macht aus
                den Kästchen einen Ablauf. Die Spaltenzahl folgt der Schrittzahl:
                acht Schritte stehen zu viert, zehn zu fünft. */}
            <div className="mt-6 shrink-0 space-y-[16mm]">
              {prozessReihen.map((reihe, r) => (
                <div key={r} className="relative">
                  <div
                    className="absolute left-0 right-0 top-[8px] h-[2.5px]"
                    style={{ background: GRAD, opacity: r === 0 ? 1 : 0.75 }}
                  />
                  <div
                    className="relative grid gap-x-5"
                    style={{
                      gridTemplateColumns: `repeat(${prozessReihen[0].length}, minmax(0,1fr))`,
                    }}
                  >
                    {reihe.map((s, i) => (
                      <div key={s.t}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-[18px] w-[18px] shrink-0 rounded-full bg-white"
                            style={{ border: `3px solid ${C.brand}` }}
                          />
                          <span
                            className="bg-white pr-1 text-[11px] font-bold tabular-nums"
                            style={{ color: C.brand }}
                          >
                            {String(r * prozessReihen[0].length + i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div
                          className="mt-3 font-bold leading-tight"
                          style={{
                            color: C.ink,
                            fontSize: prozessReihen[0].length > 4 ? 13 : 14.5,
                          }}
                        >
                          {s.t}
                        </div>
                        <div
                          className="mt-1.5 leading-[1.5]"
                          style={{
                            color: C.muted,
                            paddingRight: prozessReihen[0].length > 4 ? 8 : 16,
                            fontSize: prozessReihen[0].length > 4 ? 11.5 : 12.5,
                          }}
                        >
                          {s.d}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Leitung aus der Veröffentlichungs-Spalte in den Kanalblock. Sie
                sitzt auf 8 mm — derselben Achse wie der Punkt im Block darunter,
                sodass Schritt 05, Verzweigung und Karten eine Linie bilden. */}
            {/* Hier lief zuvor eine senkrechte Leitung in den Kanalblock. Sie saß
                auf 8 mm, also über Spalte 1, während ihre Beschriftung Schritt 05
                nannte — sie verband nichts und las sich als Strich im Weißraum.
                Den Bezug stellt jetzt allein der Kopf des Blocks her. */}
            <div className="h-[8mm] shrink-0" />

            <div
              className="flex flex-1 flex-col px-[8mm] py-[9mm]"
              style={{ background: C.soft, borderRadius: R }}
            >
              {/* Verzweigung: eine Quelle, drei Kanäle — die Stichleitungen
                  sitzen im selben Raster wie die Karten und treffen sie mittig. */}
              <div className="flex items-center gap-3">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: C.brand }} />
                <span className="shrink-0 text-[12.5px] font-bold" style={{ color: C.ink }}>
                  Schritt {String(freigabeSchritt + 1).padStart(2, "0")} · {prozess[freigabeSchritt]?.t}
                </span>
                <span className="h-[2px] flex-1" style={{ background: GRAD }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex h-[7mm] justify-center">
                    {/* Kleinanzeigen ist der halbautomatische Kanal — die
                        Stichleitung trägt dieselbe Farbe wie sein Punkt. */}
                    <div className="w-[2.5px]" style={{ background: i === 2 ? C.neutral : C.brand }} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { k: "Website", v: "vollständig verbunden", auto: true },
                  { k: "Shopify", v: "automatischer Schnittstellenabgleich", auto: true },
                  { k: "Kleinanzeigen", v: "halbautomatisch — Freigabe von Hand", auto: false },
                ].map((c) => (
                  <div
                    key={c.k}
                    className="bg-white px-4 py-9"
                    style={{ border: `1px solid ${C.line}`, borderRadius: R }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-[8px] w-[8px] rounded-full"
                        style={{ background: c.auto ? C.brand : C.neutral }}
                      />
                      <span className="text-[13.5px] font-bold" style={{ color: C.ink }}>
                        {c.k}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[12px] leading-[1.5]" style={{ color: C.body }}>
                      {c.v}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-auto pt-7 text-[14px] font-medium leading-[1.6]" style={{ color: C.ink }}>
                Ein Gerät wird einmal zentral erfasst — Rahmennummer, Zustand, Prüfprotokoll, Bilder
                und Preis. Website und Shop greifen anschließend auf denselben Datenstand zu und
                werden automatisch aktualisiert; bei Kleinanzeigen zeigt das System den erforderlichen
                manuellen Schritt eindeutig an.
              </p>
            </div>
          </div>
        </Page>
      )}

      {/* ── 4 · Paket 2, Module ───────────────────────────────────────── */}
      {order.includes("module") && (
        <Page no={pageNo("module")} total={order.length} number={doc.number} settings={settings}>
          <SectionHead
            eyebrow={pack === "system" ? "Leistungsumfang" : "Paket 02 · Leistungsumfang"}
            title="Module und Aufwand"
          />
          {/* Mehrspalter statt Raster: im Grid bestimmt das höhere Modul die
              Zeilenhöhe, bei zwölf ungleich langen Modulen gehen dadurch rund
              35 mm an Luft zwischen den Zeilen verloren — genug, dass der
              Preisfuß aus der Seite fällt. Der Spaltenfluss packt sie dicht
              untereinander, gelesen wird weiter 01–06 links, 07–12 rechts. */}
          <div className="mt-[4mm] flex-1 columns-2 gap-x-7">
            {module2.map((m) => {
              const rows = m.idx.map((i) => task((p2?.details ?? [])[i] ?? "")).filter((r) => r.text)
              if (!rows.length) return null
              return (
                <div key={m.no} className="mb-[3mm] break-inside-avoid">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[11.5px] font-bold tabular-nums" style={{ color: C.brand }}>
                      {m.no}
                    </span>
                    <span className="text-[13px] font-bold leading-snug" style={{ color: C.ink }}>
                      {m.title}
                    </span>
                      {/* „Neu" nur dort, wo das Modul gegenüber dem ersetzten
                          Angebot hinzugekommen ist — der Kunde vergleicht sonst
                          zwei Dokumente Zeile für Zeile. */}
                    {rows.some((r) => r.isNew) && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-[0.1em]"
                        style={{ background: C.brand, color: "#fff" }}
                      >
                        Neu
                      </span>
                    )}
                    <span
                      className="ml-auto shrink-0 text-[11px] tabular-nums"
                      style={{ color: C.muted }}
                    >
                      {std(rows.reduce((s, r) => s + r.hours, 0))}
                    </span>
                  </div>
                  <div className="mt-1.5 h-[1px] w-full" style={{ background: C.line }} />
                  {rows.map((r, ri) => (
                    <p
                      key={`${m.no}-${ri}`}
                      className="mt-2 text-[12px] leading-[1.45]"
                      style={{ color: C.body }}
                    >
                      {r.text}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
          <PriceFoot
            regular={reg(p2)}
            price={fixed(p2)}
            label={pack === "system" ? "Festpreis" : "Paket 2 — Festpreis"}
          />
        </Page>
      )}

      {/* ── 5 · Investition & Preis-Einordnung ────────────────────────── */}
      <Page no={pageNo("invest")} total={order.length} number={doc.number} settings={settings}>
        <SectionHead eyebrow="Investition" title="Was das Projekt kostet" />

        <div className="mt-[6mm] grid shrink-0 grid-cols-2 items-stretch gap-6">
          <div
            className="flex flex-col px-7 py-5"
            style={{ background: C.soft, borderRadius: R }}
          >
            <Eyebrow>Zusammensetzung</Eyebrow>
            <div className="mt-3.5">
              {/* Jede berechnete Position steht hier — sonst behauptete die
                  Zusammensetzung eine Rechnung, die nicht aufgeht. */}
              {positive.map((it) => (
                <SumRow key={it.id} k={it.description.split(":")[0]} v={eur(fixed(it))} />
              ))}
              <div className="my-2.5 h-[1px]" style={{ background: C.line }} />
              <SumRow k="Nettobetrag" v={eur(totals.net)} strong />
              {totals.taxBreakdown.map((t) => (
                <SumRow
                  key={t.rate}
                  k={`Umsatzsteuer ${Math.round(t.rate * 100)} %`}
                  v={eur(t.tax)}
                  muted
                />
              ))}
            </div>
          </div>

          <div
            className="flex flex-col overflow-hidden px-7 py-5"
            style={{ background: HERO_BG, borderRadius: R }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              Angebotssumme
            </div>
            {discount < 0 && (
              <div className="mt-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                Kalkulation{" "}
                <span style={{ textDecoration: "line-through" }}>
                  {eur(totals.net - discount)}
                </span>{" "}
                netto
              </div>
            )}
            <div className="mt-2 text-[32px] font-bold leading-none text-white">
              {eur(totals.gross)}
              <span className="pl-2 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                brutto
              </span>
            </div>
            <div className="mt-2.5 text-[13.5px] font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
              {eur(totals.net)} netto
            </div>
            <div className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              zzgl. {eur(totals.gross - totals.net)} Umsatzsteuer
            </div>
            {discount < 0 && (
              <div className="mt-auto">
                <div className="mt-5 h-[1px]" style={{ background: "rgba(255,255,255,0.14)" }} />
                <div className="mt-3.5 flex items-end justify-between gap-4">
                  {/* Die Kalkulation steht bereits durchgestrichen über der
                      Summe — hier nur noch der Bezug, nicht die Zahl doppelt. */}
                  <div className="text-[12px] leading-[1.45]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Ihr Nachlass gegenüber
                    <br />
                    der Kalkulation
                  </div>
                  <div className="text-[24px] font-bold leading-none" style={{ color: "#00ffe6" }}>
                    {eur(discount)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ohne Stunden gäbe es „Infinity €/Std.", ohne Vergleichswerte einen
            Balken der Breite NaN — beides landete ungefiltert im Kundendokument. */}
        {val && val.hours > 0 && val.benchmarks.length > 0 && (
          <div className="mt-[5mm] flex flex-1 flex-col">
            <Eyebrow>Preis-Einordnung</Eyebrow>
            <p className="mt-2 max-w-[150mm] text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
              {std(val.hours)} kalkulierte Arbeit, hochgerechnet auf
              marktübliche Sätze. Effektiv entspricht der Preis{" "}
              <strong style={{ color: C.ink }}>
                {Math.round(val.netAmount / val.hours)} €/Std.
              </strong>
            </p>
            <div className="mt-3 space-y-[8px]">
              {[
                { label: "Dieses Angebot", rate: val.netAmount / val.hours, amount: val.netAmount, own: true },
                ...val.benchmarks.map((b) => ({
                  label: b.label,
                  rate: b.rate,
                  amount: b.rate * val.hours,
                  own: false,
                })),
              ]
                .sort((a, b) => a.amount - b.amount)
                .map((m) => (
                  <Bar
                    key={m.label}
                    label={m.label}
                    sub={`${Math.round(m.rate)} €/h`}
                    amount={m.amount}
                    max={Math.max(val.netAmount, ...val.benchmarks.map((b) => b.rate * val.hours))}
                    own={m.own}
                  />
                ))}
            </div>

            {/* Jedes Argument trägt seine Kernzahl als linke Spalte — der Blick
                springt von 62 € zu 0 €, bevor der Text gelesen wird. Die kurze
                Gradient-Kerbe markiert den Zeilenanfang, ohne eine Karte daraus
                zu machen. */}
            <div className="mt-[5mm] grid grid-cols-2 gap-x-7 gap-y-[3mm]">
              {val.reasons.map((r) => (
                <div key={r.title} className="relative pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="absolute left-0 top-[-1.5px] h-[2.5px] w-[9mm]" style={{ background: GRAD }} />
                  <div className="flex gap-4">
                    {r.stat && (
                      <div className="w-[16mm] shrink-0">
                        <div
                          className="text-[21px] font-bold leading-none tabular-nums"
                          style={{ color: C.brand }}
                        >
                          {r.stat}
                        </div>
                        {r.statLabel && (
                          // Lange Einwort-Labels („Verantwortlicher") sind breiter
                          // als die Spalte und liefen sonst in den Fließtext.
                          // Umbruch mit Trennung statt Überlauf.
                          <div
                            className="mt-1 hyphens-auto break-words text-[9px] uppercase leading-[1.3] tracking-[0.08em]"
                            style={{ color: C.muted }}
                          >
                            {r.statLabel}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-[12.5px] font-bold" style={{ color: C.ink }}>
                        {r.title}
                      </div>
                      <p className="mt-1 text-[12px] leading-[1.55]" style={{ color: C.body }}>
                        {r.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quellen tragen die Einordnung, führen sie aber nicht an — daher
                bewusst ans Blattende, mit Luft davor. */}
            <div className="mt-auto pt-[3mm]">
              {val.sources?.length ? (
                <ol className="space-y-[3px]">
                  {val.sources.map((s, i) => (
                    <li key={s.name} className="flex gap-2 text-[10.5px] leading-[1.5]">
                      <span className="tabular-nums" style={{ color: C.muted }}>
                        {i + 1}
                      </span>
                      <span style={{ color: C.muted }}>
                        <strong className="font-semibold" style={{ color: C.body }}>
                          {s.name}
                        </strong>{" "}
                        {s.detail}
                        {s.link && <span> {s.link}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {val.sourceNote && (
                <p className="mt-2 text-[10.5px] leading-[1.5]" style={{ color: C.muted }}>
                  {val.sourceNote}
                </p>
              )}
            </div>
          </div>
        )}
      </Page>

      {/* ── 6 · Projektablauf & Rahmen ────────────────────────────────── */}
      <Page no={pageNo("rahmen")} total={order.length} number={doc.number} settings={settings}>
        <SectionHead eyebrow="Rahmen" title="Wie das Projekt läuft" />
        <div className="mt-[8mm] flex flex-1 flex-col justify-between">
          {secIntro.map((s, i) => {
            const plan = weeks(s.body[0])
            return (
              <div
                key={s.title}
                className={i ? "pt-[4mm]" : ""}
                style={i ? { borderTop: `1px solid ${C.line}` } : undefined}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[11.5px] font-bold tabular-nums" style={{ color: C.brand }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14.5px] font-bold" style={{ color: C.ink }}>
                    {s.title}
                  </span>
                  {/^Wann /i.test(s.title) && <Chip>Abnahmekriterien</Chip>}
                </div>
                <div className="mt-2 pl-[28px]">
                  {plan.length > 0 && <Timeline plan={plan} labels={planLabels} />}
                  {s.body.map((b, j) => (
                    <p
                      key={j}
                      className={`text-[12.5px] leading-[1.6]${j ? " mt-2" : ""}`}
                      style={{ color: C.body }}
                    >
                      {b}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Page>

      {/* ── 7 · Betreuung, Zahlung, Abschluss ─────────────────────────── */}
      {order.includes("pflege") && (
        <Page no={pageNo("pflege")} total={order.length} number={doc.number} settings={settings}>
          <SectionHead eyebrow="Nach dem Livegang" title="Betreuung ohne Monatspauschale" />

          <div
            className="mt-[6mm] shrink-0 overflow-hidden px-[8mm] py-[5mm]"
            style={{ background: HERO_BG, borderRadius: R }}
          >
            <div className="flex items-start justify-between gap-8">
              <div className="max-w-[108mm]">
                <div className="text-[19px] font-bold leading-tight text-white">
                  Keine feste monatliche Pflegegebühr.
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.5]" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Stattdessen 15 % des provisionsrelevanten Deckungsbeitrags aus Geschäften, die durch
                  die Website entstehen. Kein Websitegeschäft, keine Vergütung.
                </p>
              </div>
              <div
                className="shrink-0 pl-8 text-right"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.14)" }}
              >
                <div className="text-[48px] font-bold leading-none" style={{ color: "#00ffe6" }}>
                  15 %
                </div>
                <div
                  className="mt-1.5 text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  erfolgsabhängig
                </div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-[38%]" style={{ background: GRAD }} />
          </div>

          {/* Nur die Betreuung — Provision, Beispielrechnung, Zurechnung,
              Leistungsumfang, Abrechnung und Laufzeit. Zahlung und Abschluss
              stehen auf der Folgeseite; zusammen war das eine Bleiwüste. */}
          {/* Die vier Absätze beantworten vier verschiedene Fragen — als Block
              gesetzt liest sich das wie Kleingedrucktes. Mit Marginalie je Absatz
              ist erkennbar, wo Berechnung, Zurechnung, Umfang und Laufzeit
              stehen; zugleich füllt die Gliederung die Seite. */}
          {/* justify-between statt fester Fugen: die Seite trägt vier Absätze und
              endete zuvor gut 60 mm über dem Satzspiegelfuß. Der Rest verteilt
              sich jetzt auf die Trennlinien, statt als Block unten zu stehen. */}
          <div className="mt-[7mm] flex flex-1 flex-col justify-between gap-[6mm]">
            {(sec[pflegeIdx]?.body ?? []).slice(1).map((b, i) => {
              const ex = example(b)
              return (
                <div
                  key={i}
                  className={i ? "pt-[6mm]" : ""}
                  style={i ? { borderTop: `1px solid ${C.line}` } : undefined}
                >
                  <div className="flex gap-6">
                    <div
                      className="w-[26mm] shrink-0 pt-[2px] text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.1em]"
                      style={{ color: C.muted }}
                    >
                      {["Berechnung", "Zurechnung", "Enthalten", "Abrechnung & Laufzeit"][i] ?? ""}
                    </div>
                    <p className="min-w-0 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>
                      {ex ? ex.intro : b}
                    </p>
                  </div>
                  {/* Die Zahlenkette braucht die volle Satzbreite — in der
                      schmalen Textspalte brechen Beträge und Chip-Titel um. */}
                  {ex && <Calc values={ex.values} />}
                </div>
              )
            })}
          </div>
        </Page>
      )}

      {/* ── 8 · Beauftragung und Abschluss ────────────────────────────── */}
      <Page no={pageNo("zahlung")} total={order.length} number={doc.number} settings={settings}>
        <SectionHead eyebrow="Beauftragung" title="Zahlung und Konditionen" />

        {/* Der Zahlungsplan ist die Information, die der Kunde auf dieser Seite
            wirklich sucht — als Raten-Grafik beantwortet sie „wann zahle ich
            wie viel" ohne Rechnen im Kopf. */}
        <div className="mt-[8mm] shrink-0">
          <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
            Zahlungsplan
          </div>
          <p className="mt-2 text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
            {pack === "web"
              ? "In drei Raten, jeweils 14 Tage netto ohne Abzug. Zwischenstand heißt hier die freigegebene Gestaltung der Website."
              : pack === "system"
                ? "In drei Raten, jeweils 14 Tage netto ohne Abzug. Zwischenstand heißt hier der lauffähige Kernprozess im Testsystem."
                : "Je Paket in drei Raten, jeweils 14 Tage netto ohne Abzug. Zwischenstand heißt bei Paket 1 die freigegebene Gestaltung, bei Paket 2 der lauffähige Kernprozess im Testsystem. Nicht beauftragte Pakete werden nicht berechnet."}
          </p>
          <div className="mt-[4mm] flex gap-3">
            {[
              { pct: 0.4, when: "bei Auftrag" },
              { pct: 0.3, when: "bei Zwischenstand" },
              { pct: 0.3, when: "bei Abnahme" },
            ].map((r) => (
              <div
                key={r.when}
                className="flex-1 px-4 py-3"
                style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[19px] font-bold leading-none" style={{ color: C.brand }}>
                    {Math.round(r.pct * 100)} %
                  </span>
                  <span className="text-[11px]" style={{ color: C.muted }}>
                    {r.when}
                  </span>
                </div>
                {/* Zwei Pakete brauchen die Aufschlüsselung je Paket; bei einem
                    steht dieselbe Zahl sonst neben ihrer eigenen Überschrift. */}
                {packs.length > 1 ? (
                  <div className="mt-3 space-y-1.5">
                    {packs.map((it, i) => (
                      <div key={it.id} className="flex items-baseline justify-between gap-3">
                        <span className="text-[11px]" style={{ color: C.muted }}>
                          Paket {i + 1}
                        </span>
                        <span
                          className="text-[12.5px] font-semibold tabular-nums"
                          style={{ color: C.ink }}
                        >
                          {eur(fixed(it) * r.pct)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="mt-3 text-[15px] font-bold tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {eur(fixed(packs[0]) * r.pct)}
                    <span className="pl-1.5 text-[10.5px] font-medium" style={{ color: C.muted }}>
                      netto
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px]" style={{ color: C.muted }}>
            Alle Beträge netto zuzüglich der gesetzlichen Umsatzsteuer. Trifft der Projektvertrag
            eine abweichende Zahlungsvereinbarung, geht sie diesem Plan vor.
          </p>
        </div>

        {/* Seit die rechtlichen Abschnitte im Vertrag stehen, trägt die Seite
            weniger Text. `justify-between` riss sie dadurch in der Mitte auf
            und schob den letzten Absatz in die Fußzeile. Jetzt steht der Text
            oben und der Verweis auf den Vertrag als Kasten am Fuß — die Luft
            dazwischen liest sich als Satz, nicht als Lücke. */}
        <div className="mt-[7mm] flex flex-1 flex-col">
          {secEnd
            .filter((s) => !/Vertragsgrundlage/i.test(s.title))
            .map((s, i) => (
              <div
                key={s.title}
                className={i ? "mt-[5mm] pt-[5mm]" : ""}
                style={i ? { borderTop: `1px solid ${C.line}` } : undefined}
              >
                <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
                  {s.title}
                </div>
                <Paragraphs body={s.body} />
              </div>
            ))}

          {(() => {
            const v = secEnd.find((s) => /Vertragsgrundlage/i.test(s.title))
            if (!v) return null
            return (
              <div
                className="mt-auto px-[7mm] py-[5mm]"
                style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
              >
                <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
                  {v.title}
                </div>
                {v.body.map((b, i) => (
                  <p
                    key={i}
                    className={`text-[12.5px] leading-[1.7]${i ? " mt-2" : " mt-2"}`}
                    style={{ color: C.body }}
                  >
                    {b}
                  </p>
                ))}
                <div className="mt-[4mm] h-[2px] w-[32%]" style={{ background: GRAD }} />
              </div>
            )
          })()}
        </div>
      </Page>

      {/* ── 9 · Vertragsrahmen und Beauftragung ───────────────────────────
          Verzug, Abbruch und Haftung passen zusammen mit dem Beauftragungs-
          block nicht auf Seite 8 — gemessen liefen sie 43 pt unter den
          Satzspiegel. Sie tragen deshalb die Schlussseite. */}
      <Page no={pageNo("abschluss")} total={order.length} number={doc.number} settings={settings} last>
        <SectionHead eyebrow="Abschluss" title="Beauftragung und Freigabe" />

        {/* Vier Blöcke — Aufstellung, Beauftragung, die drei Schritte und der
            Abschlusssatz. `justify-between` verteilt den Rest auf die Fugen
            dazwischen, statt ihn als eine Lücke vor dem Abbinder zu sammeln. */}
        <div className="mt-[7mm] flex flex-1 flex-col justify-between">
          {secFinal && (
            <div>
              <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
                {secFinal.title}
              </div>
              <Paragraphs body={secFinal.body} />
            </div>
          )}

          {/* Was mit der Freigabe beauftragt wird, steht sonst nur auf Seite 5
              — direkt über dem Beauftragungsblock erspart es das Zurückblättern
              im Moment der Entscheidung. */}
          <div
            className="px-[7mm] py-[5mm]"
            style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
          >
            <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
              Was Sie beauftragen
            </div>
            <div className="mt-2.5">
              {packs.map((it) => (
                <SumRow
                  key={it.id}
                  k={it.description.split(":")[0]}
                  v={`${eur(fixed(it))} netto`}
                />
              ))}
              <div className="my-1.5 h-[1px]" style={{ background: C.line }} />
              <SumRow
                k={packs.length > 1 ? "Beide Pakete zusammen" : "Festpreis gesamt"}
                v={`${eur(totals.net)} netto`}
                strong
              />
              <SumRow k="zzgl. Umsatzsteuer" v={eur(totals.gross - totals.net)} muted />
              {/* Die erfolgsabhängige Betreuung hängt an der Website — im
                  Systemangebot wäre sie eine Zusage ohne Grundlage. */}
              {pack !== "system" && (
                <SumRow k="Betreuung nach dem Livegang" v="15 % erfolgsabhängig" muted />
              )}
            </div>
          </div>

          {/* Ein Angebot muss sagen, wie man es annimmt — ohne diesen Schritt
              endet das Dokument im Nichts. */}
          <div
            className="mt-[7mm] px-[7mm] py-[5mm]"
            style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
          >
            <div className="flex items-start justify-between gap-8">
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold" style={{ color: C.ink }}>
                  So beauftragen Sie
                </div>
                <p className="mt-2 max-w-[105mm] text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
                  {packs.length > 1
                    ? "Eine kurze Freigabe per E-Mail genügt — mit der Angabe, welche Pakete beauftragt werden. Danach erhalten Sie die Auftragsbestätigung und den Terminvorschlag für den Projektstart."
                    : "Eine kurze Freigabe per E-Mail genügt. Danach erhalten Sie den unterschriftsreifen Projektvertrag und den Terminvorschlag für den Projektstart."}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: C.muted }}
                >
                  Angebot gültig bis
                </div>
                <div
                  className="mt-1.5 text-[19px] font-bold leading-none tabular-nums"
                  style={{ color: C.brand }}
                >
                  {dateDE(doc.validUntil)}
                </div>
                <div className="mt-2.5 text-[12px] leading-[1.5]" style={{ color: C.body }}>
                  {settings.email}
                  <br />
                  {settings.phone}
                </div>
              </div>
            </div>
            <div className="mt-[4mm] h-[2px] w-[32%]" style={{ background: GRAD }} />
          </div>

          {/* Die Freigabe ist kein Endpunkt, sondern der erste von drei
              Schritten. Ausgeschrieben nimmt sie dem Kunden die Frage, was
              nach seiner Mail passiert — und trägt zugleich die Seite, seit
              der Rechtsteil im Vertrag steht. */}
          {!secFinal && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  t: "Freigabe",
                  d:
                    packs.length > 1
                      ? "Kurze Bestätigung per E-Mail mit Angabe der beauftragten Pakete."
                      : "Kurze Bestätigung per E-Mail, dass dieses Angebot beauftragt wird.",
                },
                {
                  t: "Vertrag und Bestätigung",
                  d: "Sie erhalten Auftragsbestätigung und Projektvertrag zur Unterzeichnung.",
                },
                {
                  t: "Projektstart",
                  d: "Terminvorschlag, Zugänge und Datenübergabe — danach beginnt die Umsetzung.",
                },
              ].map((s, i) => (
                <div
                  key={s.t}
                  className="px-4 py-3.5"
                  style={{ background: C.soft, borderRadius: R, border: `1px solid ${C.line}` }}
                >
                  <div
                    className="text-[11.5px] font-bold tabular-nums"
                    style={{ color: C.brand }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-1.5 text-[13px] font-bold" style={{ color: C.ink }}>
                    {s.t}
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-[1.55]" style={{ color: C.body }}>
                    {s.d}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* mt-auto drückte den Satz an den Fuß und riss die Blattmitte auf —
              den Rest verteilt jetzt justify-between des Containers. */}
          <p className="pb-[4mm] pt-[6mm] text-[14px] font-semibold" style={{ color: C.ink }}>
            Wir freuen uns auf die Zusammenarbeit und die gemeinsame Umsetzung Ihres Projekts.
          </p>
        </div>

        {/* Der Abbinder steht auf der letzten Seite unmittelbar über der
            Fußzeile — die Abstände hier sind knapp bemessen, damit die
            Impressumszeile nicht in die Fußzeilen-Linie läuft. */}
        <div className="mt-auto shrink-0 pt-[3mm]" style={{ borderTop: `1px solid ${C.line}` }}>
          {/* Telefon und E-Mail stehen bereits im Beauftragungs-Block darüber —
              hier nur noch Absender und Web, unten die Pflichtangaben. */}
          <div className="flex items-end justify-between gap-8">
            <div>
              <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>
                {settings.ownerName} — {settings.name}
              </div>
              <div className="mt-1 text-[12px] leading-[1.55]" style={{ color: C.body }}>
                {settings.address} · {settings.zip} {settings.city}
              </div>
            </div>
            <div className="text-right text-[12px] leading-[1.55]" style={{ color: C.body }}>
              {settings.website}
            </div>
          </div>
          <div
            className="mt-1 flex flex-wrap gap-x-6 gap-y-1 pb-[1mm] text-[10px]"
            style={{ color: C.muted }}
          >
            <span>USt-ID {settings.vatId}</span>
            <span style={{ whiteSpace: "nowrap" }}>IBAN {settings.iban}</span>
          </div>
        </div>
      </Page>
    </div>
  )
}

/* ── Bausteine ───────────────────────────────────────────────────────── */

function sumHours(it?: LineItem) {
  return (it?.details ?? []).reduce((s, d) => s + task(d).hours, 0)
}

function Page({
  no,
  total,
  number,
  settings,
  last,
  children,
}: {
  no: number
  total: number
  number: string
  settings: CompanySettings
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`prop-page${last ? " prop-last" : ""}`}>
      <div className="flex h-full flex-col">{children}</div>
      <div
        className="prop-foot flex items-center justify-between text-[9.5px] tracking-[0.06em]"
        style={{ color: C.muted }}
      >
        <span>
          {settings.name} · Angebot {number}
        </span>
        <span className="tabular-nums">
          Seite {String(no).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </section>
  )
}

function Brandbar({
  number,
  settings,
}: {
  number: string
  settings: CompanySettings
}) {
  return (
    <div
      className="relative flex h-[26mm] shrink-0 items-stretch justify-between overflow-hidden px-[7mm] py-[5mm]"
      style={{ background: HERO_BG, borderRadius: R }}
    >
      <div className="absolute bottom-0 left-0 h-[2px] w-[62%]" style={{ background: GRAD }} />
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark-light.svg" alt={settings.name} width={34} height={34} />
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-wordmark-light.svg"
            alt=""
            style={{ height: 11, width: "auto" }}
          />
          <div
            className="mt-[4px] text-[9.5px] font-medium uppercase tracking-[0.16em]"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            Webdesign &amp; KI-Automatisierung
          </div>
        </div>
      </div>
      {/* Kein Datum hier — das steht im Metablock darunter; zweimal auf einer
          Seite liest sich wie ein Versehen. */}
      <div className="flex flex-col items-end justify-center text-right">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Angebot
        </div>
        <div className="mt-[3px] text-[22px] font-bold leading-none text-white">{number}</div>
      </div>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: C.brand }}
    >
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[9.5px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: C.soft, color: C.muted, border: `1px solid ${C.line}` }}
    >
      {children}
    </span>
  )
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="shrink-0">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2.5 text-[27px] font-bold leading-tight tracking-tight" style={{ color: C.ink }}>
        {title}
      </h2>
    </div>
  )
}

function PackHead({ no, title, intro }: { no: string; title: string; intro?: string }) {
  return (
    <div className="shrink-0">
      <div className="flex items-start gap-5">
        <div
          className="text-[46px] font-bold leading-none tracking-tight"
          style={{ color: C.brand }}
        >
          {no}
        </div>
        <div className="flex-1">
          <Eyebrow>Paket {no}</Eyebrow>
          <h2
            className="mt-2 text-[27px] font-bold leading-tight tracking-tight"
            style={{ color: C.ink }}
          >
            {title}
          </h2>
        </div>
      </div>
      {intro && (
        <p className="mt-4 max-w-[158mm] text-[12.5px] leading-[1.65]" style={{ color: C.body }}>
          {intro}
        </p>
      )}
    </div>
  )
}

function GroupHead({ no, title, hours }: { no: string; title: string; hours: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-[18px] shrink-0 text-[11.5px] font-bold tabular-nums" style={{ color: C.brand }}>
        {no}
      </span>
      <span className="text-[15px] font-bold" style={{ color: C.ink }}>
        {title}
      </span>
      <span className="h-[1px] flex-1" style={{ background: C.line }} />
      <span className="shrink-0 text-[11px] tabular-nums" style={{ color: C.muted }}>
        {std(hours)}
      </span>
    </div>
  )
}

function Row({ text, hours }: { text: string; hours: number }) {
  return (
    <div className="flex gap-3 text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
      <span className="mt-[8px] h-[3px] w-[3px] shrink-0 rounded-full" style={{ background: C.brand }} />
      <span className="flex-1">{text}</span>
      {hours > 0 && (
        <span className="shrink-0 pl-3 text-right text-[11px] tabular-nums" style={{ color: C.muted }}>
          {std(hours)}
        </span>
      )}
    </div>
  )
}

/** Absätze eines Anmerkungs-Abschnitts; die Beispielrechnung wird zur Grafik. */
function Paragraphs({ body }: { body: string[] }) {
  return (
    <div className="mt-2">
      {body.map((b, j) => {
        const ex = example(b)
        if (ex) {
          return (
            <div key={j} className={j ? "mt-2.5" : ""}>
              <p className="text-[12.5px] leading-[1.5]" style={{ color: C.body }}>
                {ex.intro}
              </p>
              <Calc values={ex.values} />
            </div>
          )
        }
        return (
          <p
            key={j}
            className={`text-[12.5px] leading-[1.5]${j ? " mt-2" : ""}`}
            style={{ color: C.body }}
          >
            {b}
          </p>
        )
      })}
    </div>
  )
}

/** Beispielrechnung als Zahlenkette — Erlös − Kosten = Deckungsbeitrag → Anteil. */
function Calc({ values }: { values: string[] }) {
  const cells = [
    { k: "Nettoerlös", v: values[0], op: "−" },
    { k: "Direkte Kosten", v: values[1], op: "=" },
    { k: "Deckungsbeitrag", v: values[2], op: "→" },
    { k: "15 % Anteil", v: values[3], op: "" },
  ]
  return (
    <div className="mt-2 flex items-stretch gap-2">
      {cells.map((c, i) => (
        <div key={c.k} className="flex flex-1 items-center gap-2">
          <div
            className="flex-1 px-3.5 py-1.5"
            style={{
              borderRadius: R,
              background: i === 3 ? "#eaf2fe" : C.soft,
              border: `1px solid ${i === 3 ? "#c9dffb" : C.line}`,
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: C.muted }}>
              {c.k}
            </div>
            <div
              className="mt-1 text-[15px] font-bold tabular-nums"
              style={{ color: i === 3 ? C.brand : C.ink }}
            >
              {c.v}
            </div>
          </div>
          {c.op && (
            <span className="shrink-0 text-[13px] font-bold" style={{ color: C.muted }}>
              {c.op}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Zeitschiene für den Rahmen-Abschnitt: zwei Pakete hintereinander. */
function Timeline({ plan, labels }: { plan: [number, number][]; labels: string[] }) {
  const total = plan.reduce((s, [, b]) => s + b, 0)
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        {plan.map(([a, b], i) => (
          <div key={i} style={{ flex: b / total }}>
            <div
              className="h-[8px] rounded-full"
              style={{ background: i === 0 ? GRAD : C.neutral }}
            />
            <div className="mt-2 text-[12px] font-semibold" style={{ color: C.ink }}>
              {labels[i]}
              <span className="pl-1.5 font-normal" style={{ color: C.muted }}>
                {i ? "+ " : ""}
                {a}–{b} Wochen
              </span>
            </div>
          </div>
        ))}
        {/* Bei einer einzigen Spanne stünde hier dieselbe Zahl ein zweites Mal. */}
        {plan.length > 1 && (
          <div className="shrink-0 pl-1 text-[12px] font-semibold" style={{ color: C.muted }}>
            bis {total} Wochen gesamt
          </div>
        )}
      </div>
    </div>
  )
}

function PriceFoot({
  regular,
  price,
  label,
}: {
  regular: number
  price: number
  label: string
}) {
  return (
    <div
      className="mt-[4mm] flex shrink-0 items-end justify-between gap-6 px-[8mm] py-[4mm]"
      style={{ background: C.soft, borderRadius: R }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>
          {label}
        </div>
        {regular > price && (
          <div className="mt-2 text-[12.5px]" style={{ color: C.body }}>
            Kalkulation{" "}
            <span style={{ textDecoration: "line-through" }}>{eur(regular)}</span> netto
            {" "}·{" "}
            <span className="font-semibold" style={{ color: C.brand }}>
              {eur(price - regular)} Nachlass
            </span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[36px] font-bold leading-none" style={{ color: C.ink }}>
          {eur(price)}
        </div>
        <div className="mt-1.5 text-[12px]" style={{ color: C.muted }}>
          netto zzgl. Umsatzsteuer
        </div>
      </div>
    </div>
  )
}

function CoverCard({
  no,
  title,
  text,
  regular,
  price,
  hours,
}: {
  no: string
  title: string
  text: string
  regular: number
  price: number
  hours: number
}) {
  return (
    <div
      className="flex h-full flex-col px-7 py-6"
      style={{ border: `1px solid ${C.line}`, borderRadius: R }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-bold tabular-nums" style={{ color: C.brand }}>
          {no}
        </span>
        <span className="text-[10.5px] tabular-nums" style={{ color: C.muted }}>
          {std(hours)}
        </span>
      </div>
      <div className="mt-2.5 text-[19px] font-bold leading-tight" style={{ color: C.ink }}>
        {title}
      </div>
      <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: C.body }}>
        {text}
      </p>
      {/* Der Preis sitzt am Kartenfuß: beide Karten schließen auf derselben
          Linie ab, unabhängig von der Textlänge. Die durchgestrichene
          Kalkulation direkt darüber macht den Nachlass am Preis selbst
          sichtbar, nicht erst in der Summenbox. */}
      <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${C.line}`, marginTop: "auto" }}>
        {regular > price && (
          <div className="text-[11.5px]" style={{ color: C.muted }}>
            Kalkulation{" "}
            <span style={{ textDecoration: "line-through" }}>{eur(regular)}</span>
          </div>
        )}
        <div className="mt-1.5 text-[26px] font-bold leading-none" style={{ color: C.ink }}>
          {eur(price)}
          <span className="pl-1.5 text-[11.5px] font-medium" style={{ color: C.muted }}>
            netto
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Titelseite eines Einzelpakets. Zwei Paketkarten nebeneinander erzählen den
 * Umfang; eine allein stünde in halber Blattbreite und ließe die Seite kippen.
 * Diese Karte nimmt die volle Breite und ersetzt die zweite Karte durch die
 * Gliederung des Leistungsteils — der Kunde sieht auf der ersten Seite, was
 * enthalten ist, nicht nur, dass es ein Paket gibt. Der Preis steht bewusst
 * nicht in der Karte: er trägt darunter den Investitionsblock, und zweimal
 * dieselbe Zahl auf einem Blatt schwächt beide Stellen.
 */
function CoverOverview({
  title,
  text,
  rows,
  hours,
}: {
  title: string
  text: string
  rows: { title: string; hours: number }[]
  hours: number
}) {
  // Vier Gruppen stehen zu zweit, zwölf Module zu dritt — sonst wird die
  // Spalte entweder zur Liste oder zum Schnipsel.
  const cols = rows.length > 6 ? 3 : 2
  return (
    <div
      className="mt-[8mm] flex flex-1 flex-col px-8 py-6"
      style={{ border: `1px solid ${C.line}`, borderRadius: R }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <div className="text-[21px] font-bold leading-tight" style={{ color: C.ink }}>
          {title}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: C.muted }}>
          {std(hours)} kalkuliert
        </span>
      </div>
      {text && (
        <p className="mt-3 max-w-[150mm] text-[12.5px] leading-[1.6]" style={{ color: C.body }}>
          {text}
        </p>
      )}

      <div
        className="mt-auto grid gap-x-8 pt-[5mm]"
        style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}
      >
        {rows.map((r) => (
          <div
            key={r.title}
            className="flex items-baseline justify-between gap-3 py-[5px]"
            style={{ borderTop: `1px solid ${C.line}` }}
          >
            <span className="min-w-0 text-[12.5px] font-semibold" style={{ color: C.ink }}>
              {r.title}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums" style={{ color: C.muted }}>
              {std(r.hours)}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}

function SumRow({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[4.5px]">
      <span
        className={`text-[12px] leading-snug${strong ? " font-semibold" : ""}`}
        style={{ color: muted ? C.muted : C.body }}
      >
        {k}
      </span>
      <span
        className={`shrink-0 text-[13px] tabular-nums${strong ? " font-bold" : ""}`}
        style={{ color: muted ? C.muted : C.ink }}
      >
        {v}
      </span>
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
  const pct = Math.max(8, Math.round((amount / max) * 100))
  return (
    <div className="flex items-center gap-4 text-[12px]">
      <div className="w-[52mm] shrink-0 leading-tight" style={{ color: own ? C.ink : C.body }}>
        <span className={`block${own ? " font-bold" : " font-medium"}`}>{label}</span>
        <span className="block text-[10.5px]" style={{ color: C.muted }}>
          {sub}
        </span>
      </div>
      <div className="h-[13px] flex-1 overflow-hidden rounded-full" style={{ background: "#eff0f4" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: own ? GRAD : C.neutral }}
        />
      </div>
      <div
        className="w-[25mm] shrink-0 text-right text-[12.5px] font-semibold tabular-nums"
        style={{ color: own ? C.brand : C.ink }}
      >
        {eur(amount)}
      </div>
    </div>
  )
}
