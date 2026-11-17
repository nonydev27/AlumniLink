import React, { useState } from 'react'
import { Icon } from '../ui/Icon'

type Status = 'idle' | 'requested' | 'dismissed'

/** Demo of the AI mentor-match card: labelled as AI, explains why, keeps the user in control. */
export const AISuggestionCard: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle')
  const [showWhy, setShowWhy] = useState(false)
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)

  if (status === 'dismissed') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" role="status">
        <p className="text-sm text-slate-700">
          Got it, we won't suggest this mentor again. Your feedback helps improve future matches.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-3 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          Undo
        </button>
      </div>
    )
  }

  return (
    <article
      aria-labelledby="ai-card-title"
      className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          AI suggestion
        </span>
        <span className="text-xs text-slate-600">Mentor match</span>
      </div>

      <div className="mt-4 flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800"
          aria-hidden="true"
        >
          KM
        </div>
        <div className="min-w-0">
          <h3 id="ai-card-title" className="font-bold text-slate-900">
            Dr. Kwame Mensah
          </h3>
          <p className="text-sm text-slate-700">Head of Data Analytics · Class of 2012</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
            <Icon name="check" className="h-3.5 w-3.5" />
            Verified alumnus · Open to mentoring
          </p>
        </div>
      </div>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-slate-800">
        Dr. Mensah <strong className="font-semibold">may be a good mentor</strong> for you.
      </p>

      {showWhy && (
        <div id="why-match" className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Why this match?</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />You study Computer Science; he works in data analytics.</li>
            <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />You both listed machine learning as an interest.</li>
          </ul>
          <p className="mt-2 text-xs text-slate-600">Based on your profile and interests only. Contact details stay private until he accepts.</p>
        </div>
      )}

      {status === 'requested' ? (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
          <Icon name="check" className="h-4 w-4" />
          Request sent. He'll be able to reply when he's ready.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStatus('requested')}
            className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Request mentorship
          </button>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            aria-controls="why-match"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            {showWhy ? 'Hide reason' : 'Why this match?'}
          </button>
          <button
            type="button"
            onClick={() => setStatus('dismissed')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            Not for me
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
        {feedback ? (
          <span role="status">Thanks for the feedback.</span>
        ) : (
          <>
            <span>Was this helpful?</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => setFeedback('yes')} aria-label="Yes, helpful" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600">
                <Icon name="thumbUp" className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setFeedback('no')} aria-label="No, not helpful" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600">
                <Icon name="thumbDown" className="h-4 w-4" />
              </button>
            </span>
          </>
        )}
      </div>
    </article>
  )
}
