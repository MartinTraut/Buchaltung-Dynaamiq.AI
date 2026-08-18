import type {
  Database,
  Customer,
  Deal,
  Project,
  Invoice,
  Quote,
  Transaction,
  Activity,
  Task,
  Template,
  EmailDraft,
  CompanySettings,
  LineItemTask,
} from "./types"

const now = new Date()
const iso = (daysAgo: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}
const isoIn = (days: number) => iso(-days)

// ============================================================
// Echte Stammdaten — DYNAAMIQ AI / Martin Traut
// ============================================================

const settings: CompanySettings = {
  name: "DYNAAMIQ AI",
  legalName: "Martin Traut · DYNAAMIQ AI — Webdesign & KI-Automatisierung",
  email: "rechnung@dynaamiq.ai",
  phone: "+49 1525 2694377",
  website: "dynaamiq.ai",
  address: "Graf-von-Düren-Straße 31",
  city: "Neuenstadt am Kocher",
  zip: "74196",
  country: "Deutschland",
  vatId: "DE366566010",
  taxNumber: "",
  iban: "DE78 1001 1001 2306 8288 39",
  bic: "",
  bankName: "",
  management: "Martin Traut",
  ownerName: "Martin Traut",
  smallBusiness: false,
  reminderFee: 5,
  defaultTaxRate: 0.19,
  invoicePrefix: "2026",
  quotePrefix: "AN-2026",
  nextInvoiceNo: 432,
  nextQuoteNo: 513,
  paymentTermsDays: 14,
  invoiceFooter:
    "Vielen Dank für die Zusammenarbeit. Zahlbar innerhalb von 14 Tagen ohne Abzug.",
}

// ============================================================
// Echte Kunden
// ============================================================

const customers: Customer[] = [
  {
    id: "c1",
    company: "Hospital Equipment",
    contactName: "Enes Türedi",
    email: "",
    phone: "",
    website: "hospital-equipment.de",
    address: "Lindenweg 30",
    city: "Igersheim",
    zip: "97999",
    country: "Deutschland",
    customerNumber: "K-1004",
    tags: ["Medizintechnik", "Website", "Betreuung"],
    // Zerstrittener Altkunde: Leistung erbracht, Preis abgelehnt, nichts
    // übergeben, nichts gezahlt (siehe stornierte Rechnung 2026-431).
    // Bleibt als Historie erhalten, zählt aber nicht mehr als aktiv.
    health: "churned",
    createdAt: iso(4),
  },
  {
    id: "c2",
    company: "SKOPE E-Scooter Fachwerkstatt",
    contactName: "Thomas Zielke",
    email: "",
    phone: "",
    website: "",
    address: "Im Kampfrad 3",
    city: "Neuenstadt am Kocher",
    zip: "74196",
    country: "Deutschland",
    customerNumber: "K-1005",
    tags: ["E-Mobilität", "Website", "Warenwirtschaft", "Shopify"],
    health: "active",
    createdAt: "2026-08-09T09:00:00.000Z",
  },
]

const deals: Deal[] = [
  {
    id: "d-skope",
    title: "SKOPE — Digitalisierung Gesamtpaket",
    customerId: "c2",
    stage: "proposal",
    value: 16000,
    probability: 60,
    owner: "Martin Traut",
    expectedClose: "2026-09-13T10:00:00.000Z",
    notes:
      "Zwei Pakete zum Regelsatz 80 €/Std.: Paket 1 Website, Marke & Verkaufskanal (81,25 Std. = 6.500 €, nach Nachlass 5.000 €), Paket 2 System & Automatisierung (175,75 Std. = 14.060 €, nach Nachlass 11.000 €). Zusammen 257 Std. = 20.560 € zum Regelsatz, abzüglich 4.560 € Nachlass = 16.000 € netto. Paket 1 einzeln beauftragbar, Paket 2 setzt darauf auf. Das Angebot ist der Überblick; abgerechnet wird paketweise mit je eigener Rechnung bei Beauftragung. Pflege/Wartung nicht monatlich, sondern erfolgsabhängig: 15 % des provisionsrelevanten Deckungsbeitrags aus Geschäften, die durch die Website entstehen (Verkauf, Inspektion, Reparatur, Zubehör). Keine feste Monatspauschale.",
    createdAt: "2026-08-14T09:00:00.000Z",
  },
]

