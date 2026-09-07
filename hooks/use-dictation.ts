"use client"

import * as React from "react"

/**
 * Diktat über die Spracherkennung des Browsers (Chrome, Edge, Safari).
 *
 * ACHTUNG, häufiges Missverständnis: „im Browser" heißt NICHT „ohne Server".
 * Chrome und Edge übertragen das Mikrofonsignal zur Umwandlung in Text an
 * Google beziehungsweise Microsoft; nur Safari erkennt teilweise auf dem
 * Gerät. Wer dem Gesprächspartner sagt, es werde nichts übertragen, sagt
 * damit die Unwahrheit. Der Hinweistext an der Aufnahme muss das benennen.
 *
 * Was stimmt: Wir speichern keine Tonaufnahme und laden keine hoch — es bleibt
 * nur der erkannte Text. Kann der Browser es nicht, bleibt `supported` false;
 * das Feld lässt sich dann weiterhin tippen.
 */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [i: number]: { isFinal: boolean; 0: { transcript: string } }
  }
}

export function useDictation({
  onText,
  lang = "de-DE",
  continuous = false,
}: {
  /** Erkannter Satz — wird angehängt, nicht ersetzt. */
  onText: (text: string) => void
  lang?: string
  /**
   * Durchlaufende Mitschrift statt Kurzdiktat.
   *
   * Die Spracherkennung des Browsers beendet sich nach einigen Sekunden
   * Stille von selbst — für einen Zuruf ist das richtig, für ein
   * vierzigminütiges Verkaufsgespräch nicht: dort wäre die Aufnahme nach der
   * ersten Denkpause des Kunden zu Ende, ohne dass es jemand merkt. Mit
   * `continuous` wird sie so lange neu gestartet, bis von Hand gestoppt wird.
   */
  continuous?: boolean
}) {
  const [listening, setListening] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const recRef = React.useRef<SpeechRecognitionLike | null>(null)
  /** Vom Nutzer gewollter Zustand — überlebt das automatische Ende. */
  const wantRef = React.useRef(false)
  // Als Ref, damit der Neustart-Handler nicht an den Wert beim Aufbau der
  // Erkennung gebunden ist.
  const continuousRef = React.useRef(continuous)
  /**
   * Fehlversuche in Folge. Ohne Zähler dreht sich bei einem dauerhaften Fehler
   * — Mikrofon belegt, Verbindung weg — die Kette Fehler → Ende → Start
   * endlos, während die Uhr weiterläuft und nie Text erscheint.
   */
  const failsRef = React.useRef(0)
  const restartRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    continuousRef.current = continuous
  }, [continuous])
  // Der Callback darf sich ändern, ohne die laufende Erkennung neu zu starten.
  const cb = React.useRef(onText)
  React.useEffect(() => {
    cb.current = onText
  }, [onText])

  // Ob der Browser Spracherkennung kann, steht beim ersten Rendern fest —
  // als Zustand mit Initialwert statt als Zuweisung in einem Effekt, sonst
  // rendert die Leiste einmal ohne Mikrofonknopf und schiebt ihn nach.
  const [supported] = React.useState(
    () =>
      typeof window !== "undefined" &&
      !!(
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition
      ),
  )

  React.useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let text = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript
      }
      if (text.trim()) {
        failsRef.current = 0
        cb.current(text.trim())
      }
    }
    rec.onerror = (e) => {
      // „no-speech" und „aborted" sind der Normalfall einer langen Aufnahme,
      // keine Störung — sie dürfen die Mitschrift nicht mit einer Fehlermeldung
      // überschreiben. Fehlt dagegen die Freigabe, hilft nur ein Hinweis.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false
        setError("Mikrofon nicht freigegeben.")
        setListening(false)
        return
      }
      // „no-speech" ist bei einer langen Mitschrift der Normalfall und darf
      // keine Fehlermeldung auslösen; alles andere zählt als Fehlversuch.
      if (e.error !== "no-speech") failsRef.current += 1
      if (!continuousRef.current) {
        setError("Spracherkennung unterbrochen.")
        setListening(false)
      }
    }
    rec.onend = () => {
      if (continuousRef.current && wantRef.current && failsRef.current < 3) {
        // Neu starten, statt still zu enden — mit kurzer Pause, sonst rotiert
        // die Schleife bei einem sofort wiederkehrenden Fehler mit voller
        // Taktrate.
        restartRef.current = setTimeout(() => {
          if (!wantRef.current) return
          try {
            rec.start()
          } catch {
            /* läuft noch — das nächste onend versucht es erneut */
          }
        }, 300)
        return
      }
      if (failsRef.current >= 3) {
        wantRef.current = false
        setError("Spracherkennung bricht wiederholt ab. Mikrofon prüfen und neu starten.")
      }
      setListening(false)
    }
    recRef.current = rec
    return () => {
      wantRef.current = false
      if (restartRef.current) clearTimeout(restartRef.current)
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.stop()
      } catch {
        /* war nie gestartet */
      }
    }
  }, [lang])

  const toggle = React.useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    setError(null)
    if (listening) {
      wantRef.current = false
      rec.stop()
      setListening(false)
      return
    }
    wantRef.current = true
    failsRef.current = 0
    try {
      rec.start()
      setListening(true)
    } catch {
      /* doppelter Start — läuft bereits */
    }
  }, [listening])

  return { listening, supported, error, toggle }
}
