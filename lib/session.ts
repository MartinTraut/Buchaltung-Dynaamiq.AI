/**
 * Anmeldung: signierte Sitzung in einem httpOnly-Cookie.
 *
 * Bewusst nicht im Browser geprüft. Ein Passwortvergleich in der Oberfläche
 * schützt nichts — das Passwort stünde im JavaScript-Bundle, das jeder
 * Besucher herunterlädt, und ein Zustand „angemeldet" im localStorage lässt
 * sich in zwei Klicks setzen. Der Server prüft, der Server stellt aus, und das
 * Cookie ist signiert: Ohne den Schlüssel lässt sich keines herstellen, das
 * durchgeht.
 *
 * Was das leistet und was nicht: Es hält jeden ab, der die Adresse aufruft.
 * Es schützt nicht gegen jemanden, der bereits an diesem entsperrten Rechner
 * sitzt — der Datenbestand liegt im localStorage dieses Browsers und ist über
 * die Entwicklerwerkzeuge lesbar. Gegen den Fall hilft nur die
 * Bildschirmsperre des Rechners.
 */

export const SESSION_COOKIE = "dynaamiq-sitzung"

/** Gültigkeit einer Anmeldung. Danach wird erneut gefragt. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const encoder = new TextEncoder()

/**
 * Web Crypto statt Node-`crypto`: Der Proxy läuft je nach Bereitstellung in
 * einer Umgebung ohne Node-Module. `crypto.subtle` gibt es in beiden.
 */
async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await signingKey(secret)
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)))
}

/**
 * Vergleich in konstanter Zeit.
 *
 * Ein gewöhnlicher Vergleich bricht beim ersten abweichenden Zeichen ab. Wer
 * die Antwortzeiten misst, kann eine Signatur oder ein Passwort daran Zeichen
 * für Zeichen erraten. Deshalb immer über die volle Länge.
 */
export function equalsInConstantTime(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  // Die Länge selbst bleibt erkennbar; das ist hinnehmbar und lässt sich bei
  // Zeichenketten unterschiedlicher Länge nicht vermeiden.
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

/** Sitzungstoken ausstellen: `benutzer.ablauf.signatur`. */
export async function createSession(
  username: string,
  secret: string,
  now = Date.now(),
): Promise<string> {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000
  // Der Benutzername wird kodiert, damit ein Punkt darin die drei Teile nicht
  // durcheinanderbringt.
  const payload = `${encodeURIComponent(username)}.${expiresAt}`
  return `${payload}.${await sign(payload, secret)}`
}

/**
 * Token prüfen. Liefert den Benutzernamen oder `null` — jeder Fehlerfall
 * (falsche Form, falsche Signatur, abgelaufen) führt zu `null`, damit von
 * außen nicht erkennbar ist, woran es lag.
 */
export async function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<string | null> {
  if (!token || !secret) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [user, expiresAt, signature] = parts

  const expected = await sign(`${user}.${expiresAt}`, secret)
  if (!equalsInConstantTime(signature, expected)) return null

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry <= now) return null

  try {
    return decodeURIComponent(user)
  } catch {
    return null
  }
}
