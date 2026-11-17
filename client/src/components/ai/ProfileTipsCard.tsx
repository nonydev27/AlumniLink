import { Link } from 'react-router'
import { profileCompleteness, profileTips } from '../../lib/ai'
import { useStore } from '../../lib/store'
import { Icon } from '../ui/Icon'
import { AIBadge } from './AIBadge'
import { AIFeedback } from './AIFeedback'

export function ProfileTipsCard() {
  const { me, myState } = useStore()
  if (!me) return null
  const pct = profileCompleteness(me)
  const tips = myState.settings.aiEnabled ? profileTips(me).slice(0, myState.settings.aiDetail === 'short' ? 1 : 3) : []

  return (
    <section aria-labelledby="profile-strength" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="profile-strength" className="font-bold text-slate-900">Profile strength</h2>
        <span className="text-sm font-semibold text-slate-800">{pct}%</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-labelledby="profile-strength">
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${pct}%` }} />
      </div>

      {tips.length > 0 ? (
        <div className="mt-4">
          <AIBadge label="AI tips" />
          <ul className="mt-3 space-y-2">
            {tips.map((t) => (
              <li key={t.id} className="flex gap-2 text-sm text-slate-800">
                <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                {t.text}
              </li>
            ))}
          </ul>
          <Link to="/profile/edit" className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">
            Edit profile <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
          <div className="mt-1"><AIFeedback feedbackKey="profile-tips" /></div>
        </div>
      ) : (
        pct === 100 && <p className="mt-3 text-sm text-slate-700">Your profile is complete. Nice work.</p>
      )}
    </section>
  )
}
