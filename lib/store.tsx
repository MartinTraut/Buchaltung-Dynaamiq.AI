"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { seedDatabase } from "./seed"
import {
  computeTotals,
  contractNumberFor,
  emailSignature,
  formatDocNumber,
  ownerFirstName,
} from "./format"
import { REMINDER_LABEL } from "./types"
import type {
  Database,
  Customer,
  Deal,
  DealStage,
  Project,
  Task,
  Invoice,
  Quote,
  Contract,
  Template,
  EmailDraft,
  OnboardingSession,
  Transaction,
  Activity,
  CompanySettings,
  LineItem,
} from "./types"

const STORAGE_KEY = "dynaamiq-os-db-v13"
/** Merkt sich, welche Seed-Datensätze schon einmal eingespielt wurden. */
const SEEDED_KEY = "dynaamiq-os-seeded-ids"
const SEED_REV_KEY = "dynaamiq-os-seed-revision"
/**
 * Hochzählen, wenn sich der Inhalt bestehender Seed-Datensätze ändert (Texte,
 * Beträge, Preis-Einordnung). Beim nächsten Laden werden genau diese Datensätze
 * auf den Seed-Stand gebracht — eigene Datensätze bleiben unberührt.
 */
const SEED_REVISION = 102

/**
 * Seed-Datensätze, die es nicht mehr geben soll. Der Merge legt nur an und
 * aktualisiert — ohne diese Liste bliebe ein zurückgezogener Beleg in jeder
 * bestehenden Installation für immer stehen. Wird beim Revisionssprung gelöscht.
 */
const RETIRED_SEED_IDS = new Set([
  // Rechnung 2026-432 (3.000 € Website SKOPE) — nie versendet und im
  // paketweisen Abrechnungsmodell gegenstandslos, samt Aufgabe und Aktivität.
  "inv-2026-432",
  "a-skope-inv",
  "t-skope-alt",
  // Stornorechnung 2026-432, die zwischenzeitlich als Entwurf angelegt war.
  // Sie wurde nie versendet und ist gegenstandslos: Rechnung 2026-431 steht
  // selbst auf storniert. Ohne diesen Eintrag bliebe der Minus-Beleg in
  // bestehenden Installationen als Entwurf stehen.
  "inv-2026-432-storno",
  // Angebote AN-2026-512 und AN-2026-513 (Gesamtangebote SKOPE) — seit der
  // Trennung in AN-2026-514/515 nur noch Verwirrung in der Liste. Nie
  // beauftragt, samt ihrer Aktivitäten entfernt; die Nummern bleiben
  // vergeben und werden nicht neu verwendet.
  "quo-2026-043",
  "quo-2026-044",
  "a-skope-quo",
  "a-skope-quo-513",
  // ── Alter Demo-Bestand aus der Zeit vor den echten Firmendaten ──────────
  //
  // Er war nie zurückgezogen worden und stand deshalb in jeder bestehenden
  // Installation weiter in den Listen. Bösartig daran: Die alten Demo-Kunden
  // hießen ebenfalls c1 bis c8. Alles, was damals auf "c2" zeigte — Deals
  // „TikTok Creative Paket" und „Reels Produktion", Rechnung DYN-RE-1040,
  // Angebot DYN-AN-1023 — hängt seit dem Datenwechsel unter SKOPE, weil SKOPE
  // heute die c2 ist. Der Kunde selbst wird nicht zurückgezogen (c1 bis c3
  // sind echte Kunden), nur die Datensätze, die es nie gab.
  "c4", "c5", "c6", "c7", "c8",
  "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9",
  "i1", "i2", "i3", "i4", "i5", "i6", "i7",
  "q1", "q2", "q3", "q4",
  "con-2026-001", "con-2026-002",
  "p1", "p2", "p3", "p4", "p5",
  "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9",
  "a1", "a2", "a3", "a4", "a5", "a6",
  "e1", "e2", "e3", "e4", "em1",
  "tpl1", "tpl2", "tpl3", "tpl4",
])

/**
 * Seed-Datensätze, die trotz früherer Löschung wieder eingespielt werden.
 * Normalerweise gilt „einmal gelöscht, bleibt gelöscht" — hier nicht: Rechnung
 * 2026-431 ist versendet und verweist auf Kunde c1. Ohne den Kunden steht der
 * Beleg ohne Empfänger da, und §14 UStG verlangt Name und Anschrift des
 * Leistungsempfängers. Wird beim Revisionssprung einmalig nachgetragen.
 */
const RESTORE_SEED_IDS = new Set(["c1", "inv-2026-431"])

type Collections = Omit<Database, "settings">
type CollectionKey = keyof Collections

