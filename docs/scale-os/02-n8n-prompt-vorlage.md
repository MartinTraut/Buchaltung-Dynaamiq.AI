# Der n8n-Prompt am Ende der Pipeline

Stufe 5 („Umsetzung") endet mit dem Block **„FERTIGER PROMPT FÜR CLAUDE CODE"**:

> „Kopieren, in Claude Code einfügen, laufen lassen. Er sucht die passenden
> n8n-Nodes, liest ihre echten Parameter nach, baut den Workflow, validiert ihn
> und lässt einen Testdurchlauf laufen, bevor er Vollzug meldet. Ohne
> eingerichteten n8n-MCP-Server gibt er stattdessen importierbares JSON aus."

Das ist der Übergang von der Beratung in die Lieferung — und der Grund, warum
das Produkt sich „bis zum fertigen Bauplan" nennt.

---

## 1 · Aufbau des Prompts

Dreizehn Abschnitte, immer in dieser Reihenfolge. Die Struktur ist das
Übertragbare, nicht der Voltify5-Inhalt.

| # | Abschnitt | Funktion |
|---|---|---|
| 1 | Auftragssatz | Rolle, Ziel, **„Du triffst keine Rückfragen"**, Umgang mit Lücken |
| 2 | Kontext: Firma und Problem | Firma, Engpass, Kosten **mit Herleitung und Vorbehalt**, Lösung in einem Satz |
| 3 | Auslöser | Trigger-Art, alle Formularfelder, Pflicht/Format |
| 4 | Datenfluss Schritt für Schritt | Nummeriert, ein Schritt pro Zeile, inkl. Abbruchpfaden |
| 5 | Beteiligte Systeme und Zugangsart | Je System: Zugangsart, **wer ihn liefert**, Platzhalter falls er fehlt |
| 6 | Fehlerfälle, die abzufangen sind | Je Fall die konkrete Reaktion |
| 7 | Produktionsreif — verbindliche Vorgaben | Retry, Fehlerpfad, Credentials, Dedupe, Batch, Zeitzone, Benennung |
| 8 | Was der Workflow bewusst NICHT tut | Negative Abgrenzung, deckungsgleich mit „NICHT ENTHALTEN" im Angebot |
| 9 | Vorgehen, das du einhältst | Health-Check → Nodes nachlesen → Vorlagen → bauen → validieren → testen |
| 10 | Abnahmekriterium | Wortgleich mit Stufe 5 „ABNAHME" |
| 11 | Bekannte Risiken | Wortgleich mit Stufe 5 „WAS SCHIEFGEHEN KANN" |
| 12 | Abschlussübergabe | Was am Ende in Klartext auszugeben ist |

**Der stärkste Absatz** ist Nummer 9. Er verbietet drei typische Fehler:

1. *„Suche die passenden Nodes mit `search_nodes` und lies ihre echten Parameter
   mit `get_node` nach. **Erfinde keine Node-Eigenschaften aus dem Gedächtnis.**"*
2. *„Validiere den Workflow vor jeder Ausspielung mit `validate_workflow`. Behebe
   jeden gefundenen Fehler und validiere erneut, bis die Prüfung sauber
   durchläuft."*
3. *„**Melde Vollzug erst, wenn mindestens ein Durchlauf nachweislich grün war.**"*

Dazu drei vorgeschriebene Testfälle: ein gültiger Durchlauf, einer mit
unvollständigen Daten, einer mit dupliziertem Dedupe-Schlüssel.

**Die verbindlichen Technikvorgaben** (Abschnitt 7), unverändert übernehmbar:

- Jede Node zu einem externen System: `retryOnFail`, `maxTries: 3`, 5 s Wartezeit.
- Ein dedizierter Fehlerpfad meldet an eine benannte Rolle. **„Kein stilles
  Scheitern."**
- Zugangsdaten ausschließlich als n8n-Credential, **niemals im Workflow-JSON**.
- Dedupe-Schlüssel aus fachlichen Feldern (hier: E-Mail + Termin-Zeitstempel,
  ISO 8601), geprüft **vor** der schreibenden Aktion.
- Batch nur wo nötig: Größe 10, 1 s Pause.
- Zeitzone durchgängig `Europe/Berlin`; intern ISO 8601, für Menschen
  `TT.MM.JJJJ, HH:mm Uhr`.
- Sprechende Node-Namen **und** eine Notiz je Node: „Der Workflow muss ohne
  Rückfrage an dich von einer anderen Person gewartet werden können."

---

## 2 · Vorlage, parametrisiert

Platzhalter in `{{…}}`. Alles andere steht wörtlich so im Original und
funktioniert branchenunabhängig.

```text
# Prompt für Claude Code – n8n-Workflow für {{FIRMA}}

Du baust in n8n einen produktionsreifen, lauffähigen Workflow für den unten
beschriebenen Anwendungsfall. Du triffst keine Rückfragen an den Nutzer. Wo
Angaben fehlen, nutzt du die im Prompt genannten Annahmen oder Platzhalter, und
du dokumentierst das in der Abschlussübergabe.

## Kontext: Firma und Problem
**Firma:** {{FIRMA}}, {{BRANCHE}} in {{ORT}}. Leistungen: {{LEISTUNGEN}}.
**Engpass:** {{ENGPASS_BESCHREIBUNG}}
**Kosten des Engpasses:** {{BETRAG}} pro Monat. Annahme dahinter (aus der
Analyse übernommen, nicht neu berechnet): {{STUNDEN}} Stunden pro Monat für
{{TÄTIGKEIT}}, Stundensatz {{SATZ}} Euro für {{ROLLE}}. Diese Schätzung beruht
auf {{GRUNDLAGE_ODER_KEINER}}.
**Lösung in einem Satz:** {{LÖSUNG}}

## Auslöser
{{TRIGGER_ART}} mit den Feldern: {{FELDER_MIT_PFLICHT_UND_FORMAT}}
Werte, die sich später ändern könnten, sind als Konfigurationsvariablen
anzulegen, nicht hart in der Logik zu verdrahten.

## Datenfluss Schritt für Schritt
1. … 8. {{NUMMERIERTE_SCHRITTE_INKL_ABBRUCHPFADE}}

## Beteiligte Systeme und Zugangsart
{{JE_SYSTEM: Name — Zugangsart — wer liefert ihn — Platzhalter, falls er fehlt}}
Alle Zugangsdaten ausschließlich als n8n-Credential hinterlegen. Keine Tokens,
Passwörter oder Keys im Workflow-JSON oder in Node-Parametern.

## Fehlerfälle, die abzufangen sind
{{JE_FALL: Auslöser — Reaktion (Retry / Abbruch / Meldung an wen)}}

## Produktionsreif – verbindliche technische Vorgaben
[Abschnitt 7 oben, wörtlich übernehmen]

## Was der Workflow bewusst NICHT tut
{{NEGATIVE_ABGRENZUNG — identisch mit „NICHT ENTHALTEN" im Angebot}}

## Vorgehen, das du einhältst
1. Prüfe zuerst mit `n8n_health_check`, ob der n8n-MCP-Server erreichbar ist.
   Ist er es nicht, baue den Workflow trotzdem vollständig und gib ihn als
   importierbares JSON aus, mit Schritt-für-Schritt-Importanleitung.
2. Suche die Nodes mit `search_nodes`, lies die echten Parameter mit `get_node`
   nach. Erfinde keine Node-Eigenschaften aus dem Gedächtnis.
3. Prüfe mit `search_templates`, ob eine brauchbare Vorlage existiert.
4. Baue den Workflow.
5. Validiere mit `validate_workflow`, behebe jeden Fehler, validiere erneut.
6. Lege ihn mit `n8n_create_workflow` an, teste mit `n8n_test_workflow` gegen
   mindestens drei Fälle (gültig / unvollständig / Dedupe-Treffer) und prüfe das
   Ergebnis über `n8n_executions`.
7. Melde Vollzug erst, wenn mindestens ein Durchlauf nachweislich grün war.

## Abnahmekriterium
{{ABNAHMESATZ}}

## Bekannte Risiken
{{RISIKEN_MIT_GEGENMASSNAHME}}

## Abschlussübergabe (am Ende in Klartext ausgeben)
- Was der Workflow tut, in drei bis vier Sätzen.
- Welche Zugänge noch fehlen bzw. nachgereicht werden müssen.
- Was zu tun ist, wenn der Workflow fehlschlägt: welche Meldung wohin geht und
  wer sie prüfen muss.
- Welche Werte als Annahme eingebaut wurden und vor dem Live-Gang zu bestätigen
  sind.
```

Das vollständige, unveränderte Voltify5-Original liegt in der Sitzung vom
7. September 2026 vor und ist inhaltlich durch die Vorlage oben abgedeckt.

---

## 3 · Einrichtung des n8n-MCP-Servers

Aus dem Aufklapper „NOCH KEIN CLAUDE CODE? SO RICHTEST DU ES EIN":

1. **Claude Code installieren** — läuft im Terminal.
2. **n8n-Konto anlegen und Schlüssel holen** — auf `n8n.io` registrieren, dann
   „unten links auf deinen Namen → Settings → n8n API → Create an API key. Der
   Schlüssel wird nur ein einziges Mal angezeigt, also sofort kopieren."
3. **Claude Code die Verbindung selbst einrichten lassen** — dieser Text wird in
   Claude Code eingefügt:

```text
Richte mir bitte den n8n-MCP-Server für Claude Code ein.
Installier dazu das Paket n8n-mcp und trag den Server in meine MCP-Konfiguration ein.
Meine n8n-Adresse: https://DEINNAME.app.n8n.cloud
Mein API-Schlüssel: DEIN_API_KEY
Prüf danach mit einem Health-Check, ob die Verbindung wirklich steht, und sag mir, ob ich Claude Code neu starten muss.
```

> ⚠️ `DEINNAME` und `DEIN_API_KEY` sind **Platzhalter aus der Anleitung**, keine
> echten Zugangsdaten. Die Einrichtung braucht die tatsächliche Instanz-Adresse
> und einen echten Schlüssel; ohne beides lässt sich nichts verbinden.

**Zwei Fallstricke, die ScaleOS selbst nennt:**
- Taucht `n8n` unter `/mcp` nicht auf: Claude Code einmal neu starten —
  MCP-Server werden beim Start geladen.
- Bei selbst betriebenem n8n ausdrücklich sagen, dass die Instanz auf
  `localhost` läuft. „Sonst blockiert der MCP-Server lokale Adressen aus
  Sicherheitsgründen, und die Meldung sieht so aus, als wäre der Schlüssel
  falsch."

Der zweite Punkt ist derselbe SSRF-Schutz, den wir in `lib/safe-fetch.ts`
eingebaut haben — dort für die Website-Analyse, hier für die n8n-Verbindung.