const projects: Project[] = [
  {
    id: "p-skope",
    name: "SKOPE — Website & Warenwirtschaft",
    customerId: "c2",
    status: "active",
    budget: 16000,
    // Noch nichts abgerechnet — Rechnungen entstehen paketweise bei Beauftragung.
    spent: 0,
    startDate: "2026-08-09T09:00:00.000Z",
    dueDate: "2026-11-30T18:00:00.000Z",
    color: "#00ffe6",
    description:
      "Paket 1 Website, Marke & Verkaufskanal (81,25 Std.) — Website steht, Logo, Shopify-Anbindung und Google-Unternehmensprofil offen. Paket 2 System & Automatisierung (175,75 Std.) nach Beauftragung.",
    dealId: "d-skope",
    createdAt: "2026-08-14T09:00:00.000Z",
  },
]

// Offene Punkte aus „Vor dem Versenden zu klären" (Abschnitt 10 der Kalkulation)
const tasks: Task[] = [
  {
    id: "t-skope-ust",
    projectId: "p-skope",
    title: "Umsatzsteuer-Zeile für SKOPE-Angebot prüfen",
    status: "todo",
    kind: "task",
    due: "2026-08-14T09:00:00.000Z",
  },
  {
    id: "t-skope-send",
    projectId: "p-skope",
    title: "Angebot AN-2026-512 an Thomas Zielke versenden",
    status: "todo",
    kind: "event",
    due: "2026-08-15T09:00:00.000Z",
    time: "10:00",
    endTime: "10:30",
  },
]

/** Regulärer Stundensatz — Grundlage der Kalkulation. Der Nachlass auf den
 *  Festpreis steht als eigene, abgezogene Position auf dem Beleg. */
const REGELSATZ = 80

/**
 * Paket 1 — 81,25 Std. × 80,00 € = 6.500,00 €, nach Nachlass 5.000,00 € netto.
 * Die Einzelwerte müssen die Positionsmenge ergeben, sonst widersprechen sich
 * Aufstellung und Preis auf demselben Blatt.
 */
const PAKET_1_AUFGABEN: LineItemTask[] = [
  {
    text: "Erscheinungsbild: neues Logo und Qualitätssiegel als eigene Vektorgrafiken, Farb- und Schriftsystem, Bildsprache, eigens programmierte Hintergrund-Animationen statt Baukasten-Effekten",
    hours: 12,
  },
  {
    text: "Website mit elf festen Seiten — Startseite, E-Scooter kaufen, Reparatur, Wartungsvertrag, Versicherung, Recycling, Über uns, Kontakt, Impressum, Datenschutz, AGB mit Widerruf — plus eigener Seite je Gerät mit Bildergalerie, technischem Datenblatt und Hinweis zur Betriebserlaubnis",
    hours: 28.25,
  },
  {
    text: "Verkaufsstrecke und Shopify-Anbindung: Kaufanfrage je Gerät mit vorbelegtem Modell, Empfehlung preisähnlicher Geräte; Shopify als Bestellkanal — Artikel, Preise, Bilder und Bestände abgeglichen, soweit die Schnittstelle das zulässt",
    hours: 14,
  },
  {
    text: "Google-Suche (SEO): Seitentitel, Überschriftenhierarchie, interne Verlinkung, Sitemap, Ladezeiten",
    hours: 7,
  },
  {
    text: "Umkreissuche und Google-Unternehmensprofil (Local SEO): Profil einrichten, Kategorien, Leistungen, Öffnungszeiten, Fotos, Bewertungsstrecke; Einzugsgebiet mit echten Fahrzeiten — Neuenstadt am Kocher, Heilbronn, Neckarsulm, Öhringen, Mosbach und Umgebung",
    hours: 7,
  },
  {
    text: "KI-Assistenten (AIEO): strukturierte Daten als verbundener Datengraph — Unternehmen, Leistungen, Preise, jedes Gerät als eigenes Produkt, Bewertungen; über 20 FAQ-Fragen in natürlicher Frageform auf den Leistungsseiten",
    hours: 5,
  },
  {
    text: "Anfragestrecke: ein Formularsystem auf sechs Seiten, Anliegen je Seite und Gerät vorbelegt, Spamschutz ohne Captcha, Zustellung per E-Mail und Ablage der Anfragen",
    hours: 4,
  },
  {
    text: "Rechtstexte, Barrierefreiheit und Messung auf allen Bildschirmbreiten; keine externen Dienste im Seitenaufruf — Karte, Schriften und Bewertungen selbst gehostet — mit dem Ziel, ohne Consent-Banner auszukommen, sofern im finalen Setup ausschließlich technisch erforderliche Technologien eingesetzt werden",
    hours: 4,
  },
]

