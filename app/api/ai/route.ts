import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

interface AiContextCustomer {
  id: string
  company: string
}
interface AiRequest {
  prompt: string
  intent?: "quote" | "invoice" | "email" | "contact" | "expense" | "auto"
  customers: AiContextCustomer[]
  company: { name: string; defaultTaxRate: number; today: string }
}

// ---------------------------------------------------------------------------
// Website analysis — fetch a URL the user pasted and extract a compact brief
// the model can reason about (tech stack, structure, content signals).
// ---------------------------------------------------------------------------
function extractUrls(text: string): string[] {
  const re = /\bhttps?:\/\/[^\s)]+/gi
  const found = text.match(re) ?? []
  // also catch bare domains like "studiovega.de"
  if (found.length === 0) {
    const bare = text.match(/\b([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/gi) ?? []
    return bare.slice(0, 1).map((d) => `https://${d.replace(/^https?:\/\//, "")}`)
  }
  return [...new Set(found)].slice(0, 1)
}

interface SiteBrief {
  url: string
  title: string
  description: string
  headings: string[]
  techSignals: string[]
  wordCount: number
  pageHints: string[]
  ok: boolean
}

async function analyzeWebsite(url: string): Promise<SiteBrief> {
  const brief: SiteBrief = {
    url,
    title: "",
    description: "",
    headings: [],
    techSignals: [],
    wordCount: 0,
    pageHints: [],
    ok: false,
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 DynaamiqOS-Bot" },
      redirect: "follow",
    })
    clearTimeout(t)
    if (!res.ok) return brief
    const html = (await res.text()).slice(0, 400_000)

    brief.title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim()
    brief.description = (
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ""
    ).trim()
    brief.headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 12)

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
    brief.wordCount = text.split(" ").filter(Boolean).length

    const sig: [RegExp, string][] = [
      [/next\.js|_next\//i, "Next.js"],
      [/react/i, "React"],
      [/vue(\.js)?/i, "Vue"],
      [/wp-content|wordpress/i, "WordPress"],
      [/shopify/i, "Shopify (E-Commerce)"],
      [/woocommerce/i, "WooCommerce (Shop)"],
      [/webflow/i, "Webflow"],
      [/wix\.com|wixstatic/i, "Wix"],
      [/gsap|framer-motion|animate/i, "Animationen / Motion"],
      [/tailwind/i, "Tailwind CSS"],
      [/gtag|googletagmanager|analytics/i, "Tracking / Analytics"],
      [/schema\.org|application\/ld\+json/i, "Structured Data / SEO"],
      [/<form/i, "Formulare / Lead-Capture"],
      [/srcset=|loading=["']lazy/i, "Responsive Bilder / Lazy-Load"],
      [/calendly|cal\.com|booking/i, "Buchungs-Integration"],
    ]
    brief.techSignals = sig.filter(([re]) => re.test(html)).map(([, l]) => l)

    const hints: [RegExp, string][] = [
      [/preis|pricing|tarif|paket/i, "Preis-/Paketseite"],
      [/kontakt|contact|impressum/i, "Kontakt/Rechtliches"],
      [/blog|magazin|news/i, "Blog/Content"],
      [/leistung|service|angebot/i, "Leistungsseiten"],
      [/referenz|case|portfolio|projekt/i, "Referenzen/Portfolio"],
      [/shop|warenkorb|cart|produkt/i, "Shop/Produkte"],
    ]
    brief.pageHints = hints.filter(([re]) => re.test(html)).map(([, l]) => l)
    brief.ok = true
  } catch {
    /* unreachable site → ok stays false, model still gets the URL */
  }
  return brief
}

// ---------------------------------------------------------------------------

const SYSTEM = `Du bist der zentrale KI-Assistent von "Dynaamiq AI – Performance Marketing", einer deutschen Marketing- & Webagentur. Du arbeitest direkt im internen Business-Cockpit des Inhabers Martin und legst auf seine Zuruf-Befehle hin Datensätze an.

Du kannst FÜNF Dinge erzeugen — wähle den passenden "type":
1. "quote"   → Angebot (mit Positionen + ausführlicher, fachlich-psychologischer Begründung)
2. "invoice" → Rechnung (gleiche Struktur wie Angebot)
3. "contact" → neuen Kunden/Kontakt aus den genannten Infos anlegen
4. "expense" → Ausgabe/Beleg in die passende Kategorie einsortieren
5. "answer"  → reine Antwort, wenn nichts angelegt werden soll

Antworte AUSSCHLIESSLICH mit EINEM gültigen JSON-Objekt (kein Markdown, kein Text drumherum):

{
  "type": "quote|invoice|contact|expense|answer",
  "message": "kurze, freundliche Bestätigung auf Deutsch, was du angelegt hast",
  "customerId": "<id aus der Kundenliste, falls eindeutig erkennbar, sonst null>",
  "customerName": "<Firmenname falls genannt, sonst null>",
  "items": [ { "description": "string", "qty": number, "unitPrice": number (€ netto), "taxRate": 0.19 } ],
  "rationale": "<NUR bei quote/invoice für Web-/Designprojekte: ausführliche Wert-Begründung, siehe unten>",
  "notes": "<kurzer Fußtext fürs Dokument>",
  "validDays": <Zahl, nur bei quote>,
  "contact": { "company": "string", "contactName": "string", "email": "string", "phone": "string", "website": "string", "city": "string", "tags": ["string"] },
  "expense": { "category": "string", "amount": number (€ brutto), "taxRate": 0.19, "description": "string", "date": "YYYY-MM-DD oder null" }
}

REGELN FÜR ANGEBOTE/RECHNUNGEN:
- Wenn Martin einen Gesamtpreis UND/ODER investierte Stunden nennt (z. B. "Webseite für 5.000 €, 90 Stunden"), zerlege die Leistung in realistische PHASEN als Positionen, deren Summe den Zielpreis ergibt. Nutze nachvollziehbare Stundensätze (Standard ~85 €/h netto). Typische Phasen einer Website: Konzept & UX-Architektur, UI-Design, Frontend-Development, CMS/Integrationen, Responsiveness & QA, SEO-Setup, Launch & Einweisung. Verteile die genannten Stunden plausibel auf diese Phasen.
- Schreibe in "rationale" eine überzeugende, fachlich fundierte Begründung (4–8 Sätze) in IT-/Agentur-Fachsprache, die ERKLÄRT, WARUM dieser Preis gerechtfertigt ist: konkret auf die analysierte Website eingehen (Tech-Stack, Seitenanzahl, Funktionen, Performance, Responsiveness, Animationen, SEO), den Aufwand pro Phase einordnen und den geschäftlichen Nutzen (Conversion, Markenwirkung, Wartbarkeit) betonen. Psychologisch wertig formulieren, ohne zu übertreiben — value-based, nicht stunden-rechtfertigend wirken.
- Liegt eine Website-Analyse vor (siehe Kontext), beziehe dich explizit auf die erkannten Merkmale.

REGELN FÜR KONTAKTE: Extrahiere Firma, Ansprechpartner, E-Mail, Telefon, Website, Stadt und passende Tags (Branche/Kanal) aus dem Text. Fehlende Felder weglassen.

REGELN FÜR AUSGABEN: Ordne sinnvoll einer Kategorie zu (z. B. "Software & Tools", "Ad Spend", "Hardware", "Subunternehmer", "Büro", "Reisekosten"). amount = Bruttobetrag.

Schreibe professionelles, prägnantes Deutsch.`

function buildUserMessage(req: AiRequest, brief: SiteBrief | null) {
  const list = req.customers.map((c) => `- ${c.company} (id: ${c.id})`).join("\n")
  const site = brief
    ? `\n\nWEBSITE-ANALYSE (${brief.url}) ${brief.ok ? "" : "(Seite nicht erreichbar — nutze nur die URL als Referenz)"}:
- Titel: ${brief.title || "—"}
- Beschreibung: ${brief.description || "—"}
- Überschriften: ${brief.headings.join(" · ") || "—"}
- Erkannte Technik: ${brief.techSignals.join(", ") || "—"}
- Seitentypen: ${brief.pageHints.join(", ") || "—"}
- Umfang: ca. ${brief.wordCount} Wörter`
    : ""
  return `Heutiges Datum: ${req.company.today}
Gewünschter Typ: ${req.intent ?? "auto"}

Verfügbare Kunden:
${list || "(keine)"}${site}

Anfrage von Martin:
"""${req.prompt}"""`
}

// Demo fallback (no API key) — still useful & structured
function fallback(req: AiRequest, brief: SiteBrief | null) {
  const text = req.prompt.toLowerCase()
  const matched = req.customers.find((c) =>
    text.includes(c.company.toLowerCase().split(" ")[0]),
  )
  const amountMatch = req.prompt.match(/(\d[\d.\s]{2,})\s*(?:€|eur|euro|k|tausend)?/i)
  let amount = amountMatch ? Number(amountMatch[1].replace(/[.\s]/g, "")) : 3000
  if (/\bk\b|tausend/i.test(req.prompt) && amount < 100) amount *= 1000
  const hoursMatch = req.prompt.match(/(\d{1,3})\s*(?:std|stunden|h\b)/i)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0

  if (req.intent === "contact" || /(neuer|neuen)\s+(kontakt|kunde)/i.test(text)) {
    return {
      type: "contact" as const,
      message: "Demo-Modus: Kontakt aus deiner Eingabe abgeleitet. Für echte Analyse ANTHROPIC_API_KEY setzen.",
      contact: { company: matched?.company ?? "Neuer Kontakt", contactName: "", email: "", tags: ["Lead"] },
    }
  }
  if (req.intent === "expense" || /ausgabe|beleg|rechnung erhalten|bezahlt für/i.test(text)) {
    return {
      type: "expense" as const,
      message: "Demo-Modus: Ausgabe kategorisiert.",
      expense: { category: "Software & Tools", amount, taxRate: 0.19, description: req.prompt.slice(0, 80), date: null },
    }
  }

  const isWebsite = /web|seite|website|landing|shop/i.test(text) || !!brief
  const isInvoice = req.intent === "invoice" || /rechnung/.test(text)
  const splits = hours
    ? [
        ["Konzept & UX-Architektur", Math.round(hours * 0.15)],
        ["UI-Design", Math.round(hours * 0.2)],
        ["Frontend-Development", Math.round(hours * 0.4)],
        ["Responsiveness & QA", Math.round(hours * 0.15)],
        ["SEO-Setup & Launch", Math.round(hours * 0.1)],
      ]
    : []
  const rate = hours ? Math.round(amount / hours) : 85
  const items = isWebsite && hours
    ? splits.map(([desc, h]) => ({ description: `${desc} (${h} Std.)`, qty: Number(h), unitPrice: rate, taxRate: 0.19 }))
    : [{ description: isWebsite ? "Website-Projekt (pauschal)" : "Leistung", qty: 1, unitPrice: amount, taxRate: 0.19 }]

  return {
    type: isInvoice ? ("invoice" as const) : ("quote" as const),
    message: "Demo-Modus: Dokument abgeleitet. Für echte Website-Analyse & KI-Begründung einen ANTHROPIC_API_KEY in .env.local setzen.",
    customerId: matched?.id ?? null,
    customerName: matched?.company ?? null,
    items,
    rationale: isWebsite
      ? `Das Projekt umfasst ${hours || "die"} investierten Projektstunden über Konzept, Design, Entwicklung und Qualitätssicherung${brief?.ok ? ` für ${brief.title || brief.url}` : ""}. Der Wert ergibt sich aus einer wartbaren, performanten und conversion-orientierten Umsetzung${brief?.techSignals.length ? ` (${brief.techSignals.slice(0, 3).join(", ")})` : ""}. (Demo-Text — mit API-Key schreibt die KI eine individuelle, fundierte Begründung.)`
      : undefined,
    notes: "Vielen Dank für Ihr Vertrauen in Dynaamiq AI.",
    validDays: 21,
  }
}

export async function POST(request: Request) {
  let body: AiRequest
  try {
    body = (await request.json()) as AiRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage" }, { status: 400 })
  }

  // Analyze a pasted website link when relevant (quote/invoice/auto + a URL present)
  let brief: SiteBrief | null = null
  const urls = extractUrls(body.prompt)
  const wantsDoc = !body.intent || ["quote", "invoice", "auto"].includes(body.intent)
  if (urls.length && wantsDoc) {
    brief = await analyzeWebsite(urls[0])
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.AI_MODEL || "claude-opus-4-8"

  if (!apiKey) {
    return NextResponse.json({ ok: true, demo: true, analyzed: brief?.ok ? brief.url : null, action: fallback(body, brief) })
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2200,
        system: SYSTEM,
        messages: [{ role: "user", content: buildUserMessage(body, brief) }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({
        ok: true,
        demo: true,
        analyzed: brief?.ok ? brief.url : null,
        action: fallback(body, brief),
        warning: `KI-API-Fehler (${res.status}). Demo-Antwort genutzt.`,
        detail: errText.slice(0, 200),
      })
    }

    const data = await res.json()
    const raw: string =
      data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? ""
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)
    const action = JSON.parse(jsonStr)
    return NextResponse.json({ ok: true, demo: false, analyzed: brief?.ok ? brief.url : null, action })
  } catch (e) {
    return NextResponse.json({
      ok: true,
      demo: true,
      analyzed: brief?.ok ? brief.url : null,
      action: fallback(body, brief),
      warning: "KI-Antwort konnte nicht verarbeitet werden. Demo-Antwort genutzt.",
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}
