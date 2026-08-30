import { Badge } from "@/components/ui/badge"
import {
  INVOICE_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  CONTRACT_STATUS_LABEL,
  type InvoiceStatus,
  type QuoteStatus,
  type ContractStatus,
} from "@/lib/types"

const INV_VARIANT: Record<InvoiceStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  draft: "muted",
  sent: "warning",
  paid: "success",
  overdue: "danger",
  canceled: "muted",
}
const QUOTE_VARIANT: Record<QuoteStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  draft: "muted",
  sent: "warning",
  accepted: "success",
  declined: "danger",
  expired: "muted",
}

const CONTRACT_VARIANT: Record<ContractStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  draft: "muted",
  sent: "warning",
  signed: "success",
  active: "success",
  terminated: "danger",
  expired: "muted",
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={INV_VARIANT[status]}>{INVOICE_STATUS_LABEL[status]}</Badge>
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={QUOTE_VARIANT[status]}>{QUOTE_STATUS_LABEL[status]}</Badge>
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={CONTRACT_VARIANT[status]}>{CONTRACT_STATUS_LABEL[status]}</Badge>
}
