"use client"

import * as React from "react"
import { Plus, ClipboardList, ChevronRight, Trash2, Check } from "lucide-react"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { useQueryFlag, useQueryValue } from "@/hooks/use-query-flag"
import { useConfirm } from "@/lib/confirm"
import { dateDE } from "@/lib/format"
import type { OnboardingSession } from "@/lib/types"
import {
  answerText,
  completeness,
  sessionLabel,
  ONBOARDING_STEPS,
  SALES_STEPS,
  SESSION_KIND_LABEL,
  type SessionKind,
} from "@/lib/onboarding"
import { Button } from "@/components/ui/button"
import { Avatar, EmptyState } from "@/components/ui/misc"
import { Toolbar, SearchInput } from "@/components/page-toolbar"
import { OnboardingComposer } from "@/components/onboarding/onboarding-composer"

export default function OnboardingPage() {
  const { db, remove } = useStore()
  const confirm = useConfirm()
  const wantNew = useQueryFlag("new")
  // Deep-Link aus Kundenakte, Deal oder Projekt: das Protokoll, aus dem der
  // Datensatz entstanden ist, direkt aufschlagen.
  const focusDoc = useQueryValue("doc")
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<OnboardingSession | null>(null)
  /** Vorgewählte Gesprächsart für ein neues Protokoll. */
  const [startKind, setStartKind] = React.useState<SessionKind>("onboarding")
  // Der Deep-Link `?new` öffnet den Composer, ohne dass ein Effekt Zustand
  // nachzieht: der geöffnete Zustand wird abgeleitet. `closed` merkt sich, dass
  // der Nutzer ihn geschlossen hat — sonst risse der Link ihn wieder auf.
  const [manual, setManual] = React.useState(false)
  const [closed, setClosed] = React.useState(false)
  const linked = focusDoc ? db.onboardings.find((s) => s.id === focusDoc) : undefined
  const open = manual || ((wantNew || !!linked) && !closed)
  const setOpen = (o: boolean) => {
    setManual(o)
    if (!o) setClosed(true)
  }

  const rows = db.onboardings
    .filter((s) => {
      const q = query.toLowerCase()
      return !q || sessionLabel(s).toLowerCase().includes(q)
    })
    .sort(
      (a, b) =>
        +new Date(b.updatedAt ?? b.createdAt) - +new Date(a.updatedAt ?? a.createdAt),
    )

  function start(s: OnboardingSession | null, kind: SessionKind = "onboarding") {
    setEditing(s)
    setStartKind(kind)
    setClosed(false)
    setManual(true)
  }

  async function del(s: OnboardingSession) {
    const ok = await confirm({
      title: `Protokoll „${sessionLabel(s)}" löschen?`,
      description: "Bereits angelegte Kunden, Angebote und Verträge bleiben bestehen.",
      confirmLabel: "Löschen",
      destructive: true,
    })
    if (ok) remove("onboardings", s.id)
  }

  return (
    <div className="mx-auto max-w-[1760px]">
      <div className="glass mb-6 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-[19px] font-bold">
          Gespräche führen, statt sie hinterher zu rekonstruieren
        </h2>
        <p className="mt-1.5 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Zwei Leitfäden, dieselbe Akte: das Verkaufsgespräch klärt, ob es
          überhaupt ein Angebot gibt, das Onboarding den Umfang danach.
          Mitschreiben lassen, tippen oder der KI zurufen — rechts entsteht das
          Protokoll mit. Am Ende werden daraus Kunde, Deal, Angebot, Vertrag und
          Rechnung, ohne dass eine Angabe ein zweites Mal erfasst wird.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Verkaufsgespräch", SALES_STEPS],
              ["Onboarding", ONBOARDING_STEPS],
            ] as const
          ).map(([label, steps]) => (
            <button
              key={label}
              type="button"
              onClick={() => start(null, label === "Verkaufsgespräch" ? "sales" : "onboarding")}
              className="rounded-xl border border-white/8 p-3 text-left transition-colors hover:border-white/16 hover:bg-white/[0.04]"
            >
              <span className="text-[12px] font-semibold">
                {label} starten
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-muted-foreground"
                  >
                    {i + 1}. {s.title}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Toolbar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Firma oder Ansprechpartner…"
        />
        <div className="ml-auto">
          <Button variant="brand" size="lg" className="gap-1.5" onClick={() => start(null)}>
            <Plus className="size-4" /> Gespräch starten
          </Button>
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        query ? (
          // „Noch kein Gespräch aufgenommen" bei vorhandenen Gesprächen wäre
          // eine falsche Auskunft — der Filter hat nur nichts gefunden.
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title={`Kein Treffer für „${query}“`}
            hint="Andere Firma oder anderen Ansprechpartner suchen."
            action={
              <Button variant="outline" size="lg" onClick={() => setQuery("")}>
                Suche zurücksetzen
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="Noch kein Gespräch aufgenommen"
            hint="Verkaufsgespräch oder Onboarding starten, sobald du mit jemandem sprichst — auch mitten im Telefonat."
          />
        )
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          {rows.map((s) => {
            const pct = completeness(s.answers, s.kind)
            const created = s.created ?? {}
            const links: [string, string | undefined, string][] = [
              ["Kunde", created.customerId, `/crm?doc=${created.customerId}`],
              ["Deal", created.dealId, "/pipeline"],
              ["Angebot", created.quoteId, `/quotes?doc=${created.quoteId}`],
              ["Vertrag", created.contractId, `/contracts?doc=${created.contractId}`],
              ["Rechnung", created.invoiceId, `/invoices?doc=${created.invoiceId}`],
              ["Projekt", created.projectId, "/projects"],
            ]
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-3 border-b border-white/[0.05] px-4 py-4 transition-colors last:border-0 hover:bg-white/[0.025] md:grid-cols-[1.6fr_120px_1fr_130px_48px] md:items-center md:gap-4 md:px-6"
              >
                <button
                  onClick={() => start(s)}
                  className="flex items-center gap-3.5 text-left"
                >
                  <Avatar name={sessionLabel(s)} className="size-11 text-[12px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">
                      {sessionLabel(s)}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {SESSION_KIND_LABEL[s.kind ?? "onboarding"]} ·{" "}
                      {answerText(s.answers, "contactName") || "—"}
                      {answerText(s.answers, "city")
                        ? ` · ${answerText(s.answers, "city")}`
                        : ""}
                    </span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-white/25 md:hidden" />
                </button>

                <div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-brand-gradient"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">
                    {pct} % erfasst
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {links.filter(([, id]) => id).length === 0 ? (
                    <span className="text-[12px] text-muted-foreground">
                      noch nichts angelegt
                    </span>
                  ) : (
                    links
                      .filter(([, id]) => id)
                      .map(([label, , href]) => (
                        <Link
                          key={label}
                          href={href}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-400/[0.08] px-1.5 py-0.5 text-[11.5px] text-emerald-200/90 transition-colors hover:bg-emerald-400/[0.14]"
                        >
                          <Check className="size-3" />
                          {label}
                        </Link>
                      ))
                  )}
                </div>

                <span className="text-[12.5px] text-muted-foreground">
                  {dateDE(s.updatedAt ?? s.createdAt)}
                </span>

                <button
                  onClick={() => void del(s)}
                  aria-label="Protokoll löschen"
                  className="grid size-9 place-items-center justify-self-start rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive md:justify-self-center"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <OnboardingComposer
        open={open}
        onOpenChange={setOpen}
        session={editing ?? linked ?? null}
        defaultKind={startKind}
      />
    </div>
  )
}
