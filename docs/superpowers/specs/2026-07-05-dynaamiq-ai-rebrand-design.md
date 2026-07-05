# DYNAAMIQ AI — Rebranding & Ausbau zum Premium-All-in-One-Cockpit

**Datum:** 2026-07-05 · **Status:** Vom Nutzer freigegeben (alle Phasen)

## Entscheidungen (final)

- **Firmenname:** DYNAAMIQ AI
- **Logo-Subline:** „Webdesign & KI-Automatisierung" (ersetzt „Performance Marketing" / „Grafik / Webdesign")
- **Farbwelt:** Dark Cockpit bleibt. Brand-Gradient aus `brandmark-design (2).pdf`:
  - Cyan `#00FFE6` → Electric Blue `#1F7BF2` → Indigo `#3D00FF`
  - Ersetzt vollständig Orange/Coral/Pink/Magenta (`#ff6a00`, `#ff3d6e`, `#ff2d7e`, `#e81ccb`)
  - Gradient-Disziplin: nur CTAs, Logo, aktive Zustände, Chart-Highlights — nicht flächig
- **Logo-Asset:** Kreis-Wellen-Marke als SVG aus dem PDF extrahiert (vektoriell, exakte Verlaufsfarben), Wordmark „DYNAAMIQ AI" + Subline als komponiertes Logo (SVG/Komponente). Ersetzt `logo-mark.png`/`logo-full.png` in Sidebar, Topbar, App-Icon, Favicon, Rechnungskopf.

## Phase 1 — Rebrand

- `app/globals.css`: Brand-Tokens ersetzen (`--brand-*`, `--primary`, `--ring`, `--success`/`--warning` prüfen, Chart-Palette auf Cyan/Blau/Indigo/Violett-Basis), `.text-brand-gradient`/`.bg-brand-gradient` auf neuen Verlauf, `body::before`-Radialgradient umstimmen.
- `components/app-shell/aurora-bg.tsx`: Shader-Farben `#00FFE6`/`#3D00FF` (statt hartkodiert orange/magenta) — Farben als Props/Token.
- `components/brand/logo.tsx`: neues SVG-Logo (Mark + Wordmark „DYNAAMIQ AI" + Subline), `public/logo-*.svg` neu, `app/icon.tsx` + `app/apple-icon.tsx` aktualisieren.
- `components/documents/printable.tsx:13`: Print-Brand-Farbe aus Token statt `#ff2d7e`.
- MobileNav-Aktivfarbe vereinheitlichen (Token statt `text-brand-pink`).
- Alle Referenzen auf alte Brand-Klassen (`brand-orange` etc.) projektweit migrieren.

## Phase 2 — Rechnungs-Exzellenz

- **Pflichtangaben:** Leistungs-/Lieferdatum (`serviceDate` bzw. Zeitraum) in `Invoice`-Typ, Editor und `printable.tsx` (§14 UStG).
- **§19 UStG:** `CompanySettings.smallBusiness`-Toggle in Settings; bei aktiv: kein USt-Ausweis + Pflichttext „Gemäß §19 UStG wird keine Umsatzsteuer berechnet." auf Rechnung/Angebot.
- **Storno/Gutschrift:** Aktion „Stornorechnung erstellen" → neue Rechnung mit negativen Positionen + Referenz „Storno zu RE-…"; Original erhält Status `canceled`.
- **Mahngebühren:** fließen in Gesamtsumme der Mahnstufe ein (konfigurierbarer Betrag in Settings statt hartkodiert `(level-1)*5`).
- **Premium-A4-Layout:** `printable.tsx` neu gestaltet — Cyan-Indigo-Akzente, neues Logo, klarere Typo-Hierarchie, sauberer Footer.
- **PDF/Versand:** Print-Route mobil skalierend; „Per E-Mail senden" erzeugt Entwurf mit Link/Anhang-Hinweis.
- `convertQuoteToInvoice` überträgt `projectId` + Notizen sauber.

## Phase 3 — Mobile / iOS-Feel

- **Bottom-Tab-Bar** (5 Tabs: Home, CRM, Pipeline, Rechnungen, Mehr) + **„Mehr"-Sheet** von unten mit allen restlichen Modulen (Angebote, Projekte, Ausgaben, Buchhaltung, KI, E-Mails, Vorlagen, Einstellungen).
- Dialoge auf Mobile als **Bottom-Sheets** (Framer Motion, 180–350 ms, iOS-Spring-Feel), Safe-Area-Insets (`env(safe-area-inset-*)`).
- Suche/Command-Palette auf Mobile erreichbar (Button in Topbar/Tab-Bar).
- Tabellen (Rechnungen/Angebote) auf Mobile als Karten-Listen.
- `.doc-sheet` (Print-Vorschau) skaliert via `transform: scale()` aufs Viewport.
- Touch-Ziele ≥ 44 px, `overscroll-behavior`, flüssiges Scrolling.

## Phase 4 — Pipeline & CRM Ansichten

- Pipeline: Umschalter **Kanban / Liste / Timeline** (`useLocalState` für Persistenz), Filter (Owner, Suche), Conversion-Kennzahlen im Header.
- CRM: Kunden-Detail mit **Aktivitäts-Timeline** (Rechnungen, Angebote, Deals, E-Mails, Aktivitäten chronologisch), Listen-/Grid-Umschalter, Sortierung, `customerNumber` im Formular.

## Phase 5 — Cleanup & Performance (Audit-Fixes)

- Hardcodes → Settings: „Martin"-Gruß (`page.tsx:109`), Deal-Owner (`store.tsx:180`), E-Mail-Signaturen (4 Stellen) → `settings.ownerName`/`settings.name`.
- `StoreProvider`-`value` memoizen (`useMemo`), localStorage-Writes debouncen.
- Reminder-Labels deduplizieren (nur `REMINDER_LABEL` aus types), Ausgaben-Kategorien AI-Route ↔ Expenses-Seite angleichen, toter Ternary `assistant/page.tsx:388`, `txCat`-Leichen in seed.
- `window.confirm` in Settings → `useConfirm`.
- Ungenutzte PNGs aus `public/` und Design-Quelldateien aus Repo-Root entfernen/ignorieren (`.gitignore`), `.DS_Store` raus.
- Doppelte Hintergrund-Ebenen: CSS-Radialgradient reduzieren, Aurora bleibt führend.

## Nicht in Scope (bewusst)

- Echter E-Mail-Versand (SMTP/API), serverseitige PDF-Generierung, ZUGFeRD/XRechnung, Supabase-Anbindung — Kandidaten für später.
- Neue Marketing-Website (separates Projekt, folgt nach dem Dashboard).

## Erfolgskriterien

- Kein Orange/Magenta-Rest im UI; Logo/Icon/Print konsistent Cyan→Indigo.
- Alle Module auf dem Handy erreichbar und bedienbar (iPhone-Viewport 390 px).
- Rechnung enthält Leistungsdatum, optional §19-Text; Storno-Flow funktioniert.
- `npm run build` grün; Lighthouse-taugliche Performance (keine Dauer-Re-Renders der ganzen App).
