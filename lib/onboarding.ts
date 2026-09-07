import { nanoid } from "nanoid"
import type { Customer, Deal, LineItem, OnboardingSession } from "./types"
import { parseDE } from "./format"

/**
 * Fragenprotokoll für das Erstgespräch.
 *
 * Der Aufbau folgt dem Gespräch, nicht der Datenbank: erst wer da ist, dann
 * wo es hakt, dann was gebaut werden soll, dann was schon existiert, zuletzt
 * Geld und Termin. Wer mit dem Budget anfängt, bekommt eine Zahl statt eines
 * Auftrags.
 *
 * `ask` ist die Frage, wie man sie im Gespräch stellt — sie steht im Formular
 * über dem Feld, damit man sie ablesen kann, ohne sie sich zu merken.
 */
export type FieldType = "text" | "textarea" | "select" | "multi" | "number" | "money" | "date"

export interface OnboardingField {
  key: string
  label: string
  type: FieldType
  /** Die Frage im Gesprächston. */
  ask?: string
  hint?: string
  options?: string[]
  placeholder?: string
  required?: boolean
  /** Halbe Breite im Raster. */
  half?: boolean
}

export interface OnboardingStep {
  id: string
  title: string
  intro: string
  fields: OnboardingField[]
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "kontakt",
    title: "Wer sitzt gegenüber",
    intro:
      "Stammdaten zuerst — sie entscheiden, ob aus dem Gespräch später ein Kunde, ein Angebot und eine Rechnung werden können.",
    fields: [
      { key: "company", label: "Firma", type: "text", ask: "Wie heißt das Unternehmen genau — so, wie es auf die Rechnung soll?", required: true, half: true },
      { key: "contactName", label: "Ansprechpartner", type: "text", ask: "Mit wem spreche ich?", required: true, half: true },
      { key: "role", label: "Rolle", type: "text", placeholder: "Inhaber, Marketing, Geschäftsführung", half: true },
      { key: "email", label: "E-Mail", type: "text", ask: "An welche Adresse darf ich Angebot und Unterlagen schicken?", half: true },
      { key: "phone", label: "Telefon", type: "text", half: true },
      { key: "website", label: "Website", type: "text", placeholder: "wrapcut.nrw", half: true },
      { key: "city", label: "Ort", type: "text", half: true },
      { key: "industry", label: "Branche", type: "text", placeholder: "Fahrzeugfolierung, Zahnarzt, Handwerk", half: true },
      {
        key: "source",
        label: "Woher kommt der Kontakt",
        type: "select",
        options: ["Empfehlung", "Google", "Instagram", "LinkedIn", "Kaltakquise", "Netzwerk", "Bestandskunde", "Sonstiges"],
        half: true,
      },
    ],
  },
  {
    id: "ausgangslage",
    title: "Wo es gerade hakt",
    intro:
      "Der Teil, aus dem später die Begründung des Preises wird. Je konkreter der Schmerz, desto weniger muss das Angebot erklären.",
    fields: [
      {
        key: "currentSite",
        label: "Aktueller Stand",
        type: "textarea",
        ask: "Was haben Sie heute — und was stört Sie daran am meisten?",
        hint: "Bestehende Seite, Baukasten, gar nichts. Wörtlich mitschreiben, was genannt wird.",
      },
      {
        key: "goals",
        label: "Ziel",
        type: "textarea",
        ask: "Woran würden Sie in einem Jahr merken, dass sich das gelohnt hat?",
        hint: "Mehr Anfragen, andere Anfragen, weniger Aufwand, Auftritt zum Preis passend.",
      },
      {
        key: "audience",
        label: "Zielgruppe & Einzugsgebiet",
        type: "textarea",
        ask: "Wer soll anfragen — und aus welcher Gegend?",
      },
      {
        key: "competitors",
        label: "Wettbewerb & Vorbilder",
        type: "textarea",
        ask: "Wessen Auftritt gefällt Ihnen — und wen sehen Sie als Wettbewerb?",
      },
    ],
  },
  {
    id: "vorhaben",
    title: "Was gebaut wird",
    intro: "Der Umfang. Aus diesen Punkten entstehen die Positionen des Angebots.",
    fields: [
      {
        key: "services",
        label: "Leistungen",
        type: "multi",
        options: [
          "Website neu",
          "Relaunch",
          "Onlineshop",
          "Landingpage",
          "Marke & Logo",
          "Texte",
          "Bilder & Aufbereitung",
          "SEO / GEO",
          "KI-Automatisierung",
          "Pflege & Betreuung",
        ],
      },
      { key: "pages", label: "Seitenanzahl", type: "number", placeholder: "17", half: true },
      {
        key: "content",
        label: "Inhalte & Bilder",
        type: "select",
        options: ["liegen vollständig vor", "teilweise vorhanden", "wir erstellen alles"],
        half: true,
      },
      {
        key: "features",
        label: "Funktionen",
        type: "multi",
        options: [
          "Kontaktformular",
          "Terminbuchung",
          "Blog / Magazin",
          "Mehrsprachig",
          "Shop & Zahlung",
          "Kundenbereich",
          "Bewertungen",
          "Standortseiten",
          "Newsletter",
        ],
      },
      {
        key: "scopeNotes",
        label: "Besonderheiten",
        type: "textarea",
        ask: "Gibt es etwas, das dieses Projekt von einem Standardprojekt unterscheidet?",
      },
    ],
  },
  {
    id: "technik",
    title: "Was schon da ist",
    intro:
      "Zugänge sind der häufigste Grund, warum ein Projekt zwei Wochen stillsteht. Deshalb im Gespräch klären, nicht später per Mail.",
    fields: [
      { key: "domain", label: "Domain", type: "text", placeholder: "wrapcut.nrw", half: true },
      { key: "hosting", label: "Hosting", type: "text", placeholder: "IONOS, Strato, unbekannt", half: true },
      { key: "cms", label: "Bestehendes System", type: "text", placeholder: "WordPress, Wix, keins", half: true },
      { key: "analytics", label: "Tracking / Analytics", type: "text", placeholder: "GA4, Matomo, keins", half: true },
      {
        key: "accessOwner",
        label: "Wer hat die Zugänge",
        type: "textarea",
        ask: "Wer kommt heute an Domain, Hosting und Postfach — Sie selbst oder jemand anderes?",
      },
    ],
  },
  {
    id: "rahmen",
    title: "Geld, Termin, Entscheidung",
    intro:
      "Erst hierhin, wenn der Umfang steht. Die drei Antworten entscheiden, ob ein Angebot Sinn ergibt.",
    fields: [
      { key: "budget", label: "Budgetrahmen (€ brutto)", type: "money", ask: "In welchem Rahmen bewegen wir uns?", half: true },
      {
        key: "budgetType",
        label: "Zahlungswunsch",
        type: "select",
        options: ["Einmalzahlung", "Ratenzahlung", "noch offen"],
        half: true,
      },
      { key: "deadline", label: "Wunschtermin", type: "date", half: true },
      { key: "occasion", label: "Anlass für den Termin", type: "text", placeholder: "Messe, Saisonstart, Eröffnung", half: true },
      {
        key: "decisionMaker",
        label: "Wer entscheidet",
        type: "text",
        ask: "Wer muss außer Ihnen noch zustimmen?",
        half: true,
      },
      {
        key: "decisionWhen",
        label: "Entscheidung bis",
        type: "date",
        half: true,
      },
      {
        key: "nextStep",
        label: "Nächster Schritt",
        type: "textarea",
        ask: "Was ist der nächste Schritt — und bis wann?",
        hint: "Der Satz, mit dem das Gespräch endet. Ohne ihn ist es ein nettes Gespräch gewesen.",
      },
    ],
  },
]

