import qrcode from "qrcode-generator"

/**
 * GiroCode — EPC-QR nach SCT-Spezifikation v002. Der Empfänger scannt ihn mit
 * seiner Banking-App und hat Betrag, IBAN und Verwendungszweck gesetzt, ohne
 * etwas abzutippen. Genau dieselben Felder in genau dieser Reihenfolge erzeugt
 * auch `tools/rechnung/rechnung.py`, damit Beleg und App denselben Code zeigen.
 */
export interface GirocodeInput {
  /** Kontoinhaber, max. 70 Zeichen */
  name: string
  /** IBAN, Leerzeichen werden entfernt */
  iban: string
  /** Betrag in Euro */
  amount: number
  /** Verwendungszweck, max. 140 Zeichen */
  reference: string
}

export function girocodePayload({ name, iban, amount, reference }: GirocodeInput): string {
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    name.slice(0, 70),
    iban.replace(/\s+/g, ""),
    `EUR${amount.toFixed(2)}`,
    "",
    "",
    reference.slice(0, 140),
    "",
  ].join("\n")
}

/**
 * Modul-Matrix des Codes (true = dunkel). Fehlerkorrektur M wie im Skript —
 * bei L wird der Code bei diesem Datenumfang zu grob für kleine Druckgrößen,
 * bei Q unnötig dicht.
 */
export function girocodeMatrix(input: GirocodeInput): boolean[][] {
  const qr = qrcode(0, "M")
  qr.addData(girocodePayload(input), "Byte")
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => qr.isDark(r, c)),
  )
}
