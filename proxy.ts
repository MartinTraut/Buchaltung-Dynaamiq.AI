import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, verifySession } from "@/lib/session"

/**
 * Torwächter vor dem Cockpit.
 *
 * Heißt in Next 16 `proxy.ts` — die frühere `middleware.ts` ist abgekündigt.
 *
 * Grundhaltung: geschlossen, solange nichts anderes bewiesen ist. Fehlt
 * `AUTH_SECRET`, lässt sich keine gültige Sitzung prüfen; dann kommt niemand
 * durch, statt versehentlich alle. Die Anmeldeseite sagt in dem Fall, was zu
 * tun ist.
 */

/** Der Anmeldeweg selbst muss ohne Sitzung erreichbar sein. */
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"])

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const user = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET ?? "",
  )

  if (PUBLIC_PATHS.has(pathname)) {
    // Angemeldet und trotzdem auf der Anmeldeseite: weiter ins Cockpit.
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (user) return NextResponse.next()

  const login = new URL("/login", request.url)
  // Wohin es nach der Anmeldung gehen soll — ein Lesezeichen auf eine
  // bestimmte Rechnung landet sonst immer auf dem Dashboard.
  if (pathname !== "/") login.searchParams.set("weiter", pathname + search)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    /*
     * Alles außer:
     *  - _next/static, _next/image → Bundles und Bildoptimierung
     *  - icon, apple-icon          → Symbole, die auch die Anmeldeseite braucht
     *  - api/auth                  → der Anmeldeweg selbst
     *  - logo-*.svg                → Marke auf der Anmeldeseite
     */
    "/((?!_next/static|_next/image|icon|apple-icon|favicon.ico|api/auth|logo-).*)",
  ],
}
