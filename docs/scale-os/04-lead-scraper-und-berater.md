# ScaleOS — Lead Scraper und Berater

Nachtrag zu `01-akquise-loop.md`. Beide Module lagen beim ersten Aufnehmen
nicht vor und standen dort als offener Punkt. Aufgenommen am 7. September 2026
aus zwei Bildschirmfotos.

---

## 1 · Lead Scraper (`/lead-scraper`)

Der Zulauf in die Pipeline. Zweizeilige Beschreibung im Produkt:

> **Lead Scraper** — Firmen zu Branche und Ort finden, danach ihre
> Ansprechpartner und Adressen holen.

### Bedienung

Zwei Felder nebeneinander: **Branche** (Platzhalter „z. B. Elektriker") und
**Ort**. Darunter Filterreiter mit Zählern:

| Reiter | Bedeutung |
| --- | --- |
| Alle | alle gefundenen Firmen |
| Noch nicht gescrapt | gefunden, aber Website noch nicht gelesen |
| Ohne Ansprechpartner | gelesen, aber kein Name im Impressum |
| Ohne Adresse | gelesen, aber keine E-Mail |
| Chef mit eigener Adresse | persönliche Adresse statt `info@` gefunden |

Die Tabelle führt **Firma**, **Ansprechpartner** und **Adresse**; unter dem
Firmennamen steht die Domain. Fußzeile: `1 / 1 · 1 gescrapt · 1 mit Adresse`.

### Detailfenster einer Firma

Rechts als Panel. Aufbau von oben nach unten:

1. Firmenname als Überschrift, darunter die Domain als Verweis nach außen.
2. Drei Schaltflächen: **Website öffnen**, **Neu scrapen**, **In der Pipeline**.
3. `Zuletzt gescrapt am 7.9.2026`.
4. **ANSPRECHPARTNER** — bei fehlendem Treffer der ehrliche Satz
   „Im Impressum stand kein Name." statt eines leeren Feldes.
5. **ADRESSEN (n)** — je Adresse eine Zeile, rechts die Einordnung
   („Betriebsadresse", sonst persönliche Adresse).
6. **TELEFON (n)**.
7. **GELESEN AUF (n)** — die tatsächlich abgerufenen Pfade als Marken:
   `www.b4-media.de`, `/impressum`, `/kontakt`.

### Was daran gut ist

- **Punkt 7 ist der eigentliche Wert.** Das Modul zeigt, *woher* jede Angabe
  stammt. Eine Telefonnummer ohne Quelle ist ein Gerücht; eine mit dem Pfad
  `/impressum` ist ein Beleg.
- Leere Felder werden benannt, nicht versteckt.
- Die Filterreiter sind Arbeitszustände, keine Kategorien: „Ohne
  Ansprechpartner" ist eine Aufgabenliste.

### Was für den Nachbau gilt

Zwei Hälften mit sehr verschiedener Rechtslage und Technik:

**a) Firmen finden (Branche + Ort → Liste).** Braucht eine Bezugsquelle.
Google Places ist kostenpflichtig und in den Nutzungsbedingungen eng geführt.
Branchenverzeichnisse ohne Erlaubnis abzugrasen kommt nicht in Frage.
**Offener Punkt — nicht geraten.**

**b) Eine bekannte Website auslesen (Domain → Impressum, Kontakt).** Das ist
für uns machbar und rechtlich unproblematisch: öffentliche Pflichtangaben nach
§ 5 DDG von einer Adresse, die uns genannt wurde. Die Infrastruktur steht
bereits in `lib/safe-fetch.ts` — `safeFetchText` löst den Hostnamen auf, lehnt
interne Ziele ab und folgt Weiterleitungen einzeln geprüft.

Beim Nachbau zu übernehmen:

- Die gelesenen Pfade **mitschreiben und anzeigen**. Ohne sie ist der Datensatz
  nicht überprüfbar.
- Persönliche Adresse von `info@`/`kontakt@` unterscheiden und das kenntlich
  machen.
- Datum des letzten Abrufs führen — Impressumsangaben veralten.
- Keine E-Mail-Adresse in eine Versandliste übernehmen, nur weil sie im
  Impressum steht. Das Impressum erfüllt eine Auskunftspflicht, es ist keine
  Einwilligung.

---

## 2 · Berater (`/berater`)

Ein Chat, der die eigenen Daten kennt. Kopfzeile: **„Dein AI-Berater"**, rechts
ein Kontingentzähler `3/1000`. Links eine Gesprächsliste mit **Neues Gespräch**
und den bisherigen Verläufen unter „HEUTE".

### Leerzustand

> **Hey Dynaamiq.**
> Ich kenne deine Pipeline (19 offen), deine Aufgaben und deine Zahlen.
> Wo greifen wir an?

Darunter fünf Startpunkte als Liste, jeweils mit Symbol:

1. Aus meinen 19 offenen Leads einen Deal machen
2. Welche meiner 4 Aufgaben hat den größten Hebel?
3. Tagesfokus setzen
4. Weekly Review starten
5. Mein Angebot kritisch bewerten

### Antwortverhalten

Über der Antwort stehen die herangezogenen Datenquellen als Marken: `KPIs`,
`Pipeline`. Die Antwort beginnt mit dem Befund aus den echten Zahlen, bevor
sie berät:

> Ok, klares Bild. Bevor wir tiefer einsteigen: **0 KPI-Einträge** in den
> letzten 14 Tagen, aber **19 Leads** in deiner Pipeline — alle im Status
> „lead", keiner bewegt. Das ist der erste Punkt, den wir klären müssen.

Danach eine nummerierte Gliederung („1. Aktivität diese Woche").

### Was daran gut ist

- **Der Leerzustand ist kein Leerzustand.** Statt eines blinkenden Cursors
  stehen dort fünf Fragen, die man tatsächlich hat. Das ist der Unterschied
  zwischen einem Chatfenster und einem Werkzeug.
- **Die Datenquellen stehen über der Antwort.** Man sieht, worauf sie beruht,
  bevor man sie liest.
- **Der Befund kommt vor dem Rat.** „19 Leads, keiner bewegt" ist überprüfbar;
  „du solltest mehr nachfassen" wäre es nicht.
- Die Startpunkte sind nach Zeithorizont sortiert: heute (Tagesfokus), diese
  Woche (Review), grundsätzlich (Angebot bewerten).

### Was für den Nachbau gilt

Wir haben mit `/assistant` bereits ein Zuruf-Feld und mit `/api/ai` die Route
dahinter. Es fehlt die Erdung: der Assistent kennt heute keine Pipeline, keine
offenen Rechnungen und keine Aufgaben.

Zu übernehmen:

- Ein knapper Zahlenauszug als Kontext (offene Deals je Stufe, überfällige
  Rechnungen, Aufgaben ohne nächsten Schritt, Umsatz laufender Monat) — kurz
  genug, dass er in jeden Aufruf passt.
- Die herangezogenen Quellen in der Antwort **anzeigen**.
- Startpunkte aus dem echten Bestand formulieren, mit echten Zahlen im Text.
  Ein Startpunkt „Aus meinen 19 offenen Leads einen Deal machen" ist gut, weil
  die 19 stimmt; „Leads bearbeiten" wäre eine Überschrift.
- Kein Kontingentzähler. Das ist ein Abrechnungsmerkmal des Anbieters, kein
  Nutzen für uns.

Nicht zu übernehmen: die Gesprächsliste als eigenes Archiv. Was aus einem
Gespräch folgt, gehört als Aufgabe oder Vermerk an den Datensatz, nicht in
einen zweiten Verlauf, den niemand wiederliest.