interface StoreContextValue {
  db: Database
  ready: boolean
  /**
   * Klartext-Fehler, wenn der Browserspeicher das Schreiben abgelehnt hat
   * (Kontingent voll, privater Modus). Vorher wurde das stillschweigend
   * verschluckt: die App lief weiter, der Bestand war beim nächsten Laden auf
   * dem alten Stand. Wer Rechnungen schreibt, muss das sofort erfahren.
   */
  storageError: string | null
  // generic helpers
  add: <K extends CollectionKey>(key: K, item: Database[K][number]) => void
  update: <K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<Database[K][number]>,
  ) => void
  remove: (key: CollectionKey, id: string) => void
  // domain helpers
  upsertCustomer: (c: Partial<Customer> & { id?: string }) => Customer
  upsertDeal: (d: Partial<Deal> & { id?: string }) => Deal
  moveDeal: (id: string, stage: DealStage) => void
  upsertProject: (p: Partial<Project> & { id?: string }) => Project
  upsertTask: (t: Partial<Task> & { id?: string }) => Task
  toggleTask: (id: string) => void
  upsertInvoice: (i: Partial<Invoice> & { id?: string }) => Invoice
  setInvoiceStatus: (id: string, status: Invoice["status"]) => void
  createCancellation: (invoiceId: string) => Invoice | null
  sendReminder: (id: string) => { invoice: Invoice; email: EmailDraft } | null
  toggleRecurring: (id: string) => void
  duplicateRecurring: (id: string) => Invoice | null
  upsertQuote: (q: Partial<Quote> & { id?: string }) => Quote
  convertQuoteToInvoice: (quoteId: string) => Invoice | null
  upsertContract: (c: Partial<Contract> & { id?: string }) => Contract
  createContractFromQuote: (quoteId: string) => Contract | null
  upsertTemplate: (t: Partial<Template> & { id?: string }) => Template
  upsertOnboarding: (
    o: Partial<OnboardingSession> & { id?: string },
  ) => OnboardingSession
  upsertEmail: (e: Partial<EmailDraft> & { id?: string }) => EmailDraft
  addTransaction: (t: Partial<Transaction>) => Transaction
  updateSettings: (patch: Partial<CompanySettings>) => void
  pushActivity: (a: Omit<Activity, "id" | "at"> & { at?: string }) => void
  resetDemo: () => void
  /** Kompletten Bestand ersetzen — Wiederherstellung aus einer Sicherung. */
  replaceDatabase: (next: Database) => void
  // lookups
  customerById: (id?: string) => Customer | undefined
}

const StoreContext = React.createContext<StoreContextValue | null>(null)

