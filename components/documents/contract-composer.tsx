"use client"

import * as React from "react"
import { FileDown, Save, Send } from "lucide-react"
import { toast } from "sonner"
import type { Contract, ContractClause } from "@/lib/types"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import {
  cents,
  computeTotals,
  contractNumberFor,
  numInput,
  parseDE,
  toDateInput,
  fromDateInput,
} from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input, Select, Textarea } from "@/components/ui/input"
import { DocPreview } from "./doc-preview"
import {
  ComposerShell,
  Group,
  Field,
  PairList,
  StringList,
  SectionLabel,
} from "./composer-shell"

/**
 * Composer für Verträge — dasselbe Prinzip wie bei Angebot und Rechnung:
 * links die Angaben, rechts der gesetzte Vertrag.
 *
 * Verträge entstanden bisher ausschließlich aus einem Angebot. Das deckt den
 * Regelfall ab, aber nicht jeden: Betreuung, Rahmenvereinbarung oder ein
 * Vertrag zu einem Vorhaben, das gar kein Angebot hatte, ließen sich nicht
 * anlegen. Hier ist das Angebot deshalb eine Verknüpfung, keine Voraussetzung.
 */
export function ContractComposer({
  open,
  onOpenChange,
  contract,
  defaultCustomerId,
  defaultQuoteId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  contract: Contract | null
  defaultCustomerId?: string
  defaultQuoteId?: string
  onSaved?: (saved: Contract) => void
}) {
  if (!open) return null
  return (
    <ContractComposerBody
      key={contract?.id ?? "new"}
      onOpenChange={onOpenChange}
      contract={contract}
      defaultCustomerId={defaultCustomerId}
      defaultQuoteId={defaultQuoteId}
      onSaved={onSaved}
    />
  )
}