/**
 * Leitfaden für das Verkaufsgespräch.
 *
 * Nicht dasselbe wie das Onboarding, und deshalb ein eigener Satz Fragen: Im
 * Onboarding ist der Auftrag da und es geht um Umfang, Zugänge und Termine.
 * Im Verkaufsgespräch ist er es nicht — dort entscheidet sich, ob es überhaupt
 * ein Angebot gibt. Gefragt wird deshalb nach dem Schaden, nach dem, was ein
 * weiteres Jahr ohne Änderung kostet, nach dem Entscheidungsweg und nach dem
 * Einwand, der sonst erst nach dem Angebot kommt.
 *
 * Die Schlüssel überschneiden sich absichtlich mit dem Onboarding, wo sie
 * dasselbe meinen (`company`, `budget`, `decisionMaker`, `nextStep`). Wird aus
 * dem Verkaufsgespräch ein Auftrag, steht die Hälfte des Onboardings schon da.
 */
export const SALES_STEPS: OnboardingStep[] = [
  {
    id: "kontakt",
    title: "Wer sitzt gegenüber",
    intro:
      "Kurz halten. Wer im Verkaufsgespräch zehn Minuten Stammdaten aufnimmt, hat die Aufmerksamkeit verbraucht, bevor es um etwas geht.",
    fields: [
      { key: "company", label: "Firma", type: "text", ask: "Wie heißt das Unternehmen genau?", required: true, half: true },
      { key: "contactName", label: "Ansprechpartner", type: "text", ask: "Mit wem spreche ich?", required: true, half: true },
      { key: "role", label: "Rolle", type: "text", placeholder: "Inhaber, Marketing, Geschäftsführung", half: true },
      { key: "email", label: "E-Mail", type: "text", half: true },
      { key: "phone", label: "Telefon", type: "text", half: true },
      { key: "website", label: "Website", type: "text", half: true },
      { key: "city", label: "Ort", type: "text", half: true },
      { key: "industry", label: "Branche", type: "text", half: true },
      {
        key: "source",
        label: "Woher kommt der Kontakt",
        type: "select",
        options: ["Empfehlung", "Google", "Instagram", "LinkedIn", "Kaltakquise", "Netzwerk", "Bestandskunde", "Sonstiges"],
        half: true,
      },
    ],
  },
  {
    id: "lage",
    title: "Wie es heute läuft",
    intro:
      "Zahlen vor Meinungen. „Die Seite ist alt“ ist kein Grund, etwas zu kaufen — „von zwölf Anfragen im Monat sind zwei brauchbar“ ist einer.",
    fields: [
      {
        key: "currentSite",
        label: "Aktueller Stand",
        type: "textarea",
        ask: "Wie kommen heute Anfragen herein — und über welchen Weg die besten?",
        hint: "Wörtlich mitschreiben. Die Formulierung des Kunden ist später die Überschrift des Angebots.",
      },
      {
        key: "leadsPerMonth",
        label: "Anfragen pro Monat",
        type: "number",
        ask: "Wie viele Anfragen kommen in einem normalen Monat über die Website?",
        half: true,
      },
      {
        key: "dealValue",
        label: "Wert eines Auftrags (€)",
        type: "money",
        ask: "Was bringt ein durchschnittlicher Auftrag bei Ihnen ein?",
        hint: "Deckungsbeitrag, nicht Umsatz — danach fragen, wenn die Zahl zu rund klingt.",
        half: true,
      },
      {
        key: "closeRate",
        label: "Wie viele davon werden Kunde (%)",
        type: "number",
        placeholder: "30",
        half: true,
      },
      {
        key: "manualHours",
        label: "Stunden pro Woche für Wiederkehrendes",
        type: "number",
        ask: "Wie viel Zeit geht pro Woche für Dinge drauf, die jede Woche gleich sind?",
        half: true,
      },
    ],
  },
  {
    id: "schmerz",
    title: "Was es kostet, nichts zu tun",
    intro:
      "Der Teil, den die meisten überspringen. Ohne ihn verkauft man einen Preis; mit ihm eine Rechnung.",
    fields: [
      {
        key: "pain",
        label: "Was heute konkret schiefgeht",
        type: "textarea",
        ask: "Was ist zuletzt schiefgegangen, weil der Auftritt so ist, wie er ist?",
      },
      {
        key: "costOfInaction",
        label: "Folgen bei unverändertem Zustand",
        type: "textarea",
        ask: "Wenn wir heute nichts ändern — wo stehen Sie dann in zwölf Monaten?",
        hint: "Die Antwort in Zahlen zurückspiegeln und bestätigen lassen, statt sie später zu schätzen.",
      },
      {
        key: "triedBefore",
        label: "Was schon versucht wurde",
        type: "textarea",
        ask: "Was haben Sie schon probiert — und woran ist es gescheitert?",
        hint: "Verhindert, dass man genau das anbietet, was letztes Jahr nicht funktioniert hat.",
      },
      {
        key: "goals",
        label: "Woran der Erfolg gemessen wird",
        type: "textarea",
        ask: "Woran würden Sie in einem Jahr merken, dass sich das gelohnt hat?",
      },
    ],
  },
  {
    id: "entscheidung",
    title: "Wer entscheidet und wie",
    intro:
      "Wer das nicht klärt, schickt ein Angebot an jemanden, der es nur weiterleiten kann.",
    fields: [
      { key: "budget", label: "Budgetrahmen (€ brutto)", type: "money", ask: "In welchem Rahmen bewegen wir uns?", half: true },
      {
        key: "budgetType",
        label: "Zahlungswunsch",
        type: "select",
        options: ["Einmalzahlung", "Ratenzahlung", "noch offen"],
        half: true,
      },
      { key: "decisionMaker", label: "Wer entscheidet", type: "text", ask: "Wer muss außer Ihnen noch zustimmen?", half: true },
      { key: "decisionWhen", label: "Entscheidung bis", type: "date", half: true },
      { key: "deadline", label: "Wunschtermin", type: "date", half: true },
      { key: "occasion", label: "Anlass für den Termin", type: "text", placeholder: "Messe, Saisonstart, Eröffnung", half: true },
      {
        key: "competitors",
        label: "Wer sonst noch anbietet",
        type: "textarea",
        ask: "Mit wem sprechen Sie sonst noch?",
      },
    ],
  },
  {
    id: "abschluss",
    title: "Einwände und nächster Schritt",
    intro:
      "Einwände gehören ins Gespräch, nicht in die Antwortmail auf das Angebot. Was hier steht, beantwortet das Angebot von selbst.",
    fields: [
      {
        key: "objections",
        label: "Genannte Einwände",
        type: "textarea",
        ask: "Was spricht aus Ihrer Sicht dagegen, das zu machen?",
        hint: "Wörtlich mitschreiben. Jeder Einwand wird im Angebot zu einer Klausel oder einem Absatz.",
      },
      {
        key: "riskConcerns",
        label: "Sorgen und Vorbehalte",
        type: "textarea",
        ask: "Was müsste passieren, damit Sie das im Nachhinein bereuen?",
      },
      {
        key: "scopeNotes",
        label: "Zugesagt oder ausgeschlossen",
        type: "textarea",
        hint: "Was im Gespräch versprochen wurde — und was ausdrücklich nicht dazugehört.",
      },
      {
        key: "nextStep",
        label: "Nächster Schritt",
        type: "textarea",
        ask: "Was ist der nächste Schritt — und bis wann?",
        hint: "Der Satz, mit dem das Gespräch endet. Ohne ihn ist es ein nettes Gespräch gewesen.",
      },
    ],
  },
]

