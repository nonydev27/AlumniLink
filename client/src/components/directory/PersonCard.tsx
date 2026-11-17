import { Link } from 'react-router'
import type { User } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { ConnectActions } from '../network/ConnectActions'

export function MentoringStatus({ user }: { user: User }) {
  if (user.role !== 'alumni') return null
  return (
    <p className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.mentoring ? 'text-emerald-800' : 'text-slate-600'}`}>
      <span className={`h-2 w-2 rounded-full ${user.mentoring ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
      {user.mentoring ? 'Open to mentoring' : 'Not mentoring right now'}
    </p>
  )
}

export function PersonCard({ user }: { user: User }) {
  const showCompany = user.privacy.showCompany && user.company
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} color={user.avatarColor} />
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">
            <Link to={`/people/${user.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">{user.name}</Link>
          </h3>
          <p className="text-sm text-slate-700">{user.jobTitle ? `${user.jobTitle}${showCompany ? ` at ${user.company}` : ''}` : user.headline}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {user.role === 'student' ? 'Student' : 'Alumnus'} · {user.programme} · {user.role === 'student' ? `Graduating ${user.gradYear}` : `Class of ${user.gradYear}`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
        {user.industry && <span className="inline-flex items-center gap-1"><Icon name="building" className="h-3.5 w-3.5 text-slate-500" />{user.industry}</span>}
        {user.location && <span className="inline-flex items-center gap-1"><Icon name="mapPin" className="h-3.5 w-3.5 text-slate-500" />{user.location}</span>}
      </div>

      {user.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
          {user.skills.slice(0, 4).map((s) => (
            <li key={s} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{s}</li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="mb-3"><MentoringStatus user={user} /></div>
        <ConnectActions other={user} showViewProfile />
      </div>
    </article>
  )
}
