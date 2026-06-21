"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmOptions | null>(null)
  const resolver = React.useRef<((v: boolean) => void) | null>(null)

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    setState(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!state} onOpenChange={(o) => !o && close(false)}>
        {state && (
          <DialogContent size="sm" className="!gap-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {state.destructive && (
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/12 text-destructive">
                    <AlertTriangle className="size-5" />
                  </span>
                )}
                <DialogTitle>{state.title}</DialogTitle>
              </div>
            </DialogHeader>
            {state.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {state.description}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" size="lg" onClick={() => close(false)}>
                {state.cancelLabel ?? "Abbrechen"}
              </Button>
              <Button
                variant={state.destructive ? "destructive" : "brand"}
                size="lg"
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? "Bestätigen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider")
  return ctx
}