/** Onboarding oder Verkaufsgespräch — bestimmt Leitfaden und Auswertung. */
export type SessionKind = "onboarding" | "sales"

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  onboarding: "Onboarding",
  sales: "Verkaufsgespräch",
}

export function stepsFor(kind: SessionKind | undefined): OnboardingStep[] {
  return kind === "sales" ? SALES_STEPS : ONBOARDING_STEPS
}

export function fieldsFor(kind: SessionKind | undefined): OnboardingField[] {
  return stepsFor(kind).flatMap((s) => s.fields)
}

export const ONBOARDING_FIELDS: OnboardingField[] = ONBOARDING_STEPS.flatMap((s) => s.fields)

export function fieldByKey(key: string, kind?: SessionKind): OnboardingField | undefined {
  // Über `fieldsFor`, nicht über die Onboarding-Liste: sonst gilt jeder
  // Schlüssel des Verkaufsleitfadens als unbekannt.
  return fieldsFor(kind).find((f) => f.key === key)
}

export type Answers = Record<string, string | string[]>

/** Wert als Text — Mehrfachauswahlen kommagetrennt. */
export function answerText(a: Answers, key: string): string {
  const v = a[key]
  if (Array.isArray(v)) return v.join(", ")
  return (v ?? "").toString().trim()
}

