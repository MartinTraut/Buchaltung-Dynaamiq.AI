import { buildBackup, backupFileName, type BackupFile } from "./backup"
import type { Database } from "./types"

/**
 * Automatische Datensicherung in einen selbst gewählten Ordner.
 *
 * Die manuelle Sicherung unter den Einstellungen setzt voraus, dass jemand
 * daran denkt. Genau das passiert im Tagesgeschäft nicht — die Prüfung
 * „Noch nie eine Datensicherung erstellt" stand deshalb auf kritisch. Mit der
 * File System Access API lässt sich einmalig ein Ordner freigeben (iCloud,
 * Dropbox, externe Platte); danach schreibt die App dort ohne weiteres Zutun
 * eine datierte Sicherung, sobald sich etwas geändert hat.
 *
 * Wichtig für den Ernstfall: Es wird je Tag eine eigene Datei geschrieben und
 * eine einstellbare Anzahl Tage aufgehoben. Eine einzige, ständig
 * überschriebene Datei wäre keine Sicherung — ein Fehler, der erst nach einer
 * Woche auffällt, wäre längst in sie hineingeschrieben.
 *
 * Safari und Firefox kennen die API nicht. Dort bleibt es bei der manuellen
 * Sicherung; `isSupported()` sagt das der Oberfläche, damit sie nicht einen
 * Knopf anbietet, der nichts tut.
 */

/** Wie viele tägliche Sicherungen im Ordner stehen bleiben. */
export const KEEP_DAYS = 30

/** Mindestabstand zwischen zwei automatischen Schreibvorgängen. */
const MIN_INTERVAL_MS = 5 * 60 * 1000

const IDB_NAME = "dynaamiq-os-backup"
const IDB_STORE = "handles"
const HANDLE_KEY = "directory"

/* ── Browser-Fähigkeiten ──────────────────────────────────────────────── */

export function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined"
  )
}

/* ── Ordner-Handle dauerhaft merken ───────────────────────────────────────
 *
 * Ein Verzeichnis-Handle überlebt den Tab-Wechsel nur, wenn es gespeichert
 * wird. localStorage kann das nicht (nur Strings), IndexedDB schon — Handles
 * sind strukturiert klonbar. Ohne diesen Umweg müsste der Ordner bei jedem
 * Start neu ausgewählt werden, und die Automatik wäre keine.
 */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.objectStore(IDB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.objectStore(IDB_STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/* ── Zustand ──────────────────────────────────────────────────────────── */

export type BackupState =
  /** Browser kann es nicht — nur manuelle Sicherung. */
  | { kind: "unsupported" }
  /** Noch kein Ordner gewählt. */
  | { kind: "off" }
  /** Ordner gewählt, aber der Browser will die Freigabe neu bestätigt haben. */
  | { kind: "needs-permission"; folder: string }
  /** Läuft. */
  | { kind: "ready"; folder: string }

/**
 * Das zuletzt benutzte Handle. IndexedDB ist der dauerhafte Ablageort, aber
 * jede Sicherung dort neu nachzuschlagen heißt: Datenbank öffnen, lesen,
 * schließen — und das mehrfach je Schreibvorgang. Der Zwischenspeicher hält
 * das lebende Objekt; IndexedDB wird nur noch gebraucht, wenn die App neu
 * geladen wurde.
 */
let cachedHandle: FileSystemDirectoryHandle | null = null

export async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isSupported()) return null
  if (cachedHandle) return cachedHandle
  try {
    cachedHandle = (await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY)) ?? null
    return cachedHandle
  } catch {
    return null
  }
}

/**
 * Zustand beim Start ermitteln, ohne den Nutzer zu behelligen.
 * `queryPermission` fragt nur ab; `requestPermission` bräuchte eine
 * Nutzeraktion und würde hier stillschweigend scheitern.
 */
export async function readState(): Promise<BackupState> {
  if (!isSupported()) return { kind: "unsupported" }
  const handle = await getStoredHandle()
  if (!handle) return { kind: "off" }
  const perm = await handle.queryPermission({ mode: "readwrite" })
  return perm === "granted"
    ? { kind: "ready", folder: handle.name }
    : { kind: "needs-permission", folder: handle.name }
}