/** Nur explizit gesetzte Felder eines Partials übernehmen (undefined ausfiltern). */
function definedProps<T extends object>(obj: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

const SEED_COLLECTIONS: CollectionKey[] = [
  "customers",
  "deals",
  "projects",
  "tasks",
  "invoices",
  "quotes",
  "contracts",
  "templates",
  "activities",
]

/**
 * Neu dazugekommene Seed-Datensätze (z. B. ein neuer Kunde samt Angebot)
 * nachtragen, ohne bestehende Daten anzufassen. Jede ID wird nur ein einziges
 * Mal eingespielt — was der Nutzer danach löscht, bleibt gelöscht.
 */
function mergeNewSeedRecords(db: Database, seed: Database): Database {
  // Neue Revision: bestehende Seed-Datensätze auf den aktuellen Stand bringen.
  let storedRev = 0
  try {
    storedRev = Number(window.localStorage.getItem(SEED_REV_KEY) ?? 0)
  } catch {
    /* nicht lesbar — wie Revision 0 behandeln */
  }
  const refresh = storedRev < SEED_REVISION

  let applied: string[] = []
  try {
    const raw = window.localStorage.getItem(SEEDED_KEY)
    if (raw) applied = JSON.parse(raw) as string[]
  } catch {
    /* defekter Eintrag — wie „noch nichts eingespielt" behandeln */
  }
  const seen = new Set(applied)
  const next = { ...db }
  const added: string[] = []

  for (const key of SEED_COLLECTIONS) {
    let existing = next[key] as { id: string }[]
    const seedRecords = seed[key] as { id: string }[]

    if (refresh) {
      const byId = new Map(seedRecords.map((r) => [r.id, r]))
      const purged = existing.filter((r) => !RETIRED_SEED_IDS.has(r.id))
      if (purged.length !== existing.length) {
        existing = purged
        next[key] = purged as never
        added.push("rev")
      }
      const replaced = existing.map((r) => byId.get(r.id) ?? r)
      if (replaced.some((r, i) => r !== existing[i])) {
        existing = replaced
        next[key] = replaced as never
        added.push("rev")
      }
    }

    const have = new Set(existing.map((r) => r.id))
    const fresh = seedRecords.filter(
      (r) => !have.has(r.id) && (!seen.has(r.id) || (refresh && RESTORE_SEED_IDS.has(r.id))),
    )
    if (fresh.length) {
      next[key] = [...fresh, ...existing] as never
      added.push(...fresh.map((r) => r.id))
    }
  }

  // Alle Seed-IDs vormerken, auch die schon vorhandenen — sonst kämen gelöschte
  // Datensätze beim nächsten Start zurück.
  markSeedApplied(seed)

  return added.length ? next : db
}

/**
 * Seed-IDs und Revisionsstand als eingespielt vormerken.
 *
 * Muss auch beim allerersten Start laufen. Ohne diese Markierung stand der
 * Revisionsstand bei der zweiten Sitzung noch auf 0, der Merge hielt sich für
 * überfällig und setzte sämtliche Seed-Datensätze auf den Auslieferungsstand
 * zurück — jede Statusänderung, jede Preiskorrektur und jede Notiz der ersten
 * Sitzung war damit stillschweigend weg.
 */
function markSeedApplied(seed: Database) {
  const allIds = SEED_COLLECTIONS.flatMap((k) =>
    (seed[k] as { id: string }[]).map((r) => r.id),
  )
  try {
    window.localStorage.setItem(SEEDED_KEY, JSON.stringify(allIds))
    window.localStorage.setItem(SEED_REV_KEY, String(SEED_REVISION))
  } catch {
    /* quota / private mode — ignore */
  }
}

function load(): Database {
  if (typeof window === "undefined") return seedDatabase()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const seed = seedDatabase()
    if (!raw) {
      markSeedApplied(seed)
      return seed
    }
    const parsed = JSON.parse(raw) as Database
    // basic shape guard
    if (!parsed.customers || !parsed.settings) return seed
    // Neu hinzugekommene Sammlungen fehlen in älteren Ständen. Ohne diese
    // Zeile liefe der Seed-Merge über `undefined` und verlöre alles Weitere.
    if (!parsed.contracts) parsed.contracts = []
    if (!parsed.onboardings) parsed.onboardings = []
    // Neue Settings-Felder (z. B. Amtsgericht, HR-Nr.) aus den Defaults ergänzen,
    // ohne eigene Änderungen zu überschreiben.
    const merged = mergeNewSeedRecords(parsed, seed)
    const result = {
      ...merged,
      settings: {
        ...seed.settings,
        // Leere Strings aus dem Speicher dürfen gepflegte Vorgaben nicht
        // verdrängen — sonst bleibt ein später ergänztes Feld (z. B. Telefon)
        // bei bestehenden Installationen für immer leer.
        ...Object.fromEntries(
          Object.entries(parsed.settings).filter(([, v]) => v !== "" && v != null),
        ),
        // Zähler dürfen nie hinter den Seed zurückfallen — sonst vergäbe das
        // Tool eine Nummer erneut, die bereits auf einem Dokument steht.
        nextInvoiceNo: Math.max(seed.settings.nextInvoiceNo, parsed.settings.nextInvoiceNo ?? 0),
        nextQuoteNo: Math.max(seed.settings.nextQuoteNo, parsed.settings.nextQuoteNo ?? 0),
        nextContractNo: Math.max(
          seed.settings.nextContractNo,
          parsed.settings.nextContractNo ?? 0,
        ),
      },
    }
    // Sofort zurückschreiben: der Seed-Merge markiert seine Revision als
    // erledigt. Läuft er auf einer Route ohne persistierenden Provider
    // (z. B. der Druckansicht), ginge das Ergebnis sonst verloren und die
    // Installation bliebe dauerhaft auf dem alten Stand hängen.
    if (merged !== parsed) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      } catch {
        /* quota / private mode — ignore */
      }
    }
    return result
  } catch {
    return seedDatabase()
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = React.useState<Database>(() => seedDatabase())
  const [ready, setReady] = React.useState(false)
  const [storageError, setStorageError] = React.useState<string | null>(null)

  // hydrate from localStorage on mount (avoids SSR mismatch)
  React.useEffect(() => {
    setDb(load())
    setReady(true)
  }, [])

  // persist — debounced (300 ms), damit schnelle Folge-Updates (z. B. Tippen
  // in Editoren) nicht bei jeder Änderung synchron serialisieren/schreiben.
  const persistTimer = React.useRef<number | null>(null)
  const latest = React.useRef<{ db: Database; ready: boolean }>({ db, ready })

  const flush = React.useCallback(() => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    if (!latest.current.ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current.db))
      setStorageError((prev) => (prev === null ? prev : null))
    } catch (e) {
      // Nicht verschlucken: ohne diese Meldung arbeitet man stundenlang weiter
      // und verliert alles beim Neuladen.
      setStorageError(
        e instanceof Error && e.name === "QuotaExceededError"
          ? "Der Browserspeicher ist voll — neue Eingaben werden NICHT gesichert. Bitte jetzt eine Sicherung exportieren."
          : "Der Browserspeicher ist nicht beschreibbar (privater Modus?) — Eingaben gehen beim Neuladen verloren.",
      )
    }
  }, [])

  React.useEffect(() => {
    latest.current = { db, ready }
    if (!ready) return
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(flush, 300)
  }, [db, ready, flush])

  // Kein Datenverlust: bei Tab-Schließen/-Wechsel und beim Unmount sofort
  // schreiben (pagehide/visibilitychange sind auf Mobile zuverlässiger als
  // beforeunload).
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("beforeunload", flush)
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flush)
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibility)
      flush()
    }
  }, [flush])

  const pushActivity = React.useCallback(
    (a: Omit<Activity, "id" | "at"> & { at?: string }) => {
      setDb((d) => ({
        ...d,
        activities: [
          { id: nanoid(8), at: a.at ?? new Date().toISOString(), ...a },
          ...d.activities,
        ].slice(0, 60),
      }))
    },
    [],
  )

  const add: StoreContextValue["add"] = React.useCallback((key, item) => {
    setDb((d) => ({ ...d, [key]: [item, ...(d[key] as unknown[])] }))
  }, [])

  const update: StoreContextValue["update"] = React.useCallback(
    (key, id, patch) => {
      setDb((d) => ({
        ...d,
        [key]: (d[key] as { id: string }[]).map((it) =>
          it.id === id ? { ...it, ...patch } : it,
        ),
      }))
    },
    [],
  )

  const remove = React.useCallback((key: CollectionKey, id: string) => {
    setDb((d) => ({
      ...d,
      [key]: (d[key] as { id: string }[]).filter((it) => it.id !== id),
    }))
  }, [])

  const upsertCustomer: StoreContextValue["upsertCustomer"] = React.useCallback(
    (c) => {
      const full: Customer = {
        id: c.id ?? nanoid(8),
        company: c.company ?? "Neue Firma",
        contactName: c.contactName ?? "",
        email: c.email ?? "",
        phone: c.phone,
        website: c.website,
        logoUrl: c.logoUrl,
        address: c.address,
        city: c.city,
        zip: c.zip,
        country: c.country ?? "Deutschland",
        vatId: c.vatId,
        customerNumber: c.customerNumber,
        tags: c.tags ?? [],
        notes: c.notes,
        health: c.health ?? "lead",
        createdAt: c.createdAt ?? new Date().toISOString(),
      }
      setDb((d) => {
        const exists = d.customers.some((x) => x.id === full.id)
        return {
          ...d,
          customers: exists
            ? d.customers.map((x) => (x.id === full.id ? full : x))
            : [full, ...d.customers],
        }
      })
      return full
    },
    [],
  )

  const upsertDeal: StoreContextValue["upsertDeal"] = React.useCallback((dd) => {
    const full: Deal = {
      id: dd.id ?? nanoid(8),
      title: dd.title ?? "Neuer Deal",
      customerId: dd.customerId ?? "",
      stage: dd.stage ?? "lead",
      value: dd.value ?? 0,
      probability: dd.probability ?? 10,
      owner: dd.owner ?? "",
      expectedClose: dd.expectedClose,
      notes: dd.notes,
      createdAt: dd.createdAt ?? new Date().toISOString(),
    }
    setDb((d) => {
      // Owner-Default aus den Settings (wie Rechnungsnummer in upsertInvoice).
      if (!full.owner) full.owner = ownerFirstName(d.settings)
      const exists = d.deals.some((x) => x.id === full.id)
      return {
        ...d,
        deals: exists
          ? d.deals.map((x) => (x.id === full.id ? full : x))
          : [full, ...d.deals],
      }
    })
    return full
  }, [])

  const moveDeal = React.useCallback((id: string, stage: DealStage) => {
    setDb((d) => {
      const deal = d.deals.find((x) => x.id === id)
      const deals = d.deals.map((x) =>
        x.id === id
          ? {
              ...x,
              stage,
              probability:
                stage === "won" ? 100 : stage === "lost" ? 0 : x.probability,
            }
          : x,
      )
      // Frisch gewonnen → Folge-Projekt + Rechnungsentwurf anlegen (einmalig je Deal)
      const freshlyWon = !!deal && stage === "won" && deal.stage !== "won"
      const already = deal ? d.projects.some((p) => p.dealId === deal.id) : false
      if (!deal || !freshlyWon || already) {
        return { ...d, deals }
      }
      const now = new Date().toISOString()
      const project: Project = {
        id: nanoid(8),
        name: deal.title,
        customerId: deal.customerId,
        status: "planning",
        budget: deal.value,
        spent: 0,
        startDate: now,
        color: "#1f7bf2",
        description: `Automatisch aus gewonnenem Deal „${deal.title}" erstellt.`,
        dealId: deal.id,
        createdAt: now,
      }
      // Entwurf ohne Nummer — die wird erst beim Finalisieren im Editor vergeben,
      // damit gewonnene Deals keinen Rechnungsnummernkreis verbrauchen.
      const draft: Invoice = {
        id: nanoid(8),
        number: "",
        customerId: deal.customerId,
        status: "draft",
        issueDate: now,
        dueDate: now,
        items: [
          {
            id: nanoid(6),
            description: deal.title,
            qty: 1,
            unitPrice: deal.value,
            taxRate: 0.19,
          },
        ],
        notes: `Rechnungsentwurf aus gewonnenem Deal „${deal.title}".`,
        projectId: project.id,
        createdAt: now,
      }
      const activity: Activity = {
        id: nanoid(8),
        type: "project",
        title: `Projekt angelegt — ${project.name}`,
        meta: "aus gewonnenem Deal · Rechnungsentwurf bereit",
        customerId: deal.customerId,
        at: now,
      }
      return {
        ...d,
        deals,
        projects: [project, ...d.projects],
        invoices: [draft, ...d.invoices],
        activities: [activity, ...d.activities].slice(0, 60),
      }
    })
  }, [])

  const upsertProject: StoreContextValue["upsertProject"] = React.useCallback(
    (p) => {
      const full: Project = {
        id: p.id ?? nanoid(8),
        name: p.name ?? "Neues Projekt",
        customerId: p.customerId ?? "",
        status: p.status ?? "planning",
        budget: p.budget ?? 0,
        spent: p.spent ?? 0,
        startDate: p.startDate,
        dueDate: p.dueDate,
        color: p.color ?? "#1f7bf2",
        description: p.description,
        dealId: p.dealId,
        createdAt: p.createdAt ?? new Date().toISOString(),
      }
      setDb((d) => {
        const exists = d.projects.some((x) => x.id === full.id)
        return {
          ...d,
          projects: exists
            ? d.projects.map((x) => (x.id === full.id ? full : x))
            : [full, ...d.projects],
        }
      })
      return full
    },
    [],
  )

  const upsertTask: StoreContextValue["upsertTask"] = React.useCallback((t) => {
    const full: Task = {
      id: t.id ?? nanoid(8),
      projectId: t.projectId, // optional — freie Aufgaben/Termine ohne Projekt
      title: t.title ?? "Neue Aufgabe",
      status: t.status ?? "todo",
      kind: t.kind ?? "task",
      assignee: t.assignee,
      due: t.due,
      time: t.time,
      endTime: t.endTime,
      hours: t.hours,
    }
    setDb((d) => {
      // Beim Update gegen den Bestand mergen — nur definierte Felder
      // überschreiben, damit z. B. hours nicht verloren geht.
      const existing = d.tasks.find((x) => x.id === full.id)
      if (existing) {
        Object.assign(full, { ...existing, ...definedProps<Task>(t) })
      }
      return {
        ...d,
        tasks: existing
          ? d.tasks.map((x) => (x.id === full.id ? { ...full } : x))
          : [full, ...d.tasks],
      }
    })
    return full
  }, [])

  const toggleTask = React.useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                t.status === "done"
                  ? "todo"
                  : t.status === "todo"
                    ? "doing"
                    : "done",
            }
          : t,
      ),
    }))
  }, [])

  const upsertInvoice: StoreContextValue["upsertInvoice"] = React.useCallback(
    (i) => {
      const full: Invoice = {
        // Erst alles übernehmen, was mitgeschickt wurde: Leistungsdatum,
        // Überschrift, Einordnung und Co. gingen sonst beim Anlegen verloren,
        // weil sie in der Pflichtliste unten nicht vorkommen.
        ...(definedProps<Invoice>(i) as Invoice),
        id: i.id ?? nanoid(8),
        number: i.number ?? "",
        customerId: i.customerId ?? "",
        status: i.status ?? "draft",
        issueDate: i.issueDate ?? new Date().toISOString(),
        dueDate: i.dueDate ?? new Date().toISOString(),
        items: i.items ?? [],
        notes: i.notes,
        projectId: i.projectId,
        createdAt: i.createdAt ?? new Date().toISOString(),
      }
      setDb((d) => {
        // Beim Update gegen den Bestand mergen — sonst gehen Felder wie
        // reminderLevel, lastReminderAt, recurring, cancelsInvoiceId verloren.
        const existing = d.invoices.find((x) => x.id === full.id)
        if (existing) {
          Object.assign(full, { ...existing, ...definedProps<Invoice>(i) })
        }
        let number = full.number
        let settings = d.settings
        if (!number) {
          number = formatDocNumber(d.settings.invoicePrefix, d.settings.nextInvoiceNo)
          full.number = number
          settings = { ...d.settings, nextInvoiceNo: d.settings.nextInvoiceNo + 1 }
        }
        return {
          ...d,
          settings,
          invoices: existing
            ? d.invoices.map((x) => (x.id === full.id ? { ...full } : x))
            : [full, ...d.invoices],
        }
      })
      return full
    },
    [],
  )

  const setInvoiceStatus = React.useCallback(
    (id: string, status: Invoice["status"]) => {
      setDb((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (!inv) return d
        const wasPaid = inv.status === "paid"
        const nowPaid = status === "paid"
        let transactions = d.transactions
        if (nowPaid && !wasPaid) {
          // Zahlungseingang automatisch als Einnahme verbuchen (einmalig je Rechnung)
          const already = transactions.some(
            (t) => t.invoiceId === inv.id && t.type === "income",
          )
          if (!already) {
            const totals = computeTotals(inv.items)
            const rate = inv.items.find((it) => it.taxRate > 0)?.taxRate ?? 0
            const company =
              d.customers.find((c) => c.id === inv.customerId)?.company ?? ""
            const tx: Transaction = {
              id: nanoid(8),
              type: "income",
              category: "Rechnung",
              description: `Rechnung ${inv.number}${company ? " · " + company : ""}`,
              amount: totals.gross,
              taxRate: rate,
              date: new Date().toISOString(),
              customerId: inv.customerId,
              invoiceId: inv.id,
            }
            transactions = [tx, ...transactions]
          }
        } else if (!nowPaid && wasPaid) {
          // Nicht mehr bezahlt → die automatische Einnahme-Buchung wieder entfernen
          transactions = transactions.filter(
            (t) => !(t.invoiceId === inv.id && t.type === "income"),
          )
        }
        return {
          ...d,
          transactions,
          invoices: d.invoices.map((x) => (x.id === id ? { ...x, status } : x)),
        }
      })
    },
    [],
  )

  const createCancellation: StoreContextValue["createCancellation"] =
    React.useCallback((invoiceId) => {
      let created: Invoice | null = null
      setDb((d) => {
        const src = d.invoices.find((x) => x.id === invoiceId)
        if (
          !src ||
          src.status === "draft" ||
          src.status === "canceled" ||
          src.cancelsInvoiceId // kein Storno eines Stornos
        )
          return d
        const number = formatDocNumber(d.settings.invoicePrefix, d.settings.nextInvoiceNo)
        const now = new Date().toISOString()
        const inv: Invoice = {
          id: nanoid(8),
          number,
          customerId: src.customerId,
          status: "sent",
          issueDate: now,
          dueDate: now,
          serviceDate: src.serviceDate,
          servicePeriodEnd: src.servicePeriodEnd,
          cancelsInvoiceId: src.id,
          items: src.items.map((it) => ({
            ...it,
            id: nanoid(6),
            qty: it.qty * -1,
          })),
          notes: `Stornorechnung zu Rechnung ${src.number}.`,
          projectId: src.projectId,
          createdAt: now,
        }
        created = inv
        const c = d.customers.find((x) => x.id === src.customerId)
        return {
          ...d,
          settings: { ...d.settings, nextInvoiceNo: d.settings.nextInvoiceNo + 1 },
          invoices: [
            inv,
            ...d.invoices.map((x) =>
              x.id === invoiceId ? { ...x, status: "canceled" as const } : x,
            ),
          ],
          activities: [
            {
              id: nanoid(8),
              type: "invoice" as const,
              title: `Stornorechnung ${number} zu ${src.number}`,
              meta: c?.company,
              customerId: src.customerId,
              at: now,
            },
            ...d.activities,
          ],
        }
      })
      return created
    }, [])

  const sendReminder: StoreContextValue["sendReminder"] = React.useCallback(
    (id) => {
      let result: { invoice: Invoice; email: EmailDraft } | null = null
      setDb((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (!inv) return d
        const level = Math.min((inv.reminderLevel ?? 0) + 1, 4)
        const c = d.customers.find((x) => x.id === inv.customerId)
        // Stufe 1 = Zahlungserinnerung ohne Gebühr, danach je Mahnstufe kumuliert.
        const fee = level >= 2 ? d.settings.reminderFee * (level - 1) : 0
        // Idempotent: vorhandene Mahngebühr-Positionen erst entfernen, dann neu setzen.
        const baseItems = inv.items.filter(
          (it) => !it.description.startsWith("Mahngebühr"),
        )
        const items: LineItem[] =
          fee > 0
            ? [
                ...baseItems,
                {
                  id: nanoid(6),
                  description: `Mahngebühr (${REMINDER_LABEL[level]})`,
                  unit: "Pauschal",
                  qty: 1,
                  unitPrice: fee,
                  taxRate: 0,
                },
              ]
            : baseItems
        const gross = computeTotals(baseItems).gross
        const dueStr = new Date(inv.dueDate).toLocaleDateString("de-DE")
        const signature = emailSignature(d.settings)
        const body =
          level === 1
            ? `Hallo ${c?.contactName ?? ""},\n\nunsere Rechnung ${inv.number} über ${gross.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} war am ${dueStr} fällig. Vermutlich ist sie nur untergegangen — bitte gleichen Sie den Betrag in den nächsten Tagen aus.\n\nFalls bereits geschehen, betrachten Sie diese Nachricht als gegenstandslos.\n\n${signature}`
            : `Hallo ${c?.contactName ?? ""},\n\ntrotz unserer Erinnerung ist die Rechnung ${inv.number} über ${gross.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} (fällig am ${dueStr}) weiterhin offen.\n\nWir bitten Sie, den Betrag${fee ? ` zzgl. ${fee.toFixed(2)} € Mahngebühr` : ""} umgehend zu begleichen.\n\n${signature}`
        const email: EmailDraft = {
          id: nanoid(8),
          to: c?.email ?? "",
          customerId: inv.customerId,
          subject: `${REMINDER_LABEL[level]} — Rechnung ${inv.number}`,
          body,
          status: "draft",
          relatedType: "invoice",
          relatedId: inv.id,
          createdAt: new Date().toISOString(),
        }
        const updatedInv: Invoice = {
          ...inv,
          status: inv.status === "paid" ? inv.status : "overdue",
          reminderLevel: level,
          lastReminderAt: new Date().toISOString(),
          items,
        }
        result = { invoice: updatedInv, email }
        return {
          ...d,
          invoices: d.invoices.map((x) => (x.id === id ? updatedInv : x)),
          emails: [email, ...d.emails],
          activities: [
            {
              id: nanoid(8),
              type: "invoice" as const,
              title: `${REMINDER_LABEL[level]} erstellt — ${inv.number}`,
              meta: c?.company,
              customerId: inv.customerId,
              at: new Date().toISOString(),
            },
            ...d.activities,
          ],
        }
      })
      return result
    },
    [],
  )

  const toggleRecurring = React.useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      invoices: d.invoices.map((x) =>
        x.id === id ? { ...x, recurring: !x.recurring } : x,
      ),
    }))
  }, [])

  const duplicateRecurring: StoreContextValue["duplicateRecurring"] =
    React.useCallback((id) => {
      let created: Invoice | null = null
      setDb((d) => {
        const src = d.invoices.find((x) => x.id === id)
        if (!src) return d
        const number = formatDocNumber(d.settings.invoicePrefix, d.settings.nextInvoiceNo)
        const issue = new Date()
        const due = new Date()
        due.setDate(due.getDate() + d.settings.paymentTermsDays)
        const inv: Invoice = {
          ...src,
          id: nanoid(8),
          number,
          status: "draft",
          issueDate: issue.toISOString(),
          dueDate: due.toISOString(),
          items: src.items.map((it) => ({ ...it, id: nanoid(6) })),
          reminderLevel: 0,
          lastReminderAt: undefined,
          serviceDate: undefined,
          servicePeriodEnd: undefined,
          cancelsInvoiceId: undefined,
          createdAt: new Date().toISOString(),
        }
        created = inv
        const c = d.customers.find((x) => x.id === src.customerId)
        return {
          ...d,
          settings: { ...d.settings, nextInvoiceNo: d.settings.nextInvoiceNo + 1 },
          invoices: [inv, ...d.invoices],
          activities: [
            {
              id: nanoid(8),
              type: "invoice" as const,
              title: `Folge-Rechnung ${number} erzeugt (Retainer)`,
              meta: c?.company,
              customerId: src.customerId,
              at: new Date().toISOString(),
            },
            ...d.activities,
          ],
        }
      })
      return created
    }, [])

  const upsertQuote: StoreContextValue["upsertQuote"] = React.useCallback((q) => {
    const full: Quote = {
      // Siehe upsertInvoice: die optionalen Felder des Angebots (Fassung,
      // Kurzübersicht, Konditionen, Zahlungsplan) müssen das Anlegen überleben.
      ...(definedProps<Quote>(q) as Quote),
      id: q.id ?? nanoid(8),
      number: q.number ?? "",
      customerId: q.customerId ?? "",
      status: q.status ?? "draft",
      issueDate: q.issueDate ?? new Date().toISOString(),
      validUntil: q.validUntil ?? new Date().toISOString(),
      items: q.items ?? [],
      notes: q.notes,
      projectId: q.projectId,
      createdAt: q.createdAt ?? new Date().toISOString(),
    }
    setDb((d) => {
      // Beim Update gegen den Bestand mergen (z. B. projectId erhalten).
      const existing = d.quotes.find((x) => x.id === full.id)
      if (existing) {
        Object.assign(full, { ...existing, ...definedProps<Quote>(q) })
      }
      let number = full.number
      let settings = d.settings
      if (!number) {
        number = formatDocNumber(d.settings.quotePrefix, d.settings.nextQuoteNo)
        full.number = number
        settings = { ...d.settings, nextQuoteNo: d.settings.nextQuoteNo + 1 }
      }
      return {
        ...d,
        settings,
        quotes: existing
          ? d.quotes.map((x) => (x.id === full.id ? { ...full } : x))
          : [full, ...d.quotes],
      }
    })
    return full
  }, [])

  const convertQuoteToInvoice = React.useCallback((quoteId: string) => {
    let created: Invoice | null = null
    setDb((d) => {
      const q = d.quotes.find((x) => x.id === quoteId)
      if (!q) return d
      const number = formatDocNumber(d.settings.invoicePrefix, d.settings.nextInvoiceNo)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + d.settings.paymentTermsDays)
      const inv: Invoice = {
        id: nanoid(8),
        number,
        customerId: q.customerId,
        status: "draft",
        issueDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        items: q.items.map((it) => ({ ...it, id: nanoid(6) })),
        notes: q.notes,
        projectId: q.projectId,
        createdAt: new Date().toISOString(),
      }
      created = inv
      return {
        ...d,
        settings: { ...d.settings, nextInvoiceNo: d.settings.nextInvoiceNo + 1 },
        invoices: [inv, ...d.invoices],
        quotes: d.quotes.map((x) =>
          x.id === quoteId ? { ...x, status: "accepted" } : x,
        ),
        activities: [
          {
            id: nanoid(8),
            type: "invoice" as const,
            title: `Angebot ${q.number} → Rechnung ${number}`,
            customerId: q.customerId,
            at: new Date().toISOString(),
          },
          ...d.activities,
        ],
      }
    })
    return created
  }, [])

  const upsertContract: StoreContextValue["upsertContract"] = React.useCallback((c) => {
    const full: Contract = {
      // Wie bei Angebot und Rechnung: erst alles Mitgeschickte übernehmen,
      // damit Laufzeit, Anlagen und Auftragswert das Anlegen überleben.
      ...(definedProps<Contract>(c) as Contract),
      id: c.id ?? nanoid(8),
      number: c.number ?? "",
      customerId: c.customerId ?? "",
      status: c.status ?? "draft",
      issueDate: c.issueDate ?? new Date().toISOString(),
      title: c.title ?? "Projektvertrag",
      clauses: c.clauses ?? [],
      createdAt: c.createdAt ?? new Date().toISOString(),
    }
    setDb((d) => {
      const existing = d.contracts.find((x) => x.id === full.id)
      if (existing) {
        Object.assign(full, { ...existing, ...definedProps<Contract>(c) })
      }
      let settings = d.settings
      if (!full.number) {
        full.number = contractNumberFor(
          d.settings.contractPrefix,
          d.customers.find((x) => x.id === full.customerId)?.customerNumber,
          d.contracts.map((x) => x.number),
        )
        settings = { ...d.settings, nextContractNo: d.settings.nextContractNo + 1 }
      }
      return {
        ...d,
        settings,
        contracts: existing
          ? d.contracts.map((x) => (x.id === full.id ? { ...full } : x))
          : [full, ...d.contracts],
      }
    })
    return full
  }, [])

  /**
   * Vertrag aus einem Angebot anlegen. Die Klauseln kommen aus dem zuletzt
   * angelegten Vertrag — der ist die gepflegte Fassung. Gibt es noch keinen,
   * bleibt der Vertrag leer und wird von Hand gefüllt; ein leerer Rahmen ist
   * ehrlicher als geerbte Klauseln aus einem fremden Projekt.
   */
  const createContractFromQuote = React.useCallback((quoteId: string) => {
    let created: Contract | null = null
    setDb((d) => {
      const q = d.quotes.find((x) => x.id === quoteId)
      if (!q) return d
      if (d.contracts.some((x) => x.quoteId === quoteId)) return d
      const number = contractNumberFor(
        d.settings.contractPrefix,
        d.customers.find((x) => x.id === q.customerId)?.customerNumber,
        d.contracts.map((x) => x.number),
      )
      const vorlage = d.contracts[0]
      const c: Contract = {
        id: nanoid(8),
        number,
        customerId: q.customerId,
        quoteId: q.id,
        projectId: q.projectId,
        status: "draft",
        issueDate: new Date().toISOString(),
        title: "Projektvertrag",
        lead: `Rechtlicher Rahmen zum Angebot ${q.number}.`,
        netValue: computeTotals(q.items).net,
        attachments: [`Anlage 1 — Angebot ${q.number} nebst Leistungsbeschreibung`],
        clauses: vorlage ? vorlage.clauses.map((cl) => ({ ...cl, body: [...cl.body] })) : [],
        createdAt: new Date().toISOString(),
      }
      created = c
      return {
        ...d,
        settings: { ...d.settings, nextContractNo: d.settings.nextContractNo + 1 },
        contracts: [c, ...d.contracts],
        activities: [
          {
            id: nanoid(8),
            type: "quote" as const,
            title: `Vertrag ${number} zum Angebot ${q.number} angelegt`,
            customerId: q.customerId,
            at: new Date().toISOString(),
          },
          ...d.activities,
        ],
      }
    })
    return created
  }, [])

  const upsertOnboarding: StoreContextValue["upsertOnboarding"] = React.useCallback(
    (o) => {
      const full: OnboardingSession = {
        ...(definedProps<OnboardingSession>(o) as OnboardingSession),
        id: o.id ?? nanoid(8),
        status: o.status ?? "open",
        answers: o.answers ?? {},
        createdAt: o.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setDb((d) => {
        const existing = d.onboardings.find((x) => x.id === full.id)
        if (existing) {
          Object.assign(full, {
            ...existing,
            ...definedProps<OnboardingSession>(o),
            updatedAt: full.updatedAt,
          })
        }
        return {
          ...d,
          onboardings: existing
            ? d.onboardings.map((x) => (x.id === full.id ? { ...full } : x))
            : [full, ...d.onboardings],
        }
      })
      return full
    },
    [],
  )

  const upsertTemplate: StoreContextValue["upsertTemplate"] = React.useCallback(
    (t) => {
      const full: Template = {
        id: t.id ?? nanoid(8),
        kind: t.kind ?? "email",
        name: t.name ?? "Neue Vorlage",
        subject: t.subject,
        body: t.body,
        items: t.items,
        createdAt: t.createdAt ?? new Date().toISOString(),
      }
      setDb((d) => {
        const exists = d.templates.some((x) => x.id === full.id)
        return {
          ...d,
          templates: exists
            ? d.templates.map((x) => (x.id === full.id ? full : x))
            : [full, ...d.templates],
        }
      })
      return full
    },
    [],
  )

  const upsertEmail: StoreContextValue["upsertEmail"] = React.useCallback((e) => {
    const full: EmailDraft = {
      id: e.id ?? nanoid(8),
      to: e.to ?? "",
      customerId: e.customerId,
      subject: e.subject ?? "",
      body: e.body ?? "",
      status: e.status ?? "draft",
      relatedType: e.relatedType,
      relatedId: e.relatedId,
      createdAt: e.createdAt ?? new Date().toISOString(),
    }
    setDb((d) => {
      const exists = d.emails.some((x) => x.id === full.id)
      return {
        ...d,
        emails: exists
          ? d.emails.map((x) => (x.id === full.id ? full : x))
          : [full, ...d.emails],
      }
    })
    return full
  }, [])

  const addTransaction: StoreContextValue["addTransaction"] = React.useCallback(
    (t) => {
      const full: Transaction = {
        id: t.id ?? nanoid(8),
        type: t.type ?? "expense",
        category: t.category ?? "Sonstiges",
        description: t.description ?? "",
        amount: t.amount ?? 0,
        taxRate: t.taxRate ?? 0.19,
        date: t.date ?? new Date().toISOString(),
        customerId: t.customerId,
        invoiceId: t.invoiceId,
      }
      setDb((d) => ({ ...d, transactions: [full, ...d.transactions] }))
      return full
    },
    [],
  )

  const updateSettings = React.useCallback((patch: Partial<CompanySettings>) => {
    setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const resetDemo = React.useCallback(() => {
    const fresh = seedDatabase()
    markSeedApplied(fresh)
    setDb(fresh)
  }, [])

  /**
   * Bestand aus einer Sicherung ersetzen. Der Seed-Merge darf danach nicht
   * erneut greifen: sonst kämen zurückgezogene Beispieldatensätze in die
   * wiederhergestellte Buchhaltung zurück. Deshalb wird der Revisionsstand
   * mitgesetzt, bevor der neue Bestand die Persistenz auslöst.
   */
  const replaceDatabase = React.useCallback((next: Database) => {
    try {
      window.localStorage.setItem(SEED_REV_KEY, String(SEED_REVISION))
    } catch {
      /* nicht schreibbar — der Fehler wird beim nächsten flush gemeldet */
    }
    setDb(next)
  }, [])

  const customerById = React.useCallback(
    (id?: string) => db.customers.find((c) => c.id === id),
    [db.customers],
  )

  // Memoized, damit Consumer nicht bei jedem Provider-Render ein neues
  // Objekt bekommen — alle Helfer sind useCallback-stabil.
  const value = React.useMemo<StoreContextValue>(
    () => ({
      db,
      ready,
      storageError,
      add,
      update,
      remove,
      upsertCustomer,
      upsertDeal,
      moveDeal,
      upsertProject,
      upsertTask,
      toggleTask,
      upsertInvoice,
      setInvoiceStatus,
      createCancellation,
      sendReminder,
      toggleRecurring,
      duplicateRecurring,
      upsertQuote,
      convertQuoteToInvoice,
      upsertContract,
      createContractFromQuote,
      upsertTemplate,
      upsertOnboarding,
      upsertEmail,
      addTransaction,
      updateSettings,
      pushActivity,
      resetDemo,
      replaceDatabase,
      customerById,
    }),
    [
      db,
      ready,
      storageError,
      add,
      update,
      remove,
      upsertCustomer,
      upsertDeal,
      moveDeal,
      upsertProject,
      upsertTask,
      toggleTask,
      upsertInvoice,
      setInvoiceStatus,
      createCancellation,
      sendReminder,
      toggleRecurring,
      duplicateRecurring,
      upsertQuote,
      convertQuoteToInvoice,
      upsertContract,
      createContractFromQuote,
      upsertTemplate,
      upsertOnboarding,
      upsertEmail,
      addTransaction,
      updateSettings,
      pushActivity,
      resetDemo,
      replaceDatabase,
      customerById,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function emptyLineItem(taxRate = 0.19): LineItem {
  return { id: nanoid(6), description: "", qty: 1, unitPrice: 0, taxRate }
}

/** Direct read of the persisted DB — for routes outside the provider (e.g. print). */
export function readDatabase(): Database {
  return load()
}
