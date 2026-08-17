"use client"

import * as React from "react"
import { Trash2, CalendarClock, CheckSquare } from "lucide-react"
import { useStore } from "@/lib/store"
import { useConfirm } from "@/lib/confirm"
import {
  toDateInput,
  fromDateInput,
  minutesOfTime,
  timeOfMinutes,
  DEFAULT_EVENT_MINUTES,
} from "@/lib/format"
import { type Task, type TaskKind, type TaskStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input, Label, Select } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

/**
 * Geteilter Dialog zum Anlegen UND Bearbeiten von Aufgaben & Terminen.
 * Auf dem Phone als Bottom-Sheet (Grabber via DialogContent). Wird von der
 * Kalender-Seite und der Projekt-Detailansicht gesteuert.
 */
export function TaskDialog({
  open,
  onOpenChange,
  taskId,
  defaults,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** gesetzt = Bearbeiten, null/undefined = Neu */
  taskId?: string | null
  /** Vorbelegung beim Anlegen (z. B. Datum aus Tagesklick, projectId) */
  defaults?: Partial<Task>
}) {
  const { db, upsertTask, remove, add } = useStore()
  const confirm = useConfirm()
  // Labels mit ihren Feldern verknüpfen — sonst greifen Screenreader
  // und Label-Klicks ins Leere.
  const uid = React.useId()
  const fid = (name: string) => `${uid}-${name}`

  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : undefined

  const [title, setTitle] = React.useState("")
  const [kind, setKind] = React.useState<TaskKind>("task")
  const [due, setDue] = React.useState("")
  const [time, setTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [projectId, setProjectId] = React.useState("")
  const [assignee, setAssignee] = React.useState("")
  const [status, setStatus] = React.useState<TaskStatus>("todo")

  // Beim Öffnen aus Bestand (Edit) oder Defaults (Neu) initialisieren.
  React.useEffect(() => {
    if (!open) return
    const src = taskId ? db.tasks.find((t) => t.id === taskId) : undefined
    const base: Partial<Task> = src ?? defaults ?? {}
    setTitle(base.title ?? "")
    setKind(base.kind ?? "task")
    setDue(toDateInput(base.due))
    setTime(base.time ?? "")
    setEndTime(base.endTime ?? "")
    setProjectId(base.projectId ?? "")
    setAssignee(base.assignee ?? "")
    setStatus(base.status ?? "todo")
    // Nur bei Öffnen/Wechsel neu befüllen — nicht bei jedem db/defaults-Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId])

  const isEvent = kind === "event"
  const canSave = title.trim().length > 0

  const startMin = minutesOfTime(time)
  const endMin = minutesOfTime(endTime)
  /** Ende vor Start ist kein gültiger Termin — Speichern sperren statt still zu kippen. */
  const endInvalid = startMin !== null && endMin !== null && endMin <= startMin

  /** Startzeit setzen und ein bestehendes Ende um dieselbe Dauer mitziehen. */
  const onStartChange = (v: string) => {
    const prev = minutesOfTime(time)
    const next = minutesOfTime(v)
    if (prev !== null && next !== null && endMin !== null && endMin > prev) {
      setEndTime(timeOfMinutes(next + (endMin - prev)))
    } else if (next !== null && !endTime) {
      setEndTime(timeOfMinutes(next + DEFAULT_EVENT_MINUTES))
    }
    setTime(v)
  }

  const save = () => {
    if (!canSave || endInvalid) return
    upsertTask({
      id: taskId ?? undefined,
      title: title.trim(),
      kind,
      due: fromDateInput(due),
      time: isEvent ? time || undefined : undefined,
      endTime: isEvent && time ? endTime || undefined : undefined,
      projectId: projectId || undefined,
      assignee: assignee.trim() || undefined,
      status,
    })
    toast.success(
      taskId ? "Gespeichert" : isEvent ? "Termin angelegt" : "Aufgabe angelegt",
    )
    onOpenChange(false)
  }

  const del = async () => {
    if (!existing) return
    const ok = await confirm({
      title: `„${existing.title}" löschen?`,
      description: "Der Eintrag wird dauerhaft entfernt.",
      confirmLabel: "Löschen",
      destructive: true,
    })
    if (!ok) return
    remove("tasks", existing.id)
    onOpenChange(false)
    toast.success("Gelöscht", {
      action: { label: "Rückgängig", onClick: () => add("tasks", existing) },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
              {isEvent ? (
                <CalendarClock className="size-4.5" />
              ) : (
                <CheckSquare className="size-4.5" />
              )}
            </span>
            <DialogTitle>
              {taskId ? "Eintrag bearbeiten" : isEvent ? "Neuer Termin" : "Neue Aufgabe"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor={fid("title")}>Titel</Label>
            <Input
              id={fid("title")}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEvent ? "z. B. Kickoff-Call" : "z. B. Report finalisieren"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) save()
              }}
            />
          </div>

          <div>
            <Label>Typ</Label>
            <Segmented
              value={kind}
              onChange={(v) => setKind(v)}
              options={[
                { id: "task", label: "Aufgabe" },
                { id: "event", label: "Termin" },
              ]}
            />
          </div>

          <div className={isEvent ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : ""}>
            <div className={isEvent ? "col-span-2" : ""}>
              <Label htmlFor={fid("due")}>Datum</Label>
              <Input
                id={fid("due")}
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            {isEvent && (
              <>
                <div>
                  <Label htmlFor={fid("from")}>Von</Label>
                  <Input
                    id={fid("from")}
                    type="time"
                    step={900}
                    value={time}
                    onChange={(e) => onStartChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={fid("to")}>Bis</Label>
                  <Input
                    id={fid("to")}
                    type="time"
                    step={900}
                    value={endTime}
                    disabled={!time}
                    aria-invalid={endInvalid}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          {endInvalid && (
            <p className="-mt-2 text-[12px] text-[#ff7a7a]">
              Das Ende muss nach dem Beginn liegen.
            </p>
          )}

          <div>
            <Label htmlFor={fid("project")}>Projekt</Label>
            <Select
              id={fid("project")}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Kein Projekt</option>
              {db.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor={fid("assignee")}>Verantwortlich</Label>
            <Input
              id={fid("assignee")}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="optional"
            />
          </div>

          <div>
            <Label>Status</Label>
            {isEvent ? (
              <Segmented
                value={status === "done" ? "done" : "todo"}
                onChange={(v) => setStatus(v)}
                options={[
                  { id: "todo", label: "Offen" },
                  { id: "done", label: "Erledigt" },
                ]}
              />
            ) : (
              <Segmented
                value={status}
                onChange={(v) => setStatus(v)}
                options={[
                  { id: "todo", label: "Offen" },
                  { id: "doing", label: "In Arbeit" },
                  { id: "done", label: "Erledigt" },
                ]}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          {taskId && (
            <Button
              variant="destructive"
              className="gap-1.5 sm:mr-auto"
              onClick={del}
            >
              <Trash2 className="size-4" /> Löschen
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button variant="brand" disabled={!canSave || endInvalid} onClick={save}>
            {taskId ? "Speichern" : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
