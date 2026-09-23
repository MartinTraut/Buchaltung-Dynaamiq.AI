"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import type { Database } from "@/lib/types"
import {
  readState,
  writeBackup,
  shouldWrite,
  chooseFolder as pickFolder,
  regrant as regrantPermission,
  disable as disableBackup,
  type BackupState,
} from "@/lib/auto-backup"

/**
 * Hält die automatische Sicherung am Laufen.
 *
 * Geschrieben wird nach einer Ruhephase von 20 Sekunden, nicht bei jedem
 * Tastendruck: Wer eine Rechnung erfasst, löst sonst zwei Dutzend
 * Schreibvorgänge aus. Den Mindestabstand darüber hinaus bestimmt
 * `shouldWrite` — einmal je Tag auf jeden Fall, sonst frühestens alle fünf
 * Minuten.
 */

/** Ruhephase, nach der eine Änderung als abgeschlossen gilt. */
const SETTLE_MS = 20_000

export interface AutoBackup {
  state: BackupState
  /** Läuft gerade ein Schreibvorgang. */
  busy: boolean
  /** Letzter Fehler beim Schreiben — für die Anzeige in den Einstellungen. */
  error: string | null
  chooseFolder: () => Promise<void>
  regrant: () => Promise<void>
  disable: () => Promise<void>
  /** Sicherung sofort schreiben, unabhängig vom Mindestabstand. */
  runNow: () => Promise<void>
}

function useAutoBackup(): AutoBackup {
  const { db, ready, updateSettings } = useStore()
  const [state, setState] = React.useState<BackupState>({ kind: "off" })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    readState().then((s) => {
      if (!cancelled) setState(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const write = React.useCallback(
    async (db: Database, force: boolean) => {
      if (!force && !shouldWrite(db.settings.lastBackupAt)) return
      setBusy(true)
      const res = await writeBackup(db)
      setBusy(false)
      if (res.ok && res.backup) {
        setError(null)
        updateSettings({ lastBackupAt: res.backup.createdAt })
        return
      }
      setError(res.error ?? "Sicherung fehlgeschlagen.")
      // Freigaben fallen weg, wenn der Browser neu startet oder der Ordner
      // nicht mehr erreichbar ist. Das muss sichtbar werden, sonst hält man
      // sich für gesichert und ist es nicht.
      if (res.needsPermission) setState(await readState())
    },
    [updateSettings],
  )

  // Automatischer Lauf: nur wenn der Ordner freigegeben und der Bestand
  // geladen ist. Vor `ready` stünde der Seed-Stand im Speicher — den in die
  // Sicherung zu schreiben hieße, den echten Bestand zu überschreiben.
  //
  // Jede Änderung setzt die Ruhephase zurück; geschrieben wird also erst,
  // wenn 20 Sekunden lang nichts passiert ist. Wer eine Rechnung tippt, löst
  // damit eine Sicherung aus statt zwei Dutzend.
  React.useEffect(() => {
    if (!ready || state.kind !== "ready") return
    const t = window.setTimeout(() => void write(db, false), SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [db, ready, state.kind, write])

  const chooseFolder = React.useCallback(async () => {
    try {
      const next = await pickFolder()
      setState(next)
      setError(null)
      if (next.kind === "ready") await write(db, true)
    } catch (e) {
      // Abbruch im Dateidialog ist kein Fehler, sondern eine Entscheidung.
      if (e instanceof DOMException && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Ordner konnte nicht gewählt werden.")
    }
  }, [db, write])

  const regrant = React.useCallback(async () => {
    const next = await regrantPermission()
    setState(next)
    if (next.kind === "ready") {
      setError(null)
      await write(db, true)
    }
  }, [db, write])

  const disable = React.useCallback(async () => {
    setState(await disableBackup())
    setError(null)
  }, [])

  const runNow = React.useCallback(() => write(db, true), [db, write])

  return { state, busy, error, chooseFolder, regrant, disable, runNow }
}

/* ── Bereitstellung für die ganze App ──────────────────────────────────────
 *
 * Die Automatik muss laufen, solange die App offen ist — nicht erst, wenn
 * jemand die Einstellungen aufschlägt. Gleichzeitig darf es nur eine Instanz
 * geben: zwei Aufrufe des Hooks hießen zwei Zeitgeber und doppelte
 * Schreibvorgänge in dieselbe Datei.
 */

const AutoBackupContext = React.createContext<AutoBackup | null>(null)

export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  const value = useAutoBackup()
  return <AutoBackupContext.Provider value={value}>{children}</AutoBackupContext.Provider>
}

export function useAutoBackupContext(): AutoBackup {
  const ctx = React.useContext(AutoBackupContext)
  if (!ctx) throw new Error("useAutoBackupContext braucht einen AutoBackupProvider")
  return ctx
}
