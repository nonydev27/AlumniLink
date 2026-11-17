import { useState } from 'react'
import { coachMessage } from '../../lib/ai'
import type { User } from '../../types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { AIBadge } from './AIBadge'
import { AIFeedback } from './AIFeedback'

/**
 * Message coaching. Only appears when the user asks for it, so it never
 * interrupts someone who is mid-way through writing.
 */
export function MessageCoach({ draft, recipient, sender, onUseExample }: { draft: string; recipient: User; sender: User; onUseExample: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-brand-700">
        <Icon name="sparkles" className="h-4 w-4" /> Get writing tips
      </Button>
    )
  }
  const { tips, example } = coachMessage(draft, recipient, sender)
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <AIBadge label="AI writing tips" />
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Hide</Button>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {tips.map((t) => (
          <li key={t.text} className="flex gap-2">
            <Icon name={t.ok ? 'check' : 'info'} className={`mt-0.5 h-4 w-4 shrink-0 ${t.ok ? 'text-emerald-700' : 'text-amber-700'}`} />
            <span className={t.ok ? 'text-slate-600' : 'text-slate-900'}>
              <span className="sr-only">{t.ok ? 'Done: ' : 'Suggestion: '}</span>
              {t.text}
            </span>
          </li>
        ))}
      </ul>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand-700">See an example message</summary>
        <p className="mt-1 whitespace-pre-line rounded-lg bg-white p-3 text-sm text-slate-800 ring-1 ring-slate-200">{example}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => onUseExample(example)}>Use this as a starting point</Button>
      </details>
      <div className="mt-2"><AIFeedback feedbackKey="message-coach" /></div>
    </div>
  )
}
