"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { FileDown, Lock, Save, Send, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Invoice, Quote, LineItem, Template } from "@/lib/types"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { formatDocNumber } from "@/lib/format"
import {
  buildPayment,
  DEFAULT_ORDER_FOOT,
  DEFAULT_ORDER_ITEMS,
  DEFAULT_QUOTE_TERMS,
  PAYMENT_MODEL_LABEL,
  type PaymentModel,
} from "@/lib/quote-terms"
import { Button } from "@/components/ui/button"
import { Input, Select, Textarea } from "@/components/ui/input"
import { LineItemsEditor } from "./line-items-editor"
import { DocPreview } from "./doc-preview"
import {
  ComposerShell,
  SectionLabel,
  Group,
  Field,
  PairList,
} from "./composer-shell"

type Kind = "invoice" | "quote"
type Doc = Invoice | Quote

function toDateInput(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

/**
 * Composer für Angebot und Rechnung — Formular links, fertiges Dokument rechts.
 *
 * Der Beleg wird nicht nachgebaut, sondern in derselben Komponente gerendert,
 * die auch das PDF setzt: was in der Vorschau steht, steht im Ausdruck. Der
 * Entwurf lebt dabei im Zustand dieser Komponente und nicht im Store — sonst
 * müsste man erst speichern, um zu sehen, was man tippt.
 */
export function DocComposer({
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
  // Jede Öffnung startet mit frischem Zustand — sonst trägt der Composer die
  // Eingaben des zuletzt bearbeiteten Belegs in den nächsten hinein.
  if (!open) return null
  return (
    <ComposerBody
      key={doc?.id ?? "new"}
      kind={kind}
      onOpenChange={onOpenChange}
      doc={doc}
      defaultCustomerId={defaultCustomerId}
      defaultItems={defaultItems}
      onSaved={onSaved}
    />
  )
}

function ComposerBody({
  kind,
  onOpenChange,
  doc,
  defaultCustomerId,
  defaultItems,
  onSaved,
}: {
  kind: Kind
  onOpenChange: (o: boolean) => void
  doc: Doc | null
  defaultCustomerId?: string
  defaultItems?: LineItem[]
  onSaved?: (saved: Doc) => void
}) {
  const { db, upsertInvoice, upsertQuote, pushActivity } = useStore()
  const confirm = useConfirm()
  const isInvoice = kind === "invoice"
  const smallBusiness = db.settings.smallBusiness
  /**
   * Eine ausgestellte Rechnung wird nicht mehr angefasst: der Empfänger hält
   * sie bereits, §14 UStG und die GoBD verlangen Unveränderbarkeit. Der
   * Composer bleibt trotzdem offen — Ansehen und Drucken sind erlaubt, nur
   * Speichern nicht. Korrektur läuft über die Stornorechnung.
   */
  const locked = isInvoice && !!doc && doc.status !== "draft"

  const initialDate = doc?.issueDate ?? new Date().toISOString()
  const initialSecond =
    (doc as Invoice)?.dueDate ??
    (doc as Quote)?.validUntil ??
    (() => {
      const d = new Date()
      d.setDate(d.getDate() + (isInvoice ? db.settings.paymentTermsDays : 21))
      return d.toISOString()
    })()

  const [customerId, setCustomerId] = React.useState(
    doc?.customerId ?? defaultCustomerId ?? "",
  )
  const [issueDate, setIssueDate] = React.useState(initialDate)
  const [secondDate, setSecondDate] = React.useState(initialSecond)
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
  const [title, setTitle] = React.useState(doc?.title ?? "")
  const [titleAccent, setTitleAccent] = React.useState(doc?.titleAccent ?? "")
  const [lead, setLead] = React.useState(doc?.lead ?? "")
  const [notice, setNotice] = React.useState((doc as Quote)?.notice ?? "")
  const [summary, setSummary] = React.useState<{ k: string; v: string }[]>(
    (doc as Quote)?.summary ?? [],
  )
  // Ein neues Angebot startet mit den Standardkonditionen statt mit einer
  // leeren Seite: „Rahmen und Konditionen" ohne Konditionen ist kein Angebot,
  // sondern ein Formfehler. Bestehende Angebote behalten ihre Fassung.
  const [terms, setTerms] = React.useState<{ title: string; text: string }[]>(
    (doc as Quote)?.terms ?? (doc ? [] : DEFAULT_QUOTE_TERMS),
  )
  const [orderNote, setOrderNote] = React.useState((doc as Quote)?.orderNote ?? "")
  const [orderItems, setOrderItems] = React.useState<{ k: string; v?: string }[]>(
    (doc as Quote)?.orderItems ?? (doc ? [] : DEFAULT_ORDER_ITEMS),
  )
  const [orderFoot, setOrderFoot] = React.useState(
    (doc as Quote)?.orderFoot ?? (doc ? "" : DEFAULT_ORDER_FOOT),
  )
  /**
   * Zahlungsmodell. Der Normalfall ist die Direktzahlung — Ratenzahlung wird
   * nur angeboten, wenn sie hier bewusst gewählt wird. „keep" steht für einen
   * von Hand gepflegten Plan (SKOPE, WrapCut): den darf ein Standardmodell
   * nicht überschreiben, nur weil das Angebot einmal geöffnet wurde.
   */
  const [paymentModel, setPaymentModel] = React.useState<PaymentModel | "keep">(
    (doc as Quote)?.payment ? "keep" : "direct",
  )
  /**
   * Vorbelegung aus dem hinterlegten Plan, nicht fest 50/12: wer bei einem
   * Angebot mit 30 % Anzahlung auf „Anzahlung" umstellt, änderte sonst
   * stillschweigend die vereinbarten Konditionen.
   */
  const storedPayment = (doc as Quote | null)?.payment
  const [depositPct, setDepositPct] = React.useState(() => {
    const m = storedPayment?.cards?.[1]?.label?.match(/(\d{1,2})\s*%/)
    return m ? Number(m[1]) : 50
  })
  const [installmentMonths, setInstallmentMonths] = React.useState(() => {
    const m = storedPayment?.cards?.[1]?.label?.match(/(\d{1,2})\s*Monate/)
    return m ? Number(m[1]) : 12
  })
  // Neue Angebote entstehen in der kompakten Fassung: die ausgeschriebene
  // Variante lebt von Modulen, Wertseiten und Zahlungsplänen, die ein frisch
  // angelegtes Dokument noch nicht hat — sie stünde als Gerippe da.
  const [layout, setLayout] = React.useState<"full" | "compact">(
    (doc as Quote)?.layout ?? (doc ? "full" : "compact"),
  )
  const [dirty, setDirty] = React.useState(false)

  // Jede Zustandsänderung außer der ersten gilt als Änderung — reicht, um beim
  // Schließen nicht ungefragt Eingaben zu verwerfen.
  const firstRun = React.useRef(true)
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setDirty(true)
  }, [
    customerId,
    issueDate,
    secondDate,
    serviceDate,
    servicePeriodEnd,
    status,
    items,
    notes,
    title,
    titleAccent,
    lead,
    notice,
    summary,
    terms,
    orderNote,
    orderItems,
    orderFoot,
    paymentModel,
    depositPct,
    installmentMonths,
    layout,
  ])

  const customer = db.customers.find((c) => c.id === customerId)
  const templates = db.templates.filter((t) =>
    isInvoice ? t.kind === "invoice" : t.kind === "quote",
  )

  // Nummer des noch ungespeicherten Belegs: dieselbe Formel wie im Store —
  // die Vorschau zeigt damit die Nummer, die der Beleg beim Speichern bekommt.
  const previewNumber =
    doc?.number ??
    formatDocNumber(
      isInvoice ? db.settings.invoicePrefix : db.settings.quotePrefix,
      isInvoice ? db.settings.nextInvoiceNo : db.settings.nextQuoteNo,
    )

  const savedItems = React.useMemo(
    () => (smallBusiness ? items.map((it) => ({ ...it, taxRate: 0 })) : items),
    [items, smallBusiness],
  )

  /**
   * Der Zahlungsplan wird aus den Positionen gerechnet, nicht getippt: eine
   * Zahlungsseite, die eine andere Summe trägt als der Preisblock, ist
   * schlimmer als gar keine.
   */
  const payment = React.useMemo(() => {
    if (isInvoice) return undefined
    if (paymentModel === "keep") return storedPayment
    return buildPayment(savedItems, {
      model: paymentModel,
      termsDays: db.settings.paymentTermsDays,
      depositPct,
      months: installmentMonths,
      smallBusiness,
    })
  }, [
    isInvoice,
    paymentModel,
    storedPayment,
    savedItems,
    db.settings.paymentTermsDays,
    depositPct,
    installmentMonths,
    smallBusiness,
  ])

  /**
   * Der Entwurf, den die Vorschau rendert. Felder, die dieses Formular nicht
   * kennt (Zahlungsplan, Wert-Einordnung, Module), kommen unverändert aus dem
   * bestehenden Beleg — bearbeitet wird, was hier steht, alles andere bleibt.
   */
  const draft = React.useMemo(() => {
    const base = (doc ?? {}) as Partial<Quote & Invoice>
    const common = {
      ...base,
      id: doc?.id ?? "preview",
      number: previewNumber,
      customerId,
      status,
      issueDate,
      items: savedItems,
      notes,
      title: title || undefined,
      titleAccent: titleAccent || undefined,
      lead: lead || undefined,
      createdAt: doc?.createdAt ?? new Date().toISOString(),
    }
    return isInvoice
      ? ({
          ...common,
          status: status as Invoice["status"],
          dueDate: secondDate,
          serviceDate,
          servicePeriodEnd: servicePeriodEnd || undefined,
        } as Invoice)
      : ({
          ...common,
          status: status as Quote["status"],
          validUntil: secondDate,
          notice: notice || undefined,
          summary: summary.length ? summary : undefined,
          terms: terms.length ? terms : undefined,
          payment,
          orderNote: orderNote || undefined,
          orderItems: orderItems.length ? orderItems : undefined,
          orderFoot: orderFoot || undefined,
          layout,
        } as Quote)
  }, [
    doc,
    previewNumber,
    customerId,
    status,
    issueDate,
    savedItems,
    notes,
    title,
    titleAccent,
    lead,
    isInvoice,
    secondDate,
    serviceDate,
    servicePeriodEnd,
    notice,
    summary,
    terms,
    payment,
    orderNote,
    orderItems,
    orderFoot,
    layout,
  ])

  const canSave = !!customerId && savedItems.some((i) => i.description.trim())

  function persist(nextStatus?: string): Doc | null {
    if (locked) return null
    if (!canSave) return null
    const common = {
      id: doc?.id,
      number: doc?.number,
      customerId,
      issueDate,
      items: savedItems,
      notes,
      title: title || undefined,
      titleAccent: titleAccent || undefined,
      lead: lead || undefined,
    }
    const finalStatus = nextStatus ?? status
    let saved: Doc
    if (isInvoice) {
      saved = upsertInvoice({
        ...common,
        status: finalStatus as Invoice["status"],
        dueDate: secondDate,
        serviceDate,
        servicePeriodEnd: servicePeriodEnd || "",
      })
    } else {
      saved = upsertQuote({
        ...common,
        status: finalStatus as Quote["status"],
        validUntil: secondDate,
        notice: notice || undefined,
        summary: summary.length ? summary : undefined,
        terms: terms.length ? terms : undefined,
        payment,
        orderNote: orderNote || undefined,
        orderItems: orderItems.length ? orderItems : undefined,
        orderFoot: orderFoot || undefined,
        layout,
      })
    }
    if (!doc)
      pushActivity({
        type: isInvoice ? "invoice" : "quote",
        title: `${isInvoice ? "Rechnung" : "Angebot"} ${saved.number} erstellt`,
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
    if (saved)
      toast.success(
        `${isInvoice ? "Rechnung" : "Angebot"} ${saved.number} gespeichert`,
      )
  }

  function issue() {
    const saved = persist("sent")
    if (!saved) return
    toast.success(`${isInvoice ? "Rechnung" : "Angebot"} ${saved.number} ausgestellt`)
    onOpenChange(false)
  }

  function openPdf() {
    // Gesperrte Belege stehen unverändert im Store — direkt öffnen.
    if (locked && doc) {
      window.open(`/print/${kind}/${doc.id}`, "_blank", "noopener")
      return
    }
    // Die Druckseite liest aus dem Store — ohne Speichern zeigte sie den
    // Stand vor der Bearbeitung.
    const saved = persist()
    if (!saved) return
    window.open(`/print/${kind}/${saved.id}`, "_blank", "noopener")
  }

  // Solange die Rückfrage offen steht, darf ein zweites Escape sie nicht
  // erneut aufrufen — sonst stapeln sich die Dialoge.
  const closing = React.useRef(false)

  async function close() {
    if (closing.current) return
    if (dirty) {
      closing.current = true
      const ok = await confirm({
        title: "Änderungen verwerfen?",
        description: "Der Beleg wurde seit der letzten Speicherung geändert.",
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

  function applyTemplate(t: Template) {
    if (t.items) setItems(t.items.map((it) => ({ ...it, id: nanoid(6) })))
  }

  const docLabel = isInvoice ? "RECHNUNG" : "ANGEBOT"

  return (
    <ComposerShell
      eyebrow={doc ? `${docLabel} ${doc.number}` : `Neu: ${docLabel}`}
      onClose={() => void close()}
      locked={locked}
      notice={
        locked ? (
          <div className="flex items-center gap-2 border-b border-[#ffb020]/25 bg-[#ffb020]/10 px-4 py-2 text-[12.5px] text-[#ffd28a]">
            <Lock className="size-3.5 shrink-0" />
            <span>
              Ausgestellte Rechnung — Ansicht und Druck möglich, Änderungen nicht.
              Korrekturen laufen über eine Stornorechnung.
            </span>
          </div>
        ) : null
      }
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
            disabled={!canSave || locked}
            onClick={saveDraft}
            aria-label="Als Entwurf speichern"
            className="gap-1.5 max-sm:px-3.5"
          >
            <Save className="size-4" /> <span className="max-sm:hidden">Entwurf</span>
          </Button>
          <Button
            variant="brand"
            size="lg"
            disabled={!canSave || locked}
            onClick={issue}
            className="gap-1.5 max-sm:px-3.5"
          >
            <Send className="size-4" /> Ausstellen
          </Button>
        </>
      }
      dock={
        <AiDock
          kind={kind}
          onApply={(patch) => {
            if (patch.items) setItems(patch.items)
            if (patch.notes !== undefined) setNotes(patch.notes)
            if (patch.customerId) setCustomerId(patch.customerId)
            if (patch.validUntil) setSecondDate(patch.validUntil)
            if (patch.lead !== undefined) setLead(patch.lead)
          }}
        />
      }
      preview={
        <DocPreview kind={kind} doc={draft} customer={customer} settings={db.settings} />
      }
    >
      <>
            <Group title="Empfänger">
              <Field label="Kunde" wide>
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
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
                    customer.vatId,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </Group>

            <Group title="Eckdaten">
              <Field label="Datum">
                <Input
                  type="date"
                  value={toDateInput(issueDate)}
                  onChange={(e) =>
                    setIssueDate(new Date(e.target.value).toISOString())
                  }
                />
              </Field>
              <Field label={isInvoice ? "Fällig am" : "Gültig bis"}>
                <Input
                  type="date"
                  value={toDateInput(secondDate)}
                  onChange={(e) =>
                    setSecondDate(new Date(e.target.value).toISOString())
                  }
                />
              </Field>
              {isInvoice && (
                <>
                  <Field label="Leistungsdatum">
                    <Input
                      type="date"
                      value={toDateInput(serviceDate)}
                      onChange={(e) =>
                        setServiceDate(new Date(e.target.value).toISOString())
                      }
                    />
                  </Field>
                  <Field label="bis (optional)">
                    <Input
                      type="date"
                      value={toDateInput(servicePeriodEnd || undefined)}
                      onChange={(e) =>
                        setServicePeriodEnd(
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        )
                      }
                    />
                  </Field>
                </>
              )}
              <Field label="Status">
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
              </Field>
              {templates.length > 0 && (
                <Field label="Vorlage anwenden">
                  <Select
                    defaultValue=""
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value)
                      if (t) applyTemplate(t)
                    }}
                  >
                    <option value="">— Vorlage wählen —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {!isInvoice && (
                <Field label="Fassung">
                  <Select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as "full" | "compact")}
                  >
                    <option value="compact">Kompakt (3 Seiten)</option>
                    <option value="full">Ausgeschrieben</option>
                  </Select>
                </Field>
              )}
            </Group>

            <Group title="Überschrift">
              <Field label="Titel">
                <Input
                  value={title}
                  placeholder={isInvoice ? `Rechnung ${previewNumber}` : "Angebot"}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Akzent (farbig)">
                <Input
                  value={titleAccent}
                  placeholder="z. B. Website-Relaunch"
                  onChange={(e) => setTitleAccent(e.target.value)}
                />
              </Field>
              <Field label="Einleitungssatz" wide>
                <Textarea
                  autoGrow
                  className="min-h-16"
                  value={lead}
                  placeholder="Worum es in diesem Dokument geht."
                  onChange={(e) => setLead(e.target.value)}
                />
              </Field>
              {!isInvoice && (
                <Field label="Hinweis auf der Titelseite" wide>
                  <Textarea
                    className="min-h-16"
                    value={notice}
                    placeholder="z. B. Festpreis, ersetzt Angebot AN-2026-511."
                    onChange={(e) => setNotice(e.target.value)}
                  />
                </Field>
              )}
            </Group>

            <div>
              <SectionLabel>Positionen</SectionLabel>
              <LineItemsEditor
                items={items}
                onChange={setItems}
                taxLocked={smallBusiness}
              />
              {smallBusiness && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  §19 UStG Kleinunternehmer aktiv — alle Positionen ohne
                  Umsatzsteuer.
                </p>
              )}
            </div>

            {!isInvoice && (
              <>
                <PairList
                  label="Enthalten (Kurzübersicht)"
                  hint="Schlagwort plus eine Zeile Erklärung — erscheint auf der Titelseite."
                  rows={summary}
                  onChange={setSummary}
                  keys={["k", "v"]}
                  placeholders={["Schlagwort", "Eine Zeile Erklärung"]}
                />
                <Group title="Zahlung">
                  <Field label="Zahlungsmodell" wide>
                    <Select
                      value={paymentModel}
                      onChange={(e) => setPaymentModel(e.target.value as PaymentModel | "keep")}
                    >
                      {storedPayment && (
                        <optgroup label="Bestehender Plan">
                          <option value="keep">
                            Wie hinterlegt — von Hand gepflegt, unverändert lassen
                          </option>
                        </optgroup>
                      )}
                      <optgroup label="Standardmodelle">
                        {(Object.keys(PAYMENT_MODEL_LABEL) as PaymentModel[]).map((m) => (
                          <option key={m} value={m}>
                            {PAYMENT_MODEL_LABEL[m]}
                          </option>
                        ))}
                      </optgroup>
                    </Select>
                  </Field>
                  {paymentModel === "deposit" && (
                    <Field label="Anzahlung (%)">
                      <Input
                        type="number"
                        min={10}
                        max={90}
                        value={depositPct}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          // `|| 50` allein ließ 300 % durch und warf 0 still
                          // auf 50 zurück — beides landete ungeprüft im Plan.
                          setDepositPct(Number.isFinite(n) && n > 0 ? Math.min(90, Math.max(10, n)) : 50)
                        }}
                      />
                    </Field>
                  )}
                  {paymentModel === "installments" && (
                    <Field label="Laufzeit (Monate)">
                      <Input
                        type="number"
                        min={2}
                        max={36}
                        value={installmentMonths}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          setInstallmentMonths(
                            Number.isFinite(n) && n > 0 ? Math.min(36, Math.max(2, n)) : 12,
                          )
                        }}
                      />
                    </Field>
                  )}
                  {paymentModel === "installments" && (
                    <p className="col-span-2 rounded-lg border border-[#ffb020]/25 bg-[#ffb020]/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-[#ffd28a]">
                      Ratenzahlung bindet den Betrag über die volle Laufzeit und
                      verlagert das Ausfallrisiko auf uns. Nur anbieten, wenn der
                      Kunde ohne sie nicht zusagt.
                    </p>
                  )}
                  {storedPayment && paymentModel === "keep" && (
                    <p className="col-span-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      Der hinterlegte Plan bleibt unverändert.
                    </p>
                  )}
                  {/* Der Hinweis gehört dorthin, wo der Schaden entsteht: bei
                      „keep" passiert nichts, beim Wechsel wird ein von Hand
                      gepflegter Plan (SKOPE, WrapCut) beim Speichern ersetzt. */}
                  {storedPayment && paymentModel !== "keep" && (
                    <p className="col-span-2 rounded-lg border border-[#ffb020]/25 bg-[#ffb020]/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-[#ffd28a]">
                      Der hinterlegte Zahlungsplan wird beim Speichern ersetzt.
                      Zurück auf „Wie hinterlegt“ stellt ihn wieder her.
                    </p>
                  )}
                  {/* Was die Wahl in Zahlen bedeutet — sonst sieht man es erst
                      im Blatt rechts, und bei langen Angeboten gar nicht. */}
                  {payment?.cards?.[1] && (
                    <p className="col-span-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {[payment.cards[1].head, payment.cards[1].value].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </Group>

                <PairList
                  label="Konditionen"
                  hint="Kurzklauseln der kompakten Fassung. Ohne Eintrag greifen die Abschnitte aus der Fußnote."
                  rows={terms}
                  onChange={setTerms}
                  keys={["title", "text"]}
                  placeholders={["Titel", "Klausel"]}
                />

                <PairList
                  label="Beauftragung — was mitkommen muss"
                  hint="Stichpunkte auf der Schlussseite. Ohne Eintrag steht dort nur der Verweis auf den Vertrag."
                  rows={orderItems as { k: string; v: string }[]}
                  onChange={setOrderItems}
                  keys={["k", "v"]}
                  placeholders={["Stichwort", "Eine Zeile Erklärung"]}
                />

                <Group title="Beauftragung">
                  <Field label="Einleitung der Schlussseite" wide>
                    <Textarea
                      autoGrow
                      className="min-h-16"
                      value={orderNote}
                      placeholder="Was nach der Freigabe passiert. Ohne Eintrag verweist das Angebot auf den Projektvertrag."
                      onChange={(e) => setOrderNote(e.target.value)}
                    />
                  </Field>
                  <Field label="Schlusszeile" wide>
                    <Input
                      value={orderFoot}
                      placeholder="Was nach der Zusage passiert."
                      onChange={(e) => setOrderFoot(e.target.value)}
                    />
                  </Field>
                </Group>
              </>
            )}

            <div>
              <SectionLabel>Fußnote / Abschnitte</SectionLabel>
              <Textarea
                autoGrow
                className="min-h-28"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Eine Zeile „## Titel“ eröffnet einen eigenen Abschnitt im
                Dokument.
              </p>
            </div>
      </>
    </ComposerShell>
  )
}

