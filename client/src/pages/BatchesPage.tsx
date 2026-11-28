import { Link } from 'react-router'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { batchKey, useStore } from '../lib/store'

export default function BatchesPage() {
  const { me, db, myState } = useStore()
  if (!me) return null
  const members = db.users.filter((u) => u.role !== 'admin' && u.verification === 'verified')
  const keys = new Set(members.map((u) => batchKey(u.gradYear, u.programme)))
  if (me.role !== 'admin') keys.add(batchKey(me.gradYear, me.programme))
  // Several programmes share a graduation year, so a batch is year + programme.
  const batches = [...keys]
    .map((key) => {
      const [year, programme] = key.split('|')
      return { key, year: Number(year), programme }
    })
    .sort((a, b) => b.year - a.year || a.programme.localeCompare(b.programme))

  return (
    <>
      <PageHeader title="Batch groups" description="Every graduation year and programme has its own group. Reconnect with your batch, share news and plan reunions." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((batch) => {
          const groupMembers = members.filter((u) => u.gradYear === batch.year && u.programme === batch.programme)
          const posts = db.batchPosts.filter((p) =>
            p.gradYear === batch.year && (!p.programme || p.programme === batch.programme)).length
          const isMine = me.gradYear === batch.year && me.programme === batch.programme && me.role !== 'admin'
          const joined = isMine || myState.joinedBatches.includes(batch.key)
          return (
            <li key={batch.key}>
              <Link
                to={`/batches/${batch.year}/${encodeURIComponent(batch.programme)}`}
                className="flex h-full min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="graduation" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900">{batch.year > new Date().getFullYear() ? `Graduating ${batch.year}` : `Class of ${batch.year}`}</span>
                  <span className="block text-sm text-slate-600">{batch.programme}</span>
                  <span className="block text-sm text-slate-600">{groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'} · {posts} {posts === 1 ? 'post' : 'posts'}</span>
                </span>
                {isMine ? <Badge tone="brand">Your batch</Badge> : joined ? <Badge tone="success">Joined</Badge> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