export function answerList(a: Answers, key: string): string[] {
  const v = a[key]
  return Array.isArray(v) ? v.filter(Boolean) : v ? [String(v)] : []
}

/** Anteil beantworteter Felder — grob, aber ehrlich: leere Felder zählen nicht. */
export function completeness(a: Answers, kind?: SessionKind): number {
  const fields = fieldsFor(kind)
  const filled = fields.filter((f) => answerText(a, f.key)).length
  return Math.round((filled / fields.length) * 100)
}

export function missingRequired(a: Answers, kind?: SessionKind): string[] {
  return fieldsFor(kind)
    .filter((f) => f.required && !answerText(a, f.key))
    .map((f) => f.label)
}

/** Kurztitel der Sitzung — Firma, sonst Ansprechpartner, sonst Datum. */
export function sessionLabel(s: OnboardingSession): string {
  return (
    answerText(s.answers, "company") ||
    answerText(s.answers, "contactName") ||
    `Gespräch vom ${new Date(s.createdAt).toLocaleDateString("de-DE")}`
  )
}

// ── Ableitungen in die Module ───────────────────────────────────────────────

export function toCustomer(a: Answers): Partial<Customer> {
  const tags = [answerText(a, "industry"), answerText(a, "source")].filter(Boolean)
  return {
    company: answerText(a, "company"),
    contactName: answerText(a, "contactName"),
    email: answerText(a, "email"),
    phone: answerText(a, "phone") || undefined,
    website: answerText(a, "website") || undefined,
    city: answerText(a, "city") || undefined,
    tags: tags.length ? tags : ["Lead"],
    health: "lead",
    notes: briefSummary(a),
  }
}

