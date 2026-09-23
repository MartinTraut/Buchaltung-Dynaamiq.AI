import { NextResponse } from "next/server"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  equalsInConstantTime,
} from "@/lib/session"

export const runtime = "nodejs"

/**
 * Anmeldung prüfen und Sitzung ausstellen.
 *
 * Zugangsdaten stehen in `.env.local` (nicht im Repository), nicht im Code.
 * Sonst stünde das Passwort in der Versionsgeschichte, und dort bekommt man
 * es nie wieder heraus.
 */

/**
 * Bremse gegen das Durchprobieren von Passwörtern.
 *
 * Absichtlich prozesslokal und klein gehalten: Das hier ist ein Werkzeug für
 * einen Arbeitsplatz, kein Anmeldedienst. Zehn Fehlversuche je fünf Minuten
 * lassen Raten aussichtslos werden — bei einem vierzehnstelligen Passwort
 * reden wir über Jahrtausende — und bestrafen trotzdem keinen Vertipper.
 *
 * Die Sperre gilt anschließend auch für das richtige Passwort. Das ist
 * Absicht: Sonst ließe sich an der abweichenden Antwort ablesen, wann man
 * richtig geraten hat.
 */
const WINDOW_MS = 5 * 60_000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, number[]>()

function tooManyAttempts(ip: string, now: number): boolean {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  attempts.set(ip, recent)
  return recent.length >= MAX_ATTEMPTS
}

function noteFailure(ip: string, now: number) {
  attempts.set(ip, [...(attempts.get(ip) ?? []), now])
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "lokal"
  )
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET
  const expectedUser = process.env.AUTH_USERNAME
  const expectedPassword = process.env.AUTH_PASSWORD

  if (!secret || !expectedUser || !expectedPassword) {
    return NextResponse.json(
      {
        error:
          "Die Anmeldung ist nicht eingerichtet: AUTH_USERNAME, AUTH_PASSWORD und AUTH_SECRET fehlen in .env.local.",
      },
      { status: 500 },
    )
  }

  const now = Date.now()
  const ip = clientIp(request)
  if (tooManyAttempts(ip, now)) {
    return NextResponse.json(
      { error: "Zu viele Fehlversuche. Bitte in fünf Minuten erneut versuchen." },
      { status: 429 },
    )
  }

  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  const username = typeof body.username === "string" ? body.username.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  // Beide Vergleiche laufen immer, auch wenn der Benutzername schon nicht
  // passt: Sonst verriete die Antwortzeit, welcher der beiden Teile falsch war.
  const userOk = equalsInConstantTime(username.toLowerCase(), expectedUser.toLowerCase())
  const passwordOk = equalsInConstantTime(password, expectedPassword)

  if (!userOk || !passwordOk) {
    noteFailure(ip, now)
    // Keine Auskunft darüber, was falsch war.
    return NextResponse.json(
      { error: "Benutzername oder Passwort stimmt nicht." },
      { status: 401 },
    )
  }

  attempts.delete(ip)

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSession(expectedUser, secret, now),
    httpOnly: true, // für JavaScript unsichtbar — auch für fremdes
    sameSite: "lax",
    // In der Entwicklung läuft es über http://localhost; ein `secure`-Cookie
    // käme dort nie an.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return response
}
