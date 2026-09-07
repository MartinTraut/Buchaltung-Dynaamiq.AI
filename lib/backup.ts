import type { Database } from "./types"

/**
 * Datensicherung des gesamten Bestands.
 *
 * Der Datenbestand liegt ausschließlich im localStorage dieses Browsers. Ein
 * geleerter Browserspeicher, ein neues Gerät oder Safaris automatische Räumung
 * nicht installierter Seiten löschen ihn ersatzlos — mitsamt jeder gestellten
 * Rechnung. Nach §147 AO sind Rechnungen zehn Jahre aufzubewahren, und dieser
 * Speicher trägt keine zehn Wochen. Deshalb: eine Datei, die alles enthält,
 * und ein Weg zurück.
 */

/** Format-Version der Sicherungsdatei — steigt, wenn sich die Struktur ändert. */
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: "dynaamiq-os-backup"
  version: number
  createdAt: string
  /** Zähldaten für die Sichtprüfung, bevor eine Sicherung eingespielt wird. */
  counts: Record<string, number>
  data: Database
}

/** Sammlungen, die eine vollständige Sicherung enthalten muss. */
const COLLECTIONS = [
  "customers",
  "deals",
  "projects",
  "tasks",
  "invoices",
  "quotes",
  "contracts",
  "templates",
  "emails",
  "transactions",
  "activities",
  "onboardings",
] as const

export function buildBackup(db: Database): BackupFile {
  return {
    format: "dynaamiq-os-backup",
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    counts: Object.fromEntries(
      COLLECTIONS.map((k) => [k, (db[k] as unknown[]).length]),
    ),
    data: db,
  }
}

/** Dateiname mit Datum — Sicherungen sortieren sich damit von selbst. */
export function backupFileName(at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `dynaamiq-sicherung-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}.json`
}

export interface BackupCheck {
  ok: boolean
  /** Klartext für den Nutzer: warum die Datei nicht eingespielt werden kann. */
  error?: string
  file?: BackupFile
}

/**
 * Sicherungsdatei prüfen, bevor sie den Bestand ersetzt. Eine falsche Datei
 * darf nicht zum stillen Totalverlust führen, deshalb wird jede Sammlung auf
 * ihre Form geprüft statt nur auf „ist irgendein JSON".
 */
export function parseBackup(text: string): BackupCheck {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "Die Datei ist kein gültiges JSON." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Die Datei enthält keinen Datensatz." }
  }
  const file = parsed as Partial<BackupFile>
  if (file.format !== "dynaamiq-os-backup") {
    return {
      ok: false,
      error: "Das ist keine Sicherung von Dynaamiq OS (Kennung fehlt).",
    }
  }
  if (typeof file.version !== "number" || file.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Die Sicherung stammt aus einer neueren Version (${file.version}). Bitte erst die App aktualisieren.`,
    }
  }
  const data = file.data as Database | undefined
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Die Sicherung enthält keine Daten." }
  }
  if (!data.settings || typeof data.settings !== "object") {
    return { ok: false, error: "Die Sicherung enthält keine Firmendaten." }
  }
  const missing = COLLECTIONS.filter((k) => !Array.isArray(data[k]))
  // Sammlungen, die es zum Zeitpunkt der Sicherung noch nicht gab, sind kein
  // Fehler — sie werden beim Einspielen als leere Liste ergänzt.
  const fatal = missing.filter((k) => k === "customers" || k === "invoices")
  if (fatal.length) {
    return { ok: false, error: `Unvollständige Sicherung: ${fatal.join(", ")} fehlt.` }
  }
  for (const key of missing) (data[key] as unknown) = []
  return { ok: true, file: { ...(file as BackupFile), data } }
}

/** Kurzfassung des Inhalts für die Rückfrage vor dem Einspielen. */
export function backupSummary(file: BackupFile): string {
  const d = file.data
  return `${d.customers.length} Kunden · ${d.invoices.length} Rechnungen · ${d.quotes.length} Angebote · ${d.contracts.length} Verträge`
}