export function toDeal(a: Answers, customerId: string, owner?: string): Partial<Deal> {
  const gross = money(a, "budget")
  const services = answerList(a, "services")
  return {
    title: services.length
      ? `${services.slice(0, 2).join(" & ")} — ${answerText(a, "company")}`
      : `Vorhaben — ${answerText(a, "company")}`,
    customerId,
    stage: "qualified",
    // Der Deal führt Nettowerte; genannt wird im Gespräch fast immer brutto.
    value: gross ? Math.round(gross / 1.19) : 0,
    probability: 30,
    owner: owner ?? "",
    expectedClose: answerText(a, "decisionWhen") || answerText(a, "deadline") || undefined,
    notes: briefSummary(a),
  }
}

/**
 * Positionen für ein erstes Angebot. Bewusst eine Position mit Teilleistungen
 * statt einer erfundenen Phasenkalkulation: der genannte Rahmen ist ein
 * Rahmen, keine Kalkulation. Die Feinaufteilung macht danach die KI oder du.
 */
export function toQuoteItems(a: Answers, taxRate = 0.19): LineItem[] {
  const gross = money(a, "budget")
  const net = gross ? Math.round((gross / (1 + taxRate)) * 100) / 100 : 0
  const services = answerList(a, "services")
  const features = answerList(a, "features")
  const pages = answerText(a, "pages")
  const details = [
    pages ? `${pages} eigenständige Seiten` : "",
    ...services.filter((s) => s !== "Pflege & Betreuung"),
    ...features,
  ].filter(Boolean)

  return [
    {
      id: nanoid(6),
      description:
        services.length > 0
          ? `${services.filter((s) => s !== "Pflege & Betreuung").join(", ")} für ${answerText(a, "company")}`
          : `Vorhaben ${answerText(a, "company")}`,
      note: answerText(a, "goals") || undefined,
      details: details.length ? details : undefined,
      unit: "Pauschal",
      qty: 1,
      unitPrice: net,
      taxRate,
    },
  ]
}

