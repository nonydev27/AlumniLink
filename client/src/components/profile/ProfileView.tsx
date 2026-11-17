import { useState } from 'react'
import { Link } from 'react-router'
import { isConnected, useStore } from '../../lib/store'
import type { User } from '../../types'
import { Avatar } from '../ui/Avatar'
import { VerifiedBadge } from '../ui/Badge'
import { Button, ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ReportDialog } from '../ui/ReportDialog'
import { useToast } from '../ui/Toast'
import { MentoringStatus } from '../directory/PersonCard'
import { ConnectActions } from '../network/ConnectActions'

function TagList({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return <p className="text-sm text-slate-600">None added yet.</p>
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {items.map((s) => <li key={s} className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-800">{s}</li>)}
    </ul>
  )
}

export function ProfileView({ user }: { user: User }) {
  const { me, db, myState, toggleBlock } = useStore()
  const toast = useToast()
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const isMe = me?.id === user.id
  const connected = !!me && isConnected(db.connections, me.id, user.id)
  const blocked = myState.blocked.includes(user.id)
  const showEmail = isMe || (connected && user.privacy.showEmailToConnections)
  const showCompany = isMe || user.privacy.showCompany

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card className="p-0 sm:p-0">
          <div className="h-24 rounded-t-2xl bg-gradient-to-r from-brand-700 to-brand-900 sm:h-28" aria-hidden="true" />
          <div className="px-5 pb-6 sm:px-6">
            <Avatar name={user.name} color={user.avatarColor} size="xl" className="-mt-12 ring-4 ring-white" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{user.name}</h1>
              <VerifiedBadge status={user.verification} />
            </div>
            <p className="mt-1 text-slate-800">{user.headline}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{user.role === 'student' ? 'Student' : user.role === 'alumni' ? 'Alumnus' : 'Administrator'} · {user.programme}</span>
              {user.role !== 'admin' && (
                <Link to={`/batches/${user.gradYear}`} className="font-medium text-brand-700 hover:underline">
                  {user.role === 'student' ? `Graduating ${user.gradYear}` : `Class of ${user.gradYear}`}
                </Link>
              )}
              {user.location && <span className="inline-flex items-center gap-1"><Icon name="mapPin" className="h-4 w-4" />{user.location}</span>}
            </p>
            <div className="mt-3"><MentoringStatus user={user} /></div>
            <div className="mt-5 max-w-md">
              {isMe ? <ButtonLink to="/profile/edit" size="lg"><Icon name="edit" className="h-4 w-4" />Edit profile</ButtonLink> : <ConnectActions other={user} />}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">About</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-800">{user.bio || (isMe ? 'Add a short bio so people know what you would like to talk about.' : 'No bio yet.')}</p>
        </Card>

        {(user.jobTitle || user.industry) && (
          <Card>
            <h2 className="text-lg font-bold text-slate-900">Current work</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              {user.jobTitle && <div><dt className="text-sm text-slate-600">Role</dt><dd className="font-semibold text-slate-900">{user.jobTitle}</dd></div>}
              {showCompany && user.company && <div><dt className="text-sm text-slate-600">Company</dt><dd className="font-semibold text-slate-900">{user.company}</dd></div>}
              {user.industry && <div><dt className="text-sm text-slate-600">Industry</dt><dd className="font-semibold text-slate-900">{user.industry}</dd></div>}
            </dl>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-bold text-slate-900">Skills</h2>
          <div className="mt-3"><TagList items={user.skills} label="Skills" /></div>
          <h2 className="mt-6 text-lg font-bold text-slate-900">Interests</h2>
          <div className="mt-3"><TagList items={user.interests} label="Interests" /></div>
          {user.role === 'student' && (
            <>
              <h2 className="mt-6 text-lg font-bold text-slate-900">Career goals</h2>
              <p className="mt-2 text-slate-800">{user.careerGoals || 'Not added yet.'}</p>
            </>
          )}
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <h2 className="font-bold text-slate-900">Contact</h2>
          {showEmail ? (
            <a href={`mailto:${user.email}`} className="mt-2 inline-flex min-h-11 items-center gap-2 break-all text-brand-700 hover:underline">
              <Icon name="mail" className="h-4 w-4 shrink-0" />{user.email}
            </a>
          ) : (
            <p className="mt-2 flex gap-2 text-sm text-slate-700">
              <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              {connected ? `${user.name.split(' ')[0]} has chosen not to share contact details. You can still message them here.` : 'Contact details are only shared with connections, and only with consent.'}
            </p>
          )}
        </Card>

        {/* Destructive/safety actions: small and away from the primary actions. */}
        {!isMe && me && (
          <div className="flex flex-wrap gap-2 px-1">
            <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setReportOpen(true)}><Icon name="flag" className="h-4 w-4" />Report</Button>
            {blocked ? (
              <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => { toggleBlock(user.id); toast(`${user.name} has been unblocked.`) }}>Unblock</Button>
            ) : (
              <Button variant="danger-subtle" size="sm" onClick={() => setBlockOpen(true)}><Icon name="ban" className="h-4 w-4" />Block</Button>
            )}
          </div>
        )}
      </aside>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={user.id} what={user.name} />
      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={() => { toggleBlock(user.id); toast(`${user.name} has been blocked.`) }}
        title={`Block ${user.name}?`}
        body="They won't be able to message you, and you won't see them in suggestions. You can unblock them later from their profile."
        confirmLabel="Block"
      />
    </div>
  )
}
