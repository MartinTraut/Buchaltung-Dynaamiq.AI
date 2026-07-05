# DYNAAMIQ AI Rebrand + Cockpit-Ausbau — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Komplettes Rebranding auf DYNAAMIQ AI (Cyan `#00FFE6` → Blau `#1F7BF2` → Indigo `#3D00FF`) plus Ausbau: Rechnungs-Compliance, iOS-artige Mobile-UX, Pipeline/CRM-Ansichten, Audit-Cleanup.

**Architecture:** Rein clientseitige Next.js-16-App (App Router, Tailwind v4, Tokens in `app/globals.css`, State in `lib/store.tsx`/localStorage). Alle Brand-Werte laufen über CSS-Custom-Properties; Komponenten konsumieren Tokens, nie Hex-Werte. Neue Features folgen bestehenden Mustern (Dialog-Editoren, `useLocalState`, Framer Motion).

**Tech Stack:** Next 16, React 19, Tailwind v4, Framer Motion, dnd-kit, Recharts, ogl (WebGL-Aurora).

**Verifikation:** Kein Test-Runner im Projekt → jede Phase endet mit `npm run build` (muss grün sein) + gezielter Browser-/Viewport-Prüfung (390 px iPhone). Nach jeder Phase ein Commit.

---

## Phase 1 — Rebrand (Tokens, Logo, Aurora, Print-Akzent)

### Task 1.1: Brand-Tokens in `app/globals.css`
**Files:** Modify: `app/globals.css`
- [ ] `--brand-orange/coral/pink/magenta` ersetzen durch `--brand-cyan: #00ffe6`, `--brand-blue: #1f7bf2`, `--brand-indigo: #3d00ff` (+ Alias `--brand-violet: #7c3aed` für Charts). Alte Namen entfernen, alle Verweise projektweit migrieren (`grep -rn "brand-orange\|brand-coral\|brand-pink\|brand-magenta"`).
- [ ] `--primary` → `#00ffe6`-basiert? Nein: `--primary: #1f7bf2` (Buttons brauchen Lesbarkeit mit weißem Text), `--primary-foreground: #ffffff`; `--ring: #00ffe6`.
- [ ] `.text-brand-gradient`/`.bg-brand-gradient`: `linear-gradient(100deg, #00ffe6, #1f7bf2 45%, #3d00ff)`.
- [ ] Chart-Palette: `#00ffe6, #1f7bf2, #3d00ff, #7c3aed, #2fd3a5`.
- [ ] `body::before` Radial-Gradient auf Cyan/Indigo-Tönung, Opazität halbieren (Aurora bleibt führend).
- [ ] `npm run build` grün, visuelle Sichtprüfung Dashboard.
- [ ] Commit `feat(brand): Cyan→Indigo Token-System ersetzt Orange/Magenta`.

### Task 1.2: Aurora-Shader
**Files:** Modify: `components/app-shell/aurora-bg.tsx`
- [ ] Hartkodierte `#ff6a00`/`#e81ccb` (≈ Z.105-106) → `#00ffe6`/`#3d00ff`, Intensität prüfen (Cyan leuchtet stärker → ggf. Alpha senken).
- [ ] Commit.

### Task 1.3: Logo-Assets + Komponente
**Files:** Create: `public/logo-mark.svg`, `public/logo-full.svg` · Modify: `components/brand/logo.tsx`, `app/icon.tsx`, `app/apple-icon.tsx`, Sidebar/Topbar/Settings-Verweise, `components/documents/printable.tsx`
- [ ] Kreis-Wellen-Marke aus Scratchpad-`logo-cyan.svg` (aus `brandmark-design (2).pdf` extrahiert) isolieren: Subline-/Wordmark-Pfade entfernen, viewBox auf Marke croppen, Gradient-Defs behalten.
- [ ] `logo.tsx`: Mark-SVG inline + Wordmark „DYNAAMIQ AI" (Sora, tracking-wide, `.text-brand-gradient`) + Subline „Webdesign & KI-Automatisierung" (klein, muted bzw. Gradient in Print).
- [ ] `app/icon.tsx`/`apple-icon.tsx`: von `logo-mark.png` auf neues SVG/neu gerendertes Mark umstellen (dunkler Grund `#08080a`, Cyan-Marke).
- [ ] Alte PNG-Referenzen (`logo-full.png`, `logo-mark.png`) ersetzen; Dateien erst in Phase 5 löschen.
- [ ] Commit.

