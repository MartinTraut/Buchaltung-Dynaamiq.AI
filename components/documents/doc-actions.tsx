"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightLeft,
  Ban,
  BellRing,
  Building2,
  CheckCircle2,
  CopyPlus,
  FileDown,
  FileSignature,
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  ReceiptEuro,
  Repeat,
  Send,
  Trash2,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import { eur, dateDE, computeTotals, emailSignature } from "@/lib/format"
import type { Contract, Invoice, Quote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown"
import { toast } from "sonner"

/**
 * Die Aktionen eines Belegs — an einer Stelle.
 *
 * Vorher hing das Menü in der jeweiligen Modulseite: „Vertrag erstellen"
 * kannte nur /quotes, „Als bezahlt markieren" nur /invoices. Damit endete
 * jeder Weg über den Kunden oder die Pipeline in einer Sackgasse, obwohl das
 * Dokument dasselbe war. Der Hook liefert dieselben Menüs überall.
 *
 * `onEdit` ist optional: fehlt es, führt „Bearbeiten" per Deep-Link in das
 * zuständige Modul. Nur dort liegt der Editor — ihn in jedem Dialog erneut
 * aufzuziehen hieße, zwei Speicherpfade parallel zu pflegen.
 */
export function useDocMenus() {
  const {
    db,
    customerById,
    upsertQuote,
    upsertContract,
    convertQuoteToInvoice,
    createContractFromQuote,
    setInvoiceStatus,
    sendReminder,
    toggleRecurring,
    duplicateRecurring,
    createCancellation,
    pushActivity,
    upsertEmail,
    remove,
    add,
  } = useStore()
  const confirm = useConfirm()

  /** „Kunde öffnen" fehlt in der Kundenansicht selbst — dort wäre es ein
   *  Link auf die Stelle, an der man schon steht. */
  const customerLink = (customerId?: string, hide?: boolean) =>
    customerId && !hide ? (
      <DropdownItem asChild>
        <Link href={`/crm?c=${customerId}`}>
          <Building2 /> Kunde öffnen
        </Link>
      </DropdownItem>
    ) : null

  function quoteMenu(
    q: Quote,
    opts: { onEdit?: (q: Quote) => void; hideCustomer?: boolean } = {},
  ) {
    const c = customerById(q.customerId)
    const total = computeTotals(q.items).gross
    const con = db.contracts.find((x) => x.quoteId === q.id)
    return (
      <DropdownContent>
        {opts.onEdit ? (
          <DropdownItem onSelect={() => opts.onEdit!(q)}>
            <Pencil /> Bearbeiten
          </DropdownItem>
        ) : (
          <DropdownItem asChild>
            <Link href={`/quotes?doc=${q.id}`}>
              <Pencil /> Bearbeiten
            </Link>
          </DropdownItem>
        )}
        {customerLink(q.customerId, opts.hideCustomer)}
        <DropdownItem asChild>
          <Link href={`/print/quote/${q.id}`} target="_blank">
            <FileDown /> PDF / Drucken
          </Link>
        </DropdownItem>
        <DropdownItem
          onSelect={() => {
            upsertEmail({
              to: c?.email ?? "",
              customerId: q.customerId,
              subject: `Ihr Angebot ${q.number} von ${db.settings.name}`,
              body: `Hallo ${c?.contactName ?? ""},\n\nanbei unser Angebot ${q.number} über ${eur(total)}. Bei Fragen bin ich jederzeit für Sie da.\n\n${emailSignature(db.settings)}`,
              relatedType: "quote",
              relatedId: q.id,
              status: "draft",
            })
            if (q.status === "draft") upsertQuote({ ...q, status: "sent" })
            toast.success("E-Mail-Entwurf erstellt")
          }}
        >
          <Mail /> Per E-Mail senden
        </DropdownItem>
        <DropdownSeparator />
        {/* Der Vertrag hängt am Angebot: gibt es schon einen, führt der
            Eintrag dorthin — sonst legt er ihn an. Zwei Verträge zu einem
            Angebot wären ein Widerspruch, kein zweiter Vorgang. */}
        {con ? (
          <DropdownItem asChild>
            <Link href={`/contracts?doc=${con.id}`}>
              <FileSignature /> Vertrag {con.number} öffnen
            </Link>
          </DropdownItem>
        ) : (
          <DropdownItem
            onSelect={() => {
              const created = createContractFromQuote(q.id)
              if (created)
                toast.success(`Vertrag ${created.number} angelegt`, {
                  description: "Im Bereich Verträge verfügbar.",
                })
            }}
          >
            <FileSignature /> Vertrag erstellen
          </DropdownItem>
        )}
        <DropdownSeparator />
        {q.status !== "accepted" && (
          <DropdownItem
            onSelect={() => {
              upsertQuote({ ...q, status: "accepted" })
              toast.success("Angebot angenommen")
            }}
          >
            <CheckCircle2 /> Als angenommen markieren
          </DropdownItem>
        )}
        <DropdownItem
          onSelect={() => {
            const inv = convertQuoteToInvoice(q.id)
            if (inv)
              toast.success(`Rechnung ${inv.number} erstellt`, {
                description: "Im Bereich Rechnungen verfügbar.",
              })
          }}
        >
          <ArrowRightLeft /> In Rechnung umwandeln
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          className="text-destructive data-[highlighted]:text-destructive"
          onSelect={async () => {
            const ok = await confirm({
              title: `Angebot ${q.number} löschen?`,
              description: `Das Angebot für ${c?.company ?? "diesen Kunden"} wird entfernt.`,
              confirmLabel: "Löschen",
              destructive: true,
            })
            if (!ok) return
            remove("quotes", q.id)
            toast.success("Angebot gelöscht", {
              action: { label: "Rückgängig", onClick: () => add("quotes", q) },
            })
          }}
        >
          <Trash2 /> Löschen
        </DropdownItem>
      </DropdownContent>
    )
  }

  function invoiceMenu(
    inv: Invoice,
    opts: { onEdit?: (i: Invoice) => void; hideCustomer?: boolean } = {},
  ) {
    const c = customerById(inv.customerId)
    const total = computeTotals(inv.items).gross
    return (
      <DropdownContent>
        {opts.onEdit ? (
          <DropdownItem onSelect={() => opts.onEdit!(inv)}>
            <Pencil /> Bearbeiten
          </DropdownItem>
        ) : (
          <DropdownItem asChild>
            <Link href={`/invoices?doc=${inv.id}`}>
              <Pencil /> Bearbeiten
            </Link>
          </DropdownItem>
        )}
        {customerLink(inv.customerId, opts.hideCustomer)}
        {inv.pdfPath && (
          <DropdownItem asChild>
            <a href={inv.pdfPath} target="_blank" rel="noopener noreferrer">
              <ReceiptEuro /> Original-PDF öffnen
            </a>
          </DropdownItem>
        )}
        <DropdownItem asChild>
          <Link href={`/print/invoice/${inv.id}`} target="_blank">
            <FileDown /> PDF / Drucken
          </Link>
        </DropdownItem>
        <DropdownItem
          onSelect={() => {
            upsertEmail({
              to: c?.email ?? "",
              customerId: inv.customerId,
              subject: `Ihre Rechnung ${inv.number} von ${db.settings.name}`,
              body: `Hallo ${c?.contactName ?? ""},\n\nanbei erhalten Sie die Rechnung ${inv.number} über ${eur(total)}.\nZahlbar bis ${dateDE(inv.dueDate)}.\n\nVielen Dank für die gute Zusammenarbeit!\n\n${emailSignature(db.settings)}`,
              relatedType: "invoice",
              relatedId: inv.id,
              status: "draft",
            })
            if (inv.status === "draft") setInvoiceStatus(inv.id, "sent")
            toast.success("E-Mail-Entwurf erstellt", {
              description: "Im Bereich E-Mails findest du den Entwurf.",
            })
          }}
        >
          <Mail /> Per E-Mail senden
        </DropdownItem>
        <DropdownSeparator />
        {inv.status !== "paid" && (
          <DropdownItem
            onSelect={() => {
              setInvoiceStatus(inv.id, "paid")
              pushActivity({
                type: "payment",
                title: `Zahlung erhalten — ${inv.number}`,
                meta: `${c?.company ?? ""} · ${eur(total)}`,
                customerId: inv.customerId,
              })
              toast.success("Als bezahlt markiert")
            }}
          >
            <CheckCircle2 /> Als bezahlt markieren
          </DropdownItem>
        )}
        {inv.status === "draft" && (
          <DropdownItem onSelect={() => setInvoiceStatus(inv.id, "sent")}>
            <Send /> Als versendet markieren
          </DropdownItem>
        )}
        {(inv.status === "sent" || inv.status === "overdue") && (
          <DropdownItem
            onSelect={() => {
              const r = sendReminder(inv.id)
              if (r)
                toast.success(`${r.email.subject.split(" — ")[0]} erstellt`, {
                  description: "Entwurf im Bereich E-Mails.",
                })
            }}
          >
            <BellRing /> Mahnung / Erinnerung senden
          </DropdownItem>
        )}
        {inv.status !== "draft" && inv.status !== "canceled" && !inv.cancelsInvoiceId && (
          <DropdownItem
            onSelect={async () => {
              const ok = await confirm({
                title: `Rechnung ${inv.number} stornieren?`,
                description: `Es wird eine Stornorechnung mit negierten Positionen erstellt. ${inv.number} wird auf „Storniert" gesetzt.`,
                confirmLabel: "Stornorechnung erstellen",
                destructive: true,
              })
              if (!ok) return
              const storno = createCancellation(inv.id)
              if (storno)
                toast.success(`Stornorechnung ${storno.number} erstellt`, {
                  description: `${inv.number} wurde storniert.`,
                })
            }}
          >
            <Ban /> Stornorechnung erstellen
          </DropdownItem>
        )}
        <DropdownSeparator />
        <DropdownItem onSelect={() => toggleRecurring(inv.id)}>
          <Repeat /> {inv.recurring ? "Retainer deaktivieren" : "Als monatlich (Retainer)"}
        </DropdownItem>
        <DropdownItem
          onSelect={() => {
            const next = duplicateRecurring(inv.id)
            if (next)
              toast.success(`Folge-Rechnung ${next.number} erzeugt`, {
                description: "Als Entwurf für den nächsten Monat angelegt.",
              })
          }}
        >
          <CopyPlus /> Folge-Rechnung erzeugen
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          className="text-destructive data-[highlighted]:text-destructive"
          onSelect={async () => {
            const ok = await confirm({
              title: `Rechnung ${inv.number} löschen?`,
              description: `Die Rechnung für ${c?.company ?? "diesen Kunden"} über ${eur(total)} wird entfernt.`,
              confirmLabel: "Löschen",
              destructive: true,
            })
            if (!ok) return
            remove("invoices", inv.id)
            toast.success("Rechnung gelöscht", {
              action: { label: "Rückgängig", onClick: () => add("invoices", inv) },
            })
          }}
        >
          <Trash2 /> Löschen
        </DropdownItem>
      </DropdownContent>
    )
  }

  function contractMenu(
    con: Contract,
    opts: { onDetail?: (c: Contract) => void; hideCustomer?: boolean } = {},
  ) {
    const quote = db.quotes.find((q) => q.id === con.quoteId)
    return (
      <DropdownContent>
        {opts.onDetail ? (
          <DropdownItem onSelect={() => opts.onDetail!(con)}>
            <FileSignature /> Details
          </DropdownItem>
        ) : (
          <DropdownItem asChild>
            <Link href={`/contracts?doc=${con.id}`}>
              <FileSignature /> Details
            </Link>
          </DropdownItem>
        )}
        {customerLink(con.customerId, opts.hideCustomer)}
        {quote && (
          <DropdownItem asChild>
            <Link href={`/quotes?doc=${quote.id}`}>
              <FileText /> Angebot {quote.number} öffnen
            </Link>
          </DropdownItem>
        )}
        <DropdownItem asChild>
          <Link href={`/print/contract/${con.id}`} target="_blank">
            <FileDown /> PDF / Drucken
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        {con.status === "draft" && (
          <DropdownItem
            onSelect={() => {
              upsertContract({ ...con, status: "sent" })
              toast.success("Als versendet markiert")
            }}
          >
            <Send /> Als versendet markieren
          </DropdownItem>
        )}
        {con.status !== "signed" && con.status !== "active" && (
          <DropdownItem
            onSelect={() => {
              upsertContract({ ...con, status: "signed", signedAt: new Date().toISOString() })
              toast.success("Als unterzeichnet markiert")
            }}
          >
            <CheckCircle2 /> Als unterzeichnet markieren
          </DropdownItem>
        )}
        <DropdownSeparator />
        <DropdownItem
          className="text-destructive data-[highlighted]:text-destructive"
          onSelect={async () => {
            const ok = await confirm({
              title: `Vertrag ${con.number} löschen?`,
              description: "Der Vertrag wird entfernt. Angebot und Rechnungen bleiben bestehen.",
              confirmLabel: "Löschen",
              destructive: true,
            })
            if (!ok) return
            remove("contracts", con.id)
            toast.success("Vertrag gelöscht", {
              action: { label: "Rückgängig", onClick: () => add("contracts", con) },
            })
          }}
        >
          <Trash2 /> Löschen
        </DropdownItem>
      </DropdownContent>
    )
  }

  return { quoteMenu, invoiceMenu, contractMenu }
}

/** Der „⋮"-Auslöser. Steht das Menü in einer klickbaren Zeile, darf der Klick
 *  nicht bis zur Zeile durchschlagen — sonst öffnen sich beide. */
export function DocMenu({
  children,
  className,
  label = "Aktionen",
}: {
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={className ?? "size-8 shrink-0"}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownTrigger>
      {children}
    </Dropdown>
  )
}