/** Paket 2 — 175,75 Std. × 80,00 € = 14.060,00 €, nach Nachlass 11.000,00 € netto. */
const PAKET_2_AUFGABEN: LineItemTask[] = [
  {
    text: "Datenmodell und Vorgangslogik entlang des Werkstattablaufs (Ankauf, Prüfung, Instandsetzung, Einstellung, Reservierung, Verkauf, Storno, Rückgabe): jedes Gerät als Einzelstück mit eigener Geräte- und Rahmennummer, getrennte Statusebenen für Werkstatt, Verkauf und Kanäle; Sperren gegen Doppelverkauf bei gleichzeitigem Zugriff, unveränderliches Änderungsprotokoll je Datensatz, versionierte Datenbankänderungen",
    hours: 28,
  },
  {
    text: "Bedienoberfläche für Telefon und Computer: erfassen, fotografieren, hochladen (auch iPhone-Bildformate), per Ziehen sortieren, Preis und Zustand pflegen; Arbeitslisten je Prozessschritt — Wareneingang, Prüfung mit 12-Punkte-Protokoll, Aufbereitung; Akkuzustand, Zulassungsstatus, Suche und Filter über den Bestand",
    hours: 34,
  },
  {
    text: "Abgleich der angebundenen Kanäle: Website und System vollständig verbunden, Shopify automatisch über die offizielle Schnittstelle, Kleinanzeigen halbautomatisch. Veröffentlicht wird erst nach festen Freigaberegeln (Prüfung abgeschlossen, keine offenen Reparaturen, Betriebserlaubnis dokumentiert, Bilder vorhanden). Jede Änderung läuft über eine Warteschlange mit Wiederholung bei Störungen, Schutz gegen Doppelbuchungen, Prüfung der Rückmeldungen, Einhaltung der Anfragegrenzen und vollständigem Protokoll",
    hours: 25,
  },
  {
    text: "Bildverarbeitung: Ableitungen je Kanalformat beim Hochladen, Zuschnitt, Verkleinerung, Reihenfolge, Wasserzeichen, moderne Bildformate; Verarbeitung im Hintergrund",
    hours: 16,
  },
  {
    text: "KI-Automatisierungen: Geräte- und Anzeigentexte aus den erfassten Feldern, Vorsortierung eingehender Anfragen nach Anliegen und Dringlichkeit, Antwortvorschläge zur Freigabe. Nichts wird ohne Freigabe versendet; Vorlagen versioniert, Kosten je Aufruf gedeckelt",
    hours: 24,
  },
  {
    text: "Kleinanzeigen halbautomatisch: Überschrift, Beschreibung, Preisvorschlag und zugeschnittene Bilder auf Knopfdruck, Abgleich des Standorts jedes Geräts. Das Einstellen bleibt bewusst ein Klick von Hand, da automatisches Einstellen gegen die Nutzungsbedingungen verstößt",
    hours: 13,
  },
  {
    text: "Vorgangsliste und Auswertung: alle Anfragen aus Website, Shop und Kleinanzeigen in einer Liste mit Gerätebezug und Bearbeitungsstand; Bestand, Liegezeit, Verkäufe und Spanne je Zeitraum, Herkunft der Käufer (welche Werbung Kunden bringt), gebundenes Kapital je Prozessstufe; Umsatzliste automatisch nach Google Sheets",
    hours: 14,
  },
  {
    text: "Zugänge, Sicherung, Datenübernahme: Anmeldung und Rollen, tägliche Datensicherung, Übernahme vorhandener Geräte- und Lieferantenlisten per Import-Assistent mit Spaltenzuordnung und Dublettenprüfung, Bilder inklusive, Testlauf mit echten Vorgängen",
    hours: 10,
  },
  {
    text: "Livegang, zwei Schulungstermine, Kurzanleitung und technische Dokumentation",
    hours: 11.75,
  },
]