/** Ordner auswählen — braucht eine Nutzeraktion (Klick). */
export async function chooseFolder(): Promise<BackupState> {
  if (!isSupported()) return { kind: "unsupported" }
  const handle = await window.showDirectoryPicker({
    id: "dynaamiq-backup",
    mode: "readwrite",
    startIn: "documents",
  })
  const perm = await handle.requestPermission({ mode: "readwrite" })
  if (perm !== "granted") return { kind: "off" }
  cachedHandle = handle
  await idbSet(HANDLE_KEY, handle)
  return { kind: "ready", folder: handle.name }
}

/** Freigabe erneut anfordern — ebenfalls nur aus einem Klick heraus. */
export async function regrant(): Promise<BackupState> {
  const handle = await getStoredHandle()
  if (!handle) return { kind: "off" }
  const perm = await handle.requestPermission({ mode: "readwrite" })
  return perm === "granted"
    ? { kind: "ready", folder: handle.name }
    : { kind: "needs-permission", folder: handle.name }
}

/** Automatik abschalten und den gemerkten Ordner vergessen. */
export async function disable(): Promise<BackupState> {
  cachedHandle = null
  await idbDelete(HANDLE_KEY).catch(() => {})
  return { kind: "off" }
}

/* ── Schreiben ────────────────────────────────────────────────────────── */

const FILE_RE = /^dynaamiq-sicherung-(\d{4}-\d{2}-\d{2})\.json$/

/**
 * Alte Sicherungen aufräumen. Bewusst nur die eigenen Dateien: Der Ordner darf
 * auch anderes enthalten, und ein Sicherungswerkzeug, das fremde Dateien
 * löscht, ist ein Datenverlust mit Ansage.
 */
async function pruneOld(dir: FileSystemDirectoryHandle, keepDays: number) {
  const dates: string[] = []
  for await (const name of dir.keys()) {
    const m = FILE_RE.exec(name)
    if (m) dates.push(m[1])
  }
  dates.sort()
  for (const date of dates.slice(0, Math.max(0, dates.length - keepDays))) {
    await dir.removeEntry(`dynaamiq-sicherung-${date}.json`).catch(() => {})
  }
}

export interface WriteResult {
  ok: boolean
  /** Geschriebene Datei — für die Rückmeldung in der Oberfläche. */
  fileName?: string
  backup?: BackupFile
  error?: string
  /** Freigabe ist weggefallen: die Oberfläche muss neu fragen. */
  needsPermission?: boolean
}

/** Eine Sicherung in den freigegebenen Ordner schreiben. */
export async function writeBackup(
  db: Database,
  keepDays = KEEP_DAYS,
): Promise<WriteResult> {
  const handle = await getStoredHandle()
  if (!handle) return { ok: false, error: "Kein Sicherungsordner freigegeben." }
  const perm = await handle.queryPermission({ mode: "readwrite" })
  if (perm !== "granted") {
    return {
      ok: false,
      needsPermission: true,
      error: "Die Freigabe für den Sicherungsordner ist abgelaufen.",
    }
  }
  try {
    const backup = buildBackup(db)
    const fileName = backupFileName(new Date(backup.createdAt))
    const file = await handle.getFileHandle(fileName, { create: true })
    const stream = await file.createWritable()
    await stream.write(JSON.stringify(backup, null, 2))
    await stream.close()
    await pruneOld(handle, keepDays)
    return { ok: true, fileName, backup }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Sicherung fehlgeschlagen: ${e.message}`
          : "Sicherung fehlgeschlagen.",
    }
  }
}

/**
 * Soll jetzt geschrieben werden? Hält den Abstand ein, damit nicht jedes
 * getippte Zeichen eine Datei schreibt, erzwingt aber die erste Sicherung des
 * Tages — sonst stünde nach Mitternacht kein neuer Stand im Ordner.
 */
export function shouldWrite(lastAt: string | undefined, now = Date.now()): boolean {
  if (!lastAt) return true
  const last = new Date(lastAt).getTime()
  if (Number.isNaN(last)) return true
  if (new Date(last).toDateString() !== new Date(now).toDateString()) return true
  return now - last >= MIN_INTERVAL_MS
}