// ── KI-Zuruf ────────────────────────────────────────────────────────────────

interface AiPatch {
  items?: LineItem[]
  notes?: string
  customerId?: string
  validUntil?: string
  lead?: string
}

/**
 * Zuruf-Feld am Fuß der Formularspalte. Die KI schreibt nicht in den Store,
 * sondern in den Entwurf — was sie vorschlägt, steht sofort rechts im Blatt
 * und kann von Hand nachgezogen werden, bevor irgendetwas gespeichert wird.
 */
function AiDock({
  kind,
  onApply,
}: {
  kind: Kind
  onApply: (patch: AiPatch) => void
}) {
  const { db } = useStore()
  const [prompt, setPrompt] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [reply, setReply] = React.useState<string | null>(null)

  async function run() {
    const text = prompt.trim()
    if (!text || busy) return
    setBusy(true)
    setReply(null)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          intent: kind,
          customers: db.customers.map((c) => ({ id: c.id, company: c.company })),
          company: {
            name: db.settings.name,
            defaultTaxRate: db.settings.defaultTaxRate,
            today: new Date().toISOString().slice(0, 10),
            ownerName: db.settings.ownerName,
          },
        }),
      })
      const data = await res.json()
      const action = data?.action
      if (!action) throw new Error("Keine Antwort")

      const patch: AiPatch = {}
      if (Array.isArray(action.items) && action.items.length) {
        patch.items = action.items.map(
          (it: Partial<LineItem> & { details?: string[] }) => ({
            id: nanoid(6),
            description: it.description ?? "",
            details: it.details,
            unit: it.unit,
            qty: Number(it.qty ?? 1),
            unitPrice: Number(it.unitPrice ?? 0),
            taxRate: db.settings.smallBusiness ? 0 : Number(it.taxRate ?? 0.19),
          }),
        )
      }
      if (action.customerId) patch.customerId = action.customerId
      if (typeof action.validDays === "number") {
        const d = new Date()
        d.setDate(d.getDate() + action.validDays)
        patch.validUntil = d.toISOString()
      }
      // Die Begründung gehört als eigener Abschnitt ins Dokument, nicht in die
      // Kopfzeile — im Blatt steht sie unter „Einordnung".
      if (action.notes || action.rationale) {
        patch.notes = [
          action.notes,
          action.rationale ? `## Einordnung\n\n${action.rationale}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      }
      onApply(patch)
      setReply(
        [action.message, data.demo ? "(Demo-Modus ohne API-Key)" : ""]
          .filter(Boolean)
          .join(" "),
      )
      setPrompt("")
    } catch (e) {
      setReply(e instanceof Error ? e.message : "KI nicht erreichbar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sticky bottom-0 border-t border-white/8 bg-[#0b0b0f]/95 p-4 backdrop-blur">
      {reply && (
        <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {reply}
        </p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          className="min-h-[78px] py-2.5 text-[13px]"
          rows={2}
          value={prompt}
          disabled={busy}
          placeholder={`Zuruf: „${
            kind === "quote" ? "Website-Relaunch, 12.000 €, 90 Std." : "Betreuung September, 450 €"
          }“`}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run()
          }}
        />
        <Button
          variant="brand"
          size="lg"
          disabled={busy || !prompt.trim()}
          onClick={() => void run()}
          className="gap-1.5"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {busy ? "Schreibt…" : "Einsetzen"}
        </Button>
      </div>
    </div>
  )
}