const invoices: Invoice[] = [
  {
    id: "inv-2026-431",
    number: "2026-431",
    customerId: "c1",
    // Ausgestellt und per WhatsApp versendet, danach Streit über den Preis.
    // Der Kunde hat weder gezahlt noch die Leistung erhalten — nichts wurde
    // übergeben, nichts veröffentlicht. Kein Zahlungseingang, kein Umsatz,
    // keine Einnahme. Der Beleg bleibt als storniert stehen, damit der
    // Nummernkreis lückenlos bleibt und nachvollziehbar ist, was passiert ist.
    status: "canceled",
    issueDate: "2026-07-07T10:00:00.000Z",
    dueDate: "2026-07-10T10:00:00.000Z",
    serviceDate: "2026-07-07T10:00:00.000Z",
    createdAt: "2026-07-07T10:00:00.000Z",
    pdfPath: "/rechnungen/Rechnung-2026-431-Website-Kalender.pdf",
    items: [
      { id: "p-web", description: "Website-Relaunch hospital-equipment.de — zweisprachige Katalog-Plattform, 539 Seiten, Geräte-/Sonden-/Ersatzteil-/Fehlermeldungs-Kataloge, Suchmaschinenoptimierung & strukturierte Daten, 736 aufbereitete Bilder, Kontakt & DSGVO", unit: "Paket", qty: 1, unitPrice: 7700, taxRate: 0.19 },
      { id: "p-kal", description: "Individualsoftware Wartungs- & Terminkalender (PWA) — eigenes, sicheres Backend mit geschütztem Login, Termine mit Prüfzyklen & Überfälligkeit, Kundenübersicht, Echtzeit-Synchronisation (2 Nutzer), Foto-/Datei-Doku, installierbar wie eine native App", unit: "Paket", qty: 1, unitPrice: 1500, taxRate: 0.19 },
      { id: "p-rab", description: "Paket- & Verhandlungsrabatt (Komplettpaket)", unit: "Rabatt", qty: 1, unitPrice: -2900, taxRate: 0.19 },
    ],
    notes: "Komplettpaket Website + Wartungskalender — regulär 9.200 € netto, verhandelter Paketpreis 6.300 € netto (Ersparnis 2.900 € / 32 %). Eigentums- und Rechtevorbehalt: Alle Nutzungs- und Verwertungsrechte an Website und Software gehen erst mit vollständiger Bezahlung auf den Auftraggeber über.\n\nSTORNIERT: Der Preis wurde erst nach Fertigstellung genannt und vom Auftraggeber abgelehnt; eine Preisvereinbarung kam nie zustande. Die Leistung wurde daraufhin nicht übergeben, es erfolgte kein Zahlungseingang. Forderung nicht weiterverfolgt.",
  },
]

