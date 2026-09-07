# Analyse und Umsetzung in Dynaamiq OS

Neutral betrachtet: was daran wirklich gut ist, was nicht trägt, und wie der
Nachbau aussieht.

---

## 1 · Was ScaleOS richtig macht

**Es verkauft eine Rechnung, keine Meinung.** „Ihre Website könnte besser sein"
ist ein Geschmacksurteil. „Ihnen gehen geschätzt 360 € im Monat für Rückrufe
verloren" ist eine Behauptung, über die man streiten kann — und genau das ist
der Punkt: Sie lädt zum Gegenrechnen ein. Der Gesprächsleitfaden macht daraus
ausdrücklich eine Frage statt einer Aussage.

**Es macht Unsicherheit zum Verkaufsargument statt zum Makel.** Unter jeder Zahl
stehen die Annahmen. Der Satz *„Frag sie ab, statt sie zu behaupten — dann trägt
die Rechnung auch die Rückfrage"* ist die ganze Verkaufsphilosophie in einem
Satz. Wer die Annahme offenlegt, verliert nicht an Autorität, sondern gewinnt
Prüfbarkeit.

**Die Priorisierungskennzahl ist klug gewählt.** Nicht der größte Schaden
gewinnt, sondern `Schaden ÷ Umsetzungstage`. Damit rangiert der 360-€-Engpass
mit zwei Tagen Aufwand (180 €/Tag) vor dem 400-€-Engpass mit drei Tagen
(133 €/Tag). Das ist die richtige Größe: Sie misst, was der Dienstleister pro
Arbeitstag freisetzt.

**Es baut Abbruch ein.** Der Leitfaden endet mit einem Absagesatz und dem
Verbot, ersatzweise einen anderen Engpass zu verkaufen. Ein Vertriebswerkzeug,
das aktiv „nicht verkaufen" sagt, ist selten und schafft genau das Vertrauen,
das den Abschluss trägt.

**Der Filter „Kein nächster Schritt".** Findet nicht Datensätze mit einem
Merkmal, sondern die, bei denen die Arbeit stehen geblieben ist. Genau richtig.

**Die Sicherheitsregeln im Outreach sind ehrlich.** Warmup erzwungen,
Annahmequote als Abschaltsignal, „nur Leute anschreiben, die dich plausibel
kennen könnten". Das ist kein Marketing, das ist Betriebswissen.

---

## 2 · Was nicht trägt

**Der Summenwert „alle zusammen 1.210 € / Monat" ist ökonomisch falsch.**
Er addiert drei verschiedene Größen:

| Engpass | Art | Belastbarkeit |
|---|---|---|
| Terminvereinbarung (360 €) | verlorene **Arbeitszeit** | mittel — Stunden sind schätzbar |
| Preisangaben (270 €) | verlorene **Arbeitszeit** | mittel |
| Nachfassen (400 €) | **entgangener Umsatz** | niedrig — reine Vermutung |
| Verantwortlichkeit (180 €) | verlorene **Arbeitszeit** | sehr niedrig — beruht auf einer Vermutung zur Fusion |

Zeit, die im Betrieb ohnehin bezahlt wird, und Umsatz, der vielleicht nie
existiert hat, sind nicht dieselbe Währung. Die Software weiß das sogar — bei
Engpass 3 steht *„Stundenangabe auf 0 gesetzt, da der Engpass hier nicht als
Zeitverlust, sondern als entgangener Umsatz gerechnet wird"* — und addiert
trotzdem. Wer das im Gespräch als eine Zahl nennt, verliert beim ersten
Nachbohren.