function ContractComposerBody({
  onOpenChange,
  contract,
  defaultCustomerId,
  defaultQuoteId,
  onSaved,
}: {
  onOpenChange: (o: boolean) => void
  contract: Contract | null
  defaultCustomerId?: string
  defaultQuoteId?: string
  onSaved?: (saved: Contract) => void
}) {
  const { db, upsertContract, pushActivity } = useStore()
  const confirm = useConfirm()

  const [customerId, setCustomerId] = React.useState(
    contract?.customerId ?? defaultCustomerId ?? "",
  )
  const [quoteId, setQuoteId] = React.useState(contract?.quoteId ?? defaultQuoteId ?? "")
  const [status, setStatus] = React.useState<string>(contract?.status ?? "draft")
  const [issueDate, setIssueDate] = React.useState(
    contract?.issueDate ?? new Date().toISOString(),
  )
  const [startDate, setStartDate] = React.useState(contract?.startDate ?? "")
  const [termEndDate, setTermEndDate] = React.useState(contract?.termEndDate ?? "")
  const [title, setTitle] = React.useState(contract?.title ?? "Projektvertrag")
  const [titleAccent, setTitleAccent] = React.useState(contract?.titleAccent ?? "")
  const [lead, setLead] = React.useState(contract?.lead ?? "")
  const [netValue, setNetValue] = React.useState<number | undefined>(contract?.netValue)
  const [clauses, setClauses] = React.useState<ContractClause[]>(
    contract?.clauses ?? [],
  )
  const [attachments, setAttachments] = React.useState<string[]>(
    contract?.attachments ?? [],
  )
  const [notes, setNotes] = React.useState(contract?.notes ?? "")
  const [dirty, setDirty] = React.useState(false)

  const firstRun = React.useRef(true)
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setDirty(true)
  }, [
    customerId,
    quoteId,
    status,
    issueDate,
    startDate,
    termEndDate,
    title,
    titleAccent,
    lead,
    netValue,
    clauses,
    attachments,
    notes,
  ])

  const customer = db.customers.find((c) => c.id === customerId)
  const quote = db.quotes.find((q) => q.id === quoteId)

  // Vertragsnummern zählen je Kunde (V-1006-01), nicht jahresweise — die
  // Vorschau muss deshalb den Kunden kennen, nicht nur den Zähler.
  const previewNumber =
    contract?.number ??
    contractNumberFor(
      db.settings.contractPrefix,
      customer?.customerNumber,
      db.contracts.map((x) => x.number),
    )

  /** Klauseln fürs Formular: Absätze als Leerzeilen-getrennter Text. */
  const clauseRows = clauses.map((cl) => ({
    title: cl.title,
    body: cl.body.join("\n\n"),
  }))
  const setClauseRows = (rows: { title: string; body: string }[]) =>
    setClauses(
      rows.map((r) => ({
        title: r.title,
        body: r.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      })),
    )

  const draft = React.useMemo<Contract>(
    () => ({
      ...(contract ?? {}),
      id: contract?.id ?? "preview",
      number: previewNumber,
      customerId,
      status: status as Contract["status"],
      issueDate,
      startDate: startDate || undefined,
      termEndDate: termEndDate || undefined,
      title,
      titleAccent: titleAccent || undefined,
      lead: lead || undefined,
      quoteId: quoteId || undefined,
      netValue,
      clauses,
      attachments: attachments.filter(Boolean),
      notes: notes || undefined,
      createdAt: contract?.createdAt ?? new Date().toISOString(),
    }),
    [
      contract,
      previewNumber,
      customerId,
      status,
      issueDate,
      startDate,
      termEndDate,
      title,
      titleAccent,
      lead,
      quoteId,
      netValue,
      clauses,
      attachments,
      notes,
    ],
  )

  const canSave = !!customerId && !!title.trim() && clauses.length > 0

  function persist(nextStatus?: string): Contract | null {
    if (!canSave) return null
    const finalStatus = nextStatus ?? status
    const saved = upsertContract({
      id: contract?.id,
      number: contract?.number,
      customerId,
      status: finalStatus as Contract["status"],
      issueDate,
      startDate: startDate || undefined,
      termEndDate: termEndDate || undefined,
      title,
      titleAccent: titleAccent || undefined,
      lead: lead || undefined,
      quoteId: quoteId || undefined,
      netValue,
      clauses,
      attachments: attachments.filter(Boolean),
      notes: notes || undefined,
    })
    if (!contract)
      pushActivity({
        type: "quote",
        title: `Vertrag ${saved.number} angelegt`,
        meta: customer?.company,
        customerId,
      })
    if (nextStatus) setStatus(nextStatus)
    setDirty(false)
    onSaved?.(saved)
    return saved
  }

  function saveDraft() {
    const saved = persist()
    if (saved) toast.success(`Vertrag ${saved.number} gespeichert`)
  }

  function issue() {
    const saved = persist("sent")
    if (!saved) return
    toast.success(`Vertrag ${saved.number} versendet markiert`)
    onOpenChange(false)
  }

  function openPdf() {
    const saved = persist()
    if (!saved) return
    window.open(`/print/contract/${saved.id}`, "_blank", "noopener")
  }

  const closing = React.useRef(false)
  async function close() {
    if (closing.current) return
    if (dirty) {
      closing.current = true
      const ok = await confirm({
        title: "Änderungen verwerfen?",
        description: "Der Vertrag wurde seit der letzten Speicherung geändert.",
        confirmLabel: "Verwerfen",
        destructive: true,
      })
      closing.current = false
      if (!ok) return
    }
    onOpenChange(false)
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void close()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        saveDraft()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  /** Klauseln eines bestehenden Vertrags als Ausgangspunkt übernehmen. */
  function adoptClauses(id: string) {
    const src = db.contracts.find((c) => c.id === id)
    if (!src) return
    setClauses(src.clauses.map((cl) => ({ ...cl, body: [...cl.body] })))
    toast.success(`Abschnitte aus ${src.number} übernommen`)
  }

  /** Auftragswert und Anlage aus dem verknüpften Angebot ziehen. */
  function adoptQuote(id: string) {
    setQuoteId(id)
    const q = db.quotes.find((x) => x.id === id)
    if (!q) return
    if (!contract) {
      setCustomerId(q.customerId)
      setNetValue(cents(computeTotals(q.items).net))
      setLead((l) => l || `Rechtlicher Rahmen zum Angebot ${q.number}.`)
      setAttachments((a) =>
        a.length ? a : [`Anlage 1 — Angebot ${q.number} nebst Leistungsbeschreibung`],
      )
    }
  }

  return (
    <ComposerShell
      eyebrow={contract ? `VERTRAG ${contract.number}` : "Neu: Vertrag"}
      onClose={() => void close()}
      actions={
        <>
          <Button
            variant="outline"
            size="lg"
            disabled={!canSave}
            onClick={openPdf}
            className="gap-1.5 max-sm:hidden"
          >
            <FileDown className="size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={!canSave}
            onClick={saveDraft}
            aria-label="Als Entwurf speichern"
            className="gap-1.5 max-sm:px-3.5"
          >
            <Save className="size-4" /> <span className="max-sm:hidden">Entwurf</span>
          </Button>
          <Button
            variant="brand"
            size="lg"
            disabled={!canSave}
            onClick={issue}
            className="gap-1.5 max-sm:px-3.5"
          >
            <Send className="size-4" /> Versenden
          </Button>
        </>
      }
      preview={
        <DocPreview
          kind="contract"
          doc={draft}
          customer={customer}
          settings={db.settings}
          quote={quote}
        />
      }
    >
      <>
        <Group title="Vertragspartner">
          <Field label="Kunde" wide>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— wählen —</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </Select>
          </Field>
          {customer && (
            <p className="col-span-2 text-xs leading-relaxed text-muted-foreground">
              {[
                customer.contactName,
                customer.address,
                [customer.zip, customer.city].filter(Boolean).join(" "),
                customer.customerNumber && `Kundennr. ${customer.customerNumber}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <Field
            label="Angebot (optional)"
            wide
            hint="Verknüpft Leistungsumfang und Preise. Ohne Angebot steht der Auftragswert unten."
          >
            <Select value={quoteId} onChange={(e) => adoptQuote(e.target.value)}>
              <option value="">— kein Angebot —</option>
              {db.quotes
                .filter((q) => !customerId || q.customerId === customerId)
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.number} — {q.title ?? "Angebot"}
                  </option>
                ))}
            </Select>
          </Field>
        </Group>

        <Group title="Eckdaten">
          <Field label="Vertragsdatum">
            <Input
              type="date"
              value={toDateInput(issueDate)}
              onChange={(e) =>
                setIssueDate(fromDateInput(e.target.value) ?? issueDate)
              }
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Entwurf</option>
              <option value="sent">Versendet</option>
              <option value="signed">Unterzeichnet</option>
              <option value="active">Aktiv</option>
              <option value="terminated">Gekündigt</option>
              <option value="expired">Abgelaufen</option>
            </Select>
          </Field>
          <Field label="Projektstart / Livegang">
            <Input
              type="date"
              value={toDateInput(startDate || undefined)}
              onChange={(e) => setStartDate(fromDateInput(e.target.value) ?? "")}
            />
          </Field>
          <Field label="Ende Mindestlaufzeit">
            <Input
              type="date"
              value={toDateInput(termEndDate || undefined)}
              onChange={(e) => setTermEndDate(fromDateInput(e.target.value) ?? "")}
            />
          </Field>
          <Field
            label="Auftragswert netto"
            hint={quote ? `Angebot ${quote.number}: ${numInput(computeTotals(quote.items).net, 2)} €` : undefined}
          >
            <Input
              inputMode="decimal"
              className="text-right tabular-nums"
              placeholder="—"
              defaultValue={netValue === undefined ? "" : numInput(netValue, 2)}
              onBlur={(e) => {
                const text = e.target.value.trim()
                if (!text) {
                  setNetValue(undefined)
                  return
                }
                const n = parseDE(text)
                if (!Number.isNaN(n)) setNetValue(cents(n))
                e.target.value = Number.isNaN(n) ? "" : numInput(cents(n), 2)
              }}
            />
          </Field>
        </Group>

        <Group title="Überschrift">
          <Field label="Titel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Akzent (farbig)">
            <Input
              value={titleAccent}
              placeholder="z. B. Website & Betreuung"
              onChange={(e) => setTitleAccent(e.target.value)}
            />
          </Field>
          <Field label="Einleitungssatz" wide>
            <Textarea
              autoGrow
              className="min-h-16"
              rows={2}
              value={lead}
              placeholder="Worum es in diesem Vertrag geht."
              onChange={(e) => setLead(e.target.value)}
            />
          </Field>
        </Group>

        <div>
          <PairList
            label="Abschnitte"
            rows={clauseRows}
            onChange={setClauseRows}
            keys={["title", "body"]}
            placeholders={[
              "Überschrift des Abschnitts",
              "Absätze — eine Leerzeile trennt sie; ein führendes „- “ setzt einen Aufzählungspunkt",
            ]}
            addLabel="Abschnitt"
            stacked
            numbered
            hint="Die §-Nummern vergibt das Dokument aus der Reihenfolge."
          />
          {clauses.length === 0 && db.contracts.length > 0 && (
            <div className="mt-2">
              <SectionLabel>Aus bestehendem Vertrag übernehmen</SectionLabel>
              <Select defaultValue="" onChange={(e) => adoptClauses(e.target.value)}>
                <option value="">— Vertrag wählen —</option>
                {db.contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} — {c.title} ({c.clauses.length} Abschnitte)
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <StringList
          label="Anlagen"
          rows={attachments}
          onChange={setAttachments}
          placeholder="Anlage 1 — Angebot AN-2026-516 nebst Leistungsbeschreibung"
          addLabel="Anlage"
          hint="Anlagen sind Vertragsbestandteil und stehen so im Dokument."
        />

        <div>
          <SectionLabel>Interne Notiz</SectionLabel>
          <Textarea
            autoGrow
            className="min-h-16"
            rows={2}
            value={notes}
            placeholder="Steht nicht im Vertrag — nur in der Akte."
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {!canSave && (
          <p className="text-[11px] text-muted-foreground">
            Zum Speichern fehlen: {[
              !customerId && "Kunde",
              !title.trim() && "Titel",
              clauses.length === 0 && "mindestens ein Abschnitt",
            ]
              .filter(Boolean)
              .join(", ")}
            .
          </p>
        )}
      </>
    </ComposerShell>
  )
}
