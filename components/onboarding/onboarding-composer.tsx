"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Mic,
  MicOff,
  Save,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import type { OnboardingSession } from "@/lib/types"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { useDictation } from "@/hooks/use-dictation"
import { computeTotals, toDateInput, fromDateInput } from "@/lib/format"
import { analyze, openChecks, ANALYSIS_DISCLAIMER, LOSS_LABEL, SOURCE_LABEL } from "@/lib/analysis"
import {
  type Answers,
  type OnboardingField,
  answerList,
  answerText,
  briefSummary,
  stepsFor,
  SESSION_KIND_LABEL,
  type SessionKind,
  completeness,
  missingRequired,
  toCustomer,
  toDeal,
  toQuoteItems,
  toQuoteSummary,
} from "@/lib/onboarding"
import { Button } from "@/components/ui/button"
import { Input, Label, Select, Textarea } from "@/components/ui/input"
import { ComposerShell, SectionLabel } from "@/components/documents/composer-shell"
import { DocSheetStyles } from "@/components/documents/sheet-styles"
import { BriefDoc } from "./brief"
import { cn } from "@/lib/utils"

/**
 * Onboarding — das Erstgespräch als geführter Ablauf.
 *
 * Links das Fragenprotokoll Schritt für Schritt, rechts das Protokoll, das
 * dabei entsteht. Eingegeben wird auf drei Wegen, die alle in dieselben Felder
 * laufen: tippen, diktieren oder der KI zurufen. Am Ende entstehen daraus
 * Kunde, Deal, Angebot, Vertrag und Rechnung — ohne dass irgendetwas ein
 * zweites Mal eingetippt werden muss.
 */
export function OnboardingComposer({
  open,
  onOpenChange,
  session,
  defaultKind = "onboarding",
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  session: OnboardingSession | null
  /** Vorgewählte Gesprächsart für ein neues Protokoll. */
  defaultKind?: SessionKind
}) {
  if (!open) return null
  return (
    <Body
      key={session?.id ?? `new-${defaultKind}`}
      onOpenChange={onOpenChange}
      session={session}
      defaultKind={defaultKind}
    />
  )
}

