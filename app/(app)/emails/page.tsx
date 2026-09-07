"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Mail, Send, Trash2, Sparkles, Inbox } from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { relativeTime } from "@/lib/format"
import type { EmailDraft, Template } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/misc"
import { CustomerAvatar } from "@/components/ui/customer-avatar"
import { Input, Label, Textarea, Select } from "@/components/ui/input"
import { Toolbar, FilterChips } from "@/components/page-toolbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type Filter = "all" | "draft" | "sent"

export default function EmailsPage() {
  const { db, upsertEmail, remove, add, customerById } = useStore()
  const confirm = useConfirm()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [editing, setEditing] = React.useState<EmailDraft | null>(null)
  const [open, setOpen] = React.useState(false)

  const rows = db.emails
    .filter((e) => filter === "all" || e.status === filter)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const counts = (s: "draft" | "sent") => db.emails.filter((e) => e.status === s).length

  return (
    <div className="mx-auto max-w-[1760px]">
      <Toolbar>
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Alle", count: db.emails.length },
            { id: "draft", label: "Entwürfe", count: counts("draft") },
            { id: "sent", label: "Versendet", count: counts("sent") },
          ]}
        />
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="lg" className="gap-1.5">
            <Link href="/assistant?intent=email"><Sparkles className="size-4 text-brand-cyan" /> Mit KI</Link>
          </Button>
          <Button variant="brand" size="lg" className="gap-1.5" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="size-4" /> Neue E-Mail
          </Button>
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="Keine E-Mails" hint="Erstelle Entwürfe manuell, aus Rechnungen/Angeboten oder per KI." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((e) => {
            const c = customerById(e.customerId)
            return (
              <Card key={e.id} className="cursor-pointer p-4" onClick={() => { setEditing(e); setOpen(true) }}>
                <div className="flex items-start gap-3">
                  <CustomerAvatar customer={c} name={e.to} className="size-9 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{e.subject || "(kein Betreff)"}</p>
                      <Badge variant={e.status === "sent" ? "success" : "muted"} className="shrink-0 text-[10px]">
                        {e.status === "sent" ? "Versendet" : "Entwurf"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">An: {e.to || c?.email || "—"}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/70">{e.body}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground/50">{relativeTime(e.createdAt)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <EmailDialog
        key={editing?.id ?? (open ? "new" : "closed")}
        open={open}
        onOpenChange={setOpen}
        email={editing}
        customers={db.customers}
        templates={db.templates.filter((t) => t.kind === "email")}
        onSave={(e, send) => {
          upsertEmail({ ...e, status: send ? "sent" : "draft" })
          toast.success(send ? "E-Mail als versendet markiert" : "Entwurf gespeichert")
          setOpen(false)
        }}
        onDelete={
          editing
            ? async () => {
                const ok = await confirm({
                  title: "E-Mail löschen?",
                  description: "Der Entwurf wird endgültig entfernt.",
                  confirmLabel: "Löschen",
                  destructive: true,
                })
                if (!ok) return
                remove("emails", editing.id)
                setOpen(false)
                toast.success("E-Mail gelöscht", {
                  action: { label: "Rückgängig", onClick: () => add("emails", editing) },
                })
              }
            : undefined
        }
      />
    </div>
  )
}

function EmailDialog({
  open,
  onOpenChange,
  email,
  customers,
  templates,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  email: EmailDraft | null
  customers: { id: string; company: string; email?: string; contactName?: string }[]
  templates: Template[]
  onSave: (e: Partial<EmailDraft> & { id?: string }, send: boolean) => void
  onDelete?: () => void
}) {
  const [customerId, setCustomerId] = React.useState(email?.customerId ?? "")
  const [to, setTo] = React.useState(email?.to ?? "")
  const [subject, setSubject] = React.useState(email?.subject ?? "")
  const [bodyText, setBodyText] = React.useState(email?.body ?? "")

  function applyTemplate(t: Template) {
    const c = customers.find((x) => x.id === customerId)
    const fill = (s: string) => s.replace(/\{\{contact_name\}\}/g, c?.contactName ?? "")
    if (t.subject) setSubject(fill(t.subject))
    if (t.body) setBodyText(fill(t.body))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{email ? "E-Mail bearbeiten" : "Neue E-Mail"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kunde</Label>
            <Select value={customerId} onChange={(e) => {
              setCustomerId(e.target.value)
              const c = customers.find((x) => x.id === e.target.value)
              if (c?.email) setTo(c.email)
            }}>
              <option value="">— optional —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </Select>
          </div>
          <div>
            <Label>An (E-Mail)</Label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@firma.de" />
          </div>
        </div>
        {templates.length > 0 && (
          <div>
            <Label>Vorlage</Label>
            <Select defaultValue="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) applyTemplate(t) }}>
              <option value="">— Vorlage anwenden —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label>Betreff</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Nachricht</Label>
          <Textarea className="min-h-48" value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
          {email && onDelete && (
            <Button variant="destructive" className="gap-1.5 sm:mr-auto" onClick={onDelete}>
              <Trash2 className="size-4" /> Löschen
            </Button>
          )}
          <Button variant="outline" className="gap-1.5" onClick={() => onSave({ id: email?.id, customerId: customerId || undefined, to, subject, body: bodyText }, false)}>
            <Mail className="size-4" /> Als Entwurf
          </Button>
          <Button variant="brand" className="gap-1.5" disabled={!to || !subject} onClick={() => onSave({ id: email?.id, customerId: customerId || undefined, to, subject, body: bodyText }, true)}>
            <Send className="size-4" /> Senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
