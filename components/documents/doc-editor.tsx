"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { Sparkles } from "lucide-react"
import type { Invoice, Quote, LineItem, Template } from "@/lib/types"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input, Label, Select, Textarea } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { LineItemsEditor } from "./line-items-editor"

type Kind = "invoice" | "quote"
type Doc = Invoice | Quote

function toDateInput(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

export function DocEditorDialog({
  kind,
  open,
  onOpenChange,
  doc,
  defaultCustomerId,
  defaultItems,
  onSaved,
}: {
  kind: Kind
  open: boolean
  onOpenChange: (o: boolean) => void
  doc: Doc | null
  defaultCustomerId?: string
  defaultItems?: LineItem[]
  onSaved?: (saved: Doc) => void
}) {
  const { db, upsertInvoice, upsertQuote, pushActivity } = useStore()
  const isInvoice = kind === "invoice"
  const termDays = db.settings.paymentTermsDays
  const smallBusiness = db.settings.smallBusiness

  const initialDate = doc?.issueDate ?? new Date().toISOString()
  const initialSecond =
    (doc as Invoice)?.dueDate ??
    (doc as Quote)?.validUntil ??
    (() => {
      const d = new Date()
      d.setDate(d.getDate() + (isInvoice ? termDays : 21))
      return d.toISOString()
    })()

  const [customerId, setCustomerId] = React.useState(
    doc?.customerId ?? defaultCustomerId ?? "",
  )
  const [issueDate, setIssueDate] = React.useState(initialDate)
  const [secondDate, setSecondDate] = React.useState(initialSecond)
  // Leistungsdatum (§14 UStG) — Default: Rechnungsdatum
  const [serviceDate, setServiceDate] = React.useState(
    (doc as Invoice)?.serviceDate ?? initialDate,
  )
  const [servicePeriodEnd, setServicePeriodEnd] = React.useState(
    (doc as Invoice)?.servicePeriodEnd ?? "",
  )
  const [status, setStatus] = React.useState<string>(doc?.status ?? "draft")
  const [items, setItems] = React.useState<LineItem[]>(() => {
    const initial = doc?.items ??
      defaultItems ?? [
        {
          id: nanoid(6),
          description: "",
          qty: 1,
          unitPrice: 0,
          taxRate: smallBusiness ? 0 : 0.19,
        },
      ]
    // §19 UStG: keine Umsatzsteuer — Positionen fest auf 0 %
    return smallBusiness ? initial.map((it) => ({ ...it, taxRate: 0 })) : initial
  })
  const [notes, setNotes] = React.useState(doc?.notes ?? db.settings.invoiceFooter)

  const templates = db.templates.filter((t) =>
    isInvoice ? t.kind === "invoice" : t.kind === "quote",
  )

  function applyTemplate(t: Template) {
    if (t.items) setItems(t.items.map((it) => ({ ...it, id: nanoid(6) })))
  }

  function save() {
    // §19 UStG: sicherstellen, dass keine Position USt trägt
    const savedItems = smallBusiness
      ? items.map((it) => ({ ...it, taxRate: 0 }))
      : items
    if (isInvoice) {
      const saved = upsertInvoice({
        id: doc?.id,
        number: (doc as Invoice)?.number,
        customerId,
        status: status as Invoice["status"],
        issueDate,
        dueDate: secondDate,
        serviceDate,
        servicePeriodEnd: servicePeriodEnd || "",
        items: savedItems,
        notes,
      })
      if (!doc)
        pushActivity({
          type: "invoice",
          title: `Rechnung ${saved.number} erstellt`,
          meta: db.customers.find((c) => c.id === customerId)?.company,
        })
      onSaved?.(saved)
    } else {
      const saved = upsertQuote({
        id: doc?.id,
        number: (doc as Quote)?.number,
        customerId,
        status: status as Quote["status"],
        issueDate,
        validUntil: secondDate,
        items: savedItems,
        notes,
      })
      if (!doc)
        pushActivity({
          type: "quote",
          title: `Angebot ${saved.number} erstellt`,
          meta: db.customers.find((c) => c.id === customerId)?.company,
        })
      onSaved?.(saved)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {doc
              ? `${isInvoice ? "Rechnung" : "Angebot"} ${
                  (doc as Invoice).number
                } bearbeiten`
              : `Neue${isInvoice ? " Rechnung" : "s Angebot"}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <Label>Kunde</Label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— wählen —</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Datum</Label>
            <Input
              type="date"
              value={toDateInput(issueDate)}
              onChange={(e) => setIssueDate(new Date(e.target.value).toISOString())}
            />
          </div>
          <div>
            <Label>{isInvoice ? "Fällig am" : "Gültig bis"}</Label>
            <Input
              type="date"
              value={toDateInput(secondDate)}
              onChange={(e) => setSecondDate(new Date(e.target.value).toISOString())}
            />
          </div>
        </div>

        {isInvoice && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label>Leistungsdatum</Label>
              <Input
                type="date"
                value={toDateInput(serviceDate)}
                onChange={(e) =>
                  setServiceDate(new Date(e.target.value).toISOString())
                }
              />
            </div>
            <div>
              <Label>bis (optional)</Label>
              <Input
                type="date"
                value={toDateInput(servicePeriodEnd || undefined)}
                onChange={(e) =>
                  setServicePeriodEnd(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {isInvoice ? (
                <>
                  <option value="draft">Entwurf</option>
                  <option value="sent">Versendet</option>
                  <option value="paid">Bezahlt</option>
                  <option value="overdue">Überfällig</option>
                  <option value="canceled">Storniert</option>
                </>
              ) : (
                <>
                  <option value="draft">Entwurf</option>
                  <option value="sent">Versendet</option>
                  <option value="accepted">Angenommen</option>
                  <option value="declined">Abgelehnt</option>
                  <option value="expired">Abgelaufen</option>
                </>
              )}
            </Select>
          </div>
          {templates.length > 0 && (
            <div>
              <Label>Vorlage anwenden</Label>
              <Select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value)
                  if (t) applyTemplate(t)
                }}
              >
                <option value="">— Vorlage wählen —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label>Positionen</Label>
          <LineItemsEditor items={items} onChange={setItems} taxLocked={smallBusiness} />
          {smallBusiness && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              §19 UStG Kleinunternehmer aktiv — alle Positionen ohne Umsatzsteuer.
            </p>
          )}
        </div>

        <div>
          <Label>Fußnote / Hinweis</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="brand"
            disabled={!customerId || items.every((i) => !i.description)}
            onClick={save}
            className="gap-1.5"
          >
            <Sparkles className="size-4" />
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
