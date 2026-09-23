export const runtime = "nodejs"

/**
 * Kundenlogos über den eigenen Server holen, nicht aus dem Browser heraus.
 *
 * Die Kundenliste zog ihre Logos bisher unmittelbar von
 * `google.com/s2/favicons`. Damit ging bei jedem Öffnen der Kartei die
 * Domain jedes Kunden samt IP des Betrachters an Google — eine Übermittlung
 * an einen Dritten, die niemand erwartet und für die es keinen Grund gibt.
 * Über diese Route sieht Google nur noch den Server, und die Antwort wird
 * zwischengespeichert, statt bei jedem Seitenaufruf neu zu laden.
 *
 * Gleichzeitig verschwindet der Nebeneffekt, dass jede Firma ohne auffindbares
 * Logo eine 404-Meldung in die Browserkonsole schrieb.
 */

/** Wie lange eine Antwort (auch eine leere) gültig bleibt. */
const CACHE_SECONDS = 60 * 60 * 24 * 7

/**
 * Zulässige Domain: Buchstaben, Ziffern, Bindestrich, mindestens ein Punkt.
 * Die Domain wandert ausschließlich als Suchparameter in eine fest verdrahtete
 * Google-Adresse — trotzdem wird sie geprüft, damit nichts anderes als ein
 * Hostname dort landet.
 */
const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

/**
 * Durchsichtiges 1×1-PNG — die Antwort für „kein Logo gefunden".
 *
 * Naheliegender wäre 404 oder 204. Beides taugt hier nicht: 404 schreibt in
 * jedem Browser eine Fehlermeldung in die Konsole, und bei 204 löst ein
 * `<img>` weder `load` noch `error` aus — die Kachel bliebe leer stehen,
 * statt auf die Initialen zurückzufallen. Ein gültiges Bild von einem Pixel
 * lädt sauber; dass es ein Platzhalter ist, erkennt die Kachel an seiner
 * Größe (siehe `components/ui/customer-avatar.tsx`).
 */
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

function noLogo() {
  return new Response(new Uint8Array(BLANK_PNG), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
    },
  })
}

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.toLowerCase().trim()
  if (!domain || !DOMAIN_RE.test(domain)) return noLogo()

  try {
    const upstream = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(5000) },
    )
    const type = upstream.headers.get("content-type") ?? ""
    if (!upstream.ok || !type.startsWith("image/")) return noLogo()

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        // `immutable`: Ein Firmenlogo ändert sich nicht im Wochentakt, und ein
        // erneuter Aufruf je Kundenkachel wäre bei 200 Kunden spürbar.
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
      },
    })
  } catch {
    // Zeitüberschreitung oder kein Netz — die Initialen tun es auch.
    return noLogo()
  }
}