### Task 1.4: Print-Akzent + Nav-Aktivfarbe
**Files:** Modify: `components/documents/printable.tsx:13`, `components/app-shell/mobile-nav.tsx`
- [ ] `BRAND = "#ff2d7e"` → `#1f7bf2` (Druck: Indigo/Blau lesbarer als Neon-Cyan auf Weiß; Cyan nur für Verlaufs-Deko).
- [ ] MobileNav `text-brand-pink` → Token (`text-[var(--brand-cyan)]` bzw. neue Utility `text-brand-active`), identisch zur Sidebar-Logik.
- [ ] `npm run build` + Sichtprüfung `/print/invoice/<seed-id>`. Commit `feat(brand): Logo, Aurora, Print auf DYNAAMIQ AI umgestellt`.

## Phase 2 — Rechnungs-Exzellenz

### Task 2.1: Datenmodell + Settings
**Files:** Modify: `lib/types.ts`, `lib/store.tsx`, `lib/seed.ts`, `app/(app)/settings/page.tsx`
- [ ] `Invoice`: `serviceDate?: string` (ISO) + `servicePeriodEnd?: string`; `cancelsInvoiceId?: string`.
- [ ] `CompanySettings`: `smallBusiness: boolean` (Default false), `reminderFee: number` (Default 5), `ownerName: string` (Default „Martin").
- [ ] Settings-UI: Toggle „§19 UStG Kleinunternehmer", Zahlfeld Mahngebühr, Feld Inhaber-Name. Seed ergänzen. Build + Commit.

### Task 2.2: Editor + Print-Pflichtangaben
**Files:** Modify: `components/documents/doc-editor.tsx`, `components/documents/printable.tsx`
- [ ] DocEditor: Feld „Leistungsdatum" (+ optional „bis"), Default = Rechnungsdatum; bei `smallBusiness` USt-Spalte fixiert auf 0 %.
- [ ] Printable: Zeile „Leistungsdatum: …" bzw. „Leistungszeitraum: … – …" in Meta-Tabelle; bei `smallBusiness` statt USt-Aufschlüsselung Pflichttext „Gemäß §19 UStG wird keine Umsatzsteuer berechnet."; Mahnhinweis falls `reminderLevel > 0`.
- [ ] Build + Print-Sichtprüfung + Commit.

### Task 2.3: Storno & Mahngebühr
**Files:** Modify: `lib/store.tsx`, `app/(app)/invoices/page.tsx`
- [ ] `createCancellation(invoiceId)`: dupliziert Rechnung mit negierten Mengen, `cancelsInvoiceId`, Notiz „Stornorechnung zu {no}", setzt Original auf `canceled`; Aktivität loggen.
- [ ] `sendReminder`: Gebühr `settings.reminderFee * level` als eigene LineItem-Position „Mahngebühr (x. Mahnung)" (0 % USt) anhängen statt nur E-Mail-Text.
- [ ] Invoices-Dropdown: Aktion „Stornorechnung erstellen" (nur wenn nicht canceled/draft). Build + Commit.

### Task 2.4: Premium-A4-Layout
**Files:** Modify: `components/documents/printable.tsx`, `app/print/[type]/[id]/page.tsx`
- [ ] Redesign: neues SVG-Logo im Kopf, Gradient-Linie (Cyan→Indigo) als Trenner, klarere Typo-Hierarchie (Dokumenttitel groß, Meta rechtsbündig), Zebra-freie ruhige Positionstabelle, Summenblock mit dezentem Grad-Akzent, 4-Spalten-Footer bleibt.
- [ ] Print-Seite mobil: `.doc-sheet` per `transform: scale(min(1, (100vw-32px)/210mm))` + Wrapper, Toolbar sticky mit „Als PDF speichern" + „Per E-Mail senden".
- [ ] `convertQuoteToInvoice`: `projectId` + Notizen übernehmen (`lib/store.tsx:473`).
- [ ] Build + Sichtprüfung Desktop & 390 px + Commit.

## Phase 3 — Mobile / iOS-Feel

### Task 3.1: Tab-Bar + „Mehr"-Sheet
**Files:** Modify: `components/app-shell/mobile-nav.tsx`, `components/app-shell/nav.ts` · Create: `components/app-shell/more-sheet.tsx`
- [ ] Tabs: Home, CRM, Pipeline, Rechnungen, **Mehr**. „Mehr" öffnet Bottom-Sheet (Framer Motion `y`-Spring, Backdrop-Blur, Drag-to-dismiss) mit Grid aller restlichen Module + Suche-Trigger (öffnet Command-Palette).
- [ ] Safe-Area: `pb-[env(safe-area-inset-bottom)]`, `viewport-fit=cover` im Root-Layout-Viewport-Export.
- [ ] Commit.

