"use client"

import * as React from "react"
import { Save, RotateCcw, Sparkles, Database, DownloadCloud, UploadCloud, ShieldAlert } from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import type { CompanySettings } from "@/lib/types"
import { buildBackup, backupFileName, parseBackup, backupSummary } from "@/lib/backup"
import { dateDE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DynaamiqLogo } from "@/components/brand/logo"
import { AutoBackupRow } from "@/components/app-shell/auto-backup-row"
import { useOnChange } from "@/hooks/use-derived-state"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function SettingsPage() {
  const { db, updateSettings, resetDemo, replaceDatabase } = useStore()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const [form, setForm] = React.useState<CompanySettings>(db.settings)

  // Speichern die Firmendaten woanders geändert (Import einer Sicherung,
  // Demo-Reset), übernimmt das Formular den neuen Stand.
  useOnChange(db.settings, () => setForm(db.settings))
  const set = (p: Partial<CompanySettings>) => setForm((f) => ({ ...f, ...p }))

  function save() {
    updateSettings(form)
    toast.success("Einstellungen gespeichert")
  }

  /** Vollständigen Bestand als JSON-Datei herunterladen. */
  function exportBackup() {
    const backup = buildBackup(db)
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = backupFileName()
    a.click()
    URL.revokeObjectURL(url)
    updateSettings({ lastBackupAt: backup.createdAt })
    toast.success("Sicherung gespeichert", {
      description: backupSummary(backup),
    })
  }

  /** Sicherung einlesen — ersetzt den kompletten Bestand nach Rückfrage. */
  async function importBackup(file: File) {
    const check = parseBackup(await file.text())
    if (!check.ok || !check.file) {
      toast.error("Sicherung nicht lesbar", { description: check.error })
      return
    }
    const ok = await confirm({
      title: "Bestand aus Sicherung ersetzen?",
      description: `Die Sicherung vom ${dateDE(check.file.createdAt)} enthält ${backupSummary(check.file)}. Der aktuelle Bestand in diesem Browser wird vollständig überschrieben.`,
      confirmLabel: "Wiederherstellen",
      destructive: true,
    })
    if (!ok) return
    replaceDatabase(check.file.data)
    toast.success("Bestand wiederhergestellt", {
      description: backupSummary(check.file),
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <DynaamiqLogo />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={async () => {
              const ok = await confirm({
                title: "Demo zurücksetzen?",
                description: "Alle Daten werden auf den Demo-Stand zurückgesetzt. Eigene Änderungen gehen verloren.",
                confirmLabel: "Zurücksetzen",
                destructive: true,
              })
              if (!ok) return
              resetDemo()
              toast.success("Demo-Daten wiederhergestellt")
            }}
          >
            <RotateCcw className="size-4" /> Demo zurücksetzen
          </Button>
          <Button variant="brand" className="gap-1.5" onClick={save}>
            <Save className="size-4" /> Speichern
          </Button>
        </div>
      </Card>

      {/* Firmendaten — iOS-Grouped-Inset-List */}
      <Group title="Firmendaten">
        <Row label="Anzeigename">
          <RowInput value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Row>
        <Row label="Rechtlicher Name">
          <RowInput value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} />
        </Row>
        <Row label="E-Mail">
          <RowInput type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Row>
        <Row label="Telefon">
          <RowInput value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Row>
        <Row label="Website">
          <RowInput value={form.website} onChange={(e) => set({ website: e.target.value })} />
        </Row>
        <Row label="Inhaber">
          <RowInput value={form.ownerName ?? ""} onChange={(e) => set({ ownerName: e.target.value })} />
        </Row>
        <Row label="Adresse">
          <RowInput value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Row>
        <Row label="PLZ">
          <RowInput value={form.zip} onChange={(e) => set({ zip: e.target.value })} />
        </Row>
        <Row label="Stadt">
          <RowInput value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </Row>
      </Group>

      {/* Steuer & Nummerierung */}
      <Group title="Steuer & Nummerierung">
        <Row label="USt-IdNr.">
          <RowInput value={form.vatId} onChange={(e) => set({ vatId: e.target.value })} />
        </Row>
        <Row label="Steuernummer">
          <RowInput value={form.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} />
        </Row>
        <Row label="Rechnungs-Präfix">
          <RowInput value={form.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} />
        </Row>
        <Row label="Angebots-Präfix">
          <RowInput value={form.quotePrefix} onChange={(e) => set({ quotePrefix: e.target.value })} />
        </Row>
        <Row label="Nächste Rechnungsnr.">
          <RowInput type="number" value={form.nextInvoiceNo} onChange={(e) => set({ nextInvoiceNo: Number(e.target.value) })} />
        </Row>
        <Row label="Nächste Angebotsnr.">
          <RowInput type="number" value={form.nextQuoteNo} onChange={(e) => set({ nextQuoteNo: Number(e.target.value) })} />
        </Row>
        <Row label="Zahlungsziel (Tage)">
          <RowInput type="number" value={form.paymentTermsDays} onChange={(e) => set({ paymentTermsDays: Number(e.target.value) })} />
        </Row>
        <Row label="Standard-USt (%)">
          <RowInput type="number" value={Math.round(form.defaultTaxRate * 100)} onChange={(e) => set({ defaultTaxRate: Number(e.target.value) / 100 })} />
        </Row>
        <Row label="Mahngebühr (€ je Mahnstufe)">
          <RowInput type="number" min={0} step="0.5" value={form.reminderFee} onChange={(e) => set({ reminderFee: Number(e.target.value) })} />
        </Row>
        <SwitchRow
          label="§19 UStG Kleinunternehmer"
          hint="Dokumente ohne Umsatzsteuer, Pflichttext wird ergänzt."
          checked={form.smallBusiness}
          onChange={(v) => set({ smallBusiness: v })}
        />
      </Group>

      {/* Bankverbindung */}
      <Group title="Bankverbindung">
        <Row label="Bank">
          <RowInput value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} />
        </Row>
        <Row label="BIC">
          <RowInput value={form.bic} onChange={(e) => set({ bic: e.target.value })} />
        </Row>
        <Row label="IBAN">
          <RowInput value={form.iban} onChange={(e) => set({ iban: e.target.value })} />
        </Row>
      </Group>

      {/* Datensicherung — der Bestand liegt nur in diesem Browser */}
      <Group title="Datensicherung">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#ffb020]/12">
            <ShieldAlert className="size-4 text-[#ffb020]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Alle Daten liegen nur in diesem Browser</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Geleerte Websitedaten, ein neues Gerät oder Safaris automatische Speicherräumung
              löschen Kunden, Angebote und Rechnungen ersatzlos. Rechnungen sind nach §147 AO
              zehn Jahre aufzubewahren. Gib deshalb unten einen Sicherungsordner frei — dann
              läuft die Sicherung von selbst. Der Knopf darunter bleibt für die Kopie aus der
              Hand, etwa an den Steuerberater.
            </p>
            <p className="mt-1.5 text-xs">
              {db.settings.lastBackupAt ? (
                <span className="text-muted-foreground">
                  Letzte Sicherung: {dateDE(db.settings.lastBackupAt)}
                </span>
              ) : (
                <span className="font-medium text-[#ffb020]">Noch nie gesichert.</span>
              )}
            </p>
          </div>
        </div>
        <AutoBackupRow />
        <div className="flex flex-wrap gap-2 px-4 py-3.5">
          <Button variant="brand" className="gap-1.5" onClick={exportBackup}>
            <DownloadCloud className="size-4" /> Sicherung herunterladen
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => fileInput.current?.click()}
          >
            <UploadCloud className="size-4" /> Sicherung einspielen
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              // Zurücksetzen, damit dieselbe Datei ein zweites Mal ausgewählt
              // werden kann — sonst feuert `change` beim gleichen Namen nicht.
              e.target.value = ""
              if (f) void importBackup(f)
            }}
          />
        </div>
      </Group>

      {/* Integrationen */}
      <Group title="Integrationen">
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
      </Group>
    </div>
  )
}

/** iOS-Grouped-Inset-List: Uppercase-Header + Gruppe mit Hairline-Dividers */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-4 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        {children}
      </div>
    </section>
  )
}

/** Zeile: Label links, Control/Wert rechts — Klick aufs Label fokussiert das Feld */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-1.5">
      <span className="shrink-0 text-sm text-foreground/90">{label}</span>
      {children}
    </label>
  )
}

/** Text-Input im iOS-Stil: rechtsbündig, ohne eigene Box, Fokus dezent */
function RowInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        // text-base auf Phone (≥16px) verhindert den iOS-Auto-Zoom beim Fokussieren
        "min-w-0 flex-1 bg-transparent text-right text-base text-foreground/90 caret-brand-cyan outline-none transition-colors placeholder:text-muted-foreground/50 focus:text-foreground md:text-sm",
        className,
      )}
    />
  )
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
      className="flex min-h-[52px] w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors active:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span className="block text-sm text-foreground/90">{label}</span>
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
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant={variant} className="text-[10px]">{status}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