/**
 * Genannter Betrag als Zahl — „2.000", „2000 €", „ca. 2000" ergeben 2000.
 *
 * Über `parseDE`, nicht über ein eigenes Ersetzen: die frühere Fassung strich
 * alle Punkte, bevor sie das Komma umsetzte. Aus „1500.50" — was vom
 * Ziffernblock, aus der Zwischenablage oder von der KI kommt — wurde damit
 * 150050. Die Zahl stand danach unbemerkt im Deal und in der Schadensrechnung.
 */
export function money(a: Answers, key: string): number {
  const raw = answerText(a, key).replace(/[^\d,.-]/g, "")
  if (!raw) return 0
  const n = parseDE(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * Das Protokoll als Fließtext — für Kundennotiz, Deal-Vermerk und als
 * Kontext für die KI. Leere Felder fallen weg, sonst steht in jeder Notiz
 * eine Liste von Gedankenstrichen.
 */
export function briefText(a: Answers, kind?: SessionKind): string {
  const blocks = stepsFor(kind).map((step) => {
    const lines = step.fields
      .map((f) => {
        const v = answerText(a, f.key)
        return v ? `- ${f.label}: ${v}` : ""
      })
      .filter(Boolean)
    return lines.length ? `## ${step.title}\n${lines.join("\n")}` : ""
  }).filter(Boolean)
  return blocks.join("\n\n")
}

/**
 * Das Gespräch in zwei, drei Sätzen — für Kundennotiz, Deal-Vermerk und
 * Projektbeschreibung.
 *
 * Vorher stand dort `briefText`, also das vollständige Frage-Antwort-Protokoll.
 * In der Projektakte, der Kundenakte und im Deal las man damit dreimal
 * dieselbe Liste aus fünf Überschriften und zwanzig Gedankenstrichen — an
 * Stellen, an denen man wissen will, worum es geht, nicht, welche Fragen
 * gestellt wurden. Das Protokoll bleibt vollständig in der Gesprächsakte;
 * hierher kommt nur die Zusammenfassung. Leere Angaben fallen weg, statt als
 * „—" mitgeschleppt zu werden.
 */
export function briefSummary(a: Answers): string {
  const sentences: string[] = []

  const industry = answerText(a, "industry")
  const city = answerText(a, "city")
  const wer = [industry, city ? `in ${city}` : ""].filter(Boolean).join(" ")
  if (wer) sentences.push(`${wer}.`)

  const stand = answerText(a, "currentSite")
  if (stand) sentences.push(`Ausgangslage: ${trimSentence(stand)}`)

  // Nur im Verkaufsgespräch belegt — im Onboarding fehlen die Schlüssel und
  // die Sätze fallen weg, statt als Leerzeile mitzulaufen.
  const pain = answerText(a, "pain")
  if (pain) sentences.push(`Schmerzpunkt: ${trimSentence(pain)}`)
  const objections = answerText(a, "objections")
  if (objections) sentences.push(`Einwände: ${trimSentence(objections)}`)

  const ziel = answerText(a, "goals")
  if (ziel) sentences.push(`Ziel: ${trimSentence(ziel)}`)

  // Umfang als ein Satz: Leistungen, Seitenzahl, Funktionen. Die volle
  // Aufzählung steht im Protokoll — hier reicht, was den Umfang umreißt.
  const services = answerList(a, "services")
  const pages = answerText(a, "pages")
  const umfang = [
    services.length ? services.join(", ") : "",
    pages ? `${pages} Seiten` : "",
  ].filter(Boolean)
  if (umfang.length) sentences.push(`Vorhaben: ${umfang.join(" · ")}.`)

  const budget = answerText(a, "budget")
  const deadline = answerText(a, "deadline")
  const rahmen = [
    budget ? `Rahmen ${budget} € brutto` : "",
    deadline ? `Wunschtermin ${deadline}` : "",
  ].filter(Boolean)
  if (rahmen.length) sentences.push(`${rahmen.join(", ")}.`)

  const next = answerText(a, "nextStep")
  if (next) sentences.push(`Nächster Schritt: ${trimSentence(next)}`)

  return sentences.join(" ")
}

/** Ein Satz aus einer Freitextantwort — mit Punkt, ohne Roman. */
function trimSentence(text: string): string {
  const one = text.replace(/\s+/g, " ").trim()
  const cut = one.length > 180 ? `${one.slice(0, 177).trimEnd()}…` : one
  return /[.!?…]$/.test(cut) ? cut : `${cut}.`
}

/**
 * Ein Satz je Leistung — die Standardformulierung der Agentur. Er landet in
 * der Kurzübersicht des Angebots, damit dort nicht nur Schlagworte stehen.
 * Bewusst allgemein gehalten: was im konkreten Fall dazugehört, schreibt das
 * Angebot, nicht dieses Wörterbuch.
 */
export const SERVICE_BLURB: Record<string, string> = {
  "Website neu": "Vollständiger Webauftritt — Struktur, Design, Inhalte und Livegang",
  Relaunch: "Bestehende Website neu aufgebaut statt nachgebessert",
  Onlineshop: "Produkte, Warenkorb und Zahlung im eigenen Auftritt",
  Landingpage: "Eine Seite für ein Ziel — Kampagne, Angebot oder Aktion",
  "Marke & Logo": "Erscheinungsbild mit Logo, Farben und Schriften",
  Texte: "Inhalte neu verfasst, auf Suche und Lesbarkeit gearbeitet",
  "Bilder & Aufbereitung": "Bildmaterial ausgewählt, freigestellt und für das Web optimiert",
  "SEO / GEO": "Technische Grundlagen, strukturierte Daten und lokale Signale",
  "KI-Automatisierung": "Wiederkehrende Abläufe automatisiert statt von Hand erledigt",
  "Pflege & Betreuung": "Laufende Updates, Sicherung und Änderungen nach dem Livegang",
}

/** Kurzübersicht fürs Angebot — nur Leistungen, zu denen es etwas zu sagen gibt. */
export function toQuoteSummary(a: Answers): { k: string; v: string }[] {
  const rows: { k: string; v: string }[] = []
  const pages = answerText(a, "pages")
  if (pages)
    rows.push({
      k: `${pages} eigene Seiten`,
      v: "je mit eigenem Inhalt, eigener Struktur und eigener Auffindbarkeit",
    })
  for (const s of answerList(a, "services")) {
    const v = SERVICE_BLURB[s]
    if (v) rows.push({ k: s, v })
  }
  const features = answerList(a, "features")
  if (features.length)
    rows.push({ k: "Funktionen", v: features.join(", ") })
  return rows.slice(0, 6)
}
