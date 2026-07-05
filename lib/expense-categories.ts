// ============================================================
// Ausgaben-Kategorien — zentrale Quelle für UI (Ausgaben-Seite)
// und KI (Prompt in app/api/ai/route.ts), damit die von der KI
// vergebenen Kategorien exakt zu den bekannten Kategorien passen.
// ============================================================

export const EXPENSE_CATEGORIES = [
  "Software & Tools",
  "Ad Spend / Media",
  "Hardware",
  "Subunternehmer",
  "Büro & Miete",
  "Reisekosten",
  "Marketing",
  "Weiterbildung",
  "Versicherungen",
  "Steuerberatung",
  "Sonstiges",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
