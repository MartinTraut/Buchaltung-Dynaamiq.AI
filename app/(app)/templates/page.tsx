"use client"

import * as React from "react"
import { Plus, LayoutTemplate, Mail, FileText, ReceiptEuro, Trash2, Pencil } from "lucide-react"
import { nanoid } from "nanoid"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { eur, computeTotals } from "@/lib/format"
import type { Template, TemplateKind, LineItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/misc"
import { Input, Label, Textarea, Select } from "@/components/ui/input"
import { Toolbar, FilterChips } from "@/components/page-toolbar"
import { LineItemsEditor } from "@/components/documents/line-items-editor"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const KIND_META: Record<TemplateKind, { label: string; icon: React.ElementType; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  email: { label: "E-Mail", icon: Mail, variant: "violet" },
  invoice: { label: "Rechnung", icon: ReceiptEuro, variant: "brand" },
  quote: { label: "Angebot", icon: FileText, variant: "pink" },
}

type Filter = "all" | TemplateKind

export default function TemplatesPage() {
  const { db, upsertTemplate, remove, add } = useStore()
  const confirm = useConfirm()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [editing, setEditing] = React.useState<Template | null>(null)
  const [open, setOpen] = React.useState(false)

  const rows = db.templates.filter((t) => filter === "all" || t.kind === filter)
  const counts = (k: TemplateKind) => db.templates.filter((t) => t.kind === k).length

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar>
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.templates.length },
            { id: "email", label: "E-Mail", count: counts("email") },
            { id: "invoice", label: "Rechnung", count: counts("invoice") },
            { id: "quote", label: "Angebot", count: counts("quote") },
          ]}
        />
        <Button variant="brand" size="lg" className="ml-auto gap-1.5" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="size-4" /> Neue Vorlage
        </Button>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon={<LayoutTemplate className="size-6" />} title="Keine Vorlagen" hint="Erstelle wiederverwendbare Bausteine für Rechnungen, Angebote und E-Mails." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => {
            const meta = KIND_META[t.kind]
            const Icon = meta.icon
            const total = t.items ? computeTotals(t.items).gross : 0
            return (
              <Card key={t.id} className="group p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-white/[0.04]">
                    <Icon className="size-4 text-brand-pink" />
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(t); setOpen(true) }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Vorlage „${t.name}" löschen?`,
                          confirmLabel: "Löschen",
                          destructive: true,
                        })
                        if (!ok) return
                        remove("templates", t.id)
                        toast.success("Vorlage gelöscht", {
                          action: { label: "Rückgängig", onClick: () => add("templates", t) },
                        })
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 font-display font-semibold">{t.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                  {t.items && <span className="text-xs text-muted-foreground tnum">{eur(total)} · {t.items.length} Pos.</span>}
                </div>
                {t.subject && <p className="mt-3 truncate text-sm text-muted-foreground">{t.subject}</p>}
                {t.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">{t.body}</p>}
              </Card>
            )
          })}
        </div>
      )}

      <TemplateDialog
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSave={(t) => { upsertTemplate(t); toast.success(editing ? "Vorlage aktualisiert" : "Vorlage erstellt"); setOpen(false) }}
      />
    </div>
  )
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  template: Template | null
  onSave: (t: Partial<Template> & { id?: string }) => void
}) {
  const [kind, setKind] = React.useState<TemplateKind>(template?.kind ?? "email")
  const [name, setName] = React.useState(template?.name ?? "")
  const [subject, setSubject] = React.useState(template?.subject ?? "")
  const [bodyText, setBodyText] = React.useState(template?.body ?? "")
  const [items, setItems] = React.useState<LineItem[]>(template?.items ?? [{ id: nanoid(6), description: "", qty: 1, unitPrice: 0, taxRate: 0.19 }])

  const isEmail = kind === "email"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{template ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Typ</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)} disabled={!!template}>
              <option value="email">E-Mail</option>
              <option value="invoice">Rechnung</option>
              <option value="quote">Angebot</option>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorlagenname" />
          </div>
        </div>

        {isEmail ? (
          <>
            <div>
              <Label>Betreff</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Betreff (Platzhalter: {{contact_name}})" />
            </div>
            <div>
              <Label>Text</Label>
              <Textarea className="min-h-40" value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="E-Mail-Text mit Platzhaltern wie {{invoice_number}}, {{amount}}…" />
            </div>
          </>
        ) : (
          <div>
            <Label>Standard-Positionen</Label>
            <LineItemsEditor items={items} onChange={setItems} />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
          <Button
            variant="brand"
            disabled={!name}
            onClick={() => onSave({ id: template?.id, kind, name, subject: isEmail ? subject : undefined, body: isEmail ? bodyText : undefined, items: isEmail ? undefined : items })}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
