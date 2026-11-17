import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { formatDate, timeAgo } from '../lib/format'
import { useStore } from '../lib/store'
import type { Report } from '../types'

export default function AdminPage() {
  const { db, setVerification, setReportStatus, deleteOpportunity, deleteBatchPost } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<'verify' | 'reports'>('verify')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Report | null>(null)

  const pending = db.users.filter((u) => u.verification === 'pending')
  const openReports = db.reports.filter((r) => r.status === 'open')
  const stats = [
    { label: 'Verified alumni', value: db.users.filter((u) => u.role === 'alumni' && u.verification === 'verified').length },
    { label: 'Students', value: db.users.filter((u) => u.role === 'student').length },
    { label: 'Active mentorships', value: db.connections.filter((c) => c.kind === 'mentorship' && c.status === 'accepted').length },
    { label: 'Opportunities', value: db.opportunities.length },
  ]

  const describeTarget = (r: Report) => {
    if (r.targetType === 'opportunity') return { label: db.opportunities.find((o) => o.id === r.targetId)?.title ?? 'Deleted opportunity', link: '/opportunities' }
    if (r.targetType === 'post') {
      const p = db.batchPosts.find((x) => x.id === r.targetId)
      return { label: p ? `“${p.body.slice(0, 80)}${p.body.length > 80 ? '…' : ''}”` : 'Deleted post', link: p ? `/batches/${p.gradYear}` : undefined }
    }
    const u = db.users.find((x) => x.id === r.targetId)
    return { label: u?.name ?? 'Deleted user', link: u ? `/people/${u.id}` : undefined }
  }

  return (
    <>
      <PageHeader title="Admin" description="Verify alumni, review reports and keep the community safe." />

      <dl className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <dt className="text-sm text-slate-600">{s.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold text-slate-900">{s.value}</dd>
          </Card>
        ))}
      </dl>

      <Tabs label="Admin sections" value={tab} onChange={setTab} options={[{ value: 'verify', label: 'Verification queue', count: pending.length }, { value: 'reports', label: 'Reports', count: openReports.length }]} />

      <div className="mt-6">
        {tab === 'verify' ? (
          pending.length ? (
            <ul className="space-y-3">
              {pending.map((u) => (
                <li key={u.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex flex-1 items-start gap-3">
                      <Avatar name={u.name} color={u.avatarColor} />
                      <div>
                        <p className="font-bold text-slate-900">{u.name} <span className="font-normal text-slate-600">· {u.email}</span></p>
                        <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                          <div><dt className="text-xs text-slate-600">Role</dt><dd className="capitalize text-slate-900">{u.role}</dd></div>
                          <div><dt className="text-xs text-slate-600">Programme</dt><dd className="text-slate-900">{u.programme}</dd></div>
                          <div><dt className="text-xs text-slate-600">Graduated</dt><dd className="text-slate-900">{u.gradYear}</dd></div>
                          <div><dt className="text-xs text-slate-600">Signed up</dt><dd className="text-slate-900">{formatDate(u.joinedAt)}</dd></div>
                        </dl>
                        {u.indexNumber && <p className="mt-1 text-sm text-slate-700">Index number: <span className="font-mono">{u.indexNumber}</span></p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:w-72">
                      <Button onClick={() => { setVerification(u.id, 'verified'); toast(`${u.name} is now verified.`) }}>Approve</Button>
                      <Button variant="secondary" onClick={() => setRejecting(u.id)}>Reject</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="shield" title="All caught up" body="There are no accounts waiting for verification." />
          )
        ) : openReports.length ? (
          <ul className="space-y-3">
            {openReports.map((r) => {
              const target = describeTarget(r)
              const reporter = db.users.find((u) => u.id === r.reporterId)
              const removable = r.targetType === 'opportunity' || r.targetType === 'post'
              return (
                <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning" icon="flag">{r.targetType === 'ai-match' ? 'AI match' : r.targetType}</Badge>
                    <span className="text-xs text-slate-600">{timeAgo(r.createdAt)} · reported by {reporter?.name ?? 'a former member'}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{target.link ? <Link to={target.link} className="hover:underline">{target.label}</Link> : target.label}</p>
                  <p className="mt-1 text-sm text-slate-700">{r.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => { setReportStatus(r.id, 'dismissed'); toast('Report dismissed.') }}>Dismiss</Button>
                    <Button variant="secondary" onClick={() => { setReportStatus(r.id, 'resolved'); toast('Marked as resolved.') }}>Mark resolved</Button>
                    {removable && <Button variant="danger-subtle" onClick={() => setRemoving(r)}>Remove content</Button>}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon="flag" title="No open reports" body="Reports from members will appear here." />
        )}
      </div>

      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={() => { if (rejecting) { setVerification(rejecting, 'rejected'); toast('Verification rejected.') } }}
        title="Reject this verification?"
        body="The person will be asked to check their graduation details and try again."
        confirmLabel="Reject"
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          if (removing.targetType === 'opportunity') deleteOpportunity(removing.targetId)
          if (removing.targetType === 'post') deleteBatchPost(removing.targetId)
          setReportStatus(removing.id, 'resolved')
          toast('Content removed.')
        }}
        title="Remove this content?"
        body="It will be deleted for everyone and the report marked as resolved."
        confirmLabel="Remove"
      />
    </>
  )
}
