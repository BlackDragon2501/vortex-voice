'use client'

// Vortex Voice - Grabacion de voz con transcripcion en tiempo real.
// Usa la SpeechRecognition API del navegador (Chrome, Edge, Samsung Internet).
// El audio se procesa en el propio navegador: nada se sube a ningun servidor.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic,
  Square,
  Circle,
  Pause,
  Play,
  Eraser,
  FileDown,
  Copy,
  Check,
  NotebookPen,
  AlertTriangle,
} from 'lucide-react'
import {
  SpeechRecognitionLike,
  getRecognitionCtor,
  LANGS,
  fmtTime,
  countWords,
  sessionFileName,
  sessionToTxt,
  downloadText,
  notesImportUrl,
} from '@/lib/voice'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#8b5cf6" strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#a78bfa" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Voice · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#a78bfa] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

type State = 'idle' | 'rec' | 'paused'

export default function VoiceApp() {
  const [supported, setSupported] = useState(true)
  const [state, setState] = useState<State>('idle')
  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [lang, setLang] = useState('es-419')
  const [autoPunct, setAutoPunct] = useState(true)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const wantRunning = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
  }, [])

  // cronometro
  useEffect(() => {
    if (state === 'rec') {
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state])

  // limpieza al desmontar
  useEffect(
    () => () => {
      wantRunning.current = false
      try {
        recRef.current?.abort()
      } catch {}
    },
    []
  )

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    setError(null)
    try {
      const rec = new Ctor()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1

      rec.onresult = (e: any) => {
        let interimBuf = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          const alt = r[0]?.transcript || ''
          if (r.isFinal) {
            const clean = autoPunct
              ? alt
                  .replace(/\s+([.,;:!?])/g, '$1')
                  .replace(/^([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1])/, (m: string) => m.toUpperCase())
              : alt
            setFinalText((prev) => (prev ? prev.trimEnd() + ' ' + clean.trim() : clean.trim()))
          } else {
            interimBuf += alt
          }
        }
        setInterim(interimBuf)
      }

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setError('Permiso de micrófono denegado. Actívalo en el navegador y vuelve a intentarlo.')
          wantRunning.current = false
          setState('idle')
        } else if (e.error === 'no-speech') {
          // silencio: no es fatal, onend reinicia
        } else if (e.error === 'network') {
          setError('Error de red del servicio de voz del navegador. Revisa tu conexión.')
        }
      }

      // Chrome corta la escucha tras un silencio largo: reiniciamos mientras el usuario quiera grabar
      rec.onend = () => {
        if (wantRunning.current) {
          try {
            rec.start()
          } catch {
            /* ya iniciado */
          }
        } else {
          setInterim('')
          setState('idle')
        }
      }

      recRef.current = rec
      wantRunning.current = true
      rec.start()
      setState('rec')
    } catch {
      setError('No se pudo iniciar el reconocimiento de voz.')
      setState('idle')
    }
  }, [lang, autoPunct])

  const pause = useCallback(() => {
    wantRunning.current = false
    try {
      recRef.current?.stop()
    } catch {}
    setState('paused')
    setInterim('')
  }, [])

  const stop = useCallback(() => {
    wantRunning.current = false
    try {
      recRef.current?.stop()
    } catch {}
    setInterim('')
    setState('idle')
  }, [])

  const clear = useCallback(() => {
    setFinalText('')
    setInterim('')
    setSeconds(0)
    setTitle('')
  }, [])

  const text = (finalText + (interim ? ' ' + interim : '')).trim()
  const words = countWords(finalText)
  const effectiveTitle = title.trim() || 'Transcripción de voz'

  const saveTxt = () => {
    if (!finalText.trim()) return
    downloadText(sessionFileName(), sessionToTxt(effectiveTitle, finalText, seconds, lang))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(finalText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('No se pudo copiar al portapapeles.')
    }
  }

  const sendToNotes = () => {
    if (!finalText.trim()) return
    const url = notesImportUrl(effectiveTitle, finalText, 'voz')
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent(true)
    window.setTimeout(() => setSent(false), 2500)
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0f0f10] text-[#ececf1]">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-4 sm:px-6 h-12 flex items-center gap-2.5 shrink-0">
        <VortexLogo className="w-6 h-6" />
        <span className="text-sm font-semibold tracking-wide">
          <span className="text-[#a78bfa]">Vórtex</span> Voice
        </span>
        <span className="text-[11px] text-[#9b9ba4] hidden sm:inline">· Voz a texto en tiempo real</span>
        <span className="ml-auto text-[11px] text-[#9b9ba4] hidden md:inline">Gratis · Sin anuncios · 100% local</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {!supported && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-amber-200">
              Tu navegador no incluye reconocimiento de voz. Vórtex Voice funciona en{' '}
              <strong>Google Chrome, Microsoft Edge, Brave o Samsung Internet</strong> (PC y Android). En el resto de
              navegadores aún no está disponible esta tecnología.
            </p>
          </div>
        )}

        <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-4">
          {/* controles principales */}
          <div className="flex flex-wrap items-center gap-2">
            {state === 'idle' ? (
              <button className="inline-flex items-center gap-2 rounded-full bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a78bfa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors" onClick={start} disabled={!supported}>
                <Mic className="w-5 h-5" aria-hidden /> Grabar
              </button>
            ) : state === 'rec' ? (
              <button className="inline-flex items-center gap-2 rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8b5cf6] transition-colors animate-pulse" onClick={pause}>
                <Pause className="w-5 h-5" aria-hidden /> Pausar
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 rounded-full bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a78bfa] transition-colors" onClick={start}>
                <Play className="w-5 h-5" aria-hidden /> Continuar
              </button>
            )}
            {state !== 'idle' && (
              <button className="inline-flex items-center gap-2 rounded-full border border-[#2b2b31] bg-[#1e1e22] px-5 py-3 text-sm font-semibold text-[#ececf1] hover:bg-[#26262b] transition-colors" onClick={stop}>
                <Square className="w-4 h-4" aria-hidden /> Detener
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Circle className={'w-3 h-3 ' + (state === 'rec' ? 'text-red-500 animate-pulse fill-red-500' : 'text-[#9b9ba4]')} aria-hidden />
              <span className="text-sm font-mono text-[#ececf1]">{fmtTime(seconds)}</span>
              <span className="text-xs text-[#9b9ba4]">· {words} palabras</span>
            </div>
          </div>

          {/* ajustes */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-[#9b9ba4]">
              Idioma:
              <select
                className="rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-xs text-[#ececf1] disabled:opacity-50"
                value={lang}
                disabled={state !== 'idle'}
                onChange={(e) => setLang(e.target.value)}
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[#9b9ba4] cursor-pointer">
              <input type="checkbox" className="accent-[#8b5cf6]" checked={autoPunct} onChange={(e) => setAutoPunct(e.target.checked)} />
              Pulir mayúsculas y signos al dictar
            </label>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* transcripcion */}
          <div className="rounded-lg border border-[#2b2b31] bg-[#121214] p-4 min-h-[220px] max-h-[420px] overflow-y-auto">
            {finalText || interim ? (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {finalText}
                {interim && <span className="text-[#9b9ba4] italic"> {interim}</span>}
              </p>
            ) : (
              <p className="text-sm text-[#9b9ba4]">
                Pulsa <strong className="text-[#a78bfa]">Grabar</strong>, concede el permiso del micrófono y habla. La
                transcripción aparece aquí en tiempo real, palabra por palabra.
              </p>
            )}
          </div>
        </section>

        {/* guardar / enviar */}
        <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Título de la transcripción (opcional)"
              className="flex-1 min-w-[200px] rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs text-[#ececf1] placeholder:text-[#6b6b74] outline-none focus:border-[#8b5cf6]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button className={btn} onClick={saveTxt} disabled={!finalText.trim()}>
              <FileDown className="w-4 h-4" aria-hidden /> Guardar en .txt
            </button>
            <button className={btn} onClick={copy} disabled={!finalText.trim()}>
              <Copy className="w-4 h-4" aria-hidden /> {copied ? 'Copiado' : 'Copiar texto'}
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#8b5cf6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a78bfa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={sendToNotes}
              disabled={!finalText.trim()}
            >
              <NotebookPen className="w-4 h-4" aria-hidden /> Enviar a Vórtex Notes
            </button>
            <button className={btn} onClick={clear} disabled={!finalText.trim() && seconds === 0}>
              <Eraser className="w-4 h-4" aria-hidden /> Limpiar
            </button>
          </div>
          {sent && (
            <p className="text-xs text-[#a78bfa]">
              Abierto Vórtex Notes en una pestaña nueva: el texto llega como nota nueva lista para guardar.
            </p>
          )}
          <p className="text-[11px] text-[#9b9ba4]">
            «Enviar a Vórtex Notes» abre la app con el texto ya incorporado. El viaje es directo entre tu navegador y
            Notes: ningún servidor intermedio.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
