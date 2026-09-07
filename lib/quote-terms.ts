import type { LineItem, PaymentTerms } from "./types"
import { computeTotals, eur } from "./format"

/**
 * Zahlungsmodelle für ein neues Angebot.
 *
 * Vorher hatte ein frisch angelegtes Angebot gar kein `payment` — die zweite
 * Seite trug dann die Überschrift „Zwei Zahlungsmodelle" über einer leeren
 * Fläche. Zwei Modelle sind außerdem die Ausnahme, nicht die Regel: der
 * Normalfall ist die direkte Zahlung. Ratenzahlung wird nur angeboten, wenn
 * sie bewusst angekreuzt wird — ein Vorhaben, das monatlich abgestottert
 * wird, bindet Geld über ein Jahr und verschiebt das Ausfallrisiko auf uns.
 */
export type PaymentModel = "direct" | "deposit" | "milestones" | "installments"

export const PAYMENT_MODEL_LABEL: Record<PaymentModel, string> = {
  direct: "Direktzahlung — voller Betrag nach Rechnungsstellung",
  deposit: "Anzahlung und Restzahlung",
  milestones: "Nach Fortschritt — 40 / 30 / 30 %",
  installments: "Ratenzahlung (nur auf Wunsch)",
}

export interface PaymentOptions {
  model: PaymentModel
  /** Zahlungsziel in Tagen — aus den Einstellungen. */
  termsDays: number
  /** Anteil der Anzahlung in Prozent (nur `deposit`). */
  depositPct?: number
  /** Laufzeit der Ratenzahlung in Monaten (nur `installments`). */
  months?: number
  /** §19 UStG — dann steht keine Steuerzeile in der Rechnung. */
  smallBusiness?: boolean
}

/**
 * Netto, Umsatzsteuer, Brutto als Zeilenblock — der nachvollziehbare Teil.
 *
 * Der Steuersatz kommt aus den Positionen und steht nicht fest im Text: bei
 * 7 % stünde sonst „zzgl. 19 % USt." über einem Betrag, der mit 7 % gerechnet
 * ist. Bei mehreren Sätzen im selben Beleg wird nur „zzgl. Umsatzsteuer"
 * geschrieben — die Aufschlüsselung steht auf der Rechnung.
 */
function moneyRows(
  net: number,
  tax: number,
  gross: number,
  smallBusiness: boolean,
  label: string,
  rates: number[] = [],
) {
  const rows: NonNullable<PaymentTerms["tables"]>[number]["rows"] = [
    { k: "Nettobetrag", v: eur(net) },
  ]
  if (!smallBusiness && tax > 0) {
    const label =
      rates.length === 1
        ? `zzgl. ${Math.round(rates[0] * 100)} % USt.`
        : "zzgl. Umsatzsteuer"
    rows.push({ k: label, v: eur(tax) })
  }
  rows.push({ k: label, v: eur(gross), strong: true })
  return rows
}

/** Beschriftung der Summenzeile — „brutto" ist ohne Steuerausweis irreführend. */
function totalLabel(smallBusiness: boolean, tax: number): string {
  return smallBusiness || tax <= 0 ? "Gesamtbetrag" : "Gesamt brutto"
}

