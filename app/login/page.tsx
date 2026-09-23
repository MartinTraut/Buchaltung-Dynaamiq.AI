"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react"
import { DynaamiqLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { AuroraBackground } from "@/components/app-shell/aurora-bg"
import { useQueryValue } from "@/hooks/use-query-flag"
import { cn } from "@/lib/utils"

/**
 * Anmeldung vor dem Cockpit.
 *
 * Geprüft wird ausschließlich auf dem Server (`/api/auth/login`); diese Seite
 * schickt nur hin und zeigt an. Nach Erfolg geht es dorthin zurück, wo der
 * Aufruf abgefangen wurde — ein Lesezeichen auf eine bestimmte Rechnung soll
 * nicht auf dem Dashboard enden.
 */
export default function LoginPage() {
  const router = useRouter()
  const weiter = useQueryValue("weiter")
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "Anmeldung fehlgeschlagen.")
        setPassword("")
        setBusy(false)
        return
      }
      // `refresh()` nach `replace()`: Der Proxy hat die vorherige Antwort
      // umgeleitet, und die liegt im Routen-Zwischenspeicher. Ohne das
      // Auffrischen landet man wieder auf der Anmeldeseite.
      router.replace(weiter && weiter.startsWith("/") ? weiter : "/")
      router.refresh()
    } catch {
      setError("Der Server ist nicht erreichbar.")
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AuroraBackground />

      <div className="w-full max-w-[412px]">
        <div className="mb-7 flex justify-center sm:mb-9">
          <DynaamiqLogo />
        </div>

        <div className="mb-6 text-center">
          <h1 className="font-display leading-[1.1] font-bold text-brand-gradient [font-size:clamp(1.75rem,2.2vw+1.1rem,2.5rem)]">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Business Cockpit — Buchhaltung, CRM und Angebote
          </p>
        </div>

        <form
          onSubmit={submit}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-7"
        >
          {/* Markenschimmer an der Oberkante — hebt die Karte aus der Fläche,
              ohne eine zweite Farbe ins Formular zu tragen. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-3xl"
          />

          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-cyan/12">
              <LockKeyhole className="size-4 text-brand-cyan" />
            </span>
            <div>
              <h2 className="text-[15px] leading-tight font-semibold">Anmeldung</h2>
              <p className="text-xs text-muted-foreground">Benutzername und Passwort</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/90">
              Benutzername
            </span>
            <input
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/90">
              Passwort
            </span>
            <span className="relative block">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(fieldClass, "pr-11")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-3 py-2 text-[13px] text-[#ffb3b3]"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="brand"
            className="w-full gap-1.5"
            disabled={busy || !username || !password}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy ? "Wird geprüft…" : "Anmelden"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          Der Datenbestand liegt im Speicher dieses Browsers. Die Anmeldung hält
          Fremde von der Adresse fern — an einem entsperrten Rechner ersetzt sie
          die Bildschirmsperre nicht.
        </p>
      </div>
    </main>
  )
}

// text-base auf dem Telefon (≥16px) verhindert den iOS-Zoom beim Fokussieren.
const fieldClass =
  "w-full rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 py-2.5 text-base text-foreground caret-brand-cyan outline-none transition placeholder:text-muted-foreground/50 focus:border-brand-cyan/50 focus:bg-white/[0.06] md:text-sm"
