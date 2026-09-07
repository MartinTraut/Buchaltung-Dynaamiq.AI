# ScaleOS — Nachbau-Dokumentation

Vollständige Aufnahme des **Akquise-Loops** von Scale OS (Sapunov Consulting,
`app.scale-os.de`), erstellt am 7. September 2026 aus 22 Bildschirmfotos eines
echten Durchlaufs (Firma `voltify5.de`, Pipeline `b73e7db3-…`) und dem von dort
exportierten n8n-Prompt.

**Zweck:** Das Abonnement soll kündbar sein, ohne dass Wissen verlorengeht. Was
hier steht, reicht aus, um die Funktion in Dynaamiq OS nachzubauen — Struktur,
Reihenfolge, Feldnamen, Tonfall und Mikrotexte inbegriffen.

## Inhalt

| Datei | Inhalt |
|---|---|
| [`01-akquise-loop.md`](01-akquise-loop.md) | Die fünf Stufen, jedes Feld, jeder Mikrotext — die Referenz für den Nachbau |
| [`02-n8n-prompt-vorlage.md`](02-n8n-prompt-vorlage.md) | Der Claude-Code-Prompt am Ende der Pipeline, in seine Bausteine zerlegt und parametrisiert |
| [`03-analyse-und-umsetzung.md`](03-analyse-und-umsetzung.md) | Was daran gut ist, was nicht trägt, und wie wir es in Dynaamiq OS besser machen |

## Was das Produkt in einem Satz tut

Es nimmt eine Firmen-Website, liest sie aus, benennt **wo die Firma Geld
verliert**, rechnet den Verlust in Euro pro Monat, leitet daraus ein Angebot mit
Preisrahmen ab, schreibt die Erstkontakt-Nachrichten, baut den
Gesprächsleitfaden mit Diagnosefragen und Einwandbehandlung, und liefert am Ende
einen Umsetzungsplan samt fertigem Prompt, der den Automatisierungs-Workflow in
n8n baut.

## Die Grundhaltung, die das Produkt trägt

Das ist der eigentliche Wert, nicht die Oberfläche. Vier Regeln, die sich durch
jede Stufe ziehen:

1. **Jede Zahl trägt ihre Annahme sichtbar mit sich.** Unter jedem Betrag steht
   ein Kasten „Annahmen hinter diesen Zahlen" mit den drei bis vier Schätzungen,
   auf denen er beruht.
2. **Jede Behauptung trägt ihren Beleg.** Jeder Engpass hat eine Zeile
   „Fehlt auf der Website: …" mit dem konkreten Befund, aus dem er stammt.
3. **Zu jeder Hypothese gehört die Frage, die sie prüft** — mit Schwellenwert:
   „Ab etwa 8–10 pro Woche lohnt sich eine Online-Terminbuchung."
4. **Das System sagt aktiv, wann man nicht verkaufen soll.** Der
   Gesprächsleitfaden endet mit einem Abbruchkriterium.

Der wiederkehrende Satz dazu: *„Die Zahl oben ist geschätzt. Frag sie ab, statt
sie zu behaupten — dann trägt die Rechnung auch die Rückfrage."*

## Inhalt

- [`01-akquise-loop.md`](01-akquise-loop.md) — Akquise, Nischen, Pipeline, E-Mail, LinkedIn
- [`02-n8n-prompt-vorlage.md`](02-n8n-prompt-vorlage.md) — der Prompt, zerlegt und parametrisiert
- [`03-analyse-und-umsetzung.md`](03-analyse-und-umsetzung.md) — Bewertung und Bauplan
- [`04-lead-scraper-und-berater.md`](04-lead-scraper-und-berater.md) — Lead Scraper und AI-Berater

## Quelle und Stand

- Aufgenommen: 7. September 2026, Plan „Software — Standard"
- Beispielfirma: Voltify5, Elektrotechnik, Öhringen (Baden-Württemberg)
- Pipeline-URL-Form: `app.scale-os.de/pipeline/<uuid>`
- `Lead Scraper` und `Berater` nachgetragen in
  [`04-lead-scraper-und-berater.md`](04-lead-scraper-und-berater.md).
- Weiterhin nicht aufgenommen: `Group-Calls` (im Plan gesperrt), `Rechnungen`,
  `Profil`. **Als offener Punkt markiert, nicht geraten.**
