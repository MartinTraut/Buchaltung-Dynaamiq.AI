"use client"

export type SheetKind = "invoice" | "quote" | "contract"

/**
 * Blatt-Styles für Angebot, Rechnung und Vertrag.
 *
 * Die Regeln standen bis zuletzt in der Druckseite. Seit die Live-Vorschau im
 * Composer dieselben Dokumentkomponenten rendert, müssen beide aus derselben
 * Quelle kommen — sonst sieht der Beleg beim Tippen anders aus als im PDF,
 * und genau das soll die Vorschau ja verhindern.
 *
 * `screenOnly` lässt die @media-print-Regeln weg: im Composer liegt das Blatt
 * in einem App-Fenster, gedruckt wird von der Druckseite aus.
 */
export function DocSheetStyles({
  kind,
  screenOnly = false,
}: {
  kind: SheetKind
  screenOnly?: boolean
}) {
  return <style>{sheetCss(kind, screenOnly)}</style>
}

export function sheetCss(kind: SheetKind, screenOnly = false): string {
  return `
    ${screenOnly ? "" : printCss(kind)}
    /* ── Angebot: feste A4-Seiten mit eigener Fußzeile ──────────────
       Der Seitenrand liegt im Element, nicht in @page — nur so lassen
       sich Fußzeile und Seitenzahl an einer definierten Stelle setzen. */
    .prop-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      padding: 15mm 16mm 13mm;
      margin: 0 auto 8mm;
      background: #fff;
      color: #16161a;
      /* Im Druck muss der Beschnitt bleiben, sonst schiebt ein Überlauf
         eine Geisterseite nach. Am Bildschirm bliebe ein abgeschnittener
         Preisblock dagegen unbemerkt — dort läuft der Inhalt sichtbar über
         und der Rahmen schlägt Alarm. */
      overflow: visible;
      box-shadow: 0 24px 70px rgba(0,0,0,0.45);
      font-family: var(--font-sans), system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Die Fußzeile sitzt unterhalb des Satzspiegels: der Inhaltskasten
       endet 13 mm über der Blattkante, die Trennlinie 12,4 mm — eine volle
       Seite stößt damit an die Linie, läuft aber nicht durch sie hindurch. */
    @media print { .prop-page { overflow: hidden; } }
    .prop-foot {
      position: absolute;
      left: 16mm;
      right: 16mm;
      bottom: 7mm;
      padding-top: 2mm;
      border-top: 0.5pt solid #e6e6ea;
    }
    /* Der Vertrag ist ein fließendes Dokument: er bringt keine festen
       Seiten mit, sondern läuft über so viele, wie er braucht. Am
       Bildschirm liegt er trotzdem auf einem A4-breiten Bogen. */
    .contract-sheet {
      width: 210mm;
      margin: 0 auto;
      background: #fff;
      color: #16161a;
      padding: 16mm 16mm 14mm;
      box-shadow: 0 24px 70px rgba(0,0,0,0.45);
      font-family: var(--font-sans), system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      color: #141d2b;
      padding: 10mm;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 70px rgba(0,0,0,0.45);
      font-family: var(--font-sans), system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  `
}

function printCss(kind: SheetKind): string {
  return `
    @media print {
      /* Ohne diese Zeile malt Chrome den Seitengrund in der dunklen
         App-Farbe — jedes Blatt bekäme einen 16 mm breiten schwarzen
         Rahmen um den Satzspiegel. */
      :root { color-scheme: light; }
      html, body { background: #fff !important; }
      .no-print { display: none !important; }
      .print-root { background: #fff !important; padding: 0 !important; }
      .doc-scale { zoom: 1 !important; }
      .doc-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
      ${
        kind === "contract"
          ? `@page { margin: 16mm 16mm 18mm; size: A4; }
      .contract-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; }
      /* Überschrift nie als letzte Zeile einer Seite, Absatz nicht mit
         einer Waisenzeile beginnen — bei einem Vertrag entscheidet das
         über die Lesbarkeit der Paragrafen. */
      h2 { break-after: avoid; }
      section, p, li { orphans: 3; widows: 3; }`
          : kind === "quote"
            ? `/* Das Angebot bringt seine Ränder selbst mit. */
      @page { margin: 0; size: A4; }
      .prop-page { box-shadow: none !important; margin: 0 !important; break-after: page; }
      .prop-page.prop-last { break-after: auto; }`
            : `/* Wie im PDF-Template: 10 mm Blattrand, den Rest setzt der Beleg
         selbst — nur so reicht das Kopfband bis an den Satzspiegelrand. */
      @page { margin: 10mm; size: A4; }
      /* Satzspiegel = A4 minus @page-Rand. Reicht der Inhalt nicht bis
         unten, schiebt mt-auto den Blattfuß an die Kante; ist er länger,
         gewinnt der Inhalt — min-height bleibt dann wirkungslos. */
      .doc-sheet { min-height: 277mm !important; }
      /* Am Bildschirm darf der Beleg atmen, auf dem Blatt muss er auf eine
         Seite. Dieselbe Verdichtung nimmt das PDF-Template vor. */
      .doc-head { padding-top: 4mm !important; }
      .doc-head-in { padding-bottom: 3mm !important; }
      .doc-specs > div { padding-top: 7px !important; padding-bottom: 6px !important; }
      .doc-body { padding-top: 4mm !important; padding-bottom: 0 !important; }
      .doc-top { margin-top: 6px !important; padding-bottom: 9px !important; }
      .doc-title { margin-top: 8px !important; }
      .doc-items { margin-top: 8px !important; }
      .doc-items thead { display: table-header-group; }
      .doc-items td { padding-top: 8px !important; padding-bottom: 8px !important; }
      .doc-bottom { margin-top: 9px !important; }
      .doc-thanks { margin-top: 6px !important; }
      .doc-legalrow { margin-top: 4px !important; padding-top: 6px !important; }
      .doc-foot { padding-top: 6px !important; }`
      }
      /* Einzelne Aufgaben und Karten bleiben zusammen. Ganze Positionen
         nicht: mit langer Aufgabenliste passen sie sonst auf keine Seite
         mehr und schieben eine halbleere Seite davor. */
      li, .break-inside-avoid { break-inside: avoid; }
    }
  `
}
