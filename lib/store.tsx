"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { seedDatabase } from "./seed"
import { computeTotals, emailSignature, ownerFirstName } from "./format"
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
  Template,
  EmailDraft,
  Transaction,
  Activity,
  CompanySettings,
  LineItem,
} from "./types"

const STORAGE_KEY = "dynaamiq-os-db-v1"

type Collections = Omit<Database, "settings">
type CollectionKey = keyof Collections

interface StoreContextValue {
  db: Database
  ready: boolean
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
  upsertTemplate: (t: Partial<Template> & { id?: string }) => Template
  upsertEmail: (e: Partial<EmailDraft> & { id?: string }) => EmailDraft
  addTransaction: (t: Partial<Transaction>) => Transaction
  updateSettings: (patch: Partial<CompanySettings>) => void
  pushActivity: (a: Omit<Activity, "id" | "at"> & { at?: string }) => void
  resetDemo: () => void
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

function load(): Database {
  if (typeof window === "undefined") return seedDatabase()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDatabase()
    const parsed = JSON.parse(raw) as Database
    // basic shape guard
    if (!parsed.customers || !parsed.settings) return seedDatabase()
    // Neue Settings-Felder (z. B. Amtsgericht, HR-Nr.) aus den Defaults ergänzen,
    // ohne eigene Änderungen zu überschreiben.
    const seed = seedDatabase()
    return { ...parsed, settings: { ...seed.settings, ...parsed.settings } }
  } catch {
    return seedDatabase()
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = React.useState<Database>(() => seedDatabase())
  const [ready, setReady] = React.useState(false)

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
    } catch {
      /* quota / private mode — ignore */
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
    setDb((d) => ({
      ...d,
      deals: d.deals.map((x) =>
        x.id === id
          ? {
              ...x,
              stage,
              probability:
                stage === "won" ? 100 : stage === "lost" ? 0 : x.probability,
            }
          : x,
      ),
    }))
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
      projectId: t.projectId ?? "",
      title: t.title ?? "Neue Aufgabe",
      status: t.status ?? "todo",
      assignee: t.assignee,
      due: t.due,
      hours: t.hours,
    }
    setDb((d) => {
      const exists = d.tasks.some((x) => x.id === full.id)
      return {
        ...d,
        tasks: exists
          ? d.tasks.map((x) => (x.id === full.id ? full : x))
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
          number = `${d.settings.invoicePrefix}-${d.settings.nextInvoiceNo}`
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
      setDb((d) => ({
        ...d,
        invoices: d.invoices.map((x) => (x.id === id ? { ...x, status } : x)),
      }))
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
        const number = `${d.settings.invoicePrefix}-${d.settings.nextInvoiceNo}`
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
        const number = `${d.settings.invoicePrefix}-${d.settings.nextInvoiceNo}`
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
        number = `${d.settings.quotePrefix}-${d.settings.nextQuoteNo}`
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
      const number = `${d.settings.invoicePrefix}-${d.settings.nextInvoiceNo}`
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
    setDb(fresh)
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
      upsertTemplate,
      upsertEmail,
      addTransaction,
      updateSettings,
      pushActivity,
      resetDemo,
      customerById,
    }),
    [
      db,
      ready,
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
      upsertTemplate,
      upsertEmail,
      addTransaction,
      updateSettings,
      pushActivity,
      resetDemo,
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