function Body({
  onOpenChange,
  session,
  defaultKind,
}: {
  onOpenChange: (o: boolean) => void
  session: OnboardingSession | null
  defaultKind: SessionKind
}) {
  const router = useRouter()
  const { db, upsertOnboarding, upsertCustomer, upsertDeal, upsertQuote, upsertInvoice, upsertContract, upsertProject, pushActivity } =
    useStore()
  const confirm = useConfirm()

  // Die Gesprächsart entscheidet über den Leitfaden. Sie steht ganz oben,
  // weil sie nachträglich zu ändern bedeutet, dass die Hälfte der Antworten
  // zu Fragen gehört, die nicht mehr gestellt werden.
  const [kind, setKind] = React.useState<SessionKind>(session?.kind ?? defaultKind)
  const [answers, setAnswers] = React.useState<Answers>(session?.answers ?? {})
  const [notes, setNotes] = React.useState(session?.notes ?? "")
  const [transcript, setTranscript] = React.useState(session?.transcript ?? "")
  const [created, setCreated] = React.useState<NonNullable<OnboardingSession["created"]>>(
    session?.created ?? {},
  )
  const [step, setStep] = React.useState(0)
  const [dirty, setDirty] = React.useState(false)
  // Die Sitzung bekommt beim ersten Speichern ihre ID und behält sie danach —
  // sonst legt jeder Klick auf „Speichern" ein neues Protokoll an.
  const [sessionId, setSessionId] = React.useState<string | undefined>(session?.id)

  const firstRun = React.useRef(true)
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setDirty(true)
  }, [answers, notes, transcript, kind])

  const set = (key: string, value: string | string[]) =>
    setAnswers((a) => ({ ...a, [key]: value }))

  // Die KI füllt Lücken, sie korrigiert nicht: was getippt wurde, gilt.
  const applyFields = React.useCallback((fields: Record<string, string | string[]>) => {
    setAnswers((a) => {
      const next = { ...a }
      for (const [k, v] of Object.entries(fields)) {
        if (v && !answerText(a, k)) next[k] = v
      }
      return next
    })
  }, [])

  const ai = useOnboardingAi({ answers, kind, onFields: applyFields })

  /**
   * Leitfaden wechseln. Mit Rückfrage, sobald etwas erfasst ist: der Wechsel
   * blendet die Hälfte der sichtbaren Antworten aus, und das kommentarlos
   * mitten im Termin zu tun, sieht aus wie Datenverlust. Der Schritt bleibt
   * stehen, soweit der neue Leitfaden ihn hat — zurück auf Schritt 1 zu
   * springen wäre die zweite Überraschung.
   */
  async function switchKind(next: SessionKind) {
    if (next === kind) return
    const filled = Object.values(answers).filter((v) =>
      Array.isArray(v) ? v.length : String(v ?? "").trim(),
    ).length
    if (filled > 0) {
      const ok = await confirm({
        title: `Auf ${SESSION_KIND_LABEL[next]} umstellen?`,
        description: `${filled} erfasste Angaben bleiben im Protokoll, werden aber nur noch angezeigt, soweit der andere Leitfaden dieselben Fragen stellt.`,
        confirmLabel: "Umstellen",
      })
      if (!ok) return
    }
    setKind(next)
    setStep((cur) => Math.min(cur, stepsFor(next).length))
  }

  const steps = stepsFor(kind)

  const draft: OnboardingSession = {
    id: sessionId ?? "preview",
    kind,
    status: session?.status ?? "open",
    answers,
    transcript,
    notes,
    created,
    createdAt: session?.createdAt ?? new Date().toISOString(),
  }

  const pct = completeness(answers, kind)
  const missing = missingRequired(answers, kind)
  const company = answerText(answers, "company")

  function persist(patch: Partial<OnboardingSession> = {}) {
    const saved = upsertOnboarding({
      id: sessionId,
      kind,
      status: patch.status ?? session?.status ?? "open",
      answers,
      transcript,
      notes,
      created,
      createdAt: session?.createdAt,
      ...patch,
    })
    setSessionId(saved.id)
    setDirty(false)
    return saved
  }

  function save() {
    const saved = persist()
    toast.success("Protokoll gespeichert", {
      description: `${completeness(saved.answers, saved.kind)} % erfasst`,
    })
  }

  function openPdf() {
    const saved = persist()
    window.open(`/print/onboarding/${saved.id}`, "_blank", "noopener")
  }

  const closing = React.useRef(false)
  async function close() {
    if (closing.current) return
    if (dirty) {
      closing.current = true
      const ok = await confirm({
        title: "Protokoll speichern?",
        description: "Das Gespräch wurde seit der letzten Speicherung geändert.",
        confirmLabel: "Speichern & schließen",
        cancelLabel: "Verwerfen",
      })
      closing.current = false
      if (ok) persist()
    }
    onOpenChange(false)
  }

  // ── Was aus dem Gespräch entsteht ─────────────────────────────────────────

  /** Kunde anlegen oder den bestehenden aktualisieren. */
  function createCustomer(): string | null {
    if (!answerText(answers, "company")) {
      toast.error("Ohne Firmennamen kein Kunde")
      return null
    }
    if (created.customerId) return created.customerId
    // Gleiche Firma nicht zweimal anlegen — im Zweifel gewinnt der Bestand.
    const existing = db.customers.find(
      (c) => c.company.toLowerCase() === company.toLowerCase(),
    )
    const c = upsertCustomer({ id: existing?.id, ...toCustomer(answers) })
    const next = { ...created, customerId: c.id }
    setCreated(next)
    persist({ created: next })
    pushActivity({
      type: "customer",
      title: existing ? `${c.company} aus Onboarding aktualisiert` : `${c.company} als Lead angelegt`,
      customerId: c.id,
    })
    toast.success(existing ? `${c.company} aktualisiert` : `${c.company} angelegt`)
    return c.id
  }

  function createDeal() {
    const customerId = createCustomer()
    if (!customerId || created.dealId) return
    const d = upsertDeal(toDeal(answers, customerId, db.settings.ownerName))
    const next = { ...created, customerId, dealId: d.id }
    setCreated(next)
    persist({ created: next })
    toast.success(`Deal „${d.title}" in der Pipeline`)
  }

  function createQuote() {
    const customerId = createCustomer()
    if (!customerId) return
    if (created.quoteId) {
      router.push(`/quotes?doc=${created.quoteId}`)
      return
    }
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 21)
    const q = upsertQuote({
      customerId,
      status: "draft",
      issueDate: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
      items: toQuoteItems(answers, db.settings.smallBusiness ? 0 : db.settings.defaultTaxRate),
      layout: "compact",
      title: answerList(answers, "services")[0] ?? "Angebot",
      titleAccent: company,
      lead: answerText(answers, "goals") || undefined,
      summary: toQuoteSummary(answers),
      notes: db.settings.invoiceFooter,
    })
    const next = { ...created, customerId, quoteId: q.id }
    setCreated(next)
    persist({ created: next })
    toast.success(`Angebot ${q.number} als Entwurf angelegt`)
    router.push(`/quotes?doc=${q.id}`)
  }

  function createInvoice() {
    const customerId = createCustomer()
    if (!customerId) return
    if (created.invoiceId) {
      router.push(`/invoices?doc=${created.invoiceId}`)
      return
    }
    const due = new Date()
    due.setDate(due.getDate() + db.settings.paymentTermsDays)
    const inv = upsertInvoice({
      customerId,
      status: "draft",
      issueDate: new Date().toISOString(),
      dueDate: due.toISOString(),
      items: toQuoteItems(answers, db.settings.smallBusiness ? 0 : db.settings.defaultTaxRate),
      notes: db.settings.invoiceFooter,
    })
    const next = { ...created, customerId, invoiceId: inv.id }
    setCreated(next)
    persist({ created: next })
    toast.success(`Rechnung ${inv.number} als Entwurf angelegt`)
    router.push(`/invoices?doc=${inv.id}`)
  }

  function createContract() {
    const customerId = createCustomer()
    if (!customerId) return
    if (created.contractId) {
      router.push(`/contracts?doc=${created.contractId}`)
      return
    }
    const quote = created.quoteId ? db.quotes.find((q) => q.id === created.quoteId) : undefined
    const vorlage = db.contracts[0]
    const c = upsertContract({
      customerId,
      status: "draft",
      issueDate: new Date().toISOString(),
      title: "Projektvertrag",
      titleAccent: company || undefined,
      quoteId: quote?.id,
      netValue: quote ? computeTotals(quote.items).net : undefined,
      lead: quote ? `Rechtlicher Rahmen zum Angebot ${quote.number}.` : undefined,
      attachments: quote
        ? [`Anlage 1 — Angebot ${quote.number} nebst Leistungsbeschreibung`]
        : [],
      // Ohne Vorlage bleibt der Vertrag leer — die Abschnitte schreibt man im
      // Vertrags-Composer, nicht hier nebenbei.
      clauses: vorlage ? vorlage.clauses.map((cl) => ({ ...cl, body: [...cl.body] })) : [],
    })
    const next = { ...created, customerId, contractId: c.id }
    setCreated(next)
    persist({ created: next })
    toast.success(`Vertrag ${c.number} als Entwurf angelegt`)
    router.push(`/contracts?doc=${c.id}`)
  }

  function createProject() {
    const customerId = createCustomer()
    if (!customerId || created.projectId) return
    const p = upsertProject({
      name: `${answerList(answers, "services")[0] ?? "Vorhaben"} — ${company}`,
      customerId,
      status: "planning",
      budget: created.quoteId
        ? computeTotals(db.quotes.find((q) => q.id === created.quoteId)?.items ?? []).net
        : 0,
      dueDate: answerText(answers, "deadline") || undefined,
      description: briefSummary(answers),
    })
    const next = { ...created, customerId, projectId: p.id }
    setCreated(next)
    persist({ created: next })
    toast.success(`Projekt „${p.name}" angelegt`)
  }

  const current = steps[step]
  const isLast = step >= steps.length

  return (
    <ComposerShell
      eyebrow={`${SESSION_KIND_LABEL[kind].toUpperCase()}${company ? ` · ${company}` : ""}`}
      onClose={() => void close()}
      actions={
        <>
          <Button
            variant="outline"
            size="lg"
            onClick={openPdf}
            className="gap-1.5 max-sm:hidden"
          >
            <FileDown className="size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={save}
            aria-label="Protokoll speichern"
            className="gap-1.5 max-sm:px-3.5"
          >
            <Save className="size-4" /> <span className="max-sm:hidden">Speichern</span>
          </Button>
          <Button
            variant="brand"
            size="lg"
            onClick={() => setStep(steps.length)}
            className="gap-1.5 max-sm:px-3.5"
          >
            <Check className="size-4" /> Abschluss
          </Button>
        </>
      }
      dock={
        <AiDock transcript={transcript} onTranscript={setTranscript} ai={ai} />
      }
      preview={
        <>
          <DocSheetStyles kind="invoice" screenOnly />
          <BriefPreview session={draft} />
        </>
      }
    >
      <>
        {/* Gesprächsart — der Leitfaden richtet sich danach. Der Hinweis steht
            über den Karten, nicht darunter: sonst liest man ihn erst, wenn die
            Hälfte der sichtbaren Antworten schon verschwunden ist. */}
        <div>
          <SectionLabel>Gesprächsart</SectionLabel>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Bestimmt den Leitfaden. Antworten auf Fragen, die im anderen
            Leitfaden nicht vorkommen, bleiben im Protokoll erhalten — sie
            werden nur nicht angezeigt.
          </p>
          <div role="radiogroup" aria-label="Gesprächsart" className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(SESSION_KIND_LABEL) as SessionKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => void switchKind(k)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-left transition-colors",
                  kind === k
                    ? "border-white/20 bg-white/[0.10] text-foreground"
                    : "border-white/8 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <span className="block text-[13.5px] font-semibold">
                  {SESSION_KIND_LABEL[k]}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug">
                  {k === "sales"
                    ? "Vor dem Auftrag — Schmerz, Kosten, Entscheidung, Einwände"
                    : "Nach der Zusage — Umfang, Zugänge, Termine"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <LiveTranscript
          transcript={transcript}
          onTranscript={setTranscript}
          onAnalyze={(t) => void ai.analyze(t)}
          busy={ai.busy}
        />

        {/* Fortschritt */}
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Schritt {Math.min(step + 1, steps.length + 1)} von{" "}
              {steps.length + 1}
            </span>
            <span className="tabular-nums">{pct} % erfasst</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-brand-gradient transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                  i === step
                    ? "bg-white/[0.14] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                )}
              >
                {i + 1}. {s.title}
              </button>
            ))}
            <button
              onClick={() => setStep(steps.length)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                isLast
                  ? "bg-white/[0.14] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              Abschluss
            </button>
          </div>
        </div>

        {isLast ? (
          <Finish
            answers={answers}
            notes={notes}
            onNotes={setNotes}
            created={created}
            missing={missing}
            onCustomer={createCustomer}
            onDeal={createDeal}
            onQuote={createQuote}
            onInvoice={createInvoice}
            onContract={createContract}
            onProject={createProject}
            kind={kind}
          />
        ) : (
          <div>
            <h2 className="font-display text-[19px] font-bold">{current.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {current.intro}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {current.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={answers[f.key]}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Blättern */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="lg"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="gap-1.5"
          >
            <ChevronLeft className="size-4" /> Zurück
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={isLast}
            onClick={() => setStep((s) => Math.min(steps.length, s + 1))}
            className="gap-1.5"
          >
            Weiter <ChevronRight className="size-4" />
          </Button>
        </div>
      </>
    </ComposerShell>
  )
}


// ── KI-Auswertung ───────────────────────────────────────────────────────────

/**
 * Mitschrift an die Auswertung schicken.
 *
 * Als Hook statt als Methode der Leiste, weil zwei Stellen sie brauchen: der
 * Zuruf am Fuß der Spalte und die Auswertung der laufenden Mitschrift. Zwei
 * Kopien desselben Aufrufs wären zwei Stellen, an denen ein Feld vergessen
 * wird.
 */
function useOnboardingAi({
  answers,
  kind,
  onFields,
}: {
  answers: Answers
  kind: SessionKind
  onFields: (fields: Record<string, string | string[]>) => void
}) {
  const { db } = useStore()
  const [busy, setBusy] = React.useState(false)
  const [reply, setReply] = React.useState<string | null>(null)

  const analyze = React.useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || busy) return false
      setBusy(true)
      setReply(null)
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            intent: "onboarding",
            sessionKind: kind,
            answers,
            customers: db.customers.map((c) => ({ id: c.id, company: c.company })),
            company: {
              name: db.settings.name,
              defaultTaxRate: db.settings.defaultTaxRate,
              today: new Date().toISOString().slice(0, 10),
              ownerName: db.settings.ownerName,
            },
          }),
        })
        // Ohne diese Prüfung liefert ein 500er `data.action === undefined`,
        // und die Auswertung meldet „Keine neuen Angaben erkannt." — sie sieht
        // aus, als hätte sie funktioniert.
        if (!res.ok) throw new Error(`Auswertung nicht erreichbar (${res.status}).`)
        const data = await res.json()
        const fields = data?.action?.fields
        if (fields && typeof fields === "object") onFields(fields)
        setReply(
          [data?.action?.message, data?.demo ? "(Demo-Modus ohne API-Key)" : ""]
            .filter(Boolean)
            .join(" ") || "Keine neuen Angaben erkannt.",
        )
        return true
      } catch (e) {
        setReply(
          `${e instanceof Error ? e.message : "Auswertung nicht erreichbar."} Die Mitschrift bleibt erhalten — später erneut versuchen.`,
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [answers, busy, db.customers, db.settings, kind, onFields],
  )

  return { busy, reply, setReply, analyze }
}

