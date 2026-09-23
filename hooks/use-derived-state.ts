"use client"

import * as React from "react"

/**
 * Zustand ableiten, statt ihn im Effekt nachzuschieben.
 *
 * Ein Effekt, der `setState` aufruft, rendert zweimal: einmal mit dem alten
 * Wert, der kurz sichtbar wird, und einmal mit dem richtigen. Bei einem Dialog
 * heißt das ein Aufblitzen des leeren Formulars, bei einer Liste ein Sprung.
 * React sieht dafür das Anpassen während des Renderns vor — der Durchlauf wird
 * verworfen, bevor irgendetwas auf den Schirm kommt.
 *
 * Beide Helfer rufen `run`/`onChange` mitten im Rendern auf. Darin darf nur
 * der Zustand der eigenen Komponente gesetzt werden, nichts anderes: kein
 * Netzwerkaufruf, kein `router.push`, kein Schreiben in den Speicher.
 */

/**
 * Führt `run` genau einmal aus, sobald `value` erstmals gesetzt ist.
 *
 * Für Deep-Links gedacht (`/invoices?doc=…`): Der Wert steht beim Hydrieren
 * noch nicht fest und kommt einen Durchlauf später — genau dann soll der
 * Dialog auf, und danach nie wieder, auch wenn der Nutzer ihn zuklappt.
 */
export function useOnceWhen(value: string | boolean | null | undefined, run: () => void) {
  const [handled, setHandled] = React.useState<string | boolean | null>(null)
  if (value && value !== handled) {
    setHandled(value)
    run()
  }
}

/**
 * Führt `onChange` aus, sobald sich `value` gegenüber dem letzten Durchlauf
 * geändert hat — zum Zurücksetzen abhängiger Felder (Suchfeld leeren, wenn ein
 * Dialog schließt; Auswahl auf den ersten Treffer, wenn die Suche sich ändert).
 */
export function useOnChange<T>(value: T, onChange: (previous: T) => void) {
  const [previous, setPrevious] = React.useState(value)
  if (!Object.is(value, previous)) {
    setPrevious(value)
    onChange(previous)
  }
}
