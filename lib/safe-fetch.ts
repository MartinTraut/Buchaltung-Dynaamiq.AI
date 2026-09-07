import { lookup } from "node:dns/promises"

/**
 * Ausgehende Abrufe auf öffentliche Web-Adressen begrenzen (SSRF-Schutz).
 *
 * Die Website-Analyse holt eine URL, die aus der Anfrage stammt. Ohne Prüfung
 * ließe sich der Server damit als Werkzeug benutzen: `http://127.0.0.1:…` oder
 * `http://169.254.169.254/…` erreicht Dienste, die von außen gar nicht
 * erreichbar sein sollen — bei einem Hoster sind das unter anderem die
 * Metadaten mit den Zugangsdaten der Instanz. Deshalb wird vor JEDEM Abruf der
 * Hostname aufgelöst und die Ziel-IP geprüft, und Weiterleitungen laufen von
 * Hand, damit sie nicht an der Prüfung vorbeiführen.
 */

/** Private, lokale und Sondernetze nach RFC 1918 / 4193 / 6598 / 3927. */
function isBlockedIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 || //            0.0.0.0/8      „dieses Netz"
    a === 10 || //           10.0.0.0/8     privat
    a === 127 || //          127.0.0.0/8    Loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 Carrier-NAT
    (a === 169 && b === 254) || //           169.254.0.0/16 Link-Local (Cloud-Metadaten)
    (a === 172 && b >= 16 && b <= 31) || //  172.16.0.0/12 privat
    (a === 192 && b === 168) || //           192.168.0.0/16 privat
    (a === 192 && b === 0) || //             192.0.0.0/24  IETF-Protokollzuweisungen
    a >= 224 //                              Multicast und reserviert
  )
}

function isBlockedIPv6(ip: string): boolean {
  const v = ip.toLowerCase().split("%")[0]
  if (v === "::" || v === "::1") return true // unspezifiziert / Loopback
  // IPv4-gemappt (::ffff:127.0.0.1) über die IPv4-Regeln prüfen.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
  if (mapped) return isBlockedIPv4(mapped[1])
  return (
    v.startsWith("fc") || //  fc00::/7  Unique Local
    v.startsWith("fd") ||
    v.startsWith("fe8") || // fe80::/10 Link-Local
    v.startsWith("fe9") ||
    v.startsWith("fea") ||
    v.startsWith("feb") ||
    v.startsWith("ff") //     ff00::/8  Multicast
  )
}

export interface UrlCheck {
  ok: boolean
  reason?: string
  url?: URL
}

/** Adresse auf Schema und öffentlich erreichbares Ziel prüfen. */
export async function checkPublicUrl(raw: string): Promise<UrlCheck> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: "keine gültige Adresse" }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `Schema ${url.protocol} nicht erlaubt` }
  }
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "interner Hostname" }
  }
  try {
    // `all: true` — ein Host kann mehrere Adressen führen; eine einzige
    // interne darunter genügt zum Ablehnen.
    const addresses = await lookup(host, { all: true })
    if (!addresses.length) return { ok: false, reason: "Hostname nicht auflösbar" }
    for (const { address, family } of addresses) {
      const blocked = family === 6 ? isBlockedIPv6(address) : isBlockedIPv4(address)
      if (blocked) return { ok: false, reason: "Ziel liegt im internen Netz" }
    }
  } catch {
    return { ok: false, reason: "Hostname nicht auflösbar" }
  }
  return { ok: true, url }
}

export interface SafeFetchOptions {
  timeoutMs?: number
  maxRedirects?: number
  /** Obergrenze der gelesenen Antwort in Zeichen. */
  maxChars?: number
}

export interface SafeFetchResult {
  ok: boolean
  reason?: string
  status?: number
  finalUrl?: string
  body?: string
}

/**
 * Öffentliche Seite abrufen. Weiterleitungen werden einzeln aufgelöst und
 * jedes Ziel erneut geprüft — sonst führte eine harmlose Adresse per 302
 * geradewegs auf den Metadaten-Dienst.
 */
export async function safeFetchText(
  raw: string,
  { timeoutMs = 9000, maxRedirects = 3, maxChars = 400_000 }: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  let current = raw
  const deadline = Date.now() + timeoutMs

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = await checkPublicUrl(current)
    if (!check.ok || !check.url) return { ok: false, reason: check.reason }

    const remaining = deadline - Date.now()
    if (remaining <= 0) return { ok: false, reason: "Zeitüberschreitung" }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), remaining)
    let res: Response
    try {
      res = await fetch(check.url, {
        signal: ctrl.signal,
        headers: { "user-agent": "Mozilla/5.0 DynaamiqOS-Bot", accept: "text/html" },
        redirect: "manual",
      })
    } catch {
      return { ok: false, reason: "Seite nicht erreichbar" }
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) return { ok: false, reason: "Weiterleitung ohne Ziel" }
      current = new URL(location, check.url).toString()
      continue
    }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, status: res.status }

    // Nur Text lesen — ein 200 MB großes Video würde den Prozess sonst füllen.
    const type = res.headers.get("content-type") ?? ""
    if (type && !/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      return { ok: false, reason: `Inhaltstyp ${type.split(";")[0]} wird nicht ausgewertet` }
    }
    const text = await res.text()
    return {
      ok: true,
      status: res.status,
      finalUrl: check.url.toString(),
      body: text.slice(0, maxChars),
    }
  }
  return { ok: false, reason: "zu viele Weiterleitungen" }
}
