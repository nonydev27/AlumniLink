import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PersonCard } from '../components/directory/PersonCard'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { TextAreaField } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { ReportDialog } from '../components/ui/ReportDialog'
import { Tabs } from '../components/ui/Tabs'
import { timeAgo } from '../lib/format'
import { batchKey, useStore } from '../lib/store'

export default function BatchGroupPage() {
  const { me, db, myState, toggleJoinBatch, addBatchPost, deleteBatchPost } = useStore()
  const params = useParams()
  const year = Number(params.year)
  // Older links with no programme fall back to the viewer's own batch.
  const programme = params.programme ?? me?.programme ?? ''
  const [tab, setTab] = useState<'posts' | 'members'>('posts')
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [reporting, setReporting] = useState<string | null>(null)
  if (!me) return null

  const key = batchKey(year, programme)
  const label = `${year > new Date().getFullYear() ? `Graduating ${year}` : `Class of ${year}`} · ${programme}`
  const members = db.users.filter((u) => u.gradYear === year && u.programme === programme && u.role !== 'admin' && u.verification === 'verified' && !myState.blocked.includes(u.id))
  const posts = db.batchPosts.filter((p) => p.gradYear === year && (!p.programme || p.programme === programme) && !myState.blocked.includes(p.authorId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const isMine = me.gradYear === year && me.programme === programme && me.role !== 'admin'
  const joined = isMine || myState.joinedBatches.includes(key)
  const canPost = joined && me.verification === 'verified'

  return (
    <>
      <Link to="/batches" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900">
        <Icon name="arrowLeft" className="h-4 w-4" />All batch groups
      </Link>

      <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white"><Icon name="graduation" className="h-7 w-7" /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{label}</h1>
            <p className="text-sm text-slate-600">{members.length} verified {members.length === 1 ? 'member' : 'members'}</p>
          </div>
        </div>
        {!isMine && (
          <Button variant={joined ? 'secondary' : 'primary'} size="lg" onClick={() => toggleJoinBatch(key)} aria-pressed={joined}>
            {joined ? 'Leave group' : 'Join group'}
          </Button>
        )}
      </Card>

      <Tabs label="Group sections" value={tab} onChange={setTab} options={[{ value: 'posts', label: 'Posts', count: posts.length }, { value: 'members', label: 'Members', count: members.length }]} />

      <div className="mt-6">
        {tab === 'posts' ? (
          <div className="max-w-2xl space-y-4">
            {canPost ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addBatchPost(year, programme, draft)
                  setDraft('')
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <TextAreaField label={`Share with the ${label} group`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="News, meetups, job leads…" className="min-h-24" />
                <div className="mt-3 flex justify-end"><Button type="submit" disabled={!draft.trim()}>Post</Button></div>
              </form>
            ) : (
              <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{joined ? 'You can post once your account is verified.' : 'Join this group to post.'}</p>
            )}

            {posts.length ? (
              <ul className="space-y-4">
                {posts.map((p) => {
                  const author = db.users.find((u) => u.id === p.authorId)
                  const canDelete = p.authorId === me.id || me.role === 'admin'
                  return (
                    <li key={p.id}>
                      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          {author && <Avatar name={author.name} color={author.avatarColor} size="sm" />}
                          <div className="min-w-0 flex-1">
                            {author ? <Link to={`/people/${author.id}`} className="font-semibold text-slate-900 hover:underline">{author.name}</Link> : <span className="font-semibold">Former member</span>}
                            <p className="text-xs text-slate-600">{timeAgo(p.createdAt)}</p>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-800">{p.body}</p>
                        <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                          {canDelete ? (
                            <Button variant="danger-subtle" size="sm" onClick={() => setDeleting(p.id)}><Icon name="trash" className="h-3.5 w-3.5" />Delete</Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setReporting(p.id)}><Icon name="flag" className="h-3.5 w-3.5" />Report</Button>
                          )}
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState icon="chat" title="No posts yet" body="Be the first to say hello to your batch." />
            )}
          </div>
        ) : members.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((u) => <li key={u.id}><PersonCard user={u} /></li>)}
          </ul>
        ) : (
          <EmptyState icon="users" title="No members yet" />
        )}
      </div>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteBatchPost(deleting)} title="Delete this post?" body="It will be removed from the group for everyone." confirmLabel="Delete post" />
      <ReportDialog open={!!reporting} onClose={() => setReporting(null)} targetType="post" targetId={reporting ?? ''} what="this post" />
    </>
  )
}