**Punktschätzungen statt Spannen.** Der Prompt nennt es selbst als Risiko
(„Liegt das reale Anfragevolumen höher oder niedriger, ändert sich der
Schaden"), aber die Oberfläche zeigt trotzdem „360 €". Bei 4 statt 8 Stunden
wären es 180 € — und die Faustregel ergäbe 540 bis 1.080 € statt 1.000 bis
2.000 €. Die Preisempfehlung hängt an einer Zahl, die um den Faktor zwei
danebenliegen kann.

**Die Faustregel „3- bis 6-facher Monatsschaden" ist Konvention, wird aber wie
eine Herleitung gesetzt.** Sie kennt weder den eigenen Stundensatz noch den
tatsächlichen Aufwand. Bei zwei Umsetzungstagen zu 80 €/Std. sind 1.000 €
auskömmlich, 2.000 € großzügig — das weiß die Faustregel nicht, es ergibt sich
zufällig.

**Erkannte Fehler werden nicht behoben.** Der LinkedIn-Erstkontakt hatte 397
Zeichen bei einer Grenze von 300. Das System zeigt „zu lang, kürzen" — und
überlässt die Arbeit dem Nutzer, obwohl es den Text selbst geschrieben hat.

**Der Kreis schließt sich nie.** Die Diagnosefragen sollen die Annahmen prüfen —
aber es gibt keinen Ort, an dem die Antwort eingetragen wird und die Rechnung
sich neu ergibt. Aus der Hypothese wird nie ein Befund; sie bleibt eine
Hypothese mit einem Häkchen daneben. **Das ist die größte Lücke.**

**Das Angebot ist Text, kein Dokument.** Kein Nummernkreis, kein Steuerausweis,
keine Vertragsanlage. Für die Übergabe an den Kunden muss es ohnehin noch einmal
irgendwo geschrieben werden.

---

## 3 · Was wir bauen — und warum es besser wird

Der entscheidende Vorteil: **Wir haben, was ScaleOS fehlt.** Ein CRM mit echten
Kunden, ein Angebotsdokument mit Layout und Nummernkreis, eine Kalkulation mit
unserem Regelsatz, einen Marktvergleich (`valuation`), Verträge, Rechnungen,
Aufgaben, Onboarding-Protokolle. ScaleOS endet, wo unser Bestand anfängt.

### 3.1 Neues Modul „Akquise" — die fünf Stufen als Datensatz

Ein neuer Sammlungstyp `analyses` neben `deals`, verknüpft über `customerId`.
Die fünf Stufen als Felder eines Datensatzes, jede einzeln freigebbar — damit
bleibt der Fortschritt sichtbar wie bei ScaleOS, aber der Inhalt lebt in unserem
Bestand statt in fremder Software.

### 3.2 **Spanne statt Punktschätzung** — die wichtigste Verbesserung

Jede Annahme bekommt drei Werte statt einem:

```ts
interface Annahme {
  label: string          // „Stunden pro Monat für Rückrufe"
  min: number            // 4
  wahrscheinlich: number // 8
  max: number            // 14
  quelle: "geschätzt" | "vom Kunden bestätigt" | "gemessen"
  prueffrage: string     // die Frage, die sie bestätigt
}
```

Angezeigt wird dann **„180 – 630 € im Monat, wahrscheinlich 360 €"**. Das ist
nicht schwächer als eine einzelne Zahl, sondern stärker: Es nimmt dem Kunden das
einzige leichte Gegenargument („woher wollen Sie das wissen?") und macht die
Bandbreite selbst zum Gesprächsanlass.

### 3.3 **Zwei getrennte Töpfe, niemals addiert**

`zeitverlust` (belastbar, in Stunden × Satz) und `entgangener_umsatz`
(spekulativ). Getrennt ausgewiesen, jeder mit eigener Konfidenzstufe. Eine
Gesamtsumme gibt es nur innerhalb eines Topfs. Damit ist die eine Stelle
repariert, an der ScaleOS im Gespräch angreifbar ist.

### 3.4 **Belegpflicht technisch erzwungen**

Kein Engpass ohne Zitat aus der Quelle. Der Unterbau steht bereits:
`lib/safe-fetch.ts` holt die Seite mit SSRF-Schutz, `app/api/ai/route.ts` ist
gegen Prompt-Injection gehärtet und ratenbegrenzt. Das Datenmodell verlangt ein
Feld `beleg: { zitat: string; quelle: string }` — ohne das lässt sich der Engpass
nicht speichern.

### 3.5 **Der Kreis schließt sich** — der eigentliche Mehrwert

Die Diagnosefragen aus Stufe 4 landen als **Onboarding-Protokoll** (`onboardings`
existiert bereits). Wird eine Antwort eingetragen, wechselt die zugehörige
Annahme von `geschätzt` auf `vom Kunden bestätigt`, die Spanne schrumpft auf den
bestätigten Wert, und der Schaden wird neu gerechnet. Aus der Hypothese wird ein
Befund — nachvollziehbar, mit Datum.

Das kann ScaleOS strukturell nicht, weil dort das Gespräch nirgendwo hinführt.

### 3.6 **Aus dem Preisrahmen wird ein echtes Angebot**

Statt einer Faustregel rechnen wir mit dem, was wir wissen:
Umsetzungstage × 8 Std. × Regelsatz (80 €) = Selbstkosten; der Preis liegt
zwischen Selbstkosten und dem Sechsfachen des Monatsschadens. Beide Grenzen
werden angezeigt — die Faustregel als Orientierung, die eigene Kalkulation als
Boden.

Ein Knopf erzeugt daraus ein Angebot in unserem **kompakten Layout**
(`layout: "compact"`, drei bis vier Seiten, wie AN-2026-516) mit Nummernkreis,
Steuerausweis, `summary` aus „ENTHALTEN", `terms` aus „RAHMEN" und
„NICHT ENTHALTEN", `payment` aus dem Zahlungsmodell und `valuation` aus dem
Marktvergleich, den wir bereits haben. Das ist der Punkt, an dem unsere
Dokumentenqualität ScaleOS deutlich überlegen ist.

### 3.7 **Aus der Umsetzungsstufe wird ein Projekt**

- Meilensteine → `tasks` mit Fälligkeiten
- „Das brauchst du vom Kunden" → Onboarding-Checkliste mit Rolle und Zweck
- Abnahmekriterium → Klausel im Projektvertrag
- „Was schiefgehen kann" → Risikoliste am Projekt

### 3.8 **Erstkontakt mit harter Grenze**

Die Textbausteine gehen als Entwurf in `emails`. Die Zeichengrenze wird nicht
nur angezeigt, sondern beim Erzeugen eingehalten — ein Text über der Grenze wird
gekürzt neu erzeugt, nicht dem Nutzer zum Kürzen hingelegt.

---

## 4 · Reihenfolge des Baus

| Schritt | Inhalt | Abhängigkeit |
|---|---|---|
| 1 | Datenmodell `analyses` + `Annahme` mit Spannen in `lib/types.ts` | — |
| 2 | Stufe 1 „Analyse": Seite lesen (`safeFetchText`), Engpässe mit Beleg, Annahmen-Spannen, Hebel-Kennzahl | 1 |
| 3 | Stufe 2 „Angebot": Business Case aus den Spannen, Preisrahmen gegen eigene Kalkulation | 2 |
| 4 | **Übergabe ins Angebotsdokument** (kompaktes Layout) | 3 |
| 5 | Stufe 3 „Erstkontakt" → `emails` mit erzwungener Zeichengrenze | 2 |
| 6 | Stufe 4 „Gespräch" → Leitfaden + Rückschreiben ins Onboarding-Protokoll | 2, 5 |
| 7 | Stufe 5 „Umsetzung" → Projekt, Aufgaben, Vertragsklausel | 4 |
| 8 | Nischen-Ansicht mit Hebel-Sortierung und Musterbildung ab drei Analysen | 2 |

**Bewusst nicht nachgebaut:** LinkedIn-Automatisierung (braucht Unipile plus
Wohn-Proxy und ein reales Ban-Risiko) und der E-Mail-Sequenz-Versand (braucht
sieben bis zehn aufgewärmte Postfächer). Beides ist Infrastruktur, kein Wissen —
und beides taugt nicht als Nebenprodukt eines Buchhaltungswerkzeugs.

**Offen, weil Daten fehlen:** Der Firmen-Finder („Nische + Stadt → Firmen").
ScaleOS liefert dazu Google-Bewertungen mit; das deutet auf die Google Places
API hin — kostenpflichtig pro Abfrage und mit eigenen Nutzungsbedingungen.
Verzeichnisse ohne Erlaubnis abgrasen machen wir nicht. **Als offener Punkt
markiert.**

---

## Umsetzungsstand (7. September 2026)

Gebaut und im Betrieb:

- **Verkaufsgespräch als eigener Leitfaden** — `lib/onboarding.ts`,
  `SALES_STEPS`. Fünf Schritte: Kontakt, wie es heute läuft (Anfragen/Monat,
  Auftragswert, Abschlussquote, Wochenstunden für Wiederkehrendes), was es
  kostet nichts zu tun, Entscheidungsweg, Einwände. Die Schlüssel überschneiden
  sich mit dem Onboarding, wo sie dasselbe meinen — wird aus dem Gespräch ein
  Auftrag, steht die Hälfte des Onboardings schon da.
- **Laufende Mitschrift** — `hooks/use-dictation.ts` mit `continuous: true`
  startet die Spracherkennung nach jeder Sprechpause neu, statt nach der ersten
  Denkpause des Kunden still zu enden. Freigeschaltet erst nach bestätigtem
  Hinweis an den Gesprächspartner. Die Auswertung schreibt nur in leere Felder.
- **Engpass-Rechnung** — `lib/analysis.ts`. Der dokumentierte Bauplan ist
  umgesetzt: Spannen statt Punktschätzungen, zwei getrennte Töpfe (gebundene
  Zeit ≠ entgangener Deckungsbeitrag, es gibt bewusst keine Gesamtsumme),
  Herkunft an jeder Annahme („genannt" / „geschätzt" / „bestätigt") und zu
  jeder geschätzten Annahme die Prüffrage, mit der sie sich schließen lässt.
  Reihenfolge über den Hebel in € je Umsetzungstag, nicht über die
  Schadenshöhe. Fehlen Eingaben, wird nicht gerechnet, sondern benannt, was
  fehlt.
- **Geerdeter Assistent** — `lib/briefing.ts` + `/assistant`. Der Zahlenauszug
  (Pipeline nach Stufen, stillstehende Deals, überfällige Rechnungen, offene
  Angebote, Aufgaben, Monatszahlen) geht als Befund mit; die herangezogenen
  Quellen stehen als Marken über der Antwort. Die Startpunkte entstehen aus dem
  echten Bestand und erscheinen nur, wenn es die Zahl gibt.

Noch offen:

- Der Kreis schließt sich noch nicht ganz: eine bestätigte Antwort setzt die
  Annahme noch nicht von „geschätzt" auf „bestätigt" — dafür fehlt die
  Speicherung der Analyse an der Gesprächsakte.
- Die Übergabe der Einordnung ins Angebotsdokument.
- Firmen-Finder (Branche + Ort → Liste). Siehe
  [`04-lead-scraper-und-berater.md`](04-lead-scraper-und-berater.md).
- Bewusst nicht nachgebaut: LinkedIn-Automatisierung und Sequenzversand.
