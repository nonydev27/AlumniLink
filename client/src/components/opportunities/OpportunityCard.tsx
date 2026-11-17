import { useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../lib/store'
import { formatDate, timeAgo } from '../../lib/format'
import type { Opportunity } from '../../types'
import { Badge } from '../ui/Badge'
import { typeMeta } from './typeMeta'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ReportDialog } from '../ui/ReportDialog'


export function OpportunityCard({ opp, reasons }: { opp: Opportunity; reasons?: string[] }) {
  const { me, db, myState, toggleSaveOpportunity, deleteOpportunity } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const poster = db.users.find((u) => u.id === opp.postedById)
  const saved = myState.savedOpportunities.includes(opp.id)
  const meta = typeMeta[opp.type]
  const mine = me?.id === opp.postedById || me?.role === 'admin'

  return (
    <article aria-labelledby={`opp-${opp.id}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
        <button
          type="button"
          onClick={() => toggleSaveOpportunity(opp.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${opp.title} from saved` : `Save ${opp.title}`}
          className={`-m-2 inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600 ${saved ? 'text-brand-700' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
        </button>
      </div>

      <h3 id={`opp-${opp.id}`} className="mt-3 font-bold leading-snug text-slate-900">{opp.title}</h3>
      <p className="mt-1 text-sm text-slate-700">{opp.organisation}</p>
      <dl className="mt-2 space-y-1 text-sm text-slate-700">
        <div className="flex items-center gap-1.5"><dt className="sr-only">Location</dt><Icon name="mapPin" className="h-4 w-4 text-slate-500" /><dd>{opp.location} · {opp.mode}</dd></div>
        {opp.date && <div className="flex items-center gap-1.5"><dt className="sr-only">{meta.dateLabel}</dt><Icon name="calendar" className="h-4 w-4 text-slate-500" /><dd>{meta.dateLabel} {formatDate(opp.date)}</dd></div>}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{opp.description}</p>
      {opp.accessibilityNote && (
        <p className="mt-2 flex gap-1.5 text-sm text-slate-700"><Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />{opp.accessibilityNote}</p>
      )}

      {reasons && reasons.length > 0 && (
        <p className="mt-3 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-900 ring-1 ring-brand-100">
          <span className="font-semibold">Why suggested: </span>{reasons.join(' ')}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <span>
          Posted by{' '}
          {poster ? <Link to={`/people/${poster.id}`} className="font-semibold text-slate-800 hover:underline">{poster.name}</Link> : 'a former member'}
          {' · '}{timeAgo(opp.postedAt)}
        </span>
        <span className="flex gap-1">
          {mine ? (
            <Button variant="danger-subtle" size="sm" onClick={() => setConfirm(true)}><Icon name="trash" className="h-3.5 w-3.5" />Delete</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="text-slate-600"><Icon name="flag" className="h-3.5 w-3.5" />Report</Button>
          )}
        </span>
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => deleteOpportunity(opp.id)} title="Delete this post?" body={`“${opp.title}” will be removed from the opportunity board for everyone.`} confirmLabel="Delete post" />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="opportunity" targetId={opp.id} what="this post" />
    </article>
  )
}