### Task 3.2: Dialoge als Bottom-Sheets + Topbar-Suche
**Files:** Modify: `components/ui/dialog.tsx`, `components/app-shell/topbar.tsx`
- [ ] Dialog-Content: unter `sm` von unten einfahren (volle Breite, `rounded-t-2xl`, max-h-[92dvh], innen scrollbar), ab `sm` unverändert zentriert.
- [ ] Topbar: Such-/⌘K-Trigger auch auf Phone sichtbar (Icon-Button).
- [ ] Commit.

### Task 3.3: Tabellen → Karten auf Mobile
**Files:** Modify: `app/(app)/invoices/page.tsx`, `app/(app)/quotes/page.tsx`
- [ ] Unter `md`: Karten-Liste (Kunde, Nummer, Betrag `.tnum`, StatusBadge, Fällig-Datum, Aktions-Dropdown), Touch-Ziele ≥ 44 px. Tabelle bleibt ab `md`.
- [ ] Build + 390 px-Prüfung aller Hauptseiten + Commit.

## Phase 4 — Pipeline & CRM Ansichten

### Task 4.1: Pipeline Kanban/Liste/Timeline
**Files:** Modify: `app/(app)/pipeline/page.tsx`
- [ ] View-Switcher (Segmented Control, `useLocalState("pipeline-view")`): **Kanban** (bestehend), **Liste** (sortierbare Tabelle: Deal, Kunde, Stage, Wert, gewichtet, Owner, Aktion), **Timeline** (Deals gruppiert nach `expectedClose`-Monat, horizontale Monatsspur).
- [ ] Header-Kennzahlen: Conversion Won/(Won+Lost), gewichtete Summe (bestehend), Ø Dealwert. Suche/Owner-Filter über allen Views.
- [ ] Build + Commit.

### Task 4.2: CRM Aktivitäts-Timeline + Liste
**Files:** Modify: `app/(app)/crm/page.tsx`
- [ ] Kunden-Detail-Dialog: Tab/Sektion „Verlauf" — chronologisch gemischte Timeline aus Rechnungen, Angeboten, Deals, E-Mails, Activities des Kunden (Icon + Datum + Betrag/Status, Link zur Quelle).
- [ ] Grid/Liste-Umschalter, Sortierung (Name/Umsatz/zuletzt aktiv), `customerNumber` im CustomerDialog erfassen.
- [ ] Build + Commit.

## Phase 5 — Cleanup & Performance

### Task 5.1: Hardcodes → Settings
**Files:** Modify: `app/(app)/page.tsx:109`, `lib/store.tsx:180,336-349`, `app/(app)/invoices/page.tsx:95,194`, `app/(app)/crm/page.tsx:67`, `app/(app)/quotes/page.tsx:179`, `app/(app)/pipeline/page.tsx:458`, `app/api/ai/route.ts`
- [ ] Gruß, Deal-Owner, E-Mail-Signaturen → `settings.ownerName`/`settings.name`. Reminder-Labels nur noch aus `REMINDER_LABEL`. AI-Route-Ausgabenkategorien an `expenses/page.tsx` `CATEGORIES` angleichen. Toter Ternary `assistant/page.tsx:388` fixen; `txCat`-Reste in `lib/seed.ts` entfernen; `window.confirm` in Settings → `useConfirm`.
- [ ] Build + Commit.

### Task 5.2: Performance
**Files:** Modify: `lib/store.tsx`
- [ ] Context-`value` mit `useMemo` memoizen; localStorage-Write mit 300 ms-Debounce (`useRef`-Timer, flush bei `beforeunload`).
- [ ] Build + Commit.

### Task 5.3: Asset-Hygiene
**Files:** Modify: `.gitignore` · Delete: ungenutzte `public/*.png`, Root-Design-Dateien
- [ ] `public/`: `brandmark-design (1).png`, `Design ohne Titel*.png`, `logo-avatar.png` und — nach Umstellung auf SVG — `logo-full.png`/`logo-mark.png` löschen. Root: `brandmark-design*`, `Design ohne Titel (1).png`, `Grafik Design Dynaamiq (1) Kopie.png`, `AN-261021 (1).pdf` in `brand-assets/` (gitignored) verschieben statt löschen (Quelldateien des Nutzers!). `.DS_Store` + Eintrag in `.gitignore`.
- [ ] Finaler `npm run build` + Gesamtsichtprüfung + Commit.
