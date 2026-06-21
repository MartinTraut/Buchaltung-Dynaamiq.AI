# Dynaamiq OS — Business Cockpit

All-in-One **Buchhaltung · CRM · Pipeline · Projekte · KI-Angebote** für
Dynaamiq AI — Performance Marketing. High-End, dunkel, animiert, im Brand-Look
(Schwarz + Orange→Pink→Magenta).

![Stack](https://img.shields.io/badge/Next.js-16-black) ![TS](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Schnellstart

```bash
npm install
npm run dev
# → http://localhost:3000
```

Die App läuft **sofort** mit realistischen Demo-Daten (gespeichert im Browser via
localStorage). Kein Account, kein Key nötig.

## Module

| Bereich | Funktion |
|---|---|
| **Dashboard** | Live-KPIs, Umsatz/Ausgaben-Chart, Pipeline, Aktivität, Top-Kunden, Aufgaben |
| **CRM & Kontakte** | Kunden/Leads, Tags, Detail mit Umsatz/Deals/Projekten |
| **Pipeline** | Kanban mit Drag & Drop, gewichteter Forecast |
| **Angebote** | Editor, Vorlagen, PDF, → 1-Klick in Rechnung umwandeln |
| **Rechnungen** | Positionen, USt (19/7/0 %), Status, Mahnwesen, PDF-Druck, per E-Mail |
| **Projekte** | Budget vs. Ist, Tasks (todo/doing/done), Status |
| **Buchhaltung** | Einnahmen/Ausgaben, USt-Übersicht, CSV-Export |
| **KI-Assistent** | Angebote/Rechnungen/E-Mails aus natürlicher Sprache → 1-Klick anlegen |
| **E-Mails** | Entwürfe & Versand, Vorlagen, KI-Texte |
| **Vorlagen** | Wiederverwendbare Bausteine (Rechnung/Angebot/E-Mail) |
| **Einstellungen** | Firmendaten, Steuer, Nummernkreise, Bank, Integrationen |

## KI aktivieren (Claude)

Ohne Key läuft der Assistent im **Demo-Modus** (heuristische Antworten, voll
klickbar). Für echte Generierung:

```bash
cp .env.example .env.local
# ANTHROPIC_API_KEY=sk-ant-...  eintragen
npm run dev
```

Der Endpoint `app/api/ai/route.ts` ruft die Claude-API serverseitig auf und gibt
ein strukturiertes Angebot/Rechnung/E-Mail-Objekt zurück, das die App direkt
anlegt. Modell überschreibbar via `AI_MODEL`.

## Cloud-DB (Supabase) — optional

Aktuell wird lokal gespeichert. Für Multi-Device/Cloud:

1. Supabase-Projekt anlegen, `supabase/schema.sql` im SQL-Editor ausführen.
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Daten-Layer (`lib/store.tsx`) auf den Supabase-Adapter umstellen — das
   Datenmodell in `lib/types.ts` ist 1:1 auf das Schema gemappt.

## Tech

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · Custom Design-System (`app/globals.css`)
- **Recharts** (Charts) · **@dnd-kit** (Kanban) · **motion** · **sonner**
- Fonts: **Sora** (Display) · **Manrope** (Body) · **JetBrains Mono** (Zahlen)

## Struktur

```
app/(app)/…        Module-Seiten (Dashboard, CRM, …)
app/print/…        Druck-/PDF-Ansicht für Rechnungen & Angebote
app/api/ai         Claude-Endpoint
lib/types.ts       Datenmodell
lib/store.tsx      State + Persistenz (localStorage, Supabase-ready)
lib/metrics.ts     Abgeleitete Kennzahlen
components/…        UI-Kit, Charts, App-Shell, Brand
```

---
© Dynaamiq AI — Performance Marketing