const quotes: Quote[] = [
  {
    id: "quo-2026-043",
    number: "AN-2026-512",
    customerId: "c2",
    projectId: "p-skope",
    status: "draft",
    issueDate: "2026-08-14T10:00:00.000Z",
    validUntil: "2026-09-13T10:00:00.000Z",
    createdAt: "2026-08-14T10:00:00.000Z",
    items: [
      {
        id: "paket-1",
        description:
          "Paket 1 — Website, Marke und Verkaufskanal: Redesign mit neuem Logo, vollständiger Webauftritt mit eigener Seite je Gerät, Shopify-Anbindung, Optimierung der Auffindbarkeit für Google, die Umkreissuche und KI-Systeme, eingerichtetes Google-Unternehmensprofil. Betrieb und Pflege danach ohne monatliche Gebühr — siehe Anmerkungen",
        note: "Der Aufwand steckt weniger in den elf festen Seiten als darin, dass jedes Gerät eine eigene Seite bekommt, die sich aus dem Bestand füllt, und dass diese Seiten einzeln für Google, die Umkreissuche und KI-Systeme auffindbar aufgebaut sind. Wer das nachträglich anbaut, baut die Website ein zweites Mal.",
        details: PAKET_1_AUFGABEN,
        unit: "Std.",
        qty: 81.25,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-1-rabatt",
        description:
          "Nachlass auf Paket 1 — berechnet werden 5.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 5000 - 81.25 * REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-2",
        description:
          "Paket 2 — System und Automatisierung: eigene Warenwirtschaft für Geräte, Vorgänge und Anfragen, zentraler Bestands- und Vorgangsabgleich der angebundenen Verkaufskanäle im Rahmen der jeweils verfügbaren und zulässigen Schnittstellen, KI-gestützte Texterstellung und Anfragebearbeitung, Auswertung, Einführung und Übergabe",
        note: "Gebrauchte Geräte sind Einzelstücke: jedes mit eigener Rahmennummer, eigenem Zustand, eigenem Prüfprotokoll und Bestand 1. Standard-Warenwirtschaften rechnen mit Artikeln in Mengen; ein verkauftes Einzelstück muss dagegen auf allen Kanälen sofort verschwinden, sonst wird es ein zweites Mal verkauft. Genau dieser Fall — gleichzeitiger Zugriff, ausgefallene Verbindung mitten im Vorgang, Storno nach dem Abgleich — macht den Aufwand aus.",
        details: PAKET_2_AUFGABEN,
        unit: "Std.",
        qty: 175.75,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-2-rabatt",
        description:
          "Nachlass auf Paket 2 — berechnet werden 11.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 11000 - 175.75 * REGELSATZ,
        taxRate: 0.19,
      },
    ],
    valuation: {
      hours: 257,
      netAmount: 16000,
      benchmarks: [
        { label: "Mein Regelsatz ohne Nachlass", rate: 80 },
        { label: "Freelancer Web & Software", rate: 91 },
        { label: "Freelancer DACH, Schnitt", rate: 103 },
        { label: "Agentur", rate: 130 },
      ],
      reasons: [
        {
          title: "Unter dem eigenen Regelsatz",
          text: "257 Std. ergeben zum Regelsatz 20.560 €. Berechnet werden 16.000 € — marktübliche Sätze für Web- und Softwareentwicklung liegen bei etwa 91 bis 103 €/Std.",
          stat: "62 €",
          statLabel: "je Std.",
        },
        {
          title: "Ein Ansprechpartner",
          text: "Kein Agentur-Apparat, keine Weitergabe an Dritte: direkte Abstimmung, kurze Wege, ein Verantwortlicher.",
          stat: "1",
          statLabel: "Ansprechpartner",
        },
        {
          title: "Der Unterbau trägt alle Kanäle",
          text: "Datenmodell, Abgleichmotor und Bildverarbeitung werden einmal gebaut — Shopify und Kleinanzeigen sind danach dünne Anschlüsse.",
          stat: "3",
          statLabel: "Kanäle",
        },
        {
          title: "Erfolgsabhängig statt Fixkosten",
          text: "Eine Warenwirtschaft von der Stange kostet 150 bis 400 € monatlich, unbefristet. Hier fällt danach keine Grundgebühr an.",
          stat: "0 €",
          statLabel: "feste Pauschale",
        },
      ],
      sources: [
        {
          name: "freelancermap — Freelancer-Kompass 2026.",
          detail:
            "Größte Freelancer-Studie im DACH-Raum: Ø-Stundensatz aller Freelancer 103 €/h (Vorjahr 104 €/h), Software- und Webentwicklung 91 €/h.",
          link: "freelancermap.de/freelancer-kompass",
        },
        {
          name: "Gründerküche",
          detail:
            "(unabhängige Fachpresse) — Bericht zum Freelancer-Kompass 2026: Stundensätze erstmals seit Studienbeginn rückläufig, im Durchschnitt 103 Euro.",
          link: "gruenderkueche.de/news/freelancer-kompass-2026",
        },
        {
          name: "GULP / Randstad Professional",
          detail:
            "— Stundensatz-Analyse und -Kalkulator einer der größten IT-Projektplattformen (unabhängige Zweitquelle).",
          link: "gulp.de/freelancing/stundensatzkalkulator",
        },
      ],
      sourceNote:
        "Rechnerische Einordnung anhand marktüblicher Stundensätze, keine Zusicherung über Preise Dritter. Agentursätze (~130 €/h) sind Erfahrungswerte aus dem deutschen Markt.",
      bottomLine:
        "Zum Vergleich: 257 Std. entsprechen rechnerisch rund 23.100 € zu Freelancer-Sätzen und rund 33.400 € zu Agentursätzen. Beide Pakete zusammen kosten 16.000 € netto — 4.560 € unter der eigenen Kalkulation von 20.560 €.",
    },
    notes:
      "## Festpreis und Leistungsumfang\n\nPaket 1 kostet 5.000,00 € netto, Paket 2 kostet 11.000,00 € netto. Die Stundenangaben dienen der nachvollziehbaren Kalkulation — Sie kaufen keine Stunden, sondern den beschriebenen Leistungsumfang. Bleibt dieser unverändert, liegt das Risiko eines höheren tatsächlichen Aufwands bei uns.\n\nEnthalten sind ausschließlich die hier beschriebenen Funktionen. Was nach Auftragserteilung dazukommt, ist eine Zusatzleistung: Wir stimmen sie vorher ab, bieten sie separat an und setzen sie erst nach Ihrer Freigabe um. Ohne Freigabe entstehen keine zusätzlichen Kosten.\n\n## Wann Paket 1 fertig ist\n\nWebsite veröffentlicht und funktionsfähig, die vereinbarten Seiten umgesetzt, Darstellung auf Telefon, Tablet und Computer geprüft, Formulare stellen zu, Shopify-Anbindung im beschriebenen Umfang in Betrieb, SEO-Grundstruktur und strukturierte Daten eingebaut, Google-Unternehmensprofil eingerichtet beziehungsweise optimiert (sofern die Zugänge vorliegen), Kontakt- und Anfragewege getestet. Zum Abschluss läuft ein gemeinsamer Funktionstest.\n\n## Wann Paket 2 fertig ist\n\nWenn ein vollständiger Vorgang durchläuft: Gerät erfassen, Rahmennummer hinterlegen, Zustand und Prüfstatus dokumentieren, Bilder hochladen, Preis festlegen, Verkaufsinformationen erzeugen, Gerät auf den angebundenen Kanälen bereitstellen, Reservierung oder Verkauf erfassen, Bestand aktualisieren, Gerät gegen Doppelverkauf sperren, Vorgang protokollieren und Verkauf samt Spanne in der Auswertung sehen. Bei Kleinanzeigen erfolgt die Veröffentlichung wie beschrieben halbautomatisch.\n\n## Zeitrahmen und Mitwirkung\n\nPaket 1 rund 3 bis 5 Wochen ab Projektstart, Paket 2 rund 6 bis 10 weitere Wochen. Das sind Planwerte. Sie setzen voraus, dass Zugänge, Gerätedaten, Bilder, Rechtstexte und Freigaben rechtzeitig vorliegen; fehlende Zugänge oder Daten, ausstehende Freigaben, Änderungen am Leistungsumfang und Wartezeiten bei Drittanbietern verschieben den Zeitraum entsprechend.\n\n## Angebundene Kanäle und Drittanbieter\n\nWebsite und internes System sind vollständig verbunden. Shopify wird automatisch abgeglichen — Geräte, Artikeldaten, Preise, Bilder, Verfügbarkeit und Bestellungen, soweit die Schnittstelle das zulässt. Kleinanzeigen bleibt bewusst halbautomatisch: Titel, Beschreibung, Preis und zugeschnittene Bilder werden vorbereitet, veröffentlicht wird per Klick von Hand, weil automatisches Einstellen gegen die Nutzungsbedingungen verstößt.\n\nFunktionen, die von Shopify, Kleinanzeigen, Google oder KI-Anbietern abhängen, lassen sich nur im Rahmen der dort jeweils verfügbaren Schnittstellen und Nutzungsbedingungen umsetzen. Ändert ein Anbieter Schnittstelle, Bedingungen oder Funktionsumfang grundlegend, ist das keine Nichterfüllung unsererseits; größere Anpassungen daraus werden separat vereinbart.\n\n## Pflege und Betreuung statt Monatspauschale\n\nEs gibt keine feste monatliche Pflegegebühr. Stattdessen 15 % des provisionsrelevanten Deckungsbeitrags aus jedem Geschäft, das durch die Website entsteht. Kein Websitegeschäft, keine Vergütung.\n\nProvisionsrelevanter Deckungsbeitrag = Nettoerlös abzüglich direktem Einkaufspreis, zurechenbarem Material, zurechenbarer Instandsetzung und zurechenbaren Fremdleistungen. Für Reparatur, Inspektion, Wartung und Zubehör gilt dieselbe Rechnung. Beispiel: Gerät für 1.900,00 € verkauft, Einkauf und Instandsetzung 1.300,00 € — Deckungsbeitrag 600,00 €, Anteil 90,00 €.\n\nAls Websitegeschäft gilt ein Auftrag, wenn Kauf, Anfrage, Formular, Terminbuchung oder ein nachweisbarer Erstkontakt über die Website oder den angebundenen Shop eingegangen ist — auch dann, wenn daraus erst später ein bezahlter Auftrag wird. Laufkundschaft, Telefon, Kleinanzeigen und Bestandskunden ohne Website-Ursprung bleiben außen vor.\n\nEnthalten sind Betrieb der Anwendung, Fehlerbehebung, Sicherheitsaktualisierungen, technische Pflege, Überwachung der angebundenen Schnittstellen, Pflege der Automatisierungen, kleinere Anpassungen und Optimierungen sowie Unterstützung bei Störungen. Nicht enthalten sind neue Funktionen und Module, umfangreiche Redesigns und die Anbindung weiterer Anbieter — das sind eigene Projekte und werden separat angeboten.\n\nAbgerechnet wird monatlich nachträglich anhand der Geschäfte, die in diesem Monat zustande gekommen sind. Storniert ein Kunde oder gibt er zurück, wird der bereits berechnete Anteil mit der nächsten Rechnung gutgeschrieben. Die Laufzeit beträgt 12 Monate; danach ist die Vereinbarung mit drei Monaten Frist zum Monatsende kündbar.\n\n## Nutzungsrechte und Beauftragung\n\nMit vollständiger Zahlung gehen alle Nutzungsrechte an Quelltext, Gestaltung, Logo und erzeugten Grafiken an Sie über. Paket 1 ist einzeln beauftragbar, Paket 2 jederzeit nachrüstbar; jedes beauftragte Paket wird einzeln in Rechnung gestellt, nicht beauftragte Pakete werden nicht berechnet.\n\n## Nicht enthalten\n\nDomain, Hosting, Shopify und die eingesetzten KI-Dienste zahlen Sie direkt beim jeweiligen Anbieter. Anbieter und Umfang legen wir vor der Einrichtung gemeinsam fest, damit Sie die monatlichen Kosten vorher kennen. Alle Beträge netto zuzüglich der gesetzlichen Umsatzsteuer.",
  },
]
const transactions: Transaction[] = []
const emails: EmailDraft[] = []
const activities: Activity[] = [
  {
    id: "a-skope-quo",
    type: "quote",
    title: "Angebot AN-2026-512 erstellt — SKOPE Digitalisierung",
    meta: "16.000,00 € netto · gültig bis 13.09.2026",
    customerId: "c2",
    at: "2026-08-14T10:05:00.000Z",
  },
]