// ── Laufende Mitschrift ─────────────────────────────────────────────────────

/**
 * Das Gespräch mitschreiben, während es läuft.
 *
 * Die Erkennung läuft im Browser — es wird nichts hochgeladen und nichts
 * aufgezeichnet, nur der erkannte Text bleibt stehen. Trotzdem gilt: ein
 * Gespräch mitzuschreiben, ohne es zu sagen, ist nicht erlaubt. Deshalb wird
 * die Aufnahme erst freigeschaltet, wenn der Hinweis bestätigt ist — nicht als
 * juristische Formalie, sondern damit es im Termin nicht vergessen wird.
 */
function LiveTranscript({
  transcript,
  onTranscript,
  onAnalyze,
  busy,
}: {
  transcript: string
  /** Funktionsform — siehe unten: sonst geht bei schneller Rede Text verloren. */
  onTranscript: (update: (prev: string) => string) => void
  onAnalyze: (text: string) => void
  busy: boolean
}) {
  const [consent, setConsent] = React.useState(false)
  const [seconds, setSeconds] = React.useState(0)
  const [hint, setHint] = React.useState<string | null>(null)
  const consentRef = React.useRef<HTMLInputElement>(null)

  const { listening, supported, error, toggle } = useDictation({
    continuous: true,
    // Anhängen über den vorherigen Wert, nicht über die Variable aus diesem
    // Render: bei zusammenhängender Rede kommen zwei Ergebnisse, bevor React
    // neu gerendert hat — das zweite überschriebe sonst das erste.
    onText: (t) => onTranscript((prev) => [prev, t].filter(Boolean).join(" ")),
  })

  // Die Uhr zählt nur, solange aufgenommen wird. Zurückgesetzt wird sie beim
  // Start, nicht hier — ein `setSeconds(0)` im Effekt löst eine zusätzliche
  // Renderrunde aus, für die es keinen Grund gibt.
  React.useEffect(() => {
    if (!listening) return
    const id = setInterval(() => setSeconds((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [listening])

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

  function start() {
    if (!consent) {
      // Kein toter, ausgegrauter Knopf: auf dem Telefon gibt der keine
      // Rückmeldung und der Bezug zur Zeile darüber bleibt ungesagt.
      setHint("Erst den Hinweis bestätigen — dann läuft die Mitschrift.")
      consentRef.current?.focus()
      return
    }
    setHint(null)
    setSeconds(0)
    toggle()
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>Gespräch mitschreiben</SectionLabel>
        {listening && (
          <span
            aria-live="polite"
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] tabular-nums text-[#ff6b6b]"
          >
            <span className="size-2 animate-pulse rounded-full bg-[#ff6b6b]" />
            Mitschrift läuft · {clock}
          </span>
        )}
      </div>

      {supported ? (
        <>
          {/* Der Hinweis nennt, was tatsächlich passiert. „Läuft im Browser"
              heißt nicht „ohne Server": Chrome und Edge schicken das
              Mikrofonsignal zur Umwandlung an ihren Hersteller. Das dem
              Gesprächspartner zu verschweigen, wäre genau an der Stelle
              falsch, an der man seine Zustimmung einholt. */}
          <label className="mt-2 flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            <input
              ref={consentRef}
              type="checkbox"
              checked={consent}
              disabled={listening}
              onChange={(e) => {
                setConsent(e.target.checked)
                if (e.target.checked) setHint(null)
              }}
              className="mt-0.5 size-4 shrink-0 accent-[#1f7bf2]"
            />
            <span>
              Der Gesprächspartner wurde informiert und ist mit der Mitschrift
              einverstanden. Zur Umwandlung in Text überträgt der Browser das
              Mikrofonsignal an seinen Hersteller (Chrome: Google, Edge:
              Microsoft). Wir speichern keine Tonaufnahme; die Mitschrift lässt
              sich jederzeit löschen, und der Gesprächspartner kann jederzeit
              widersprechen.
            </span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant={listening ? "outline" : "brand"}
              size="lg"
              onClick={listening ? toggle : start}
              className="gap-1.5"
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {listening ? "Mitschrift beenden" : "Mitschrift starten"}
            </Button>
          </div>
          {hint && (
            <p aria-live="polite" className="mt-2 text-[12px] text-[#ffd28a]">
              {hint}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          Dieser Browser kann keine Spracherkennung. In Chrome, Edge oder Safari
          läuft sie — hier lässt sich die Mitschrift trotzdem tippen oder
          einfügen und anschließend auswerten.
        </p>
      )}

      {error && (
        <p aria-live="polite" className="mt-2 text-[12px] text-[#ffb3b3]">
          {error}
        </p>
      )}

      <Textarea
        autoGrow
        rows={3}
        className="mt-3 min-h-24 text-[13px]"
        value={transcript}
        placeholder="Die Mitschrift erscheint hier. Sie lässt sich jederzeit korrigieren — ausgewertet wird, was hier steht."
        onChange={(e) => {
          const v = e.target.value
          onTranscript(() => v)
        }}
      />

      {/* Außerhalb des `supported`-Zweigs: sonst ist in Firefox der eingefügte
          Text zwar da, aber nicht auswertbar. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={busy || !transcript.trim()}
          onClick={() => onAnalyze(transcript)}
          className="gap-1.5"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "Wertet aus…" : "Gespräch auswerten"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Für die Auswertung geht die Mitschrift an unseren KI-Dienstleister
        (Auftragsverarbeitung nach Art. 28 DSGVO). Sie bleibt die Quelle, die
        Felder sind die Auswertung — bestehende Antworten werden nicht
        überschrieben.
      </p>
    </div>
  )
}

/** Das Blatt in der Vorschau — mit den Settings aus dem Store. */
function BriefPreview({ session }: { session: OnboardingSession }) {
  const { db } = useStore()
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const compute = () => setScale(Math.min(1, (el.clientWidth - 48) / 794))
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef}>
      {scale > 0 && (
        <div style={{ zoom: scale }}>
          <BriefDoc session={session} settings={db.settings} />
        </div>
      )}
    </div>
  )
}

// ── Ein Feld ────────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: OnboardingField
  value: string | string[] | undefined
  onChange: (v: string | string[]) => void
}) {
  const text = Array.isArray(value) ? "" : (value ?? "")
  const list = Array.isArray(value) ? value : []
  // Ohne `htmlFor`/`id` liest die Sprachausgabe nur den Platzhalter vor — bei
  // Feldern wie „Wert eines Auftrags (€)" ist das der Unterschied zwischen
  // benutzbar und nicht.
  const id = React.useId()
  const hintId = field.hint ? `${id}-hint` : undefined

  return (
    <div className={field.half ? "" : "col-span-2"}>
      <Label htmlFor={field.type === "multi" ? undefined : id}>
        {field.label}
        {field.required && <span className="ml-1 text-brand-cyan">*</span>}
      </Label>
      {field.ask && (
        <p className="mb-1.5 -mt-1 text-[12px] leading-relaxed text-muted-foreground/80 italic">
          „{field.ask}“
        </p>
      )}

      {field.type === "textarea" ? (
        <Textarea
          id={id}
          aria-describedby={hintId}
          autoGrow
          rows={2}
          className="min-h-16 text-[13.5px]"
          value={text}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <Select id={id} aria-describedby={hintId} value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">— offen —</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : field.type === "multi" ? (
        <div role="group" aria-label={field.label} className="flex flex-wrap gap-1.5">
          {field.options?.map((o) => {
            const on = list.includes(o)
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(on ? list.filter((x) => x !== o) : [...list, o])
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                  on
                    ? "border-brand-cyan/40 bg-brand-cyan/12 text-foreground"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                {o}
              </button>
            )
          })}
        </div>
      ) : field.type === "date" ? (
        <Input
          id={id}
          aria-describedby={hintId}
          type="date"
          value={toDateInput(text || undefined)}
          onChange={(e) => onChange(fromDateInput(e.target.value) ?? "")}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={hintId}
          inputMode={field.type === "number" || field.type === "money" ? "decimal" : undefined}
          value={text}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.hint && (
        <p id={hintId} className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {field.hint}
        </p>
      )}
    </div>
  )
}

// ── Abschluss ───────────────────────────────────────────────────────────────

// ── Engpass-Rechnung ────────────────────────────────────────────────────────

/**
 * Was der heutige Zustand kostet — aus den Zahlen des Gesprächs.
 *
 * Bewusst nicht als eine Zahl: jede Zeile trägt eine Spanne, ihre Herkunft und
 * die Frage, mit der sie sich prüfen lässt. Und bewusst zwei Summen: gebundene
 * Arbeitszeit und entgangener Deckungsbeitrag sind verschiedene Währungen und
 * werden nicht addiert.
 */
function AnalysisPanel({ answers }: { answers: Answers }) {
  const result = React.useMemo(() => analyze(answers), [answers])
  const checks = React.useMemo(() => openChecks(result), [result])
  const [showChecks, setShowChecks] = React.useState(false)
  /**
   * Spanne in ganzen Euro. Mit Cent stünde in einer 300 px breiten Kachel
   * „12.480,00 € – 43.680,00 €" — 25 Zeichen bei 19 px. Und eine Schätzung auf
   * den Cent genau anzugeben behauptet eine Genauigkeit, die es nicht gibt.
   */
  const round0 = (n: number) =>
    `${Math.round(n).toLocaleString("de-DE")}\u00a0€`
  const span = (r: { min: number; max: number }) =>
    `${round0(r.min)} – ${round0(r.max)}`

  if (!result.bottlenecks.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <SectionLabel>Was der heutige Zustand kostet</SectionLabel>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Noch nicht zu rechnen. Es fehlt: {result.missing.join(", ")}. Ohne diese
          Angaben bliebe jede Zahl geraten — und eine geratene Zahl fällt im
          nächsten Gespräch auseinander.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel>Was der heutige Zustand kostet</SectionLabel>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(["revenue", "time"] as const).map((k) =>
          result.totals[k].likely > 0 ? (
            <div key={k} className="rounded-xl bg-white/[0.04] px-3.5 py-3">
              <span className="block text-[11px] leading-snug tracking-wide text-muted-foreground">
                {LOSS_LABEL[k]} · pro Monat
              </span>
              <span
                className="mt-1 block font-display font-bold tabular-nums"
                style={{ fontSize: "clamp(1rem, 2.5vw + 0.5rem, 1.2rem)" }}
              >
                {span(result.totals[k])}
              </span>
            </div>
          ) : null,
        )}
      </div>

      <div className="mt-4 space-y-3">
        {result.bottlenecks.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/8 p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-semibold">{b.title}</span>
              <span className="text-[12px] tabular-nums text-brand-cyan">
                {round0(b.leverage)} je Umsetzungstag
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {span(b.monthly)} pro Monat · {b.days} Umsetzungstage · {b.fix}
            </p>
            {/* Nur Kennzahl und Herkunft in der Zeile. Die Prüffragen stehen
                gebündelt am Fuß — sechs kursive Fragen zwischen den Zahlen
                haben die Rechnung selbst unlesbar gemacht. */}
            <div className="mt-2.5 space-y-1">
              {b.assumptions.map((x) => (
                <div key={x.key} className="flex flex-wrap items-baseline gap-x-2 text-[12px] leading-snug">
                  <span className="text-muted-foreground">{x.label}:</span>
                  <span className="tabular-nums">
                    {x.value.min === x.value.max
                      ? `${x.value.likely} ${x.unit}`
                      : `${x.value.min}–${x.value.max} ${x.unit}`}
                  </span>
                  <span
                    title={SOURCE_LABEL[x.source]}
                    className={cn(
                      "rounded px-1 py-px text-[11px]",
                      x.source === "geschätzt"
                        ? "bg-[#ffb020]/15 text-[#ffd28a]"
                        : "bg-emerald-400/10 text-emerald-200/90",
                    )}
                  >
                    {x.source}
                  </span>
                </div>
              ))}
            </div>
            {b.evidence.length > 0 && (
              <p className="mt-2.5 border-t border-white/8 pt-2 text-[12px] leading-snug text-muted-foreground">
                Belegt durch: {b.evidence.join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {checks.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showChecks}
            onClick={() => setShowChecks((v) => !v)}
            className="text-[12.5px] font-semibold text-brand-cyan hover:underline"
          >
            Im Gespräch klären ({checks.length}) {showChecks ? "▴" : "▾"}
          </button>
          {showChecks && (
            <ul className="mt-2 space-y-1.5">
              {checks.map((x) => (
                <li key={x.key} className="text-[12px] leading-snug text-muted-foreground">
                  <span className="text-foreground">{x.label}:</span> „{x.check}“
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.missing.length > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Nicht gerechnet, weil noch nicht erfasst: {result.missing.join(", ")}.
        </p>
      )}

      {/* Muss sichtbar dabeistehen, nicht nur im Code: eine Rechnung mit
          Spannen liest sich sonst trotzdem wie eine Zusage. */}
      <p className="mt-3 border-t border-white/8 pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {ANALYSIS_DISCLAIMER}
      </p>
    </div>
  )
}

function Finish({
  answers,
  notes,
  onNotes,
  created,
  missing,
  onCustomer,
  onDeal,
  onQuote,
  onInvoice,
  onContract,
  onProject,
  kind,
}: {
  answers: Answers
  notes: string
  onNotes: (v: string) => void
  created: NonNullable<OnboardingSession["created"]>
  missing: string[]
  onCustomer: () => void
  onDeal: () => void
  onQuote: () => void
  onInvoice: () => void
  onContract: () => void
  onProject: () => void
  kind: SessionKind
}) {
  const next = answerText(answers, "nextStep")

  const actions: {
    key: keyof NonNullable<OnboardingSession["created"]>
    label: string
    hint: string
    run: () => void
    brand?: boolean
  }[] = [
    {
      key: "customerId",
      label: "Kunde anlegen",
      hint: "Stammdaten in CRM & Kontakte — Grundlage für alles Weitere.",
      run: onCustomer,
    },
    {
      key: "dealId",
      label: "Deal in die Pipeline",
      hint: "Mit Budget als Wert und dem Entscheidungsdatum als Abschluss.",
      run: onDeal,
    },
    {
      key: "quoteId",
      label: "Angebot erstellen",
      hint: "Entwurf mit Leistungen und Rahmen — öffnet sich zum Feinschliff.",
      run: onQuote,
      brand: true,
    },
    {
      key: "contractId",
      label: "Vertrag anlegen",
      hint: "Abschnitte aus dem zuletzt angelegten Vertrag, Angebot als Anlage.",
      run: onContract,
    },
    {
      key: "invoiceId",
      label: "Rechnung anlegen",
      hint: "Direkt fakturieren — wenn der Auftrag im Gespräch schon steht.",
      run: onInvoice,
    },
    {
      key: "projectId",
      label: "Projekt anlegen",
      hint: "Für die Lieferung: Budget, Termin und das Protokoll als Beschreibung.",
      run: onProject,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[19px] font-bold">Was daraus wird</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Das Protokoll rechts geht als Zusammenfassung an den Kunden. Hier
          entstehen die Datensätze — jeweils als Entwurf, nichts wird versendet.
        </p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200/90">
          Noch offen: {missing.join(", ")}. Ohne Firma und Ansprechpartner lässt
          sich kein Kunde anlegen.
        </p>
      )}

      {/* Die Engpass-Rechnung gehört ins Verkaufsgespräch: dort entscheidet
          sich, ob sich ein Angebot lohnt. Im Onboarding ist die Frage längst
          beantwortet. */}
      {kind === "sales" && <AnalysisPanel answers={answers} />}

      <div className="grid gap-2">
        {actions.map((a) => {
          const done = !!created[a.key]
          return (
            <button
              key={a.key}
              onClick={a.run}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                done
                  ? "border-emerald-400/25 bg-emerald-400/[0.06]"
                  : "border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.05]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/8 text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : "→"}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">
                  {done ? a.label.replace(/ anlegen| erstellen| in die Pipeline/, "") + " steht" : a.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                  {done ? "Angelegt — noch einmal klicken öffnet den Datensatz." : a.hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {next && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
          <SectionLabel>Vereinbarter nächster Schritt</SectionLabel>
          <p className="text-[13.5px] leading-relaxed">{next}</p>
        </div>
      )}

      <div>
        <SectionLabel>Interner Vermerk</SectionLabel>
        <Textarea
          autoGrow
          rows={2}
          className="min-h-16"
          value={notes}
          placeholder="Einschätzung, Bauchgefühl, Warnsignale — steht im Protokoll, nicht im Angebot."
          onChange={(e) => onNotes(e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Zuruf & Diktat ──────────────────────────────────────────────────────────

function AiDock({
  transcript,
  onTranscript,
  ai,
}: {
  transcript: string
  onTranscript: (t: string) => void
  ai: ReturnType<typeof useOnboardingAi>
}) {
  const [text, setText] = React.useState("")

  const { listening, supported, error, toggle } = useDictation({
    onText: (t) => setText((prev) => (prev ? `${prev} ${t}` : t)),
  })

  async function run() {
    const prompt = text.trim()
    if (!prompt || ai.busy) return
    const ok = await ai.analyze(prompt)
    if (!ok) return
    // Die Rohmitschrift bleibt erhalten — sie ist die Quelle, die Felder
    // sind die Auswertung.
    onTranscript([transcript, prompt].filter(Boolean).join("\n\n"))
    setText("")
  }

  return (
    <div className="sticky bottom-0 border-t border-white/8 bg-[#0b0b0f]/95 p-4 backdrop-blur">
      {(ai.reply || error) && (
        <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {error ?? ai.reply}
        </p>
      )}
      <div className="flex items-end gap-2">
        {supported && (
          <Button
            variant={listening ? "brand" : "outline"}
            size="lg"
            onClick={toggle}
            aria-label={listening ? "Diktat beenden" : "Diktat starten"}
            className="shrink-0 px-3.5"
          >
            {listening ? <Mic className="size-4 animate-pulse" /> : <MicOff className="size-4" />}
          </Button>
        )}
        <Textarea
          autoGrow
          rows={2}
          className="min-h-[78px] py-2.5 text-[13px]"
          value={text}
          disabled={ai.busy}
          placeholder={
            listening
              ? "Sprich — was erkannt wird, landet hier."
              : "Zuruf: „Wrapcut, Roberto, Folierer in Jüchen, Relaunch 17 Seiten, Budget 1900, bis November“"
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run()
          }}
        />
        <Button
          variant="brand"
          size="lg"
          disabled={ai.busy || !text.trim()}
          onClick={() => void run()}
          className="shrink-0 gap-1.5"
        >
          {ai.busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {ai.busy ? "Liest…" : "Übernehmen"}
        </Button>
      </div>
    </div>
  )
}
