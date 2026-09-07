# ScaleOS — Der Akquise-Loop, vollständig

Referenz für den Nachbau. Reihenfolge, Feldnamen und Mikrotexte sind so
aufgenommen, wie sie in der Oberfläche stehen; wörtliche Übernahmen stehen in
Anführungszeichen. Wo etwas nicht belegt ist, steht **TODO** — geraten wird
nichts.

---

## 0 · Der Weg durch das Produkt

```
Nische (+ Stadt)  ──►  Firmen suchen  ──►  Firmenliste je Nische
                                              │
                                              ├─ „Analysieren" je Firma
                                              ▼
                                    Akquise-Loop, 5 Stufen
                    Analyse → Angebot → Erstkontakt → Gespräch → Umsetzung
                                              │
                                              ▼
                                 Vertriebs-Pipeline (CRM)
```

Module der linken Navigation: `Dashboard`, `LinkedIn`, `E-Mail`, `Akquise`,
`Lead Scraper`, `Pipeline`, `Rechnungen`, `Group-Calls` (gesperrt im Plan
„Standard"), `Berater`, `Aufgaben`, `Onboarding`, `Profil`.

---

## 1 · Akquise-Übersicht  ·  `/akquise`

**Überschrift:** „Von der Firma zum Auftrag."
**Unterzeile:** „Scale OS analysiert Firmen, baut daraus dein Angebot und führt
dich bis zum fertigen Bauplan."

**Kennzahlen** (rechts, vier Werte): `Nischen` · `Firmen` · `Analysen` ·
`geschätzter Verlust/Monat`. Beispiel: 2 · 19 · 2 · 520 €.

### Neue Akquise starten
- Freitextfeld **Nische** (Komma-Liste, z. B. „Handwerker, Maschinenbau,
  Fitness-Coaching, Verkaufscoaching, Rohbau, Elektrik, E-Scooter-Reparatur,
  Marketing/Logo-Design, Printmedien")
- Feld **Stadt** („Stadt — z. B. Kassel")
- Knopf **„Firmen suchen →"**
- Hilfetext: „Ganze Nische: Sag noch die Stadt — die Firmen sucht Scale OS selbst."
- Nebenknopf **„Nische aus deinem Onboarding"** — übernimmt die im Onboarding
  hinterlegte Zielgruppe
- Aufklapper **„Eigene Firmen oder Suchbegriff"** — manuelle Eingabe statt Suche

### Laufende Akquise
- **„DEIN NÄCHSTER SCHRITT"** — eine einzige Handlung, groß gesetzt:
  „Firmen analysieren" · „Noch 3 freigegebene Analysen, dann steht das Muster."
  · Knopf „Jetzt weitermachen →" · darunter die Nische als Kleintext
- **„GRÖSSTES POTENZIAL"** — Firma, Betrag groß, „geschätzter Verlust pro
  Monat", Link „Firma ansehen →"

### Deine Akquise-Pipelines
„Jede Nische läuft durch denselben klaren Prozess."
Vier Schrittmarken: **1 Firmen · 2 Muster · 3 Urteil · 4 Kontakt**
Je Zeile: Nischenname · „Stadt · N Firmen" · nächste Aktion („Firmen
analysieren" / „Weitere Firmen suchen") · vier Schritt-Punkte (erledigt = Haken)
· Fortschrittsbalken mit „1/17 analysiert".

---

## 2 · Nischen-Ansicht  ·  `/nische/<uuid>`

**Kopf:** Auszeichnung „NISCHE", der Nischenname als Überschrift, darunter
„`Stadt` · `N` Firmen · `Phase`". Beobachtete Phase: **„Entdeckung"**.
**TODO:** weitere Phasenbezeichnungen nicht beobachtet.

**„ALS NÄCHSTES":** „Noch 3 freigegebene Tiefenanalysen, dann steht das Muster
der Nische." — Das Produkt sucht das **Muster einer Nische**, nicht nur den
Einzelfall. Ab drei Analysen behauptet es, den wiederkehrenden Engpass der
Branche zu kennen.

**„GRÖSSTER HEBEL"-Karte:**
- „`<Firma>` verliert" + Betrag in Großschrift + „jeden Monat — `X` € im Jahr"
- Engpass-Titel (z. B. „Terminabstimmung ausschließlich manuell")
- **Zitat-Beleg** mit Zitatzeichen, kursiv abgesetzt, darunter die Herkunft:
  „Von der eigenen Website · `domain.de`" — der Satz von der Website, aus dem
  der Engpass abgeleitet wurde
- Knöpfe: „Weiter zum Angebot" · „Website ↗" · Randnotiz „80 € pro Umsetzungstag"

**Firmentabelle:**
Untertitel: „Sortiert nach Hebel — monatlicher Schaden geteilt durch
Umsetzungsaufwand."
Spalten: Rang · Firmenname · URL bzw. Website-Zitat · Google-Bewertung (★ 4,8) ·
Betrag mit „`X` €/Tag Hebel" · Aktion „Öffnen ↗" (analysiert) bzw.
„Analysieren" (offen).

> **Die zentrale Kennzahl des ganzen Produkts:**
> `Hebel [€/Tag] = monatlicher Schaden [€] ÷ Umsetzungsaufwand [Tage]`
> Danach wird priorisiert — nicht nach Schadenshöhe. Ein 400-€-Engpass mit drei
> Tagen Aufwand rangiert hinter einem 360-€-Engpass mit zwei Tagen.

---

## 3 · Vertriebs-Pipeline  ·  `/pipeline`

**Kopf:** „AGENCY CRM & PM · CRM & Projekt-Hub" — „Vertrieb, Kunden-Auslieferung
und deine gemessenen Akquise-Zahlen an einem Ort."
Drei Bereiche als Umschalter: **VERTRIEB (CRM)** · **DELIVERY (PM)** · **ZAHLEN**.

**Vertriebs-Pipeline:** Ansichten `Übersicht` · `Board` · `Liste`;
Aktionen `EXPORT` · `IMPORTIEREN` · `+ NEUER LEAD`.

**Filterreiter:** „Alle" · „Überfällig" · „Heute fällig" · „Wartet auf Antwort" ·
„Heiße Deals" · **„Kein nächster Schritt"**.

> Der letzte Filter ist der beste Gedanke der ganzen Liste: er findet nicht
> Datensätze mit einem Merkmal, sondern die, bei denen die **Arbeit stehen
> geblieben** ist.

**Weitere Bedienelemente:** Suche „Name oder Firma suchen…", Kanal-Auswahl,
Schalter „Nur fällige", „Gruppieren", Dichte „Kompakt/Komfort", „Spalten".

**Spalten:** `NAME` (Firma + Domain) · `STATUS` (Lead) · `KANAL`
(YouTube / E-Mail / Sonstiges) · `FÄLLIG` (Datum oder Platzhalter „setzen…") ·
`TEMPERATUR` · `AKTUALISIERT` („heute"). Zeilenaktion „→ Antwort".

**Temperatur-Werte:** `—` · `Warm` · `Heiß` · `Ready to Buy`.

---

## 4 · Der Akquise-Loop  ·  `/pipeline/<uuid>`

**Kopf jeder Stufe:** Auszeichnung „AKQUISE-LOOP", Domain als Überschrift,
„Stufe `N` von 5 abgeschlossen", Knöpfe „Website ↗" und „← Pipeline".

**Stufenleiste** (immer sichtbar, erledigte mit Haken):

| # | Stufe | Untertitel |
|---|---|---|
| 1 | Analyse | „Wo die Firma Geld verliert" |
| 2 | Angebot | „Der Business Case" |
| 3 | Erstkontakt | „Die Nachricht" |
| 4 | Gespräch | „Der Leitfaden" |
| 5 | Umsetzung | „Der Plan für die Lieferung" |

**Fuß jeder Stufe:** „Freigegeben" / „Freigabe zurücknehmen", eine
eingeblendete Leiste „Stufe `N` abgeschlossen." mit dem Knopf „→ Weiter zu
‚`nächste Stufe`'", sowie Kurslinks: „Dazu im Kurs: 5.6 Prozessanalyse · 2.5
Zielgruppen Verständnis · Den Berater dazu fragen".

---

### Stufe 1 — Analyse · „Wo die Firma Geld verliert"

**Kopfzeile über dem Inhalt** (drei Angaben, mit Quellenvorbehalt):
- Branche in Klammern aufgeschlüsselt: „Elektrotechnik (Installation,
  Photovoltaik, Elektroprüfungen, Brandmeldetechnik)"
- Ort: „Öhringen (Baden-Württemberg)"
- Größe **mit Beleg und Vorbehalt**: „5 Elektrotechnikermeister laut Startseite
  (‚5 Elektrotechnikermeister', ‚50 gemeinsame Jahre Erfahrung', ‚Fusion im Jahr
  2025'); genaue Mitarbeiterzahl aus Impressum nicht vorliegend, daher nicht
  abschließend bestimmbar"

**Block „GRÖSSTER HEBEL":**
- Engpass-Titel, z. B. „Terminvereinbarung nur telefonisch/manuell"
- Betrag oben rechts, groß: „360 €" / „pro Monat"
- Beschreibungsabsatz: Was passiert, warum es Aufwand erzeugt
- **Beleg-Zeile:** „⊖ Fehlt auf der Website: `<konkreter Befund>`"
- **Vier Kennzahlen nebeneinander:**
  `STUNDEN / MONAT` · `STUNDENSATZ` · `UMSETZUNG` (Tage) · `HEBEL` (€/Tag)
- **Kasten „DAS FRAGST DU IM GESPRÄCH"** (blau umrandet):
  eine Frage plus Schwellenwert — „Wie viele Rückrufe und Terminabstimmungen
  laufen bei Ihnen pro Woche über Telefon? Ab etwa 8-10 pro Woche lohnt sich
  eine Online-Terminbuchung für Erstberatungen."
  Fußnote: *„Die Zahl oben ist geschätzt. Frag sie ab, statt sie zu behaupten —
  dann trägt die Rechnung auch die Rückfrage."*
- **„ANNAHMEN HINTER DIESEN ZAHLEN"** — drei Spiegelstriche, jede Annahme
  einzeln offengelegt, einschließlich ihrer Unsicherheit
- **„Trifft: `<Rolle>`"** — wen der Engpass im Betrieb trifft (Büro/Inhaber)

**Block „WEITERE ENGPÄSSE":**
Rechts oben „alle zusammen `X` € / Monat". Aufklappbare Liste, je Zeile
Engpass-Titel, „`X` €/Tag" und „`Y` €". Aufgeklappt trägt jeder Eintrag
denselben Aufbau wie der Hauptengpass (Beschreibung, Beleg, vier Kennzahlen,
Gesprächsfrage, Annahmen).

Beobachtete Nebenengpässe bei Voltify5:
| Engpass | €/Tag | €/Monat |
|---|---|---|
| Keine Preisangaben oder Leistungspakete online | 270 | 270 |
| Kein systematisches Nachfassen bei wiederkehrenden Prüfungen | 133 | 400 |
| Keine klare Verantwortlichkeit für Anfragebearbeitung erkennbar | 120 | 180 |

**Priorisierungsabsatz** — begründet die Auswahl offen gegen die Alternative:
„Die Terminvereinbarung ohne Online-Buchung hat den größten Hebel, weil sie mit
geringem Umsetzungsaufwand (2 Tage) einen wiederkehrenden monatlichen
Zeitverlust von geschätzt 360 Euro adressiert […]. Das fehlende Nachfassen bei
wiederkehrenden Prüfungen hat zwar den höchsten geschätzten Betrag, betrifft
aber entgangenen Umsatz mit größerer Unsicherheit in der Schätzung […]."

**„PROZESSKETTE DER FIRMA"** — „`2` von `8` belegt".
**TODO:** die acht Glieder der Kette waren zugeklappt, Bezeichnungen liegen
nicht vor.

**Block „WAS DIE WEBSITE NICHT HERGIBT"** (bernsteinfarben umrandet):
Vier bis fünf Spiegelstriche mit den Wissenslücken, danach ein Punkt
„Fragen an die Firma: …" mit vier konkreten Fragen. Fußnote:
*„Diese Punkte gehören ins Erstgespräch. Was du dort klärst, macht aus der
Hypothese einen Befund."*

**Block „KONTAKTDATEN":**
E-Mail und Telefon, je mit Herkunftsangabe („Betriebsadresse · www.voltify5.de")
und Häkchen „übernommen"; Kopierknopf. Hinweis „Die Seite hat zusätzlich ein
Kontaktformular." Fußnote: *„Aus dem öffentlichen Impressum und den
Kontaktseiten gelesen, nicht geraten. Prüf die Adresse, bevor du schreibst — der
erste Eindruck ist einmalig."*

---

### Stufe 2 — Angebot · „Der Business Case"

**Kopfhinweis:** „Der Entwurf kennt deine Leistung nicht — setz ein, was du
wirklich baust." · Knopf „Angebot anpassen".

- **Titel** („Online-Terminbuchung für Erstberatungen – Voltify5") und ein
  Problemabsatz
- **„BUSINESS CASE"** — drei Karten:
  `SCHADEN / MONAT` (360 €) · `SCHADEN / JAHR` (4.320 €) ·
  `INVESTITION EINMALIG` (1.000 € – 2.000 €)
- **Rechenweg** im Klartext: „8 Stunden pro Monat für Rückrufe und
  Terminabstimmung, angesetzt mit einem Stundensatz von 45 Euro […], ergeben 360
  Euro pro Monat bzw. 4.320 Euro pro Jahr."
- **„Rechnerisch amortisiert nach `3` Monaten."**
- **„ANNAHMEN"** — dieselben drei Spiegelstriche wie in Stufe 1
- **„ENTHALTEN"** / **„NICHT ENTHALTEN"** — zwei Spalten, je vier bis fünf
  Punkte. Über der rechten Spalte: *„Ohne Abgrenzung entsteht später Streit.
  Diese Liste gehört ins Angebot."*
- **„PREISRAHMEN"** — Spanne groß, darunter die Herleitung:
  „Die Faustregel von etwa dem Drei- bis Sechsfachen des monatlichen Schadens
  (360 Euro) ergibt eine Spanne von rund 1.080 bis 2.160 Euro. Da die
  Positionierung des Dienstleisters Projekte üblicherweise um 1.000 Euro
  anbietet, wird die Spanne auf 1.000 bis 2.000 Euro angepasst […]."
  Dann **„Woran der Preis kippen kann:"** (bernsteinfarben) mit den Größen, die
  die Rechnung umwerfen. Fußnote: *„Das ist ein Vorschlag aus der Rechnung. Den
  Preis setzt deine Positionierung."*
- **„WAS DIE FIRMA BEISTEUERN MUSS"** — vier Punkte
- **„RAHMEN"** — `ZEITRAHMEN` und `ERFOLGSKRITERIUM`, letzteres messbar
  formuliert: „…die Anzahl der Rückrufe zur reinen Terminfindung sinkt spürbar
  (Vergleich vor/nach Einführung über z. B. 4 Wochen)."

---

### Stufe 3 — Erstkontakt · „Die Nachricht"

**Prüfhinweis vor dem Versand:** „Ist ein konkreter Ansprechpartner bekannt
(Name statt allgemeiner Anrede), und stimmt die Annahme zum Anfragevolumen
(8 Std./Monat) zumindest grob mit dem überein, was auf der Website oder in
Bewertungen sichtbar ist? Beide Punkte erhöhen die Trefferquote der Nachricht
deutlich."

Drei Textbausteine, je mit „Kopieren" und „Bearbeiten":

| Baustein | Grenze | Beobachtet |
|---|---|---|
| LinkedIn — Erstkontakt | 300 Zeichen | 397 — „zu lang, kürzen" (bernsteinfarben) |
| LinkedIn — Nachfassen | 700 Zeichen | 391 |
| E-Mail (mit Betreffzeile) | 1200 Zeichen | 757 |

Unter jedem Baustein: **„Was diese Nachricht unverwechselbar macht: `<Satz>`"**
— der eine Halbsatz, den keine Serienmail enthalten könnte.

- **„ALS E-MAIL VERSENDEN"** — „Legt eine Kampagne für genau diese Firma an —
  mit dem Text oben, nicht mit einer Vorlage. Sie startet als Entwurf; du prüfst
  und schickst ab." · „Geht an `<adresse>`" · Knopf „Kampagne anlegen ↗"
- **„IN DEN OUTREACH ÜBERNEHMEN"** — „Die Nachrichten gehen nicht automatisch
  raus. Kopier die passende Variante und leg sie in deiner LinkedIn-Kampagne ab
  — dort steuerst du Timing und Reihenfolge." · Knopf „Zu LinkedIn ↗"
- **Kontaktdaten** (wie Stufe 1)
- **„Hast du die Nachricht abgeschickt?"** — „Sag es der Software — dann
  erinnert sie dich in 5 Tagen ans Nachfassen. Ohne diesen Klick weiß sie nichts
  davon und kann an nichts erinnern." · Knopf „Verschickt"
- **„DEINE ENTSCHEIDUNG"** — Reflexionsfrage: **„Warum sollte ausgerechnet diese
  Firma dir antworten?"** Überspringbar; dann steht dort „Ohne Antwort
  weitergegangen."

---

### Stufe 4 — Gespräch · „Der Leitfaden"

**Vorspann:** „Kein Skript zum Ablesen. Die Analyse ist eine Hypothese — das
Gespräch prüft sie. Wenn die Diagnosefragen sie widerlegen, ist das ein gutes
Ergebnis, kein schlechtes."

**1. Einstieg** — Ziel benannt („ins Gespräch kommen, ohne dass es wie ein
Verkaufsanruf wirkt. Der Aufhänger ist die Fusion, nicht die Website-Analyse."),
drei Spiegelstriche mit wörtlichen Formulierungen, darunter die Verbote:
„Nicht mit der Lösung anfangen. Nicht mit ‚wir bieten Online-Terminbuchung an'
einsteigen."

**2. Diagnosefragen** — „Reihenfolge: vom Allgemeinen zum Konkreten, damit es
wie ein Gespräch und nicht wie ein Verhör wirkt." Sieben nummerierte Fragen,
danach: „Wichtig: Bei Frage 3 und 4 genau hinhören. Wenn der Engpass hier nicht
bestätigt wird […], ist die Hypothese widerlegt — dann ehrlich sagen, dass der
vermutete Engpass sich nicht bestätigt hat, statt daran festzuhalten."

**3. Die Zahl im Gespräch** — „Die Zahl ist eine Rechnung mit offenen Annahmen,
kein Messergebnis." Danach ein **wörtliches Skript** in Anführungszeichen, das
die Zahl als Frage einführt statt als Behauptung. Drei „Wichtig"-Punkte:
- „Die Zahl als Diskussionsgrundlage anbieten, nicht als Fakt verkaufen."
- „Wenn die reale Zahl niedriger ist, das akzeptieren und die Konsequenz ziehen."
- „Nicht mit Jahreszahl (4.320 Euro) einsteigen, das wirkt aufgeblasen."

**4. Erwartbare Einwände** — vier Einwände wörtlich in Anführungszeichen, je mit
„**Reframe:**". Bemerkenswert: zwei der vier Reframes geben dem Einwand recht
(„Das ist eine legitime Antwort, kein Einwand, der überwunden werden muss.").

**5. Nächster Schritt** — „Am Ende steht keine Unterschrift, sondern eine
Bestätigung oder Widerlegung der Zahlen." Drei Verzweigungen, darunter:
„Wenn Unsicherheit bleibt […]: anbieten, die reale Anfragezahl über zwei Wochen
grob mitzuzählen (z. B. Strichliste im Büro), bevor eine Entscheidung fällt."

**Abbruchkriterium** — wann man **nicht** verkauft, samt wörtlichem Absagesatz.
Schluss: „Kein Umlenken auf einen anderen der vier Engpässe nur um des
Abschlusses willen, außer die Firma bringt von sich aus ein anderes Problem
konkret zur Sprache."

**„DEINE ENTSCHEIDUNG":** „Was ist der wahrscheinlichste Grund, warum dieser
Deal nicht zustande kommt?"

---

### Stufe 5 — Umsetzung · „Der Plan für die Lieferung"

- **„WAS DU LIEFERST"** mit Machbarkeits-Abzeichen oben rechts
  (beobachtet: **„MIT EINARBEITUNG MACHBAR"**; weitere Stufen **TODO**).
  Ein fett gesetzter Satz beschreibt das Liefergegenstand, darunter eine
  ehrliche Einschätzung, wo die Unsicherheit steckt.
- **„WENN DU ES NICHT SELBST BAUST"** (bernsteinfarben) — Handlungsanweisungen
  je nach vorgefundener Technik, mit Fußnote:
  *„Das jetzt zu wissen ist kein Scheitern. Es drei Wochen nach dem Kickoff zu
  merken, wäre eins."*
- **„DAS BRAUCHST DU VOM KUNDEN"** — „Frag alles im Kickoff auf einmal ab. Jede
  Nachfrage später kostet dich Tage." Je Punkt drei Angaben:
  **was** · **„von: `<Rolle>`"** · **„· `<wofür>`"**
- **„MEILENSTEINE"** — nummeriert, je mit prüfbarem Ergebnis und Dauer rechts
  („1 Tag", „0.5 Tage")
- **„DIE ERSTEN TAGE"** — drei nummerierte Handlungen für den Start
- **„ABNAHME"** (grün) — ein Satz, der die Abnahme definiert. Fußnote:
  *„Sag diesen Satz im Kickoff. Was hier nicht steht, ist nicht beauftragt."*
- **„WAS SCHIEFGEHEN KANN"** — je Risiko eine Zeile, darunter
  **„Dann: `<Gegenmaßnahme>`"**
- **„FERTIGER PROMPT FÜR CLAUDE CODE"** — Aufklapper „PROMPT ANZEIGEN", Knopf
  „Prompt kopieren", zweiter Aufklapper „NOCH KEIN CLAUDE CODE? SO RICHTEST DU
  ES EIN" (siehe [`02-n8n-prompt-vorlage.md`](02-n8n-prompt-vorlage.md))
- Fußaktionen: „Kopieren" · „Neu erstellen" · „Bearbeiten" · „Freigeben"

---

## 5 · Wiederkehrende Bausteine der Oberfläche

Diese sechs Muster tragen das Produkt. Sie sind der eigentliche Nachbau-Auftrag:

| Baustein | Zweck | Beispiel |
|---|---|---|
| **Beleg-Zeile** | Jede Behauptung nennt ihre Quelle | „Fehlt auf der Website: …", „Von der eigenen Website · `domain`" |
| **Annahmen-Kasten** | Jede Zahl legt ihre Schätzungen offen | „ANNAHMEN HINTER DIESEN ZAHLEN" |
| **Prüffrage mit Schwelle** | Macht die Hypothese im Gespräch prüfbar | „Ab etwa 8-10 pro Woche lohnt sich …" |
| **Wissenslücken-Kasten** | Benennt, was man *nicht* weiß | „WAS DIE WEBSITE NICHT HERGIBT" |
| **Abbruchkriterium** | Sagt, wann man nicht verkauft | Ende von Stufe 4 |
| **Entscheidungsfrage** | Zwingt zu einem eigenen Urteil | „Warum sollte ausgerechnet diese Firma dir antworten?" |

---

## 6 · Outreach-Module

### E-Mail  ·  `/email`

**Kopf:** „OUTREACH · E-Mail" — „Sequenzen aus deinen eigenen Postfächern.
Antworten stoppen die Sequenz automatisch." · Querlink „Zu LinkedIn".
**Reiter:** `Kampagnen` · `Postfächer` · `Antworten` · `Abgemeldet`.

Über allen Reitern eine bernsteinfarbene Sperrleiste, solange nichts verbunden
ist: „Noch kein Postfach verbunden — es kann nichts rausgehen. `Ansehen`".

| Reiter | Inhalt |
|---|---|
| **Kampagnen** | Feld „Name der Kampagne, z.B. Elektrobetriebe Köln" + „+ Anlegen". Leerzustand: „Eine Kampagne ist eine Abfolge von Mails an eine Liste von Firmen. Antwortet jemand, endet seine Sequenz automatisch." |
| **Postfächer** | „+ Postfach". Leerzustand: „Ohne Postfach kann nichts rausgehen. **Für 200 Mails am Tag brauchst du sieben bis zehn — jedes verträgt 20 bis 30.**" |
| **Antworten** | „Sobald jemand auf eine Kampagnen-Mail antwortet, erscheint sie hier — und seine Sequenz endet automatisch." |
| **Abgemeldet** | „Diese Adressen bekommen nichts mehr — aus keiner Kampagne. Abmeldungen und dauerhaft unzustellbare Adressen landen automatisch hier." Feld + Knopf „Sperren". |

**Kasten „Frisches Postfach? Erst aufwärmen."** — fachlich der wertvollste Text
des Moduls: „Ein neu angelegtes Postfach, das sofort Fremde anschreibt, landet
dauerhaft im Spam. Wärm es zwei bis vier Wochen auf […] — wir empfehlen dafür
**TrulyInbox** (~29 $/Monat, beliebig viele Postfächer). Dein gewachsenes
Geschäftspostfach braucht das nicht: Es startet hier automatisch gedrosselt mit
10 Mails am Tag und steigert sich von selbst."
Fußnote: „Wir arbeiten daran, das Aufwärmen direkt in Scale OS einzubauen — bis
dahin ist der externe Weg der sichere."

### LinkedIn Outreach  ·  `/linkedin`

**Kopf:** „Automatisierte Vernetzung & Follow-ups — ban-sicher gedrosselt."
**Reiter:** `Cockpit` · `Kampagnen` · `Leads` · `Inbox` · `Analytics` ·
`Account & Safety`.

**Cockpit-Leerzustand** — vier Schrittkarten:
1. „Account verbinden" · „Sicher per LinkedIn-Login"
2. „Leads hinzufügen" · „Suche, CSV oder Auto-Refill-Quelle"
3. „Kampagne erstellen" · „Bewährte 4-Step-Sequenz"
4. „Live gehen" · „Leads zuordnen + Kampagne aktivieren"

**„So bleibt dein Account sicher"** — die vier Regeln, wörtlich:
- **Warmup erzwungen:** 14 Tage Ramp (8 → 15 → 20 → voller Cap Anfragen/Tag) —
  überspringbar, wenn das Profil schon warm ist.
- **Harte Tages- und Wochen-Limits + Jitter:** max. 25 Anfragen/Tag und
  ~100/Woche, nur Mo–Fr 08–18 Uhr, zufällige Abstände.
- **Annahmequote ist das Master-Signal:** fällt sie unter 10 %, pausiert das
  System automatisch (Neustart zählt von vorn). Ziel > 40 %.
- **Nur Leute anschreiben, die dich plausibel kennen könnten** — „Kenne ich
  nicht"-Reports sind der #1-Ban-Grund.

**Verbindung:** Weiterleitung auf die LinkedIn-Anmeldung, Feld „Proxy-Land
(ISO)" (Vorgabe `DE`), „Kein Passwort wird bei uns gespeichert."
Fremdanbieter im Unterbau: **Unipile** („Schon bei Unipile eingeloggt, aber hier
nicht verbunden? Verbindung prüfen"), Aufklapper „+ Erweitert (`account_id` /
`li_at`-Cookie)".

> Für einen Nachbau ist das die teuerste Stelle: LinkedIn-Automatisierung
> braucht einen Anbieter wie Unipile plus Wohn-Proxy, und die Sicherheitsregeln
> oben sind kein Beiwerk, sondern die Bedingung dafür, dass das Konto überlebt.