// Wiederverwendbare E-Mail-Vorlagen (keine Kundendaten)
const templates: Template[] = [
  {
    id: "tpl-rechnung",
    kind: "email",
    name: "Rechnung versenden",
    subject: "Ihre Rechnung {{invoice_number}} von DYNAAMIQ AI",
    body:
      "Hallo {{contact_name}},\n\nanbei erhalten Sie die Rechnung {{invoice_number}} über {{amount}}.\nZahlbar bis {{due_date}}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nBeste Grüße\nMartin — DYNAAMIQ AI",
    createdAt: iso(4),
  },
  {
    id: "tpl-angebot",
    kind: "email",
    name: "Angebot Follow-up",
    subject: "Kurze Rückfrage zu Ihrem Angebot {{quote_number}}",
    body:
      "Hallo {{contact_name}},\n\nich wollte kurz nachfassen, ob Sie schon einen Blick auf das Angebot {{quote_number}} werfen konnten. Gerne bespreche ich offene Punkte in einem kurzen Call.\n\nBeste Grüße\nMartin — DYNAAMIQ AI",
    createdAt: iso(4),
  },
]

export function seedDatabase(): Database {
  return {
    customers,
    deals,
    projects,
    tasks,
    invoices,
    quotes,
    templates,
    emails,
    transactions,
    activities,
    settings,
  }
}
