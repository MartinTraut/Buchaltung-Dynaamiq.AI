# Copy-Paste-Prompt: DYNAAMIQ AI Marketing-Website

> In einem NEUEN Terminal/Projekt-Ordner Claude Code starten und den kompletten Block unten einfügen.

---

Baue die offizielle Marketing-Website für **DYNAAMIQ AI** — Webdesign & KI-Automatisierung. Premium-Agentur-Niveau (20–50k€-Anmutung), keine 0815-KI-Website. Lege dafür ein neues Next.js-Projekt in diesem Ordner an.

## 0) Arbeitsweise & Tooling — PFLICHT, bevor du designst

1. Führe zuerst `/find-skills` aus und liste, welche Skills/Plugins für Website-Bau, Design-Review, SEO und Animationen verfügbar sind — nutze die passenden aktiv im Verlauf.
2. Nutze die lokalen Premium-Component-Libraries unter `~/Code/component-libraries/` (zuerst dort suchen, nie blind selbst bauen):
   - `react-bits/src/ts-tailwind/{Backgrounds,Animations,Components}/` → WebGL/Shader-Hero-Backgrounds, Text-Effekte
   - `magicui/apps/www/registry/magicui/` → Marquees, Beams, Reveals, Badges
   - `animata/components/` → Cards, interaktive Blöcke
   - `shadcn-ui/apps/v4/registry/` → Foundational UI
3. Nutze verfügbare MCPs: **21st.dev Magic** (`mcp__magic__*`) für Komponenten-Inspiration/Refinement, **shadcn MCP** für UI-Basis, **HIGGSFIELD MCP** für visuelle Assets: erst `balance` prüfen, dann `generate_image` für Hero-/Section-Visuals (abstrakte, dunkle 3D-Wellen/Partikel im Brand-Verlauf Cyan→Blau→Indigo, fotorealistisch-clean, kein Kitsch) und optional `generate_video` für einen kurzen Hero-Loop. Wenn ein MCP nicht verbunden ist: kurz melden und ohne weitermachen.
4. QA per Browser-Skill (`browse`): Screenshots bei 390 px, 768 px, 1440 px nach jedem größeren Abschnitt.
5. Am Ende: `/council` (falls vorhanden, sonst `/design-review`) über die fertige Seite + `/security-review`.

## 1) Marke (verbindlich, nichts davon ändern)

- Name: **DYNAAMIQ AI** · Subline: **„Webdesign & KI-Automatisierung"** · Inhaber: Martin Traut
- Farbverlauf (einzige Akzente): Cyan `#00FFE6` → Blau `#1F7BF2` → Indigo `#3D00FF` (Verlaufsende nur in Gradients; als UI-lesbares Indigo `#5B2EFF`). Dunkler Grund `#08080a`/`#0b0b10`. KEIN Orange, kein Magenta.
- Logo-Assets liegen fertig hier — kopiere sie ins neue Projekt:
  - `/Users/martintraut/Dokumente/Projekte/Buchaltung-Dynaamiq.AI/public/logo-mark.svg` (Kreis-Wellen-Marke)
  - `/Users/martintraut/Dokumente/Projekte/Buchaltung-Dynaamiq.AI/public/logo-wordmark.svg` („DYNAAMIQ AI"-Schriftzug mit Verlauf)
- Fonts: **Sora** (Display/Headlines) + **Manrope** (Body) via next/font. Fluid Type mit `clamp(MIN, vw+rem, MAX)` für alle Display-Größen.

## 2) Leistungen (echtes Angebot — nichts dazu erfinden)

1. **Webdesign & Websites** — FLAGGSCHIFF, bekommt die größte Bühne: Premium-Websites, Relaunches, conversionstarke Markenauftritte
2. **KI-Automatisierung** — Workflows & Prozesse automatisieren (z. B. Angebote, E-Mails, Backoffice)
3. **KI-Videos & Content** — KI-generierte Videos und visuelle Inhalte
4. **Social-Media-Content** — laufender Content für Kanäle
5. **KI-Telefonassistenten** — Voice-Agents, die Anrufe annehmen und qualifizieren

## 3) Struktur (One-Pager mit Ankern + rechtliche Unterseiten)

Hero (starke Komposition: Wordmark/Claim, animierter Brand-Verlauf-Hintergrund aus react-bits, klare Value Prop + primärer CTA „Projekt anfragen") → Trust-/Logo-Zeile (Platzhalter mit TODO) → Leistungen (Webdesign als große Feature-Section, die vier weiteren als hochwertige Cards) → Prozess (3–4 Schritte: Analyse → Konzept → Umsetzung → Betreuung) → Referenzen/Cases (Struktur bauen, Inhalte als `TODO:` markieren — NICHTS erfinden) → Über/Founder (Martin, kurz, glaubwürdig, TODO für Foto) → FAQ (interview-artig, Long-Tail-Fragen, Antwort beginnt mit der direkten Antwort; 6–8 Fragen zu Website-Kosten/Dauer/Ablauf, KI-Automatisierung, Telefonassistenten) → Kontakt (Formular ohne Backend-Fake: mailto/Formspree-TODO) → Footer. Unterseiten: `/impressum`, `/datenschutz` (Pflichtangaben als TODO-Platzhalter, von mir einzusetzen).

## 4) Design-Sprache: „Als hätte Apple es gebaut"

- Ruhe, Präzision, großzügiger Weißraum; große, souveräne Typo-Hierarchie; Glas-Flächen (`backdrop-blur`, hairline borders `white/10`) statt harter Karten; Tiefenstaffelung und Layering statt Karten-Friedhof
- Motion: dezent und flüssig — Scroll-Reveals, weiche Spring-Transitions (180–450 ms), Hover-Micro-Interactions; `prefers-reduced-motion` respektieren; auf Mobile stabil
- Responsive wie eine native App: Mobile-first, Touch-Ziele ≥ 44 px, Safe-Areas (`viewport-fit=cover` + `env(safe-area-inset-*)`), keine horizontalen Scrolls, Inputs ≥ 16 px (iOS-Zoom)
- Dark als Standard (Markenwelt), Kontraste WCAG AA

## 5) Technik & SEO

- Next.js (App Router) + Tailwind v4 + Framer Motion; saubere Section-Komponenten; optimierte Bilder (`next/image`); Lighthouse-Ziel ≥ 95 Performance/SEO/A11y
- Genau eine H1, saubere H2/H3-Hierarchie, semantisches HTML, Meta Title/Description pro Route, OG-Image im Brand
- **Schema.org JSON-LD als verbundener `@graph` (Pflicht):** Organization/ProfessionalService (DYNAAMIQ AI, founder Martin Traut, Logo, Leistungskatalog als OfferCatalog), WebSite, BreadcrumbList, Service je Leistung, FAQPage (nur dort, wo das FAQ sichtbar ist), `inLanguage: "de"`. Standort-/GEO-Daten als TODO markieren, bis ich Adresse/Einzugsgebiet liefere.
- Keine halluzinierten Fakten: keine erfundenen Kundenzahlen, Bewertungen, Preise, Referenzen — alles Unbekannte als `TODO:` kennzeichnen und mich am Ende gesammelt danach fragen.

## 6) Ablauf

Arbeite in Phasen mit je einem Commit: (1) Setup + Designsystem/Tokens, (2) Hero + Navigation, (3) Sections, (4) FAQ + Rechtliches + Schema, (5) Motion-Feinschliff + Responsive-QA (Screenshots 390/768/1440), (6) Council-/Design-Review + Fixes. Zeig mir nach Phase 2 einen Screenshot, bevor du weiterbaust.
