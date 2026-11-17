import { useState } from 'react'
import { Icon } from './Icon'
import { cx } from '../../lib/format'

/* Minimal typing for the Web Speech API (not in lib.dom for all browsers). */
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SRCtor = new () => SpeechRecognitionLike

function getRecognition(): SRCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** Voice input for search and messages. Hidden when the browser has no speech support. */
export function VoiceInputButton({ onText, label = 'Speak instead of typing', className }: { onText: (t: string) => void; label?: string; className?: string }) {
  const [listening, setListening] = useState(false)
  const SR = typeof window !== 'undefined' ? getRecognition() : undefined
  if (!SR) return null

  const start = () => {
    const rec = new SR()
    rec.lang = 'en-GB'
    rec.interimResults = false
    rec.onresult = (e) => onText(e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    setListening(true)
    rec.start()
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={listening ? 'Listening…' : label}
      aria-pressed={listening}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-brand-600',
        listening ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100',
        className,
      )}
    >
      <Icon name="mic" />
    </button>
  )
}
