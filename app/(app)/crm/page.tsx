"use client"

import * as React from "react"
import { useQueryFlag } from "@/hooks/use-query-flag"
import { useRouter } from "next/navigation"
import {
  Plus,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Trash2,
  Pencil,
  FileText,
  ReceiptEuro,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { eur, dateDE, computeTotals } from "@/lib/format"
import type { Customer } from "@/lib/types"
import { DocEditorDialog } from "@/components/documents/doc-editor"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Input, Label, Textarea, Select } from "@/components/ui/input"
import { Toolbar, SearchInput, FilterChips } from "@/components/page-toolbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type Health = "all" | "active" | "lead" | "churned"

const HEALTH_BADGE: Record<Customer["health"], { label: string; variant: "success" | "brand" | "muted" }> = {
  active: { label: "Aktiv", variant: "success" },
  lead: { label: "Lead", variant: "brand" },
  churned: { label: "Inaktiv", variant: "muted" },
}

export default function CrmPage() {
  const { db, upsertCustomer, remove, add, upsertEmail, customerById } = useStore()
  const confirm = useConfirm()
  const router = useRouter()
  const wantNew = useQueryFlag("new")
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Health>("all")
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [docEditor, setDocEditor] = React.useState<{
    kind: "invoice" | "quote"
    customerId: string
  } | null>(null)

  function createEmailFor(c: Customer) {
    upsertEmail({
      to: c.email,
      customerId: c.id,
      subject: `Nachricht von Dynaamiq AI`,
      body: `Hallo ${c.contactName || ""},\n\n\n\nBeste Grüße\nMartin — Dynaamiq AI`,
      status: "draft",
    })
    setDetailId(null)
    toast.success("E-Mail-Entwurf erstellt")
    router.push("/emails")
  }

  React.useEffect(() => {
    if (wantNew) {
      setEditing(null)
      setDialogOpen(true)
    }
  }, [wantNew])

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setDialogOpen(true)
  }

  const filtered = db.customers.filter((c) => {
    if (filter !== "all" && c.health !== filter) return false
    const q = query.toLowerCase()
    return (
      !q ||
      c.company.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const counts = {
    all: db.customers.length,
    active: db.customers.filter((c) => c.health === "active").length,
    lead: db.customers.filter((c) => c.health === "lead").length,
    churned: db.customers.filter((c) => c.health === "churned").length,
  }

  const detail = customerById(detailId ?? undefined)

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Kunde, Kontakt oder Tag…" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: counts.all },
            { id: "active", label: "Aktiv", count: counts.active },
            { id: "lead", label: "Leads", count: counts.lead },
            { id: "churned", label: "Inaktiv", count: counts.churned },
          ]}
        />
        <Button variant="brand" size="lg" className="ml-auto gap-1.5" onClick={openNew}>
          <Plus className="size-4" /> Neuer Kunde
        </Button>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Keine Kunden gefunden"
          hint="Lege deinen ersten Kunden an, um Deals, Projekte und Rechnungen zu verknüpfen."
          action={
            <Button variant="brand" onClick={openNew} className="gap-1.5">
              <Plus className="size-4" /> Kunde anlegen
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const revenue = db.invoices
              .filter((i) => i.customerId === c.id && i.status === "paid")
              .reduce((s, i) => s + computeTotals(i.items).gross, 0)
            const openDeals = db.deals.filter(
              (d) => d.customerId === c.id && d.stage !== "won" && d.stage !== "lost",
            ).length
            const hb = HEALTH_BADGE[c.health]
            return (
              <Card
                key={c.id}
                className="cursor-pointer p-5"
                onClick={() => setDetailId(c.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.company} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display font-semibold">{c.company}</p>
                      <Badge variant={hb.variant} className="shrink-0">{hb.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.contactName || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="muted" className="text-[10px]">{t}</Badge>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Umsatz</p>
                    <p className="font-semibold tnum">{eur(revenue, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Offene Deals</p>
                    <p className="font-semibold tnum">{openDeals}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CustomerDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editing}
        onSave={(data) => {
          upsertCustomer(data)
          toast.success(editing ? "Kunde aktualisiert" : "Kunde angelegt")
          setDialogOpen(false)
        }}
      />

      {/* Detail */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        {detail && (
          <DialogContent size="lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar name={detail.company} className="size-12" />
                <div>
                  <DialogTitle>{detail.company}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{detail.contactName}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {detail.email && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> {detail.email}
                </span>
              )}
              {detail.phone && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> {detail.phone}
                </span>
              )}
              {detail.website && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="size-4" /> {detail.website}
                </span>
              )}
              {(detail.city || detail.address) && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" /> {[detail.address, detail.zip, detail.city].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const inv = db.invoices.filter((i) => i.customerId === detail.id)
                const revenue = inv
                  .filter((i) => i.status === "paid")
                  .reduce((s, i) => s + computeTotals(i.items).gross, 0)
                const deals = db.deals.filter((d) => d.customerId === detail.id)
                const projects = db.projects.filter((p) => p.customerId === detail.id)
                return (
                  <>
                    <Stat label="Umsatz" value={eur(revenue, { compact: true })} />
                    <Stat label="Deals" value={String(deals.length)} />
                    <Stat label="Projekte" value={String(projects.length)} />
                  </>
                )
              })()}
            </div>

            {detail.notes && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                {detail.notes}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                Schnell erstellen
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => {
                    setDetailId(null)
                    setDocEditor({ kind: "quote", customerId: detail.id })
                  }}
                >
                  <FileText className="size-4 text-brand-pink" /> Angebot
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => {
                    setDetailId(null)
                    setDocEditor({ kind: "invoice", customerId: detail.id })
                  }}
                >
                  <ReceiptEuro className="size-4 text-brand-orange" /> Rechnung
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => createEmailFor(detail)}
                >
                  <Mail className="size-4 text-[#a78bfa]" /> E-Mail
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                className="gap-1.5 sm:mr-auto"
                onClick={async () => {
                  const ok = await confirm({
                    title: `${detail.company} löschen?`,
                    description:
                      "Der Kunde wird entfernt. Verknüpfte Rechnungen, Angebote und Deals bleiben erhalten, verlieren aber die Zuordnung.",
                    confirmLabel: "Löschen",
                    destructive: true,
                  })
                  if (!ok) return
                  remove("customers", detail.id)
                  setDetailId(null)
                  toast.success("Kunde gelöscht", {
                    action: { label: "Rückgängig", onClick: () => add("customers", detail) },
                  })
                }}
              >
                <Trash2 className="size-4" /> Löschen
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Schließen</Button>
              </DialogClose>
              <Button
                variant="brand"
                className="gap-1.5"
                onClick={() => {
                  setDetailId(null)
                  openEdit(detail)
                }}
              >
                <Pencil className="size-4" /> Bearbeiten
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {docEditor && (
        <DocEditorDialog
          kind={docEditor.kind}
          open={!!docEditor}
          onOpenChange={(o) => !o && setDocEditor(null)}
          doc={null}
          defaultCustomerId={docEditor.customerId}
          onSaved={() => {
            toast.success(docEditor.kind === "quote" ? "Angebot erstellt" : "Rechnung erstellt")
            setDocEditor(null)
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tnum">{value}</p>
    </div>
  )
}

function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customer: Customer | null
  onSave: (data: Partial<Customer> & { id?: string }) => void
}) {
  const [form, setForm] = React.useState<Partial<Customer>>(
    customer ?? { health: "lead", country: "Deutschland", tags: [] },
  )
  const [tagText, setTagText] = React.useState((customer?.tags ?? []).join(", "))
  const set = (patch: Partial<Customer>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Kunde bearbeiten" : "Neuer Kunde"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Firma">
            <Input value={form.company ?? ""} onChange={(e) => set({ company: e.target.value })} placeholder="Firmenname" />
          </Field>
          <Field label="Ansprechpartner">
            <Input value={form.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} placeholder="Vor- und Nachname" />
          </Field>
          <Field label="E-Mail">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="name@firma.de" />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="+49 …" />
          </Field>
          <Field label="Website">
            <Input value={form.website ?? ""} onChange={(e) => set({ website: e.target.value })} placeholder="firma.de" />
          </Field>
          <Field label="USt-IdNr.">
            <Input value={form.vatId ?? ""} onChange={(e) => set({ vatId: e.target.value })} placeholder="DE…" />
          </Field>
          <Field label="Adresse">
            <Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} placeholder="Straße & Nr." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PLZ">
              <Input value={form.zip ?? ""} onChange={(e) => set({ zip: e.target.value })} />
            </Field>
            <Field label="Stadt">
              <Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.health ?? "lead"} onChange={(e) => set({ health: e.target.value as Customer["health"] })}>
              <option value="lead">Lead</option>
              <option value="active">Aktiv</option>
              <option value="churned">Inaktiv</option>
            </Select>
          </Field>
          <Field label="Tags (Komma-getrennt)">
            <Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Meta Ads, Retainer" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notizen">
              <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Interne Notizen…" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="brand"
            disabled={!form.company}
            onClick={() =>
              onSave({
                ...form,
                id: customer?.id,
                tags: tagText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
