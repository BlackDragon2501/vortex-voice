// Vórtex Voice - transcripción de voz en tiempo real (SpeechRecognition API).
// 100% local: el audio se procesa en el navegador. Nada se sube a ningun servidor.

// URL del portal de Vórtex Notes donde se envia el texto transcrito.
// El texto viaja en el fragmento (#import=...) y nunca toca un servidor:
// los fragmentos no se envian por HTTP, solo los lee la propia pagina Notes.
export const NOTES_URL = 'https://vortex-notes-two.vercel.app'

export interface VoiceSession {
  title: string
  text: string
  words: number
  seconds: number
  lang: string
  finishedAt: number
}

export interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResultLike {
  readonly length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

export interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    readonly length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export const LANGS = [
  { value: 'es-419', label: 'Español (Latinoamérica)' },
  { value: 'es-NI', label: 'Español (Nicaragua)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'en-US', label: 'English (US)' },
]

// Codifica un texto a base64url seguro para URLs (soporta acentos y emojis).
export function encodeImport(title: string, text: string, source: string): string {
  const payload = JSON.stringify({ t: title, x: text, s: source })
  const bytes = new TextEncoder().encode(payload)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function notesImportUrl(title: string, text: string, source: string): string {
  return `${NOTES_URL}#import=${encodeImport(title, text, source)}`
}

// Formatea segundos a mm:ss
export function fmtTime(total: number): string {
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function countWords(t: string): number {
  const clean = t.trim()
  return clean ? clean.split(/\s+/).length : 0
}

export function sessionFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `vortex-voice-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`
}

// Texto plano de la sesion para descargar como .txt
export function sessionToTxt(title: string, text: string, seconds: number, lang: string): string {
  const d = new Date()
  const fecha = d.toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hora = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  return [
    'Vórtex Voice · Transcripción de voz',
    'Derechos Reservados © 2026 Vortex Company',
    `Fecha: ${fecha} · ${hora}`,
    `Idioma: ${lang} · Duración: ${fmtTime(seconds)}`,
    `Título: ${title}`,
    '',
    '----------------------------------------',
    '',
    text.trim(),
    '',
    '----------------------------------------',
    '',
    'Generado localmente en el navegador · Gratis · Sin anuncios',
  ].join('\n')
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
