import type {
  Database,
  Customer,
  Deal,
  Project,
  Invoice,
  Quote,
  Contract,
  ContractClause,
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
  bic: "NTSBDEB1XXX",
  bankName: "N26 Bank",
  management: "Martin Traut",
  ownerName: "Martin Traut",
  smallBusiness: false,
  reminderFee: 5,
  defaultTaxRate: 0.19,
  invoicePrefix: "2026",
  quotePrefix: "AN-2026",
  contractPrefix: "V-2026",
  nextInvoiceNo: 434,
  nextQuoteNo: 516,
  nextContractNo: 3,
  paymentTermsDays: 14,
  // Keine Zahlungsfrist in diesem Satz: das Zahlungsziel steht mit echtem
  // Datum in der Kennzahlenleiste, im Zahlungsblock und in der Rechtszeile —
  // eine vierte, pauschale Angabe widerspricht ihnen, sobald eine Rechnung
  // eine abweichende Frist hat.
  invoiceFooter: "Vielen Dank für die gute Zusammenarbeit.",
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
    // Firmierung, Kontakt und USt-IdNr. wörtlich aus dem Impressum von
    // skopegebrauchtwarenhandel.com — der Empfängername ist Pflichtangabe
    // nach §14 Abs. 4 UStG und muss die tatsächliche Firmierung treffen.
    company: "Skope Gebrauchtwarenhandel",
    contactName: "Thomas Zielke",
    email: "skopegebrauchtwarenhandel@gmail.com",
    phone: "+49 178 5097654",
    website: "skopegebrauchtwarenhandel.com",
    address: "Im Kampfrad 3",
    city: "Neuenstadt am Kocher",
    zip: "74196",
    country: "Deutschland",
    vatId: "DE346591640",
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
    stage: "negotiation",
    value: 24000,
    probability: 70,
    owner: "Martin Traut",
    expectedClose: "2026-09-22T10:00:00.000Z",
    notes:
      "Seit 23.08.2026 zwei getrennte Vorgänge statt eines Gesamtangebots — jeder mit eigenem Angebot, Vertrag und Rechnung.\n\n(1) Website: Angebot AN-2026-514, Vertrag V-2026-001, Rechnung 2026-433. 81,25 Std. = 6.500 € zum Regelsatz, nach Nachlass 5.000 € netto. Ratenzahlung nach § 6: 2.000 € brutto bis 30.09.2026, Rest 3.950 € ab 01.03.2027 in Monatsraten ab 500 €, spätestens vollständig 31.12.2027. Eine einzige Rechnung bei Abnahme, die Raten sind Teilzahlungen darauf.\n\n(2) Warenwirtschaft: Angebot AN-2026-515, Vertrag V-2026-002. 324 Std. = 25.920 € zum Regelsatz, nach Nachlass 19.000 € netto. Noch nicht beauftragt; Preisbindung sechs Monate ab Abnahme der Website. Zahlung 40/30/30, Umsetzungsbeginn erst nach Eingang der ersten Rate.\n\nPflege in beiden Fällen nicht monatlich, sondern 15 % des provisionsrelevanten Deckungsbeitrags aus Websitegeschäften.",
    createdAt: "2026-08-14T09:00:00.000Z",
  },
]

/**
 * Ein Projekt je Paket, nicht eines für beide. Paket 1 ist einzeln beauftragbar
 * und läuft bereits, Paket 2 setzt darauf auf und wartet auf die Beauftragung.
 * In einem gemeinsamen Projekt stünden 16.000 € Budget und ein Enddatum im
 * November, obwohl nur die Website bestellt wurde — Fortschritt, Budget und
 * Fälligkeit wären für beide Teile falsch.
 */
const projects: Project[] = [
  {
    id: "p-skope",
    name: "SKOPE Paket 1 — Website, Marke & Verkaufskanal",
    customerId: "c2",
    status: "active",
    budget: 5000,
    // Noch nichts abgerechnet — die Rechnung entsteht bei Abnahme des Pakets.
    spent: 0,
    startDate: "2026-08-09T09:00:00.000Z",
    dueDate: "2026-09-30T18:00:00.000Z",
    color: "#00ffe6",
    description:
      "81,25 Std. — Website mit elf festen Seiten plus Geräteseiten steht, Logo & Qualitätssiegel, Shopify-Anbindung, Google-Unternehmensprofil und Anfragestrecke offen. Angebot AN-2026-514, Vertrag V-2026-001, Rechnung 2026-433 — unabhängig von der Warenwirtschaft.",
    dealId: "d-skope",
    createdAt: "2026-08-14T09:00:00.000Z",
  },
  {
    id: "p-skope-2",
    name: "SKOPE Paket 2 — System & Automatisierung",
    customerId: "c2",
    // Noch nicht beauftragt: setzt Paket 1 voraus und startet erst danach.
    status: "planning",
    budget: 19000,
    spent: 0,
    dueDate: "2027-02-28T18:00:00.000Z",
    color: "#3d00ff",
    description:
      "324 Std. — Warenwirtschaft für Einzelstücke und Mengenbestand, Lager und Inventur, Werkstatt und Ausschlachtung, Kanalabgleich, KI-Automatisierung und Auswertung. Eigenes Angebot AN-2026-515 und eigener Vertrag V-2026-002; beginnt erst nach Abnahme der Website.",
    dealId: "d-skope",
    createdAt: "2026-08-14T09:00:00.000Z",
  },
]

