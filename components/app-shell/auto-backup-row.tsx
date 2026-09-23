"use client"

import * as React from "react"
import { FolderCheck, FolderPlus, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAutoBackupContext } from "@/hooks/use-auto-backup"
import { KEEP_DAYS } from "@/lib/auto-backup"

/**
 * Bedienung der automatischen Sicherung — eine Zeile in den Einstellungen.
 *
 * Die manuelle Sicherung bleibt daneben stehen. Sie ist der Weg, eine Kopie
 * aus dem Haus zu geben (Steuerberater, zweiter Datenträger); die Automatik
 * ist der Weg, den täglichen Stand überhaupt zu haben.
 */
export function AutoBackupRow() {
  const { state, busy, error, chooseFolder, regrant, disable, runNow } =
    useAutoBackupContext()

  if (state.kind === "unsupported") {
    return (
      <div className="px-4 py-3.5">
        <p className="text-sm font-semibold">Automatische Sicherung</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Dieser Browser kann nicht selbstständig in einen Ordner schreiben. In Chrome oder
          Edge geht das — dort lässt sich ein Ordner einmalig freigeben. Bis dahin bleibt nur
          die Sicherung von Hand.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
      <span
        className={
          state.kind === "ready"
            ? "grid size-9 shrink-0 place-items-center rounded-lg bg-[#3ee3b5]/12"
            : "grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06]"
        }
      >
        {state.kind === "ready" ? (
          <ShieldCheck className="size-4 text-[#3ee3b5]" />
        ) : (
          <FolderPlus className="size-4 text-muted-foreground" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Automatische Sicherung</p>

        {state.kind === "off" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Einen Ordner freigeben — am besten einen, der selbst synchronisiert wird (iCloud,
            Dropbox, OneDrive) oder auf einer externen Platte liegt. Danach schreibt die App
            dort ohne weiteres Zutun eine datierte Sicherung und hebt die letzten {KEEP_DAYS}{" "}
            Tage auf.
          </p>
        )}

        {state.kind === "needs-permission" && (
          <p className="mt-0.5 text-xs text-[#ffb020]">
            Die Freigabe für „{state.folder}“ ist abgelaufen — Browser fordern sie nach einem
            Neustart erneut an. Bis zur Bestätigung wird nichts gesichert.
          </p>
        )}

        {state.kind === "ready" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Läuft. Sicherungen gehen nach „{state.folder}“, eine Datei je Tag, die letzten{" "}
            {KEEP_DAYS} Tage bleiben stehen.
          </p>
        )}

        {error && <p className="mt-1.5 text-xs text-[#ff8080]">{error}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {state.kind === "off" && (
          <Button variant="brand" className="gap-1.5" onClick={() => void chooseFolder()}>
            <FolderPlus className="size-4" /> Ordner freigeben
          </Button>
        )}

        {state.kind === "needs-permission" && (
          <Button variant="brand" className="gap-1.5" onClick={() => void regrant()}>
            <RefreshCw className="size-4" /> Freigabe bestätigen
          </Button>
        )}

        {state.kind === "ready" && (
          <>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={busy}
              onClick={async () => {
                await runNow()
                toast.success("Sicherung geschrieben")
              }}
            >
              <ShieldCheck className="size-4" /> {busy ? "Sichert…" : "Jetzt sichern"}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => void chooseFolder()}
            >
              <FolderCheck className="size-4" /> Ordner wechseln
            </Button>
            <Button variant="ghost" onClick={() => void disable()}>
              Abschalten
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
