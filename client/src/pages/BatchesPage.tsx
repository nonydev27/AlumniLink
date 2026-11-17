import { Link } from 'react-router'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { useStore } from '../lib/store'

export default function BatchesPage() {
  const { me, db, myState } = useStore()
  if (!me) return null
  const members = db.users.filter((u) => u.role !== 'admin' && u.verification === 'verified')
  const years = [...new Set([...members.map((u) => u.gradYear), ...(me.role !== 'admin' ? [me.gradYear] : [])])].sort((a, b) => b - a)

  return (
    <>
      <PageHeader title="Batch groups" description="Every graduation year has a group page. Reconnect with your year, share news and plan reunions." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {years.map((y) => {
          const count = members.filter((u) => u.gradYear === y).length
          const posts = db.batchPosts.filter((p) => p.gradYear === y).length
          const isMine = me.gradYear === y && me.role !== 'admin'
          const joined = isMine || myState.joinedBatches.includes(y)
          return (
            <li key={y}>
              <Link to={`/batches/${y}`} className="flex h-full min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-600">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="graduation" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900">{y > new Date().getFullYear() ? `Graduating ${y}` : `Class of ${y}`}</span>
                  <span className="block text-sm text-slate-600">{count} {count === 1 ? 'member' : 'members'} · {posts} {posts === 1 ? 'post' : 'posts'}</span>
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
