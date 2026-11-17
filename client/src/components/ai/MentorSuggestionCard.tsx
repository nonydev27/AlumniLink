import { useState } from 'react'
import { Link } from 'react-router'
import type { MentorMatch } from '../../lib/ai'
import { connectionBetween, useStore } from '../../lib/store'
import { shortName } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { AIBadge } from './AIBadge'
import { AIFeedback } from './AIFeedback'
import { MentorshipRequestDialog } from '../network/MentorshipRequestDialog'

/**
 * AI mentor match. Labelled as AI, explains why, uses uncertain wording,
 * and leaves the user in control (request, dismiss, report).
 */
export function MentorSuggestionCard({ match }: { match: MentorMatch }) {
  const { me, db, myState, dismissMatch, report } = useStore()
  const [showWhy, setShowWhy] = useState(myState.settings.aiDetail === 'detailed')
  const [requestOpen, setRequestOpen] = useState(false)
  const [reported, setReported] = useState(false)
  const u = match.user
  const existing = me ? connectionBetween(db.connections, me.id, u.id) : undefined
  const whyId = `why-${u.id}`

  return (
    <article aria-labelledby={`match-${u.id}`} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <AIBadge />
        <span className="text-xs text-slate-600">Mentor match</span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <Avatar name={u.name} color={u.avatarColor} />
        <div className="min-w-0">
          <h3 id={`match-${u.id}`} className="font-bold text-slate-900">
            <Link to={`/people/${u.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">{u.name}</Link>
          </h3>
          <p className="text-sm text-slate-700">{u.jobTitle}{u.company ? ` at ${u.company}` : ''}</p>
          <p className="text-xs text-slate-600">{u.programme} · Class of {u.gradYear}</p>
        </div>
      </div>

      <p className="mt-4 text-slate-800">
        {shortName(u.name)} <strong className="font-semibold">may be a good mentor</strong> for you.
      </p>

      {showWhy && (
        <div id={whyId} className="mt-3 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Why this match?</p>
          <ul className="mt-1.5 space-y-1">
            {match.reasons.map((r) => (
              <li key={r} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />{r}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">Based only on your profile and interests.</p>
        </div>
      )}

      <div className="mt-auto pt-4">
        {existing ? (
          <p className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
            <Icon name="check" className="h-4 w-4" />
            {existing.status === 'accepted' ? 'Connected' : 'Request sent'}
          </p>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setRequestOpen(true)}>Request mentorship</Button>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy} aria-controls={whyId}>
            {showWhy ? 'Hide reason' : 'Why this match?'}
          </Button>
          <Button variant="secondary" onClick={() => dismissMatch(u.id)}>Not for me</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <AIFeedback feedbackKey={`match:${u.id}`} />
          {reported ? (
            <span role="status" className="text-xs text-slate-600">Reported. An admin will review it.</span>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs text-slate-600" onClick={() => { report('ai-match', u.id, 'User reported this AI match as unsuitable.'); setReported(true) }}>
              <Icon name="flag" className="h-3.5 w-3.5" /> Report match
            </Button>
          )}
        </div>
      </div>

      <MentorshipRequestDialog open={requestOpen} onClose={() => setRequestOpen(false)} recipient={u} kind="mentorship" />
    </article>
  )
}