// Offene Punkte aus „Vor dem Versenden zu klären" (Abschnitt 10 der Kalkulation)
const tasks: Task[] = [
  {
    id: "t-skope-ust",
    projectId: "p-skope",
    // Entscheidet, ob die Umsatzsteuer auf die 5.000 € mit der Abnahme oder
    // erst mit dem Zahlungseingang entsteht — vor der Rechnung zu klären.
    title: "Istversteuerung nach § 20 UStG beim Finanzamt beantragen",
    status: "todo",
    kind: "task",
    due: "2026-09-01T09:00:00.000Z",
  },
  {
    id: "t-skope-send",
    projectId: "p-skope",
    title: "Angebot AN-2026-514 mit Vertrag V-2026-001 an Thomas Zielke versenden",
    status: "todo",
    kind: "event",
    due: "2026-08-25T09:00:00.000Z",
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
    text: "Einbindung Ihrer Rechtstexte, barrierearme Umsetzung nach anerkannten Grundsätzen und Messung auf allen Bildschirmbreiten; keine externen Dienste im Seitenaufruf — Karte, Schriften und Bewertungen selbst gehostet — mit dem Ziel, ohne Consent-Banner auszukommen, sofern im finalen Setup ausschließlich technisch erforderliche Technologien eingesetzt werden",
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

/**
 * Paket 2 in der Fassung AN-2026-513: zwölf Module statt acht. Neu sind Lager
 * und Inventur, Werkstatt und Ausschlachtung, frei anlegbare Warengruppen sowie
 * Rechte und Rollen; das Datenmodell trägt zusätzlich Mengenbestand. Der Titel
 * je Teilleistung ist die Modulüberschrift im Angebot.
 */
const PAKET_2_MODULE_513: LineItemTask[] = [
  {
    title: "Warenwirtschaft & Datenmodell",
    text: "Einzelstücke mit eigener Rahmennummer, eigenem Zustand und Bestand 1 sowie Mengenware mit Stückzahl und Durchschnittseinstand in einem Modell. Das Bewegungsjournal ist die einzige Wahrheit über den Bestand — der Bestand ist das Ergebnis aller Buchungen, kein überschreibbarer Zähler. Storno und Retoure laufen als Gegenbuchung; dazu Sperre gegen Doppelverkauf bei gleichzeitigem Zugriff, unveränderliches Änderungsprotokoll je Datensatz und versionierte Datenbankänderungen",
    hours: 64,
  },
  {
    title: "Lager & Inventur",
    text: "NEU: Lagerplätze und Umlagerung, platzgenaue Verfügbarkeit, Inventur mit Differenzbuchung und Grund statt stillem Überschreiben",
    hours: 22,
  },
  {
    title: "Werkstatt & Ausschlachtung",
    text: "NEU: Zerlegung eines Geräts in Teile, Verteilung des Einkaufswerts auf die entnommenen Teile in drei wählbaren Verfahren, Entwurf speicherbar, Zerlegung stornierbar",
    hours: 18,
  },
  {
    title: "Kategorien & Prüfkataloge",
    text: "NEU: frei anlegbare Warengruppen mit eigenen Attributen und eigenem Prüfprotokoll, statt eines fest verdrahteten Katalogs für E-Scooter",
    hours: 20,
  },
  {
    title: "Bedienoberfläche",
    text: "Erfassen, Fotografieren, Sortieren, Arbeitslisten je Prozessschritt, Suche und Filter über den gesamten Bestand; dazu Etiketten mit Barcode und Scanfeld für Regal und Werkbank",
    hours: 46,
  },
  {
    title: "Kanalabgleich",
    text: "Website vollständig verbunden, Shopify automatisch, Kleinanzeigen halbautomatisch; feste Freigaberegeln, Warteschlange mit Wiederholung bei Störungen, Schutz gegen Doppelbuchungen, vollständiges Protokoll",
    hours: 25,
  },
  {
    title: "Bildverarbeitung",
    text: "Ableitungen je Kanalformat beim Hochladen, Zuschnitt, Verkleinerung, Reihenfolge, Wasserzeichen, moderne Bildformate; Verarbeitung im Hintergrund",
    hours: 16,
  },
  {
    title: "KI-Automatisierungen",
    text: "Geräte- und Anzeigentexte aus den erfassten Feldern, Vorsortierung eingehender Anfragen nach Anliegen und Dringlichkeit, Antwortvorschläge zur Freigabe. Nichts wird ohne Freigabe versendet; Vorlagen versioniert, Kosten je Aufruf gedeckelt",
    hours: 24,
  },
  {
    title: "Kleinanzeigen",
    text: "Überschrift, Beschreibung, Preisvorschlag und zugeschnittene Bilder auf Knopfdruck, Standort je Gerät abgeglichen. Das Einstellen bleibt bewusst ein Klick von Hand, da automatisches Einstellen gegen die Nutzungsbedingungen verstößt",
    hours: 13,
  },
  {
    title: "Reporting & Auswertung",
    text: "Vorgangsliste, Bestand, Liegezeit, Verkäufe und Spanne, gebundenes Kapital je Prozessstufe, Vergleich über Zeiträume; Umsatzliste automatisch nach Google Sheets",
    hours: 26,
  },
  {
    title: "Rechte & Rollen",
    text: "NEU: Rollen mit echter Wirkung auf Einkaufspreise, Preisänderung und Storno — nicht nur als Anzeige, sondern als Berechtigung im System",
    hours: 8,
  },
  {
    title: "Einführung, Datenübernahme, Sicherung & Schulung",
    text: "Import-Assistent für beide Bestandsarten mit Spaltenzuordnung, Dublettenprüfung und Testlauf; Export von Bestand, Bewegungsjournal, Verkäufen und Inventur, tägliche Sicherung, Livegang, zwei Schulungstermine und Kurzanleitung",
    hours: 42,
  },
]

/** Werkstattablauf in der Fassung AN-2026-513 — zehn Schritte, neu sind Storno
 *  und Retoure sowie Inventur und Korrektur. */
const PROZESS_513: { title: string; detail: string }[] = [
  { title: "Ankauf", detail: "Gerät oder Menge angelegt, Rahmennummer und Einstand erfasst" },
  { title: "Prüfung", detail: "Zustand, Akku, Zulassung, Prüfprotokoll" },
  { title: "Instandsetzung", detail: "Arbeiten und Material dem Gerät zugeordnet" },
  { title: "Bilder & Gerätedaten", detail: "Fotos hochgeladen, Texte erzeugt, Preis gesetzt" },
  { title: "Veröffentlichung", detail: "Website und Shop automatisch, Kleinanzeigen auf Freigabe" },
  { title: "Anfrage / Reservierung", detail: "Alle Kanäle laufen in einer Vorgangsliste auf" },
  { title: "Verkauf", detail: "Bestand gebucht, Gerät auf allen Kanälen gesperrt" },
  { title: "Storno & Retoure", detail: "Gegenbuchung, Ware wahlweise zurück ins Lager" },
  { title: "Inventur & Korrektur", detail: "Differenz mit Grund gebucht, nicht überschrieben" },
  { title: "Auswertung", detail: "Liegezeit, Verkäufe, Spanne, gebundenes Kapital" },
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
    title: "Website-Relaunch und Wartungskalender",
    titleAccent: "hospital-equipment.de",
    lead: "Komplettpaket aus zweisprachiger Katalog-Website und eigener Wartungs- und Terminsoftware — beides übergabefertig hergestellt.",
    items: [
      {
        id: "p-web",
        description: "Website-Relaunch hospital-equipment.de",
        note: "Zweisprachige Katalog-Plattform mit 539 Seiten: Geräte-, Sonden-, Ersatzteil- und Fehlermeldungs-Kataloge, Suchmaschinenoptimierung und strukturierte Daten, 736 aufbereitete Bilder, Kontakt und DSGVO.",
        unit: "Paket", qty: 1, unitPrice: 7700, taxRate: 0.19,
      },
      {
        id: "p-kal",
        description: "Individualsoftware Wartungs- und Terminkalender (PWA)",
        note: "Eigenes, gesichertes Backend mit geschütztem Login, Termine mit Prüfzyklen und Überfälligkeit, Kundenübersicht, Echtzeit-Synchronisation für zwei Nutzer, Foto- und Datei-Dokumentation, installierbar wie eine native App.",
        unit: "Paket", qty: 1, unitPrice: 1500, taxRate: 0.19,
      },
      { id: "p-rab", description: "Paket- und Verhandlungsrabatt (Komplettpaket)", unit: "Rabatt", qty: 1, unitPrice: -2900, taxRate: 0.19 },
    ],
    notes: "Komplettpaket Website + Wartungskalender — regulär 9.200 € netto, verhandelter Paketpreis 6.300 € netto (Ersparnis 2.900 € / 32 %).\n\nSTORNIERT: Der Preis wurde erst nach Fertigstellung genannt und vom Auftraggeber abgelehnt; eine Preisvereinbarung kam nie zustande. Die Leistung wurde daraufhin nicht übergeben, es erfolgte kein Zahlungseingang. Forderung nicht weiterverfolgt.",
  },
  {
    id: "inv-2026-432-nfc",
    number: "2026-432",
    customerId: "c2",
    // Einheitliche Leistung mit Schwerpunkt Einrichtung: programmiert, mit dem
    // Google-Profil verknüpft, persönlich übergeben — der Aufsteller ist Träger,
    // nicht der Wert. Deshalb Leistung statt Warenverkauf, kein Versand, keine
    // Verpackung. PDF liegt erzeugt vor, der Versand steht noch aus; Status
    // wechselt beim Verschicken auf „versendet".
    status: "draft",
    issueDate: "2026-08-18T10:00:00.000Z",
    dueDate: "2026-08-25T10:00:00.000Z",
    serviceDate: "2026-08-18T10:00:00.000Z",
    createdAt: "2026-08-18T10:00:00.000Z",
    pdfPath: "/rechnungen/Rechnung-2026-432-Bewertungsstrecke.pdf",
    title: "Bewertungsstrecke",
    titleAccent: "Google-Unternehmensprofil",
    lead: "Eingerichtet und übergeben: zwei NFC-Aufsteller, die Kunden ohne Umweg zur Google-Bewertung führen — Smartphone auflegen genügt.",
    items: [
      {
        id: "n-auf",
        description: "Bewertungsstrecke eingerichtet",
        note: "NFC-Chips programmiert und mit dem Google-Unternehmensprofil des Auftraggebers verknüpft, Bewertungsweg eingerichtet und vor Ort übergeben. Tischaufsteller inklusive.",
        unit: "Aufsteller", qty: 2, unitPrice: 40, taxRate: 0.19,
      },
      { id: "n-rab", description: "Mengenrabatt (2 Stück)", unit: "Rabatt", qty: 1, unitPrice: -5, taxRate: 0.19 },
    ],
    // Leistungsumfang steht als Rechtszeile neben dem GiroCode, nicht in den
    // Anmerkungen — dort, wo im PDF auch der Rechtevorbehalt steht.
    legalNote:
      "<b>Leistungsumfang:</b> Einrichtung und persönliche Übergabe vor Ort; die verwendeten Aufsteller sind Teil der Leistung. Die hinterlegte Ziel-Adresse der NFC-Chips lässt sich jederzeit auf Wunsch ändern.",
  },
  {
    // Entwurf. Nach § 6 Abs. 3 des Projektvertrags V-2026-001 wird genau eine
    // Rechnung über die Gesamtleistung gestellt, und zwar mit der Abnahme —
    // keine Rechnung je Rate. Rechnungs- und Leistungsdatum stehen deshalb auf
    // dem geplanten Abnahmetag und werden beim Versenden auf den tatsächlichen
    // gesetzt. Die 2.000 € Ende September sind Teilzahlung auf diese Rechnung;
    // ihre Fälligkeit folgt aus dem Vertrag, nicht aus dem Zahlungsziel.
    id: "inv-2026-433-website",
    number: "2026-433",
    customerId: "c2",
    status: "draft",
    issueDate: "2026-09-30T10:00:00.000Z",
    dueDate: "2026-09-30T10:00:00.000Z",
    serviceDate: "2026-09-30T10:00:00.000Z",
    createdAt: "2026-08-23T10:00:00.000Z",
    title: "Website & Verkaufskanal",
    titleAccent: "skopegebrauchtwarenhandel.com",
    lead: "Neues Erscheinungsbild, vollständiger Webauftritt mit eigener Seite je Gerät, Shopify als Bestellkanal und Auffindbarkeit bei Google, in der Umkreissuche und in KI-Assistenten — hergestellt und übergeben.",
    items: [
      {
        id: "w-web",
        description: "Website, Marke und Verkaufskanal",
        note: "Logo und Qualitätssiegel, Farb- und Schriftsystem, elf feste Seiten zuzüglich eigener Seite je Gerät, Verkaufsstrecke mit Shopify-Anbindung, Suchmaschinen- und Umkreisoptimierung, Google-Unternehmensprofil, strukturierte Daten für KI-Systeme, Anfragestrecke auf sechs Seiten sowie Einbindung der beigestellten Rechtstexte. Leistungsumfang nach Angebot AN-2026-514 vom 23.08.2026.",
        unit: "Std.",
        qty: 81.25,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "w-rab",
        description: "Nachlass laut Angebot AN-2026-514",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 5000 - 81.25 * REGELSATZ,
        taxRate: 0.19,
      },
    ],
    legalNote:
      "<b>Zahlungsvereinbarung:</b> Abweichend von einem allgemeinen Zahlungsziel gilt der individuell vereinbarte Ratenplan aus § 6 des Projektvertrags V-2026-001: 2.000,00 € brutto bis 30.09.2026, der verbleibende Betrag von 3.950,00 € brutto ab 01.03.2027 in monatlichen Raten von mindestens 500,00 €, spätestens vollständig am 31.12.2027. Bitte geben Sie bei jeder Überweisung die Rechnungsnummer als Verwendungszweck an. Bis zur vollständigen Zahlung bleiben die Nutzungsrechte nach § 8 des Vertrags vorbehalten.",
    notes:
      "Leistung nach Angebot AN-2026-514 vom 23.08.2026 und Projektvertrag V-2026-001. Regulär 6.500,00 € netto (81,25 Std. × 80,00 €), berechnet 5.000,00 € netto — Nachlass 1.500,00 €.\n\nDie Warenwirtschaft ist nicht Gegenstand dieser Rechnung; sie wird gesondert angeboten (AN-2026-515) und gesondert abgerechnet.",
  },
]

/**
 * Dieselben zwölf Module ohne die „NEU"-Marken. Die verglichen das ersetzte
 * Angebot AN-2026-513 — in einem eigenständigen Angebot gäbe es nichts, wogegen
 * ein Modul neu wäre.
 */
const PAKET_2_MODULE_515: LineItemTask[] = PAKET_2_MODULE_513.map((m) =>
  typeof m === "string" ? m : { ...m, text: m.text.replace(/^NEU: /, "") },
)

const quotes: Quote[] = [
  {
    id: "quo-2026-043",
    number: "AN-2026-512",
    customerId: "c2",
    projectId: "p-skope",
    // Durch AN-2026-513 ersetzt — der Datensatz bleibt als Vorgang stehen,
    // ist aber nicht mehr gültig.
    status: "expired",
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
  {
    // Nachfolger von AN-2026-512: Paket 2 trägt jetzt zusätzlich Mengenbestand,
    // Lagerplätze, Inventur und Ausschlachtung. Der Vorgänger bleibt als
    // Datensatz stehen, ist aber nicht mehr gültig.
    id: "quo-2026-044",
    number: "AN-2026-513",
    customerId: "c2",
    projectId: "p-skope",
    // Durch die Trennung in AN-2026-514 (Website) und AN-2026-515
    // (Warenwirtschaft) erledigt. Der Datensatz bleibt als Vorgang stehen.
    status: "expired",
    issueDate: "2026-08-18T10:00:00.000Z",
    validUntil: "2026-09-17T10:00:00.000Z",
    createdAt: "2026-08-18T10:00:00.000Z",
    lead: "Website, Verkaufskanäle und automatisierte Warenwirtschaft für Einzelstücke und Mengenbestand — in zwei Paketen, einzeln beauftragbar.",
    notice:
      "Ersetzt Angebot AN-2026-512 vom 14. Aug. 2026. Paket 2 ist um Mengenbestand, Lagerplätze, Inventur und Ausschlachtung erweitert.",
    process: PROZESS_513,
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
        description: "Nachlass auf Paket 1 — berechnet werden 5.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 5000 - 81.25 * REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-2",
        description:
          "Paket 2 — System und Automatisierung: eigene Warenwirtschaft für Einzelstücke und Mengenbestand, Lager und Inventur, Werkstatt und Ausschlachtung, zentraler Bestands- und Vorgangsabgleich der angebundenen Verkaufskanäle im Rahmen der jeweils verfügbaren und zulässigen Schnittstellen, KI-gestützte Texterstellung und Anfragebearbeitung, Auswertung, Einführung und Übergabe",
        note: "Gebrauchtware ist beides: Einzelstücke mit eigener Rahmennummer, eigenem Zustand und Bestand 1 — und Mengenware wie Ersatzteile, Zubehör und Verschleißmaterial, die nach Stückzahl und Durchschnittseinstand geführt wird. Beides gehört in ein System, mit einem gemeinsamen Bewegungsjournal als einziger Wahrheit über den Bestand. Genau das macht den Aufwand aus.",
        details: PAKET_2_MODULE_513,
        unit: "Std.",
        qty: 324,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-2-rabatt",
        description: "Nachlass auf Paket 2 — berechnet werden 19.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 19000 - 324 * REGELSATZ,
        taxRate: 0.19,
      },
    ],
    valuation: {
      // 405,25 Std. statt gerundeter 405: nur so trifft der Regelsatz-Balken
      // exakt die Kalkulation von 32.420,00 €, die daneben ausgewiesen ist.
      hours: 405.25,
      netAmount: 24000,
      benchmarks: [
        { label: "Mein Regelsatz ohne Nachlass", rate: 80 },
        { label: "Freelancer Web & Software", rate: 91 },
        { label: "Freelancer DACH, Schnitt", rate: 103 },
        { label: "Agentur", rate: 130 },
      ],
      reasons: [
        {
          title: "Unter dem eigenen Regelsatz",
          text: "405,25 Std. ergeben zum Regelsatz 32.420 €. Berechnet werden 24.000 € — marktüblich sind 91 bis 103 €/Std.",
          stat: "59 €",
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
          text: "Datenmodell, Bewegungsjournal, Abgleichmotor und Bildverarbeitung werden einmal gebaut — Shopify und Kleinanzeigen sind danach dünne Anschlüsse.",
          stat: "3",
          statLabel: "Kanäle",
        },
        {
          title: "Erfolgsabhängig statt Fixkosten",
          text: "Nach dem Livegang keine feste Grundgebühr. Die Betreuung wird nur fällig, wenn über die Website ein Geschäft zustande kommt.",
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
        "Zum Vergleich: 405,25 Std. entsprechen rechnerisch rund 36.900 € zu Freelancer-Sätzen und rund 52.700 € zu Agentursätzen. Beide Pakete zusammen kosten 24.000 € netto — 8.420 € unter der eigenen Kalkulation von 32.420 €.",
    },
    notes:
      "## Festpreis und Leistungsumfang\n\nPaket 1 kostet 5.000,00 € netto, Paket 2 kostet 19.000,00 € netto. Die Stundenangaben dienen der nachvollziehbaren Kalkulation — Sie kaufen keine Stunden, sondern den beschriebenen Leistungsumfang. Bleibt dieser unverändert, liegt das Risiko eines höheren tatsächlichen Aufwands bei uns.\n\nEnthalten sind ausschließlich die hier beschriebenen Funktionen. Was nach Auftragserteilung dazukommt, ist eine Zusatzleistung: Wir stimmen sie vorher ab, bieten sie separat an und setzen sie erst nach Ihrer Freigabe um. Ohne Freigabe entstehen keine zusätzlichen Kosten.\n\n## Wann Paket 1 fertig ist\n\nWebsite veröffentlicht und funktionsfähig, die vereinbarten Seiten umgesetzt, Darstellung auf Telefon, Tablet und Computer geprüft, Formulare stellen zu, Shopify-Anbindung im beschriebenen Umfang in Betrieb, SEO-Grundstruktur und strukturierte Daten eingebaut, Google-Unternehmensprofil eingerichtet beziehungsweise optimiert (sofern die Zugänge vorliegen), Kontakt- und Anfragewege getestet. Zum Abschluss läuft ein gemeinsamer Funktionstest.\n\n## Wann Paket 2 fertig ist\n\nWenn ein vollständiger Vorgang durchläuft: Gerät erfassen, Rahmennummer hinterlegen, Zustand und Prüfprotokoll dokumentieren, Bilder hochladen, Preis festlegen, Gerät auf den angebundenen Kanälen bereitstellen, Reservierung oder Verkauf erfassen, Bestand aktualisieren, Gerät gegen Doppelverkauf sperren, Vorgang protokollieren und Verkauf samt Spanne in der Auswertung sehen.\n\nZusätzlich für den Mengenbestand: ein Mengenartikel wird zugebucht, umgelagert, verbraucht und inventiert; eine Ausschlachtung verteilt den Einkaufswert eines Geräts auf die entnommenen Teile — wahlweise nach Verkaufswert, nach hinterlegtem Richtwert oder zu gleichen Teilen; ein Verkauf lässt sich stornieren und die Ware wahlweise zurück ins Lager nehmen. Bei Kleinanzeigen erfolgt die Veröffentlichung wie beschrieben halbautomatisch.\n\n## Zeitrahmen und Mitwirkung\n\nPaket 1 rund 3 bis 5 Wochen ab Projektstart, Paket 2 rund 11 bis 16 weitere Wochen — zusammen rund 14 bis 21 Wochen. Das sind Planwerte und keine Fixtermine. Sie setzen voraus, dass Zugänge, Gerätedaten, Bilder, Rechtstexte und Freigaben rechtzeitig vorliegen; fehlende Zugänge oder Daten, ausstehende Freigaben, Änderungen am Leistungsumfang und Wartezeiten bei Drittanbietern verschieben den Zeitraum entsprechend.\n\n## Angebundene Kanäle und Drittanbieter\n\nWebsite und internes System sind vollständig verbunden. Shopify wird automatisch abgeglichen — Geräte, Artikeldaten, Preise, Bilder, Verfügbarkeit und Bestellungen, soweit die Schnittstelle das zulässt. Kleinanzeigen bleibt bewusst halbautomatisch: Titel, Beschreibung, Preis und zugeschnittene Bilder werden vorbereitet, veröffentlicht wird per Klick von Hand, weil automatisches Einstellen gegen die Nutzungsbedingungen verstößt.\n\nFunktionen, die von Shopify, Kleinanzeigen, Google oder KI-Anbietern abhängen, lassen sich nur im Rahmen der dort jeweils verfügbaren Schnittstellen und Nutzungsbedingungen umsetzen. Ändert ein Anbieter Schnittstelle, Bedingungen oder Funktionsumfang grundlegend, ist das keine Nichterfüllung unsererseits; größere Anpassungen daraus werden separat vereinbart.\n\n## Pflege und Betreuung statt Monatspauschale\n\nEs gibt keine feste monatliche Pflegegebühr. Stattdessen 15 % des provisionsrelevanten Deckungsbeitrags aus jedem Geschäft, das durch die Website entsteht. Kein Websitegeschäft, keine Vergütung.\n\nProvisionsrelevanter Deckungsbeitrag = Nettoerlös abzüglich direktem Einkaufspreis, zurechenbarem Material, zurechenbarer Instandsetzung und zurechenbaren Fremdleistungen. Für Reparatur, Inspektion, Wartung und Zubehör gilt dieselbe Rechnung. Beispiel: Gerät für 1.900,00 € verkauft, Einkauf und Instandsetzung 1.300,00 € — Deckungsbeitrag 600,00 €, Anteil 90,00 €.\n\nAls Websitegeschäft gilt ein Auftrag, wenn Kauf, Anfrage, Formular, Terminbuchung oder ein nachweisbarer Erstkontakt über die Website oder den angebundenen Shop eingegangen ist — auch dann, wenn daraus erst später ein bezahlter Auftrag wird. Maßgeblich ist die Herkunftserfassung des Systems. Laufkundschaft, Telefon, Kleinanzeigen und Bestandskunden ohne Website-Ursprung bleiben außen vor.\n\nEnthalten sind Betrieb der Anwendung, Fehlerbehebung, Sicherheitsaktualisierungen, technische Pflege, Überwachung der angebundenen Schnittstellen, Pflege der Automatisierungen, kleinere Anpassungen und Optimierungen sowie Unterstützung bei Störungen. Nicht enthalten sind neue Funktionen und Module, umfangreiche Redesigns und die Anbindung weiterer Anbieter — das sind eigene Projekte und werden separat angeboten.\n\nAbgerechnet wird monatlich nachträglich anhand der Geschäfte, die in diesem Monat zustande gekommen sind. Storniert ein Kunde oder gibt er zurück, wird der bereits berechnete Anteil mit der nächsten Rechnung gutgeschrieben. Die Laufzeit beträgt 12 Monate ab Livegang; danach ist die Vereinbarung mit drei Monaten Frist zum Monatsende kündbar.\n\n## Beauftragung und Preisbindung\n\nPaket 1 ist einzeln beauftragbar. Paket 2 kann nachträglich beauftragt werden — zu dem hier genannten Preis, sofern die Beauftragung innerhalb von sechs Monaten nach Abnahme von Paket 1 erfolgt; danach wird es neu kalkuliert. Jedes beauftragte Paket wird einzeln in Rechnung gestellt, nicht beauftragte Pakete werden nicht berechnet.\n\nDie erfolgsabhängige Betreuung gehört zur Beauftragung von Paket 1 und beginnt mit dem Livegang. Sie wird nicht gesondert beauftragt und nicht pauschal berechnet; abgerechnet wird ausschließlich der Anteil aus tatsächlich zustande gekommenen Websitegeschäften.\n\n## Vertragsgrundlage\n\nDieses Angebot beschreibt Leistung, Preis und Zeitrahmen. Die rechtlichen Regelungen — Abnahme, Nutzungsrechte, Gewährleistung, Haftung, Datenschutz, Laufzeit und Kündigung — stehen im zugehörigen Projektvertrag, der diesem Angebot beiliegt. Angebot und Vertrag gehören zusammen: Mit der Unterzeichnung des Vertrags wird dieses Angebot in dem dort bezeichneten Umfang verbindlich beauftragt.\n\n## Nicht enthalten\n\nDomain, Hosting, Shopify und die eingesetzten KI-Dienste zahlen Sie direkt beim jeweiligen Anbieter. Anbieter und Umfang legen wir vor der Einrichtung gemeinsam fest, damit Sie die monatlichen Kosten vorher kennen. Ebenfalls nicht enthalten sind Rechtsberatung und die Erstellung von Rechtstexten (Impressum, Datenschutzerklärung, Shop-AGB, Widerrufsbelehrung), Marken- und Schutzrechtsrecherchen sowie Inhalte und Lizenzen Dritter. Alle Beträge netto zuzüglich der gesetzlichen Umsatzsteuer.",
  },
  /**
   * AN-2026-514 — Website, Marke und Verkaufskanal als eigenständiges Angebot.
   *
   * Angebot AN-2026-513 trug beide Pakete in einem Dokument. Für die Website
   * allein war es damit weder verschickbar noch abschließbar: Der Kunde
   * beauftragt zuerst die Website, die Warenwirtschaft folgt später und zu
   * eigenen Bedingungen. Getrennt hat jedes Paket sein Angebot, seinen Vertrag
   * und seine Rechnung — und keine Zeile bezieht sich auf das jeweils andere.
   */
  {
    id: "quo-2026-045",
    number: "AN-2026-514",
    customerId: "c2",
    projectId: "p-skope",
    pack: "web",
    status: "draft",
    issueDate: "2026-08-23T10:00:00.000Z",
    validUntil: "2026-09-22T10:00:00.000Z",
    createdAt: "2026-08-23T10:00:00.000Z",
    title: "Website &",
    titleAccent: "Verkaufskanal",
    lead: "Neues Erscheinungsbild, vollständiger Webauftritt mit eigener Seite je Gerät, Shopify als Bestellkanal und Auffindbarkeit bei Google, in der Umkreissuche und in KI-Assistenten.",
    notice:
      "Ersetzt Paket 1 aus Angebot AN-2026-513 vom 18. Aug. 2026. Website und Warenwirtschaft werden ab sofort getrennt angeboten; dieses Angebot betrifft ausschließlich die Website. Die Warenwirtschaft steht in Angebot AN-2026-515.",
    items: [
      {
        id: "paket-1",
        description:
          "Website, Marke und Verkaufskanal: Redesign mit neuem Logo, vollständiger Webauftritt mit eigener Seite je Gerät, Shopify-Anbindung, Optimierung der Auffindbarkeit für Google, die Umkreissuche und KI-Systeme, eingerichtetes Google-Unternehmensprofil. Betrieb und Pflege danach ohne monatliche Gebühr — siehe Anmerkungen",
        note: "Der Aufwand steckt weniger in den elf festen Seiten als darin, dass jedes Gerät eine eigene Seite bekommt, die sich aus dem Bestand füllt, und dass diese Seiten einzeln für Google, die Umkreissuche und KI-Systeme auffindbar aufgebaut sind. Wer das nachträglich anbaut, baut die Website ein zweites Mal.",
        details: PAKET_1_AUFGABEN,
        unit: "Std.",
        qty: 81.25,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-1-rabatt",
        description: "Nachlass — berechnet werden 5.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 5000 - 81.25 * REGELSATZ,
        taxRate: 0.19,
      },
    ],
    valuation: {
      hours: 81.25,
      netAmount: 5000,
      benchmarks: [
        { label: "Mein Regelsatz ohne Nachlass", rate: 80 },
        { label: "Freelancer Web & Software", rate: 91 },
        { label: "Freelancer DACH, Schnitt", rate: 103 },
        { label: "Agentur", rate: 130 },
      ],
      reasons: [
        {
          title: "Unter dem eigenen Regelsatz",
          text: "81,25 Std. ergeben zum Regelsatz 6.500 €. Berechnet werden 5.000 € — marktüblich sind 91 bis 103 €/Std.",
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
          title: "Jedes Gerät bekommt eine eigene Seite",
          text: "Die Geräteseiten füllen sich aus dem Bestand und sind einzeln für Google, die Umkreissuche und KI-Systeme auffindbar. Nachträglich angebaut heißt: die Website ein zweites Mal bauen.",
          stat: "11",
          statLabel: "feste Seiten",
        },
        {
          title: "Erfolgsabhängig statt Fixkosten",
          text: "Nach dem Livegang keine feste Grundgebühr. Die Betreuung wird nur fällig, wenn über die Website ein Geschäft zustande kommt.",
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
        "Zum Vergleich: 81,25 Std. entsprechen rechnerisch rund 7.400 € zu Freelancer-Sätzen für Web- und Softwareentwicklung und rund 10.600 € zu Agentursätzen. Die Website kostet 5.000 € netto — 1.500 € unter der eigenen Kalkulation von 6.500 €.",
    },
    notes:
      "## Festpreis und Leistungsumfang\n\nDie Website kostet 5.000,00 € netto. Die Stundenangaben dienen der nachvollziehbaren Kalkulation — Sie kaufen keine Stunden, sondern den beschriebenen Leistungsumfang. Bleibt dieser unverändert, liegt das Risiko eines höheren tatsächlichen Aufwands bei uns.\n\nEnthalten sind ausschließlich die hier beschriebenen Funktionen. Was nach Auftragserteilung dazukommt, ist eine Zusatzleistung: Wir stimmen sie vorher ab, bieten sie separat an und setzen sie erst nach Ihrer Freigabe um. Ohne Freigabe entstehen keine zusätzlichen Kosten.\n\n## Wann die Website fertig ist\n\nWebsite veröffentlicht und funktionsfähig, die vereinbarten Seiten umgesetzt, Darstellung auf Telefon, Tablet und Computer geprüft, Formulare stellen zu, Shopify-Anbindung im beschriebenen Umfang in Betrieb, SEO-Grundstruktur und strukturierte Daten eingebaut, Google-Unternehmensprofil eingerichtet beziehungsweise optimiert (sofern die Zugänge vorliegen), Kontakt- und Anfragewege getestet. Zum Abschluss läuft ein gemeinsamer Funktionstest.\n\n## Zeitrahmen und Mitwirkung\n\nRund 3 bis 5 Wochen ab Projektstart. Das sind Planwerte und keine Fixtermine. Sie setzen voraus, dass Zugänge, Gerätedaten, Bilder, Rechtstexte und Freigaben rechtzeitig vorliegen; fehlende Zugänge oder Daten, ausstehende Freigaben, Änderungen am Leistungsumfang und Wartezeiten bei Drittanbietern verschieben den Zeitraum entsprechend.\n\n## Angebundene Kanäle und Drittanbieter\n\nShopify wird als Bestellkanal angebunden — Artikel, Preise, Bilder und Bestände werden abgeglichen, soweit die Schnittstelle das zulässt. Die Geräteseiten der Website und der Shop zeigen denselben Datenstand.\n\nFunktionen, die von Shopify, Google oder KI-Anbietern abhängen, lassen sich nur im Rahmen der dort jeweils verfügbaren Schnittstellen und Nutzungsbedingungen umsetzen. Ändert ein Anbieter Schnittstelle, Bedingungen oder Funktionsumfang grundlegend, ist das keine Nichterfüllung unsererseits; größere Anpassungen daraus werden separat vereinbart.\n\n## Pflege und Betreuung statt Monatspauschale\n\nEs gibt keine feste monatliche Pflegegebühr. Stattdessen 15 % des provisionsrelevanten Deckungsbeitrags aus jedem Geschäft, das durch die Website entsteht. Kein Websitegeschäft, keine Vergütung.\n\nProvisionsrelevanter Deckungsbeitrag = Nettoerlös abzüglich direktem Einkaufspreis, zurechenbarem Material, zurechenbarer Instandsetzung und zurechenbaren Fremdleistungen. Für Reparatur, Inspektion, Wartung und Zubehör gilt dieselbe Rechnung. Beispiel: Gerät für 1.900,00 € verkauft, Einkauf und Instandsetzung 1.300,00 € — Deckungsbeitrag 600,00 €, Anteil 90,00 €.\n\nAls Websitegeschäft gilt ein Auftrag, wenn Kauf, Anfrage, Formular, Terminbuchung oder ein nachweisbarer Erstkontakt über die Website oder den angebundenen Shop eingegangen ist — auch dann, wenn daraus erst später ein bezahlter Auftrag wird. Maßgeblich ist die Herkunftserfassung der Website. Laufkundschaft, Telefon, Kleinanzeigen und Bestandskunden ohne Website-Ursprung bleiben außen vor.\n\nEnthalten sind Betrieb der Website, Fehlerbehebung, Sicherheitsaktualisierungen, technische Pflege, Überwachung der angebundenen Schnittstellen, kleinere Anpassungen und Optimierungen sowie Unterstützung bei Störungen. Nicht enthalten sind neue Funktionen und Module, umfangreiche Redesigns und die Anbindung weiterer Anbieter — das sind eigene Projekte und werden separat angeboten.\n\nAbgerechnet wird monatlich nachträglich anhand der Geschäfte, die in diesem Monat zustande gekommen sind. Storniert ein Kunde oder gibt er zurück, wird der bereits berechnete Anteil mit der nächsten Rechnung gutgeschrieben. Die Laufzeit beträgt 12 Monate ab Livegang; danach ist die Vereinbarung mit drei Monaten Frist zum Monatsende kündbar.\n\n## Beauftragung und Preisbindung\n\nDieses Angebot betrifft ausschließlich die Website. Die Warenwirtschaft ist Gegenstand des eigenen Angebots AN-2026-515 und wird nur berechnet, wenn sie gesondert beauftragt wird. Sie bleibt sechs Monate nach Abnahme der Website zum dort genannten Preis beauftragbar.\n\nDie erfolgsabhängige Betreuung gehört zur Beauftragung dieses Angebots und beginnt mit dem Livegang. Sie wird nicht gesondert beauftragt und nicht pauschal berechnet; abgerechnet wird ausschließlich der Anteil aus tatsächlich zustande gekommenen Websitegeschäften.\n\n## Vertragsgrundlage\n\nDieses Angebot beschreibt Leistung, Preis und Zeitrahmen. Die rechtlichen Regelungen — Abnahme, Zahlung, Nutzungsrechte, Gewährleistung, Haftung, Datenschutz, Laufzeit und Kündigung — stehen im Projektvertrag V-2026-001, der diesem Angebot beiliegt. Angebot und Vertrag gehören zusammen: Mit der Unterzeichnung des Vertrags wird dieses Angebot verbindlich beauftragt.\n\n## Nicht enthalten\n\nDomain, Hosting, Shopify und die eingesetzten KI-Dienste zahlen Sie direkt beim jeweiligen Anbieter. Anbieter und Umfang legen wir vor der Einrichtung gemeinsam fest, damit Sie die monatlichen Kosten vorher kennen. Ebenfalls nicht enthalten sind Rechtsberatung und die Erstellung von Rechtstexten (Impressum, Datenschutzerklärung, Shop-AGB, Widerrufsbelehrung), Marken- und Schutzrechtsrecherchen sowie Inhalte und Lizenzen Dritter. Alle Beträge netto zuzüglich der gesetzlichen Umsatzsteuer.",
  },
  /**
   * AN-2026-515 — Warenwirtschaft und Automatisierung als eigenständiges
   * Angebot. Setzt die Website voraus, wird aber getrennt beauftragt, getrennt
   * bezahlt und getrennt abgenommen.
   */
  {
    id: "quo-2026-046",
    number: "AN-2026-515",
    customerId: "c2",
    projectId: "p-skope-2",
    pack: "system",
    status: "draft",
    issueDate: "2026-08-23T10:00:00.000Z",
    validUntil: "2026-09-22T10:00:00.000Z",
    createdAt: "2026-08-23T10:00:00.000Z",
    title: "Warenwirtschaft &",
    titleAccent: "Automatisierung",
    lead: "Eigene Warenwirtschaft für Einzelstücke und Mengenbestand — Lager und Inventur, Werkstatt und Ausschlachtung, Kanalabgleich, KI-Automatisierung und Auswertung in einem System.",
    notice:
      "Ersetzt Paket 2 aus Angebot AN-2026-513 vom 18. Aug. 2026. Website und Warenwirtschaft werden getrennt angeboten; die Website steht in Angebot AN-2026-514.",
    process: PROZESS_513,
    items: [
      {
        id: "paket-2",
        description:
          "System und Automatisierung: eigene Warenwirtschaft für Einzelstücke und Mengenbestand, Lager und Inventur, Werkstatt und Ausschlachtung, zentraler Bestands- und Vorgangsabgleich der angebundenen Verkaufskanäle im Rahmen der jeweils verfügbaren und zulässigen Schnittstellen, KI-gestützte Texterstellung und Anfragebearbeitung, Auswertung, Einführung und Übergabe",
        note: "Gebrauchtware ist beides: Einzelstücke mit eigener Rahmennummer, eigenem Zustand und Bestand 1 — und Mengenware wie Ersatzteile, Zubehör und Verschleißmaterial, die nach Stückzahl und Durchschnittseinstand geführt wird. Beides gehört in ein System, mit einem gemeinsamen Bewegungsjournal als einziger Wahrheit über den Bestand. Genau das macht den Aufwand aus.",
        details: PAKET_2_MODULE_515,
        unit: "Std.",
        qty: 324,
        unitPrice: REGELSATZ,
        taxRate: 0.19,
      },
      {
        id: "paket-2-rabatt",
        description: "Nachlass — berechnet werden 19.000,00 € netto",
        unit: "Nachlass",
        qty: 1,
        unitPrice: 19000 - 324 * REGELSATZ,
        taxRate: 0.19,
      },
    ],
    valuation: {
      hours: 324,
      netAmount: 19000,
      benchmarks: [
        { label: "Mein Regelsatz ohne Nachlass", rate: 80 },
        { label: "Freelancer Web & Software", rate: 91 },
        { label: "Freelancer DACH, Schnitt", rate: 103 },
        { label: "Agentur", rate: 130 },
      ],
      reasons: [
        {
          title: "Unter dem eigenen Regelsatz",
          text: "324 Std. ergeben zum Regelsatz 25.920 €. Berechnet werden 19.000 € — marktüblich sind 91 bis 103 €/Std.",
          stat: "59 €",
          statLabel: "je Std.",
        },
        {
          title: "Der Unterbau trägt alle Kanäle",
          text: "Datenmodell, Bewegungsjournal, Abgleichmotor und Bildverarbeitung werden einmal gebaut — Shopify und Kleinanzeigen sind danach dünne Anschlüsse.",
          stat: "3",
          statLabel: "Kanäle",
        },
        {
          title: "Keine Lizenz, kein Abo",
          text: "Eine Warenwirtschaft von der Stange kostet 150 bis 400 € monatlich, unbefristet — und kennt keine Einzelstücke mit eigener Rahmennummer.",
          stat: "0 €",
          statLabel: "feste Pauschale",
        },
        {
          title: "Ein Ansprechpartner",
          text: "Kein Agentur-Apparat, keine Weitergabe an Dritte: direkte Abstimmung, kurze Wege, ein Verantwortlicher.",
          stat: "1",
          statLabel: "Ansprechpartner",
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
        "Zum Vergleich: 324 Std. entsprechen rechnerisch rund 29.500 € zu Freelancer-Sätzen für Web- und Softwareentwicklung und rund 42.100 € zu Agentursätzen. Das System kostet 19.000 € netto — 6.920 € unter der eigenen Kalkulation von 25.920 €.",
    },
    notes:
      "## Festpreis und Leistungsumfang\n\nDie Warenwirtschaft kostet 19.000,00 € netto. Die Stundenangaben dienen der nachvollziehbaren Kalkulation — Sie kaufen keine Stunden, sondern den beschriebenen Leistungsumfang. Bleibt dieser unverändert, liegt das Risiko eines höheren tatsächlichen Aufwands bei uns.\n\nEnthalten sind ausschließlich die zwölf hier beschriebenen Module. Was nach Auftragserteilung dazukommt, ist eine Zusatzleistung: Wir stimmen sie vorher ab, bieten sie separat an und setzen sie erst nach Ihrer Freigabe um. Ohne Freigabe entstehen keine zusätzlichen Kosten.\n\n## Wann das System fertig ist\n\nWenn ein vollständiger Vorgang durchläuft: Gerät erfassen, Rahmennummer hinterlegen, Zustand und Prüfprotokoll dokumentieren, Bilder hochladen, Preis festlegen, Gerät auf den angebundenen Kanälen bereitstellen, Reservierung oder Verkauf erfassen, Bestand aktualisieren, Gerät gegen Doppelverkauf sperren, Vorgang protokollieren und Verkauf samt Spanne in der Auswertung sehen.\n\nZusätzlich für den Mengenbestand: ein Mengenartikel wird zugebucht, umgelagert, verbraucht und inventiert; eine Ausschlachtung verteilt den Einkaufswert eines Geräts auf die entnommenen Teile — wahlweise nach Verkaufswert, nach hinterlegtem Richtwert oder zu gleichen Teilen; ein Verkauf lässt sich stornieren und die Ware wahlweise zurück ins Lager nehmen. Bei Kleinanzeigen erfolgt die Veröffentlichung wie beschrieben halbautomatisch.\n\n## Zeitrahmen und Mitwirkung\n\nRund 11 bis 16 Wochen ab Projektstart. Das sind Planwerte und keine Fixtermine. Sie setzen voraus, dass die Website aus Angebot AN-2026-514 abgenommen ist und dass Zugänge, Gerätedaten, Altbestände, Bilder und Freigaben rechtzeitig vorliegen; fehlende Zugänge oder Daten, ausstehende Freigaben, Änderungen am Leistungsumfang und Wartezeiten bei Drittanbietern verschieben den Zeitraum entsprechend.\n\n## Angebundene Kanäle und Drittanbieter\n\nWebsite und System sind vollständig verbunden. Shopify wird automatisch abgeglichen — Geräte, Artikeldaten, Preise, Bilder, Verfügbarkeit und Bestellungen, soweit die Schnittstelle das zulässt. Kleinanzeigen bleibt bewusst halbautomatisch: Titel, Beschreibung, Preis und zugeschnittene Bilder werden vorbereitet, veröffentlicht wird per Klick von Hand, weil automatisches Einstellen gegen die Nutzungsbedingungen verstößt.\n\nFunktionen, die von Shopify, Kleinanzeigen, Google oder KI-Anbietern abhängen, lassen sich nur im Rahmen der dort jeweils verfügbaren Schnittstellen und Nutzungsbedingungen umsetzen. Ändert ein Anbieter Schnittstelle, Bedingungen oder Funktionsumfang grundlegend, ist das keine Nichterfüllung unsererseits; größere Anpassungen daraus werden separat vereinbart.\n\n## Beauftragung und Preisbindung\n\nDieses Angebot betrifft ausschließlich die Warenwirtschaft und setzt die Website aus Angebot AN-2026-514 voraus. Der genannte Festpreis gilt, sofern die Beauftragung innerhalb von sechs Monaten nach Abnahme der Website erfolgt; danach wird neu kalkuliert.\n\nFür das System fällt keine monatliche Grundgebühr an. Betrieb, Fehlerbehebung, Sicherheitsaktualisierungen und technische Pflege laufen über die bereits vereinbarte erfolgsabhängige Betreuung aus Angebot AN-2026-514 mit; eine zusätzliche Pauschale entsteht nicht. Endet diese Betreuung, wird die Betreuung des Systems gesondert vereinbart.\n\n## Vertragsgrundlage\n\nDieses Angebot beschreibt Leistung, Preis und Zeitrahmen. Die rechtlichen Regelungen — Abnahme, Zahlung, Nutzungsrechte, Gewährleistung, Haftung, Datenschutz, Laufzeit und Kündigung — stehen im Projektvertrag V-2026-002, der diesem Angebot beiliegt. Angebot und Vertrag gehören zusammen: Mit der Unterzeichnung des Vertrags wird dieses Angebot verbindlich beauftragt.\n\n## Nicht enthalten\n\nHosting, Rechenleistung, Speicher, Shopify und die eingesetzten KI-Dienste zahlen Sie direkt beim jeweiligen Anbieter. Anbieter und Umfang legen wir vor der Einrichtung gemeinsam fest, damit Sie die laufenden Kosten vorher kennen. Ebenfalls nicht enthalten sind Rechtsberatung, die Aufbereitung unbrauchbarer Altdaten, Hardware wie Etikettendrucker und Scanner sowie Inhalte und Lizenzen Dritter. Alle Beträge netto zuzüglich der gesetzlichen Umsatzsteuer.",
  },
]
/**
 * Klauseln, die in beiden SKOPE-Verträgen wörtlich gleich lauten. Sie stehen
 * einmal, damit Website- und Systemvertrag nicht mit der Zeit auseinander-
 * laufen. Die Paragrafenfolge ist in beiden Verträgen identisch (1 Gegenstand
 * … 16 Schluss) — nur so bleiben die Verweise zwischen den Klauseln richtig.
 *
 * Alle Regelungen sind bewusst einzeln ausgehandelt und nicht als vorformu-
 * lierte Bedingungen gedacht: eine Klausel, die als AGB gilt, wird an § 307 BGB
 * gemessen — insbesondere Abnahmefiktion, Haftungsdeckel, Verfallklausel und
 * Pauschalen halten als Individualabrede deutlich mehr aus. Deshalb steht die
 * Aushandlung ausdrücklich im Schlussparagrafen.
 */
const K_MITWIRKUNG: ContractClause = {
  title: "Mitwirkungspflichten des Auftraggebers",
  body: [
    "Der Auftraggeber stellt rechtzeitig, vollständig und unentgeltlich alles bereit, was zur Leistungserbringung erforderlich ist: Zugänge zu Domain, Hosting, Shopify, Google-Diensten und sonstigen Konten, Geräte- und Lieferantendaten, Bilder, Inhalte, Rechtstexte sowie sämtliche Freigaben. Er benennt einen Ansprechpartner mit Entscheidungsbefugnis.",
    "Freigaben und Rückmeldungen erfolgen innerhalb von zehn Werktagen nach Anforderung in Textform.",
    "Der Auftraggeber sichert zu, dass er an allen beigestellten Inhalten — insbesondere Texten, Bildern, Marken und Daten — die erforderlichen Rechte hält. Er stellt den Auftragnehmer von Ansprüchen Dritter frei, die aus der vertragsgemäßen Verwendung beigestellter Inhalte erhoben werden, einschließlich angemessener Kosten der Rechtsverteidigung.",
    "Verzögert sich die Mitwirkung, verschieben sich vereinbarte Zeiträume mindestens um die Dauer der Verzögerung zuzüglich einer angemessenen Wiederanlaufzeit. Nachweislich entstandener Mehraufwand — insbesondere Leerlauf und erneute Einarbeitung — wird nach § 2 Abs. 3 vergütet; Ansprüche aus § 642 BGB bleiben unberührt.",
    "Kommt der Auftraggeber seiner Mitwirkung trotz Fristsetzung von 14 Tagen in Textform länger als 30 Tage nicht nach, ist der Auftragnehmer berechtigt, den Vertrag nach § 643 BGB zu kündigen. Es gilt dann § 15 Abs. 4.",
  ],
}

const K_TERMINE: ContractClause = {
  title: "Termine",
  body: [
    "Die in Anlage 1 genannten Zeiträume sind Planwerte und keine Fixtermine. Verbindlich ist ein Termin nur, wenn er in Textform ausdrücklich als Fixtermin bezeichnet wurde.",
    "Vertragsstrafen sind nicht vereinbart.",
    "Ereignisse außerhalb des Einflussbereichs des Auftragnehmers — insbesondere Störungen, Änderungen oder Ausfälle bei Drittanbietern, Netzausfälle, behördliche Maßnahmen, Krankheit und höhere Gewalt — verlängern die Leistungszeit um die Dauer der Behinderung zuzüglich einer angemessenen Wiederanlaufzeit.",
  ],
}

const K_GEWAEHRLEISTUNG: ContractClause = {
  title: "Gewährleistung",
  body: [
    "Ein Mangel liegt vor, wenn das Werk von der in Anlage 1 vereinbarten Beschaffenheit abweicht. Kein Mangel sind insbesondere: nachträgliche Änderungswünsche, Fehler aus beigestellten Inhalten oder Daten, Eingriffe des Auftraggebers oder Dritter, Änderungen oder Ausfälle bei Drittanbietern, unsachgemäße Nutzung sowie Folgen unterlassener Aktualisierungen außerhalb einer laufenden Betreuung.",
    "Der Auftraggeber zeigt offensichtliche Mängel innerhalb von zehn Werktagen nach Abnahme, verdeckte Mängel unverzüglich nach Entdeckung in Textform an. Die Anzeige hat den Mangel und, soweit möglich, den Weg zu seiner Nachvollziehbarkeit zu beschreiben.",
    "Der Auftragnehmer leistet zunächst Nacherfüllung. Erst wenn die Nacherfüllung zweimal fehlgeschlagen ist oder er sie ernsthaft und endgültig verweigert, stehen dem Auftraggeber die weiteren gesetzlichen Rechte zu.",
    "Stellt sich heraus, dass eine gemeldete Störung nicht auf einem Mangel beruht, kann der Auftragnehmer den Aufwand für Prüfung und Behebung nach § 2 Abs. 3 berechnen, sofern der Auftraggeber dies erkennen konnte.",
    "Die Verjährungsfrist für Mängelansprüche beträgt zwölf Monate ab Abnahme. Dies gilt nicht bei Arglist, bei Vorsatz und grober Fahrlässigkeit sowie bei Ansprüchen wegen Verletzung des Lebens, des Körpers oder der Gesundheit; insoweit gelten die gesetzlichen Fristen.",
    "Beschaffenheits- oder Haltbarkeitsgarantien werden nur übernommen, wenn sie in Textform ausdrücklich als „Garantie“ bezeichnet sind.",
  ],
}

const K_HAFTUNG: ContractClause = {
  title: "Haftung",
  body: [
    "Der Auftragnehmer haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit, für die Verletzung des Lebens, des Körpers oder der Gesundheit, bei Arglist, im Rahmen einer übernommenen Garantie sowie nach dem Produkthaftungsgesetz.",
    "Bei einfacher Fahrlässigkeit haftet der Auftragnehmer nur für die Verletzung wesentlicher Vertragspflichten, also solcher Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Auftraggeber regelmäßig vertrauen darf. In diesem Fall ist die Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt.",
    "Für den Verlust von Daten haftet der Auftragnehmer nur bis zu dem Aufwand, der bei ordnungsgemäßer und regelmäßiger Sicherung der Daten für ihre Wiederherstellung angefallen wäre. Der Auftraggeber ist für eine dem Wert der Daten angemessene eigene Datensicherung verantwortlich, solange keine Sicherung durch den Auftragnehmer vereinbart ist.",
    "Der Auftragnehmer haftet nicht für entgangenen Gewinn, ausgebliebene Einsparungen, mittelbare Schäden und Folgeschäden, soweit nicht Abs. 1 eingreift.",
    "Eine Änderung der Beweislast zum Nachteil des Auftraggebers ist mit den vorstehenden Regelungen nicht verbunden. Die Haftungsbeschränkungen gelten auch zugunsten der Erfüllungsgehilfen des Auftragnehmers.",
  ],
}

const K_DATENSCHUTZ: ContractClause = {
  title: "Datenschutz und Auftragsverarbeitung",
  body: [
    "Der Auftraggeber ist Verantwortlicher im Sinne der DSGVO, der Auftragnehmer Auftragsverarbeiter, soweit er personenbezogene Daten im Auftrag verarbeitet. Die Parteien schließen vor Beginn der Verarbeitung die Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO (Anlage 2); sie ist Voraussetzung für den produktiven Betrieb.",
    "Der Auftraggeber verantwortet die Rechtmäßigkeit der Verarbeitung, insbesondere Rechtsgrundlagen, Einwilligungen, Informationspflichten, Verzeichnis der Verarbeitungstätigkeiten und die Beantwortung von Betroffenenanfragen. Der Auftragnehmer unterstützt ihn dabei im Rahmen der Anlage 2.",
    "Der Auftraggeber genehmigt den Einsatz der in Anlage 2 aufgeführten Unterauftragsverarbeiter, insbesondere Hosting-, Shop-, E-Mail- und KI-Dienste. Der Auftragnehmer informiert über beabsichtigte Änderungen; der Auftraggeber kann ihnen nur aus einem wichtigen, datenschutzrechtlichen Grund innerhalb von 14 Tagen widersprechen.",
    "Erfolgt eine Verarbeitung in einem Drittland, geschieht dies auf Grundlage eines Angemessenheitsbeschlusses oder der Standardvertragsklauseln der EU-Kommission nebst ergänzender Maßnahmen.",
    "Der Auftragnehmer trifft angemessene technische und organisatorische Maßnahmen nach Art. 32 DSGVO; sie sind in Anlage 2 beschrieben.",
  ],
}

const K_DRITTANBIETER: ContractClause = {
  title: "Betrieb, Verfügbarkeit und Drittanbieter",
  body: [
    "Eine bestimmte Verfügbarkeit wird nicht geschuldet; ein Service-Level-Agreement ist nicht vereinbart. Der Auftragnehmer bemüht sich, Störungsmeldungen an Werktagen von Montag bis Freitag zwischen 9 und 17 Uhr zu bearbeiten und innerhalb eines Werktags zu reagieren. Es handelt sich um ein Bemühen, nicht um eine zugesicherte Reaktions- oder Wiederherstellungszeit.",
    "Erforderliche Wartungs- und Aktualisierungsarbeiten kann der Auftragnehmer auch mit kurzfristiger Ankündigung durchführen; er legt sie nach Möglichkeit in nutzungsarme Zeiten.",
    "Leistungen, die auf Schnittstellen und Diensten Dritter beruhen — insbesondere Shopify, Kleinanzeigen, Google und KI-Anbieter — können nur im Rahmen der dort jeweils verfügbaren und zulässigen Schnittstellen und Nutzungsbedingungen erbracht werden. Ändert, beschränkt oder beendet ein Anbieter Schnittstelle, Bedingungen oder Funktionsumfang, liegt darin keine Pflichtverletzung des Auftragnehmers. Erforderliche Anpassungen sind Zusatzleistungen nach § 2.",
    "Kosten für Domain, Hosting, Shop-, KI- und sonstige Drittdienste trägt der Auftraggeber unmittelbar gegenüber dem jeweiligen Anbieter. Verträge hierüber schließt er im eigenen Namen.",
  ],
}

const K_VERTRAULICHKEIT: ContractClause = {
  title: "Vertraulichkeit",
  body: [
    "Die Parteien behandeln alle im Rahmen der Zusammenarbeit erlangten nicht offenkundigen Informationen der jeweils anderen Partei — insbesondere Geschäftszahlen, Einkaufspreise, Kundendaten, Quelltext und Konzepte — vertraulich und verwenden sie nur für Zwecke dieses Vertrags.",
    "Ausgenommen sind Informationen, die allgemein bekannt sind, unabhängig entwickelt wurden, rechtmäßig von Dritten erlangt wurden oder aufgrund gesetzlicher oder behördlicher Anordnung offenzulegen sind.",
    "Die Pflicht gilt für die Dauer des Vertrags und drei Jahre über sein Ende hinaus. Das Recht des Auftragnehmers zur Referenznennung nach § 8 Abs. 6 bleibt unberührt.",
  ],
}

const K_SCHLUSS: ContractClause = {
  title: "Schlussbestimmungen",
  body: [
    "Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Dies gilt auch für die Aufhebung dieses Formerfordernisses. Mündliche Nebenabreden bestehen nicht.",
    "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.",
    "Ausschließlicher Gerichtsstand für alle Streitigkeiten aus und im Zusammenhang mit diesem Vertrag ist Heilbronn, sofern der Auftraggeber Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist. Der Auftragnehmer bleibt berechtigt, auch am allgemeinen Gerichtsstand des Auftraggebers zu klagen. Erfüllungsort ist der Sitz des Auftragnehmers.",
    "Die Abtretung von Rechten aus diesem Vertrag bedarf der Zustimmung der anderen Partei; dies gilt nicht für Geldforderungen des Auftragnehmers.",
    "Sollte eine Bestimmung dieses Vertrags unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die Parteien werden die unwirksame Bestimmung durch eine wirksame ersetzen, die dem wirtschaftlich Gewollten am nächsten kommt. Entsprechendes gilt für Regelungslücken.",
    "Die Parteien haben die Regelungen dieses Vertrags einzeln erörtert und ausgehandelt; sie sind keine für eine Vielzahl von Verträgen vorformulierten Bedingungen.",
  ],
}

/**
 * Projektvertrag V-2026-001 — Website, Marke und Verkaufskanal (AN-2026-514).
 * Trägt die individuell vereinbarte Ratenzahlung und die erfolgsabhängige
 * Betreuung; die Warenwirtschaft ist ausdrücklich nicht Gegenstand.
 */
const VERTRAG_WEBSITE: ContractClause[] = [
  {
    title: "Vertragsgegenstand und Vertragsbestandteile",
    body: [
      "Gegenstand dieses Vertrags ist die Herstellung und Überlassung des im Angebot AN-2026-514 vom 23. August 2026 beschriebenen Werks — Website, Marke und Verkaufskanal — sowie die erfolgsabhängige Betreuung nach § 7. Der Festpreis beträgt 5.000,00 € netto.",
      "Die Warenwirtschaft ist nicht Gegenstand dieses Vertrags. Sie wird im Angebot AN-2026-515 gesondert angeboten und, wenn sie beauftragt wird, in einem eigenen Vertrag geregelt.",
      "Vertragsbestandteile sind in dieser Rangfolge: (1) dieser Vertrag, (2) Anlage 1 — Angebot AN-2026-514 nebst Leistungsbeschreibung, (3) Anlage 2 — Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO, (4) in Textform vereinbarte Änderungen nach § 2. Widersprechen sich Bestandteile, geht der jeweils vorrangige vor.",
      "Für die Herstellung des Werks gilt Werkvertragsrecht, für die Betreuung nach § 7 Dienstvertragsrecht.",
      "Es gelten ausschließlich die Bestimmungen dieses Vertrags. Allgemeine Geschäftsbedingungen des Auftraggebers werden nicht Vertragsbestandteil, auch wenn ihnen im Einzelfall nicht ausdrücklich widersprochen wird.",
    ],
  },
  {
    title: "Leistungsumfang, Änderungen und Zusatzleistungen",
    body: [
      "Geschuldet ist ausschließlich der in Anlage 1 beschriebene Leistungsumfang. Eine darüber hinausgehende Beschaffenheit ist nur geschuldet, wenn sie in Textform ausdrücklich vereinbart wurde.",
      "Änderungs- und Erweiterungswünsche teilt der Auftraggeber in Textform mit. Der Auftragnehmer prüft Machbarkeit, Aufwand und Auswirkung auf den Zeitrahmen und unterbreitet ein gesondertes Angebot. Umgesetzt wird erst nach Freigabe in Textform; ohne Freigabe entstehen keine zusätzlichen Kosten und besteht kein Anspruch auf Umsetzung.",
      "Zusatzleistungen ohne gesonderte Preisvereinbarung werden nach tatsächlichem Aufwand zum Regelsatz von 80,00 € netto je Stunde abgerechnet, angefangene Viertelstunden anteilig.",
      "Der Auftragnehmer ist berechtigt, Unterauftragnehmer einzusetzen. Er bleibt dem Auftraggeber gegenüber für die Leistungserbringung verantwortlich.",
      "Die Warenwirtschaft nach Angebot AN-2026-515 kann innerhalb von sechs Monaten nach Abnahme der Website zu dem dort genannten Festpreis beauftragt werden; die Beauftragung erfolgt durch einen eigenen Vertrag. Nach Ablauf dieser Frist wird sie neu kalkuliert. Ohne gesonderte Beauftragung wird sie nicht berechnet.",
    ],
  },
  K_MITWIRKUNG,
  K_TERMINE,
  {
    title: "Abnahme",
    body: [
      "Nach Fertigstellung zeigt der Auftragnehmer die Abnahmebereitschaft in Textform an und fordert zur Abnahme auf. Maßstab sind die in Anlage 1 unter „Wann die Website fertig ist“ beschriebenen Kriterien.",
      "Der Auftraggeber prüft innerhalb von zehn Werktagen ab Zugang der Aufforderung und erklärt die Abnahme in Textform. Verweigert er die Abnahme, hat er dies innerhalb der Frist in Textform unter konkreter Bezeichnung der beanstandeten wesentlichen Mängel zu tun.",
      "Erklärt sich der Auftraggeber innerhalb der Frist nicht oder verweigert er die Abnahme ohne Bezeichnung eines wesentlichen Mangels, gilt die Abnahme mit Fristablauf als erteilt. Auf diese Folge weist der Auftragnehmer in der Abnahmeaufforderung ausdrücklich hin (§ 640 Abs. 2 BGB).",
      "Als Abnahme gilt ferner die Ingebrauchnahme: die Veröffentlichung der Website oder die Verwendung der Arbeitsergebnisse im Geschäftsbetrieb. Wird die Website auf Wunsch des Auftraggebers vor der förmlichen Abnahme veröffentlicht, gilt sie mit der Veröffentlichung als abgenommen.",
      "Unwesentliche Mängel berechtigen nicht zur Verweigerung der Abnahme. Sie werden im Abnahmeprotokoll festgehalten und im Rahmen der Gewährleistung nach § 9 beseitigt.",
      "Gegenstand der Abnahme ist die Website als Ganzes; Teilabnahmen einzelner Seiten oder Funktionen sind nicht vereinbart. Mit der Abnahme beginnt die Frist nach § 9 Abs. 5.",
    ],
  },
  {
    title: "Vergütung, Zahlungsplan und Zahlungsverzug",
    body: [
      "Der Festpreis beträgt 5.000,00 € netto, zuzüglich 19 % Umsatzsteuer 950,00 €, insgesamt 5.950,00 € brutto. Alle weiteren Beträge dieses Vertrags verstehen sich netto zuzüglich der jeweils gesetzlichen Umsatzsteuer.",
      "Abweichend vom Zahlungsplan der Anlage 1 vereinbaren die Parteien individuell die folgende Ratenzahlung: (a) eine erste Zahlung von 2.000,00 € brutto, fällig bis zum 30. September 2026; (b) der verbleibende Betrag von 3.950,00 € brutto in monatlichen Raten von mindestens 500,00 €, fällig jeweils zum Ersten eines Monats, beginnend am 1. März 2027, bis zur vollständigen Tilgung, spätestens jedoch in voller Höhe am 31. Dezember 2027. Höhere Zahlungen und vorzeitige Tilgung sind jederzeit ohne Zusatzkosten möglich.",
      "Abgerechnet wird mit einer einzigen Rechnung über die Gesamtleistung, gestellt mit der Abnahme. Die Zahlungen nach Abs. 2 sind Teilzahlungen auf diese Rechnung; gesonderte Rechnungen je Rate werden nicht erstellt. Zahlungen, die vor Rechnungsstellung eingehen, werden auf sie angerechnet. Die Rechnung nimmt auf den Ratenplan nach Abs. 2 Bezug; dessen Fälligkeiten gehen einem allgemeinen Zahlungsziel der Rechnung vor. Der Auftraggeber gibt bei jeder Überweisung die Rechnungsnummer als Verwendungszweck an.",
      "Die Fälligkeit der Zahlungen nach Abs. 2 folgt unmittelbar aus diesem Vertrag; sie setzt den Zugang einer Rechnung nicht voraus.",
      "Der Auftraggeber erkennt die Forderung aus Abs. 1 dem Grunde und der Höhe nach an. Die Ratenzahlung nach Abs. 2 wird ausschließlich zahlungshalber gewährt und lässt den Bestand der Forderung unberührt.",
      "Gerät der Auftraggeber mit zwei Raten ganz oder teilweise in Verzug oder mit der ersten Zahlung nach Abs. 2 lit. a länger als 14 Tage, wird der gesamte noch offene Restbetrag ohne weitere Mahnung sofort zur Zahlung fällig (Verfallklausel).",
      "Rechnungen sind ohne Abzug innerhalb von 14 Tagen ab Zugang zahlbar, soweit dieser Vertrag keine abweichende Fälligkeit bestimmt; für die Vergütung nach Abs. 1 gilt ausschließlich der Ratenplan nach Abs. 2. Bei Zahlungsverzug schuldet der Auftraggeber Verzugszinsen in Höhe von neun Prozentpunkten über dem Basiszinssatz sowie eine Pauschale von 40,00 € (§ 288 Abs. 2 und 5 BGB); die Geltendmachung eines weitergehenden Schadens bleibt vorbehalten.",
      "Befindet sich der Auftraggeber länger als 14 Tage nach Fälligkeit in Verzug, ist der Auftragnehmer berechtigt, seine Leistungen bis zum vollständigen Zahlungseingang einzustellen; vereinbarte Zeiträume verschieben sich entsprechend. Ferner gilt § 8 Abs. 5.",
      "Der Auftraggeber kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Ein Zurückbehaltungsrecht steht ihm nur wegen Gegenansprüchen aus demselben Vertragsverhältnis zu.",
      "Ein Stundungsentgelt wird für die Ratenzahlung nach Abs. 2 nicht erhoben.",
    ],
  },
  {
    title: "Erfolgsabhängige Betreuung",
    body: [
      "Mit dem Livegang beginnt die erfolgsabhängige Betreuung nach Anlage 1. Eine feste monatliche Pauschale wird nicht geschuldet. Die Vergütung beträgt 15 % des provisionsrelevanten Deckungsbeitrags aus jedem Websitegeschäft, zuzüglich Umsatzsteuer.",
      "Provisionsrelevanter Deckungsbeitrag ist der Nettoerlös abzüglich des direkten Einkaufspreises sowie zurechenbaren Materials, zurechenbarer Instandsetzung und zurechenbarer Fremdleistungen. Nicht abzugsfähig sind Gemeinkosten, kalkulatorische Kosten, eigene Arbeitszeit des Auftraggebers, Rabatte an nahestehende Personen sowie nachträgliche Umbuchungen ohne belegten Grund.",
      "Websitegeschäft ist jeder Auftrag, bei dem Kauf, Anfrage, Formular, Terminbuchung oder ein nachweisbarer Erstkontakt über die Website oder den angebundenen Shop eingegangen ist — auch dann, wenn der bezahlte Auftrag erst später zustande kommt. Für die Zuordnung ist die Herkunftserfassung des Systems maßgeblich. Der Auftraggeber kann einer Zuordnung innerhalb von 14 Tagen nach Zugang der monatlichen Abrechnung in Textform unter Angabe von Gründen widersprechen; danach gilt sie als anerkannt.",
      "Der Auftraggeber stellt bis zum fünften Werktag eines Monats eine Aufstellung der im Vormonat zustande gekommenen Websitegeschäfte mit Nettoerlös, Einkaufspreis, Material, Instandsetzung und Fremdleistungen bereit. Eine aus dem System erzeugte Aufstellung genügt. Kommt er dieser Pflicht trotz Fristsetzung von sieben Tagen in Textform nicht nach, ist der Auftragnehmer berechtigt, die Bemessungsgrundlage zu schätzen; Grundlage ist der Durchschnitt der letzten drei abgerechneten Monate, hilfsweise ein Deckungsbeitrag von 25 % des Nettoerlöses. Die Schätzung gilt als vereinbart, wenn der Auftraggeber ihr nicht binnen 14 Tagen unter Vorlage der Belege substantiiert widerspricht.",
      "Der Auftragnehmer kann jederzeit Auskunft und einen Buchauszug über alle provisionspflichtigen Geschäfte verlangen (entsprechend § 87c HGB). Einmal je Vertragsjahr kann er die Richtigkeit auf eigene Kosten durch einen zur Verschwiegenheit verpflichteten Steuerberater oder Wirtschaftsprüfer prüfen lassen; der Auftraggeber gewährt hierzu Einsicht in die erforderlichen Unterlagen. Ergibt die Prüfung eine Abweichung von mehr als 5 % zulasten des Auftragnehmers, trägt der Auftraggeber die Kosten der Prüfung.",
      "Der Auftraggeber unterlässt Maßnahmen, die darauf gerichtet sind, die Vergütung zu umgehen — insbesondere das Umleiten von Website-Anfragen auf andere Kanäle zum Zweck der Umgehung, das Abschalten oder Verfälschen der Herkunftserfassung sowie das Abschalten der Website bei fortgesetzter Nutzung der übrigen Arbeitsergebnisse. Wird die Herkunftserfassung abgeschaltet oder ihre Nutzung verweigert, gilt Abs. 4 Satz 3 entsprechend.",
      "Geschäfte, die bis zum Vertragsende über die Website angebahnt und innerhalb von sechs Monaten danach abgeschlossen werden, bleiben vergütungspflichtig.",
      "Abgerechnet wird monatlich nachträglich; die Rechnung ist innerhalb von 14 Tagen zahlbar. Storniert ein Kunde oder gibt er zurück, wird der berechnete Anteil mit der nächsten Abrechnung gutgeschrieben.",
      "Die Mindestlaufzeit beträgt 12 Monate ab Livegang. Danach ist die Betreuung von beiden Seiten mit einer Frist von drei Monaten zum Monatsende in Textform kündbar. Das Recht zur Kündigung aus wichtigem Grund bleibt unberührt.",
      "Überträgt der Auftraggeber den Geschäftsbetrieb oder die Website ganz oder teilweise auf einen Dritten, verpflichtet er sich, diesem die Pflichten aus diesem Paragrafen aufzuerlegen. Geschieht dies nicht, schuldet er einen Ablösebetrag in Höhe der durchschnittlichen Monatsvergütung der letzten sechs Abrechnungsmonate multipliziert mit der Zahl der verbleibenden Monate der Mindestlaufzeit, mindestens jedoch sechs Monatsvergütungen.",
    ],
  },
  {
    title: "Nutzungsrechte",
    body: [
      "Mit vollständiger Zahlung der Vergütung räumt der Auftragnehmer dem Auftraggeber das räumlich und zeitlich unbeschränkte Recht ein, die eigens für ihn erstellten Arbeitsergebnisse — Quelltext, Gestaltung, Logo und erzeugte Grafiken — für die eigenen geschäftlichen Zwecke zu nutzen, zu bearbeiten und weiterzuentwickeln. Am Logo und an der individuellen Gestaltung der Website wird dieses Recht ausschließlich eingeräumt.",
      "Nicht übertragen werden Rechte an vorbestehenden und wiederverwendbaren Bestandteilen — insbesondere an Frameworks, Bibliotheken, Komponenten, Datenmodellen, Abgleichmechanismen, Werkzeugen und Vorlagen des Auftragnehmers. Hieran erhält der Auftraggeber ein einfaches, nicht ausschließliches Nutzungsrecht im Rahmen des Werks. Der Auftragnehmer bleibt uneingeschränkt berechtigt, diese Bestandteile sowie das im Projekt erworbene Know-how für andere Projekte zu verwenden.",
      "Inhalte und Software Dritter — insbesondere Open-Source-Bestandteile, Schriften, Karten- und Bildmaterial — unterliegen den Lizenzbedingungen der jeweiligen Rechteinhaber. Erforderliche Lizenzen erwirbt der Auftraggeber auf eigene Kosten und in eigenem Namen.",
      "An Ergebnissen generativer KI-Systeme besteht mangels persönlicher geistiger Schöpfung regelmäßig kein Urheberrecht. Der Auftragnehmer überträgt insoweit alle übertragbaren Rechte, übernimmt jedoch keine Gewähr für deren Ausschließlichkeit oder dafür, dass identische oder ähnliche Ergebnisse Dritten nicht ebenfalls zur Verfügung stehen.",
      "Bis zur vollständigen Zahlung steht dem Auftraggeber lediglich ein widerrufliches Nutzungsrecht zu Test-, Abnahme- und Betriebszwecken zu. Stellt der Auftragnehmer die Website vor vollständiger Zahlung produktiv bereit, geschieht dies aus Kulanz und unter dem Vorbehalt des Widerrufs; ein Anspruch darauf besteht nicht. Befindet sich der Auftraggeber länger als 14 Tage nach Fälligkeit in Verzug, ist der Auftragnehmer berechtigt, das Nutzungsrecht zu widerrufen und die bereitgestellten Arbeitsergebnisse bis zum vollständigen Zahlungseingang abzuschalten oder offline zu nehmen. Ein Schadensersatzanspruch des Auftraggebers besteht insoweit nicht.",
      "Der Auftragnehmer ist berechtigt, das Projekt unter Nennung von Name, Logo und Abbildungen als Referenz zu verwenden und in eigenen Medien darüber zu berichten. Der Auftraggeber kann dem in Textform widersprechen; bereits erschienene Veröffentlichungen bleiben davon unberührt.",
      "Der Auftragnehmer darf im Fußbereich der Website einen dezenten Urheberhinweis mit Verlinkung anbringen.",
    ],
  },
  K_GEWAEHRLEISTUNG,
  K_HAFTUNG,
  K_DATENSCHUTZ,
  {
    title: "Rechtstexte, Barrierefreiheit und Sichtbarkeit",
    body: [
      "Der Auftragnehmer erbringt keine Rechtsberatung. Impressum, Datenschutzerklärung, Cookie- und Einwilligungstexte, Shop-AGB, Widerrufsbelehrung und sonstige Rechtstexte stellt der Auftraggeber in eigener Verantwortung bereit; der Auftragnehmer bindet sie technisch ein. Für Inhalt, Vollständigkeit und Rechtmäßigkeit dieser Texte haftet der Auftragnehmer nicht.",
      "Geschuldet ist eine barrierearme technische Umsetzung nach anerkannten Grundsätzen — insbesondere semantisches Markup, Tastaturbedienbarkeit, ausreichende Kontraste und Alternativtexte für beigestellte Bilder. Eine Konformität nach dem Barrierefreiheitsstärkungsgesetz (BFSG), der BITV oder der EN 301 549 wird nicht zugesichert. Konformitätsprüfung, Erklärung zur Barrierefreiheit sowie darüber hinausgehende Anpassungen sind gesondert zu beauftragen.",
      "Der Auftragnehmer schuldet keine bestimmten Platzierungen in Suchmaschinen, keine Sichtbarkeit in KI-Systemen, keine Reichweiten und keine Umsatz- oder Absatzergebnisse. Zusicherungen hierzu werden nicht abgegeben.",
    ],
  },
  K_DRITTANBIETER,
  K_VERTRAULICHKEIT,
  {
    title: "Laufzeit, Kündigung und Projektabbruch",
    body: [
      "Der Werkvertragsteil endet mit Abnahme und vollständiger Zahlung. Die Betreuung nach § 7 richtet sich nach der dort geregelten Laufzeit.",
      "Der Auftraggeber kann den Werkvertrag nach § 648 BGB jederzeit kündigen. Der Auftragnehmer behält in diesem Fall den Anspruch auf die vereinbarte Vergütung abzüglich ersparter Aufwendungen. Die ersparten Aufwendungen werden pauschal mit 40 % der auf die noch nicht erbrachten Leistungen entfallenden Vergütung angesetzt. Beiden Parteien bleibt der Nachweis vorbehalten, dass die ersparten Aufwendungen tatsächlich höher oder niedriger sind.",
      "Das Recht beider Parteien zur Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für den Auftragnehmer insbesondere vor bei Zahlungsverzug von mehr als 30 Tagen nach Mahnung, bei Eintritt der Zahlungsunfähigkeit oder Stellung eines Insolvenzantrags über das Vermögen des Auftraggebers sowie bei anhaltender Verweigerung der Mitwirkung nach § 3 Abs. 5.",
      "Wird der Vertrag aus Gründen beendet, die der Auftragnehmer nicht zu vertreten hat, rechnet er die bis dahin erbrachten Leistungen nach den kalkulierten Stunden zum Regelsatz von 80,00 € netto je Stunde ab, höchstens jedoch bis zur Höhe des Festpreises nach § 6 Abs. 1. Bereits gezahlte Beträge werden angerechnet. Den erreichten Stand erhält der Auftraggeber nach vollständiger Zahlung samt der Nutzungsrechte nach § 8.",
      "Kündigungen bedürfen der Textform.",
    ],
  },
  K_SCHLUSS,
]

/**
 * Projektvertrag V-2026-002 — Warenwirtschaft und Automatisierung
 * (AN-2026-515). Gleiche Paragrafenfolge wie der Websitevertrag, damit die
 * Verweise zwischen den Klauseln in beiden Verträgen dieselben sind. Kein
 * Ratenplan: 19.000 € laufen über einen Zahlungsplan mit Vorkasse-Anteil.
 */
const VERTRAG_SYSTEM: ContractClause[] = [
  {
    title: "Vertragsgegenstand und Vertragsbestandteile",
    body: [
      "Gegenstand dieses Vertrags ist die Herstellung und Überlassung des im Angebot AN-2026-515 vom 23. August 2026 beschriebenen Werks — Warenwirtschaft und Automatisierung — zum Festpreis von 19.000,00 € netto.",
      "Der Vertrag setzt die Website aus dem Projektvertrag V-2026-001 voraus: Das System bindet die Website als Verkaufskanal an. Ist die Website nicht abgenommen, verschieben sich die Zeiträume dieses Vertrags entsprechend.",
      "Vertragsbestandteile sind in dieser Rangfolge: (1) dieser Vertrag, (2) Anlage 1 — Angebot AN-2026-515 nebst Leistungsbeschreibung, (3) Anlage 2 — Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO, (4) in Textform vereinbarte Änderungen nach § 2. Widersprechen sich Bestandteile, geht der jeweils vorrangige vor.",
      "Für die Herstellung des Werks gilt Werkvertragsrecht.",
      "Es gelten ausschließlich die Bestimmungen dieses Vertrags. Allgemeine Geschäftsbedingungen des Auftraggebers werden nicht Vertragsbestandteil, auch wenn ihnen im Einzelfall nicht ausdrücklich widersprochen wird.",
    ],
  },
  {
    title: "Leistungsumfang, Änderungen und Zusatzleistungen",
    body: [
      "Geschuldet ist ausschließlich der in Anlage 1 beschriebene Leistungsumfang — die dort aufgeführten zwölf Module. Eine darüber hinausgehende Beschaffenheit ist nur geschuldet, wenn sie in Textform ausdrücklich vereinbart wurde.",
      "Änderungs- und Erweiterungswünsche teilt der Auftraggeber in Textform mit. Der Auftragnehmer prüft Machbarkeit, Aufwand und Auswirkung auf den Zeitrahmen und unterbreitet ein gesondertes Angebot. Umgesetzt wird erst nach Freigabe in Textform; ohne Freigabe entstehen keine zusätzlichen Kosten und besteht kein Anspruch auf Umsetzung.",
      "Zusatzleistungen ohne gesonderte Preisvereinbarung werden nach tatsächlichem Aufwand zum Regelsatz von 80,00 € netto je Stunde abgerechnet, angefangene Viertelstunden anteilig.",
      "Der Auftragnehmer ist berechtigt, Unterauftragnehmer einzusetzen. Er bleibt dem Auftraggeber gegenüber für die Leistungserbringung verantwortlich.",
      "Der Festpreis nach § 6 Abs. 1 gilt, wenn dieser Vertrag innerhalb von sechs Monaten nach Abnahme der Website zustande kommt. Danach wird der Leistungsumfang neu kalkuliert.",
    ],
  },
  K_MITWIRKUNG,
  K_TERMINE,
  {
    title: "Abnahme",
    body: [
      "Nach Fertigstellung zeigt der Auftragnehmer die Abnahmebereitschaft in Textform an und fordert zur Abnahme auf. Maßstab sind die in Anlage 1 unter „Wann das System fertig ist“ beschriebenen Kriterien — insbesondere der vollständige Durchlauf eines Vorgangs vom Ankauf bis zur Auswertung.",
      "Der Auftraggeber prüft innerhalb von zehn Werktagen ab Zugang der Aufforderung und erklärt die Abnahme in Textform. Verweigert er die Abnahme, hat er dies innerhalb der Frist in Textform unter konkreter Bezeichnung der beanstandeten wesentlichen Mängel zu tun.",
      "Erklärt sich der Auftraggeber innerhalb der Frist nicht oder verweigert er die Abnahme ohne Bezeichnung eines wesentlichen Mangels, gilt die Abnahme mit Fristablauf als erteilt. Auf diese Folge weist der Auftragnehmer in der Abnahmeaufforderung ausdrücklich hin (§ 640 Abs. 2 BGB).",
      "Als Abnahme gilt ferner die Ingebrauchnahme: die produktive Nutzung des Systems im Geschäftsbetrieb, insbesondere die Führung des Bestands oder die Veröffentlichung von Geräten über das System.",
      "Unwesentliche Mängel berechtigen nicht zur Verweigerung der Abnahme. Sie werden im Abnahmeprotokoll festgehalten und im Rahmen der Gewährleistung nach § 9 beseitigt.",
      "Gegenstand der Abnahme ist das System als Ganzes. Der Auftragnehmer kann die Abnahme des lauffähigen Kernprozesses als Teilabnahme anbieten; sie ist nur wirksam, wenn beide Parteien sie in Textform erklären.",
    ],
  },
  {
    title: "Vergütung, Zahlungsplan und Zahlungsverzug",
    body: [
      "Der Festpreis beträgt 19.000,00 € netto, zuzüglich 19 % Umsatzsteuer 3.610,00 €, insgesamt 22.610,00 € brutto. Alle weiteren Beträge dieses Vertrags verstehen sich netto zuzüglich der jeweils gesetzlichen Umsatzsteuer.",
      "Die Vergütung wird in drei Raten abgerechnet: 40 % bei Vertragsschluss, 30 % bei Erreichen des Zwischenstands — lauffähiger Kernprozess im Testsystem — und 30 % bei Abnahme. Jede Rate wird gesondert in Rechnung gestellt und ist ohne Abzug innerhalb von 14 Tagen ab Zugang der Rechnung zahlbar.",
      "Die Ratenzahlung aus § 6 des Projektvertrags V-2026-001 gilt für diesen Vertrag nicht. Eine abweichende Zahlungsvereinbarung bedarf der Textform.",
      "Der Auftragnehmer beginnt mit der Umsetzung erst nach Eingang der ersten Rate. Zeiträume beginnen mit diesem Eingang.",
      "Bei Zahlungsverzug schuldet der Auftraggeber Verzugszinsen in Höhe von neun Prozentpunkten über dem Basiszinssatz sowie eine Pauschale von 40,00 € (§ 288 Abs. 2 und 5 BGB); die Geltendmachung eines weitergehenden Schadens bleibt vorbehalten.",
      "Befindet sich der Auftraggeber länger als 14 Tage nach Fälligkeit in Verzug, ist der Auftragnehmer berechtigt, seine Leistungen bis zum vollständigen Zahlungseingang einzustellen; vereinbarte Zeiträume verschieben sich entsprechend. Ferner gilt § 8 Abs. 5.",
      "Der Auftraggeber kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Ein Zurückbehaltungsrecht steht ihm nur wegen Gegenansprüchen aus demselben Vertragsverhältnis zu.",
    ],
  },
  {
    title: "Betrieb und Betreuung des Systems",
    body: [
      "Für den Betrieb des Systems wird keine monatliche Grundgebühr geschuldet. Betrieb, Fehlerbehebung, Sicherheitsaktualisierungen, technische Pflege, Überwachung der angebundenen Schnittstellen und kleinere Anpassungen sind von der erfolgsabhängigen Betreuung nach § 7 des Projektvertrags V-2026-001 mit umfasst, solange diese läuft.",
      "Endet die Betreuung nach V-2026-001, endet damit auch die Betreuung des Systems. Ihre Fortführung wird in diesem Fall gesondert vereinbart; ohne Vereinbarung schuldet der Auftragnehmer keine Pflege- oder Betriebsleistung.",
      "Nicht umfasst sind neue Funktionen und Module, umfangreiche Umbauten sowie die Anbindung weiterer Anbieter. Sie sind Zusatzleistungen nach § 2.",
      "Laufende Kosten für Betrieb, Rechenleistung, Speicher und eingesetzte KI-Dienste trägt der Auftraggeber nach § 13 Abs. 4.",
    ],
  },
  {
    title: "Nutzungsrechte",
    body: [
      "Mit vollständiger Zahlung der Vergütung räumt der Auftragnehmer dem Auftraggeber das räumlich und zeitlich unbeschränkte, einfache Recht ein, das System für die eigenen geschäftlichen Zwecke zu nutzen, zu bearbeiten und weiterzuentwickeln. Der Auftraggeber erhält den Quelltext der eigens für ihn erstellten Anwendung.",
      "Nicht übertragen werden Rechte an vorbestehenden und wiederverwendbaren Bestandteilen — insbesondere an Frameworks, Bibliotheken, Komponenten, Datenmodellen, Abgleichmechanismen, Warteschlangen, Bildverarbeitung, Werkzeugen und Vorlagen des Auftragnehmers. Hieran erhält der Auftraggeber ein einfaches, nicht ausschließliches Nutzungsrecht im Rahmen des Werks. Der Auftragnehmer bleibt uneingeschränkt berechtigt, diese Bestandteile sowie das im Projekt erworbene Know-how für andere Projekte zu verwenden; ein Wettbewerbsverbot ist nicht vereinbart.",
      "Die Weitergabe, Vermietung oder Unterlizenzierung des Systems an Dritte sowie sein Vertrieb als eigenes Produkt sind nicht gestattet. Zulässig bleibt die Nutzung durch eigene Mitarbeiter und verbundene Unternehmen des Auftraggebers.",
      "Inhalte und Software Dritter — insbesondere Open-Source-Bestandteile — unterliegen den Lizenzbedingungen der jeweiligen Rechteinhaber. Erforderliche Lizenzen erwirbt der Auftraggeber auf eigene Kosten und in eigenem Namen. An Ergebnissen generativer KI-Systeme besteht mangels persönlicher geistiger Schöpfung regelmäßig kein Urheberrecht; der Auftragnehmer überträgt insoweit alle übertragbaren Rechte, ohne deren Ausschließlichkeit zu gewährleisten.",
      "Bis zur vollständigen Zahlung steht dem Auftraggeber lediglich ein widerrufliches Nutzungsrecht zu Test-, Abnahme- und Betriebszwecken zu. Befindet sich der Auftraggeber länger als 14 Tage nach Fälligkeit in Verzug, ist der Auftragnehmer berechtigt, das Nutzungsrecht zu widerrufen und den Zugang zum System bis zum vollständigen Zahlungseingang zu sperren. Die im System erfassten Daten des Auftraggebers bleiben davon unberührt und werden ihm auf Verlangen in einem gängigen Format herausgegeben.",
      "Der Auftragnehmer ist berechtigt, das Projekt unter Nennung von Name, Logo und Abbildungen als Referenz zu verwenden und in eigenen Medien darüber zu berichten. Der Auftraggeber kann dem in Textform widersprechen; bereits erschienene Veröffentlichungen bleiben davon unberührt.",
    ],
  },
  K_GEWAEHRLEISTUNG,
  K_HAFTUNG,
  K_DATENSCHUTZ,
  {
    title: "Datenbestand, steuerliche Aufzeichnungen und Rechtstexte",
    body: [
      "Das System dient der betrieblichen Steuerung. Eine Konformität mit den GoBD, dem Kassengesetz oder sonstigen steuerlichen Aufzeichnungs- und Aufbewahrungspflichten wird nicht zugesichert; das System ersetzt weder Buchführung noch Kassensystem noch steuerliche Beratung. Der Auftraggeber verantwortet seine steuerlichen Pflichten einschließlich Aufbewahrung und Archivierung.",
      "Der Auftraggeber verantwortet die Richtigkeit und Vollständigkeit der zu übernehmenden Altbestände. Der Auftragnehmer stellt den Import-Assistenten mit Spaltenzuordnung, Dublettenprüfung und Testlauf bereit; er schuldet keine inhaltliche Prüfung, Bereinigung oder Nacherfassung der gelieferten Daten. Aufwand für die Aufbereitung unbrauchbarer Daten ist Zusatzleistung nach § 2 Abs. 3.",
      "Der Auftraggeber erhält jederzeit die Möglichkeit, Bestand, Bewegungsjournal, Verkäufe und Inventur in einem gängigen Format zu exportieren. Für die eigene Datensicherung außerhalb der vereinbarten Sicherung bleibt er verantwortlich.",
      "Der Auftragnehmer erbringt keine Rechtsberatung. Rechtstexte, Kennzeichnungspflichten und Vorgaben für den Verkauf über Drittplattformen verantwortet der Auftraggeber. Er stellt insbesondere sicher, dass die halbautomatische Einstellung bei Kleinanzeigen den dortigen Nutzungsbedingungen entspricht.",
    ],
  },
  K_DRITTANBIETER,
  K_VERTRAULICHKEIT,
  {
    title: "Laufzeit, Kündigung und Projektabbruch",
    body: [
      "Der Vertrag endet mit Abnahme und vollständiger Zahlung. Der Betrieb nach § 7 richtet sich nach der Laufzeit der Betreuung im Projektvertrag V-2026-001.",
      "Der Auftraggeber kann den Vertrag nach § 648 BGB jederzeit kündigen. Der Auftragnehmer behält in diesem Fall den Anspruch auf die vereinbarte Vergütung abzüglich ersparter Aufwendungen. Die ersparten Aufwendungen werden pauschal mit 40 % der auf die noch nicht erbrachten Leistungen entfallenden Vergütung angesetzt. Beiden Parteien bleibt der Nachweis vorbehalten, dass die ersparten Aufwendungen tatsächlich höher oder niedriger sind.",
      "Das Recht beider Parteien zur Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für den Auftragnehmer insbesondere vor bei Zahlungsverzug von mehr als 30 Tagen nach Mahnung, bei Eintritt der Zahlungsunfähigkeit oder Stellung eines Insolvenzantrags über das Vermögen des Auftraggebers sowie bei anhaltender Verweigerung der Mitwirkung nach § 3 Abs. 5.",
      "Wird der Vertrag aus Gründen beendet, die der Auftragnehmer nicht zu vertreten hat, rechnet er die bis dahin erbrachten Leistungen nach den kalkulierten Stunden zum Regelsatz von 80,00 € netto je Stunde ab, höchstens jedoch bis zur Höhe des Festpreises nach § 6 Abs. 1. Bereits gezahlte Beträge werden angerechnet. Den erreichten Stand erhält der Auftraggeber nach vollständiger Zahlung samt der Nutzungsrechte nach § 8.",
      "Kündigungen bedürfen der Textform.",
    ],
  },
  K_SCHLUSS,
]

const contracts: Contract[] = [
  {
    id: "con-2026-001",
    number: "V-2026-001",
    customerId: "c2",
    quoteId: "quo-2026-045",
    projectId: "p-skope",
    status: "draft",
    issueDate: "2026-08-23T10:00:00.000Z",
    // Livegang und damit Beginn der Betreuungslaufzeit stehen erst mit der
    // Abnahme fest — bis dahin bleibt das Feld leer, statt ein Datum zu
    // behaupten, das im Vertrag als Fristbeginn dient.
    title: "Projektvertrag",
    titleAccent: "Website & Verkaufskanal",
    lead: "Rechtlicher Rahmen zum Angebot AN-2026-514 — Abnahme, Zahlung, Rechte, Haftung, Datenschutz und Laufzeit.",
    netValue: 5000,
    attachments: [
      "Anlage 1 — Angebot AN-2026-514 vom 23. August 2026 nebst Leistungsbeschreibung",
      "Anlage 2 — Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO",
    ],
    clauses: VERTRAG_WEBSITE,
    notes:
      "Website verbindlich beauftragt (5.000,00 € netto). Individuell vereinbarte Ratenzahlung in § 6: 2.000,00 € brutto bis 30.09.2026, Rest 3.950,00 € brutto ab 01.03.2027 in Monatsraten von mindestens 500,00 €, spätestens fällig 31.12.2027. Abgerechnet wird mit einer einzigen Rechnung bei Abnahme (2026-433); die Raten sind Teilzahlungen darauf, ihre Fälligkeit folgt aus § 6 Abs. 4 auch ohne Rechnung. Verfallklausel, Schuldanerkenntnis und Abschaltrecht sind die Sicherheit für die Vorleistung. Offen: Antrag auf Istversteuerung nach § 20 UStG.",
    createdAt: "2026-08-23T10:00:00.000Z",
  },
  {
    id: "con-2026-002",
    number: "V-2026-002",
    customerId: "c2",
    quoteId: "quo-2026-046",
    projectId: "p-skope-2",
    // Noch nicht beauftragt: liegt dem Angebot AN-2026-515 bei und wird erst
    // unterschrieben, wenn die Warenwirtschaft beauftragt wird.
    status: "draft",
    issueDate: "2026-08-23T10:00:00.000Z",
    title: "Projektvertrag",
    titleAccent: "Warenwirtschaft & Automatisierung",
    lead: "Rechtlicher Rahmen zum Angebot AN-2026-515 — Abnahme, Zahlungsplan, Rechte, Haftung, Datenschutz und Laufzeit.",
    netValue: 19000,
    attachments: [
      "Anlage 1 — Angebot AN-2026-515 vom 23. August 2026 nebst Leistungsbeschreibung",
      "Anlage 2 — Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO",
    ],
    clauses: VERTRAG_SYSTEM,
    notes:
      "Noch nicht beauftragt. Kein Ratenplan wie beim Websitevertrag: 19.000,00 € netto laufen über 40 % bei Vertragsschluss, 30 % bei lauffähigem Kernprozess, 30 % bei Abnahme — Umsetzungsbeginn erst nach Eingang der ersten Rate (§ 6 Abs. 4). Preisbindung sechs Monate ab Abnahme der Website. Betrieb läuft über die erfolgsabhängige Betreuung aus V-2026-001; endet sie, endet auch die Systembetreuung.",
    createdAt: "2026-08-23T10:00:00.000Z",
  },
]

const transactions: Transaction[] = []

const emails: EmailDraft[] = []
const activities: Activity[] = [
  {
    id: "a-skope-split",
    type: "quote",
    title: "Angebote getrennt — AN-2026-514 Website, AN-2026-515 Warenwirtschaft",
    meta: "5.000,00 € und 19.000,00 € netto · eigene Verträge V-2026-001 und V-2026-002 · ersetzt AN-2026-513",
    customerId: "c2",
    at: "2026-08-23T14:00:00.000Z",
  },
  {
    id: "a-skope-con-002",
    type: "quote",
    title: "Vertrag V-2026-002 entworfen — Warenwirtschaft & Automatisierung",
    meta: "19.000,00 € netto · Zahlung 40/30/30 · zu AN-2026-515",
    customerId: "c2",
    at: "2026-08-23T14:05:00.000Z",
  },
  {
    id: "a-skope-inv-433",
    type: "invoice",
    title: "Rechnung 2026-433 vorbereitet — Website & Verkaufskanal",
    meta: "5.000,00 € netto · gestellt mit der Abnahme · Ratenplan nach § 6 V-2026-001",
    customerId: "c2",
    at: "2026-08-23T14:10:00.000Z",
  },
  {
    id: "a-skope-con-001",
    type: "quote",
    title: "Vertrag V-2026-001 entworfen — Projektvertrag SKOPE",
    meta: "Paket 1 5.000,00 € netto · Ratenzahlung ab 30.09.2026 · zu AN-2026-513",
    customerId: "c2",
    at: "2026-08-23T10:10:00.000Z",
  },
  {
    id: "a-skope-quo-513",
    type: "quote",
    title: "Angebot AN-2026-513 erstellt — SKOPE Digitalisierung, Paket 2 erweitert",
    meta: "24.000,00 € netto · gültig bis 17.09.2026 · ersetzt AN-2026-512",
    customerId: "c2",
    at: "2026-08-18T10:05:00.000Z",
  },
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
    contracts,
    templates,
    emails,
    transactions,
    activities,
    settings,
  }
}