/** Cent-genau runden — sonst summieren sich Raten auf 0,01 € neben den Preis. */
function cents(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Zahlungsplan aus den Positionen des Angebots rechnen.
 *
 * Die Beträge kommen aus den Positionen, nicht aus einer zweiten Eingabe:
 * eine Zahlungsseite, die eine andere Summe trägt als der Preisblock, ist
 * schlimmer als gar keine. Die letzte Rate trägt die Rundungsdifferenz, damit
 * die Teilbeträge exakt den Gesamtbetrag ergeben.
 */
export function buildPayment(items: LineItem[], opts: PaymentOptions): PaymentTerms | undefined {
  const totals = computeTotals(items)
  const { net, tax, gross } = totals
  if (gross <= 0) return undefined
  const small = !!opts.smallBusiness
  const days = opts.termsDays
  const rates = totals.taxBreakdown.map((t) => t.rate)
  const sum = totalLabel(small, tax)

  if (opts.model === "direct") {
    return {
      // Nicht „Zahlung": darüber steht bereits die Marginalie „Zahlung", und
      // zweimal dasselbe Wort untereinander liest sich wie ein Fehler.
      title: "Festpreis in einer Rechnung",
      intro: `Der Festpreis wird nach Abnahme in einer Rechnung gestellt und ist innerhalb von ${days} Tagen ohne Abzug fällig.`,
      cards: [{ head: eur(gross), when: `Fällig ${days} Tage nach Rechnungsstellung` }],
      // Zwei Karten statt einer: die Zahlungsseite ist zweispaltig gesetzt,
      // eine einzelne Karte stünde als halbes Blatt da. Die zweite Karte
      // erfindet nichts, sie schreibt den Ablauf aus, der sonst nur im
      // Einleitungssatz steht.
      tables: [
        {
          title: "Festpreis",
          sub: "Eine Rechnung nach Abnahme — keine Teilbeträge, keine Laufzeit.",
          rows: moneyRows(net, tax, gross, small, "Rechnungsbetrag", rates),
          foot: `Zahlbar innerhalb von ${days} Tagen nach Rechnungsdatum ohne Abzug. Die Bankverbindung steht auf der Rechnung.`,
        },
        {
          title: "Ablauf",
          sub: "Wann welcher Betrag fällig wird.",
          rows: [
            { k: "Bei Beauftragung", v: "keine Zahlung" },
            { k: "Nach Abnahme", v: eur(gross), strong: true },
            { k: "Zahlungsziel", v: `${days} Tage` },
          ],
          foot: "Keine Anzahlung, keine Raten, keine Bearbeitungsgebühr. Zusätzliche Wünsche werden vorher abgestimmt und gesondert angeboten.",
        },
      ],
    }
  }

  if (opts.model === "deposit") {
    const raw = Math.round(opts.depositPct ?? 50)
    const pct = Number.isFinite(raw) ? Math.min(90, Math.max(10, raw)) : 50
    const depositGross = cents((gross * pct) / 100)
    const restGross = cents(gross - depositGross)
    const depositNet = cents((net * pct) / 100)
    const restNet = cents(net - depositNet)
    return {
      title: "Zahlung in zwei Schritten",
      intro: `Die Anzahlung wird mit der Beauftragung fällig, der Rest nach Abnahme. Beide Beträge sind jeweils innerhalb von ${days} Tagen ohne Abzug zu zahlen.`,
      cards: [
        { head: eur(gross), when: sum },
        {
          head: `${eur(depositGross)} bei Beauftragung`,
          value: `${eur(restGross)} nach Abnahme`,
          label: `Anzahlung ${pct} %`,
          when: "",
        },
      ],
      tables: [
        {
          title: `Anzahlung · ${pct} %`,
          sub: "Fällig mit der Beauftragung — danach beginnt die Arbeit.",
          rows: moneyRows(depositNet, cents(depositGross - depositNet), depositGross, small, "Anzahlung gesamt", rates),
        },
        {
          title: `Restzahlung · ${100 - pct} %`,
          sub: "Fällig nach Abnahme der fertigen Leistung.",
          rows: moneyRows(restNet, cents(restGross - restNet), restGross, small, "Restzahlung gesamt", rates),
        },
      ],
      // § 14 Abs. 5 UStG: Die Anzahlung wird als Anzahlungsrechnung mit
      // ausgewiesener Steuer gestellt; die Schlussrechnung muss sie samt der
      // darauf entfallenden Steuer absetzen. Ohne diesen Satz weist der Beleg
      // die Steuer zweimal aus — § 14c Abs. 1 UStG.
      note: `Beide Rechnungen sind innerhalb von ${days} Tagen ohne Abzug fällig. Die Anzahlung wird als Anzahlungsrechnung mit ausgewiesener Umsatzsteuer gestellt; die Schlussrechnung weist den Gesamtbetrag aus und setzt die bereits berechnete Anzahlung einschließlich der darauf entfallenden Umsatzsteuer ab.`,
    }
  }

  if (opts.model === "milestones") {
    const shares = [0.4, 0.3, 0.3]
    const labels = ["Beauftragung", "Zwischenstand", "Abnahme"]
    const grossParts = shares.map((s) => cents(gross * s))
    grossParts[2] = cents(gross - grossParts[0] - grossParts[1])
    return {
      title: "Zahlung nach Fortschritt",
      intro:
        "Der Festpreis wird in drei Rechnungen gestellt: bei Beauftragung, beim vereinbarten Zwischenstand und nach Abnahme.",
      cards: [
        { head: eur(gross), when: sum },
        {
          head: "40 / 30 / 30 %",
          value: grossParts.map((g) => eur(g)).join(" · "),
          label: "Zahlung nach Fortschritt",
          when: "",
        },
      ],
      tables: [
        {
          title: "Zahlungsplan",
          sub: "Drei Rechnungen, an den Projektfortschritt gebunden.",
          rows: [
            ...labels.flatMap((l, i) => [
              { k: `${i + 1}. ${l} · ${Math.round(shares[i] * 100)} %`, v: eur(grossParts[i]), strong: true },
            ]),
            { k: sum, v: eur(gross), strong: true, rule: true },
          ],
          foot: `Jede Rechnung ist innerhalb von ${days} Tagen ohne Abzug fällig. Die Zahlungen vor Abnahme werden als Anzahlungsrechnungen gestellt; die Schlussrechnung setzt sie einschließlich der darauf entfallenden Umsatzsteuer ab.`,
        },
        {
          title: "Aufteilung",
          sub: "Netto und Umsatzsteuer des Gesamtbetrags.",
          rows: moneyRows(net, tax, gross, small, sum, rates),
        },
      ],
    }
  }

  // Ratenzahlung — bewusst als Ausnahme, deshalb der Hinweis auf die
  // Zinsfreiheit und die feste Laufzeit im Text.
  const rawMonths = Math.round(opts.months ?? 12)
  const months = Number.isFinite(rawMonths) ? Math.min(36, Math.max(2, rawMonths)) : 12
  const rate = cents(gross / months)
  const last = cents(gross - rate * (months - 1))
  return {
    title: `Ratenzahlung über ${months} Monate`,
    intro: `Der Festpreis wird auf ${months} gleich hohe Monatsraten verteilt, zinsfrei. Die erste Rate ist mit der Beauftragung fällig, jede weitere zum Monatsersten.`,
    cards: [
      { head: eur(gross), when: sum },
      {
        head: `${eur(rate)} monatlich`,
        value: `${months} Raten · zinsfrei`,
        label: `Ratenzahlung · ${months} Monate`,
        when: "",
      },
    ],
    tables: [
      {
        title: "Einmalzahlung",
        sub: "Eine Rechnung nach Abnahme.",
        rows: moneyRows(net, tax, gross, small, "Rechnungsbetrag", rates),
        foot: `Zahlbar innerhalb von ${days} Tagen ohne Abzug.`,
      },
      {
        title: `Ratenzahlung · ${months} Monate`,
        // Keine „monatliche Rechnung": eine Ratenzahlung ist eine Stundung,
        // keine Teilleistung. Die Steuer entsteht bei Sollversteuerung
        // vollständig mit der Leistung; monatliche Belege mit anteiligem
        // Steuerausweis wären ein doppelter Ausweis nach § 14c Abs. 1 UStG.
        sub: "Monatliche Zahlungsaufforderung ohne erneuten Steuerausweis, zinsfrei, keine Bearbeitungsgebühr.",
        rows: [
          { k: `${months - 1} × monatlich`, v: eur(rate), strong: true },
          { k: "letzte Rate", v: eur(last) },
          { k: sum, v: eur(gross), strong: true, rule: true },
        ],
        foot: "Die Rechnung wird nach Abnahme einmalig über den Gesamtbetrag mit ausgewiesener Umsatzsteuer gestellt. Die Monatsbeträge sind Teilzahlungen darauf und werden nicht erneut in Rechnung gestellt. Der Gesamtbetrag entspricht der Einmalzahlung — es fallen keine Zinsen und keine Gebühren an.",
      },
    ],
    // Nicht „bei Zahlungsverzug sofort alles fällig": ein Gesamtfälligstellen
    // schon bei irgendeinem Verzug hält der Inhaltskontrolle nach § 307 BGB
    // voraussichtlich nicht stand — sie gilt auch im B2B (§ 310 Abs. 1 BGB).
    // Angelehnt an den Rechtsgedanken des § 498 BGB: qualifizierter Verzug
    // plus Nachfrist.
    note: "Die Ratenzahlung setzt einen unterschriebenen Vertrag voraus. Gerät der Auftraggeber mit zwei aufeinanderfolgenden Raten ganz oder teilweise in Verzug und zahlt er den Rückstand nach schriftlicher Mahnung nicht innerhalb von 14 Tagen, wird der noch offene Restbetrag in einer Summe fällig.",
  }
}

/**
 * Standardkonditionen der kompakten Fassung.
 *
 * Ohne sie blieb die Konditionenseite leer oder trug die Fußnote der
 * Rechnung. Die Sätze sind bewusst kurz und verpflichtend formuliert — sie
 * stehen im Angebot, nicht im Vertrag, und müssen ohne Anwalt verständlich
 * sein. Was nicht passt, wird im Composer abgewählt oder umgeschrieben.
 */
export const DEFAULT_QUOTE_TERMS: { title: string; text: string }[] = [
  {
    title: "Preise",
    text: "Alle Preise verstehen sich netto zuzüglich der gesetzlichen Umsatzsteuer. Der genannte Preis ist ein Festpreis für den beschriebenen Umfang; zusätzliche Wünsche werden vorher schriftlich abgestimmt und gesondert angeboten.",
  },
  {
    title: "Gültigkeit",
    text: "Das Angebot gilt bis zum genannten Datum. Danach werden Umfang und Preis neu bewertet.",
  },
  {
    title: "Mitwirkung",
    text: "Inhalte, Bilder und Zugänge werden zu Projektbeginn bereitgestellt. Verzögert sich die Zulieferung, verschiebt sich der Termin entsprechend. Für die Rechte an gelieferten Texten und Bildern steht der Auftraggeber ein und stellt uns von Ansprüchen Dritter frei.",
  },
  {
    // § 640 Abs. 2 BGB: ohne Rügefrist und Abnahmefiktion bleibt die
    // Nachbesserungspflicht unbefristet offen.
    title: "Abnahme",
    text: "Nach Fertigstellung wird die Leistung gemeinsam durchgesehen. Abweichungen vom vereinbarten Umfang sind innerhalb von 14 Tagen schriftlich zu melden und werden ohne weitere Kosten behoben. Erfolgt in dieser Frist keine Meldung oder wird das Ergebnis in Betrieb genommen, gilt die Leistung als abgenommen.",
  },
  {
    // § 29 UrhG: das Urheberrecht selbst ist nicht übertragbar. Und § 31
    // Abs. 5 UrhG — was nicht ausdrücklich benannt ist, bleibt beim Urheber;
    // ohne Nennung von Bearbeitung und Weiterübertragung bekäme der
    // Auftraggeber beides nicht.
    title: "Nutzungsrechte",
    text: "Mit vollständiger Zahlung erhält der Auftraggeber am gelieferten Ergebnis ein ausschließliches, räumlich, zeitlich und inhaltlich unbeschränktes Nutzungsrecht einschließlich des Rechts zur Bearbeitung und zur Übertragung auf Dritte. Bis dahin ist die Nutzung nur widerruflich gestattet. An eingesetzten Fremdlizenzen sowie an allgemein verwendeten Werkzeugen und Bausteinen erhält der Auftraggeber ein einfaches Nutzungsrecht im Umfang des Projekts.",
  },
  {
    title: "Mängel und Haftung",
    text: "Für Mängel gilt die gesetzliche Verjährung. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit; bei einfacher Fahrlässigkeit nur für die Verletzung wesentlicher Vertragspflichten und der Höhe nach begrenzt auf den vertragstypischen, vorhersehbaren Schaden.",
  },
  {
    title: "Zahlung und Verzug",
    text: "Rechnungen sind ohne Abzug zur genannten Frist fällig. Bei Verzug gelten die gesetzlichen Verzugszinsen sowie die Pauschale nach § 288 Abs. 5 BGB.",
  },
  {
    title: "Datenschutz",
    text: "Werden personenbezogene Daten im Auftrag verarbeitet, wird vor Projektbeginn eine Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen.",
  },
  {
    title: "Referenznennung",
    text: "Wir dürfen das Projekt als Referenz nennen und zeigen. Der Auftraggeber kann dem jederzeit widersprechen.",
  },
]

/** Was mit der Zusage mitkommen muss — Stichpunkte des Beauftragungsblocks. */
export const DEFAULT_ORDER_ITEMS: { k: string; v?: string }[] = [
  { k: "Freigabe", v: "Kurze schriftliche Zusage per E-Mail genügt." },
  { k: "Rechnungsanschrift", v: "Firmierung, Anschrift und USt-IdNr., falls vorhanden." },
  { k: "Zugänge", v: "Domain, Hosting und Postfach — oder wer sie verwaltet." },
  { k: "Inhalte", v: "Texte, Bilder und Logo in der höchsten vorhandenen Auflösung." },
]

export const DEFAULT_ORDER_FOOT =
  "Nach der Zusage folgt der Terminplan mit den verbindlichen Zwischenständen."
