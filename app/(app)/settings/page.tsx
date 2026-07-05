"use client"

import * as React from "react"
import { Save, RotateCcw, Building2, Receipt, Landmark, Sparkles, Database } from "lucide-react"
import { useStore } from "@/lib/store"
import type { CompanySettings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input, Label } from "@/components/ui/input"
import { SectionTitle } from "@/components/kpi-card"
import { DynaamiqLogo } from "@/components/brand/logo"
import { toast } from "sonner"

export default function SettingsPage() {
  const { db, updateSettings, resetDemo } = useStore()
  const [form, setForm] = React.useState<CompanySettings>(db.settings)

  React.useEffect(() => setForm(db.settings), [db.settings])
  const set = (p: Partial<CompanySettings>) => setForm((f) => ({ ...f, ...p }))

  function save() {
    updateSettings(form)
    toast.success("Einstellungen gespeichert")
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <DynaamiqLogo />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              if (confirm("Alle Daten auf den Demo-Stand zurücksetzen?")) {
                resetDemo()
                toast.success("Demo-Daten wiederhergestellt")
              }
            }}
          >
            <RotateCcw className="size-4" /> Demo zurücksetzen
          </Button>
          <Button variant="brand" className="gap-1.5" onClick={save}>
            <Save className="size-4" /> Speichern
          </Button>
        </div>
      </Card>

      {/* Company */}
      <Card className="p-6">
        <SectionTitle><Building2 className="mr-2 inline size-4 text-brand-cyan" />Firmendaten</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Anzeigename"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Rechtlicher Name"><Input value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} /></Field>
          <Field label="E-Mail"><Input value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Telefon"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set({ website: e.target.value })} /></Field>
          <Field label="Inhaber"><Input value={form.ownerName ?? ""} onChange={(e) => set({ ownerName: e.target.value })} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field label="PLZ"><Input value={form.zip} onChange={(e) => set({ zip: e.target.value })} /></Field>
          <Field label="Stadt"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
        </div>
      </Card>

      {/* Tax & numbering */}
      <Card className="p-6">
        <SectionTitle><Receipt className="mr-2 inline size-4 text-brand-cyan" />Steuer & Nummerierung</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="USt-IdNr."><Input value={form.vatId} onChange={(e) => set({ vatId: e.target.value })} /></Field>
          <Field label="Steuernummer"><Input value={form.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} /></Field>
          <Field label="Rechnungs-Präfix"><Input value={form.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} /></Field>
          <Field label="Angebots-Präfix"><Input value={form.quotePrefix} onChange={(e) => set({ quotePrefix: e.target.value })} /></Field>
          <Field label="Nächste Rechnungsnr."><Input type="number" value={form.nextInvoiceNo} onChange={(e) => set({ nextInvoiceNo: Number(e.target.value) })} /></Field>
          <Field label="Nächste Angebotsnr."><Input type="number" value={form.nextQuoteNo} onChange={(e) => set({ nextQuoteNo: Number(e.target.value) })} /></Field>
          <Field label="Zahlungsziel (Tage)"><Input type="number" value={form.paymentTermsDays} onChange={(e) => set({ paymentTermsDays: Number(e.target.value) })} /></Field>
          <Field label="Standard-USt (%)"><Input type="number" value={Math.round(form.defaultTaxRate * 100)} onChange={(e) => set({ defaultTaxRate: Number(e.target.value) / 100 })} /></Field>
          <Field label="Mahngebühr (€ je Mahnstufe)"><Input type="number" min={0} step="0.5" value={form.reminderFee} onChange={(e) => set({ reminderFee: Number(e.target.value) })} /></Field>
          <div className="flex items-end sm:col-span-1">
            <SwitchRow
              label="§19 UStG Kleinunternehmer"
              hint="Dokumente ohne Umsatzsteuer, Pflichttext wird ergänzt."
              checked={form.smallBusiness}
              onChange={(v) => set({ smallBusiness: v })}
            />
          </div>
        </div>
      </Card>

      {/* Bank */}
      <Card className="p-6">
        <SectionTitle><Landmark className="mr-2 inline size-4 text-brand-cyan" />Bankverbindung</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bank"><Input value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} /></Field>
          <Field label="BIC"><Input value={form.bic} onChange={(e) => set({ bic: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="IBAN"><Input value={form.iban} onChange={(e) => set({ iban: e.target.value })} /></Field></div>
        </div>
      </Card>

      {/* Integrations status */}
      <Card className="p-6">
        <SectionTitle>Integrationen</SectionTitle>
        <div className="space-y-3">
          <IntegrationRow
            icon={<Sparkles className="size-4 text-brand-cyan" />}
            title="KI-Assistent (Claude)"
            desc="Setze ANTHROPIC_API_KEY in .env.local für echte KI-Generierung. Ohne Key läuft der Demo-Modus."
            status="Aktiv (Demo / Live je nach Key)"
            variant="warning"
          />
          <IntegrationRow
            icon={<Database className="size-4 text-[#3ee3b5]" />}
            title="Supabase Datenbank"
            desc="Aktuell lokal (localStorage). Trage NEXT_PUBLIC_SUPABASE_URL & Key + supabase/schema.sql ein für Cloud-Sync."
            status="Lokal aktiv"
            variant="muted"
          />
        </div>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && (
          <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
        )}
      </span>
      <span
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        style={{
          background: checked
            ? "linear-gradient(90deg,#1f7bf2,#5b2eff)"
            : "rgba(255,255,255,0.12)",
        }}
      >
        <span
          className="absolute size-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  )
}

function IntegrationRow({
  icon,
  title,
  desc,
  status,
  variant,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  status: string
  variant: React.ComponentProps<typeof Badge>["variant"]
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant={variant} className="text-[10px]">{status}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
