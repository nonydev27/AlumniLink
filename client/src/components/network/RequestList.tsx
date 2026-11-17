import { Link } from 'react-router'
import { useStore } from '../../lib/store'
import { timeAgo } from '../../lib/format'
import type { Connection } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

/** Incoming requests with equally sized, well-spaced Accept / Decline buttons. */
export function RequestList({ connections }: { connections: Connection[] }) {
  const { db, respondToConnection } = useStore()
  const toast = useToast()
  return (
    <ul className="space-y-3">
      {connections.map((c) => {
        const from = db.users.find((u) => u.id === c.fromId)
        if (!from) return null
        return (
          <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <Avatar name={from.name} color={from.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/people/${from.id}`} className="font-bold text-slate-900 hover:underline">{from.name}</Link>
                  {c.kind === 'mentorship' && <Badge tone="brand" icon="graduation">Mentorship request</Badge>}
                </div>
                <p className="text-sm text-slate-700">{from.headline}</p>
                <p className="text-xs text-slate-600">{timeAgo(c.createdAt)}</p>
                {c.note && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200">“{c.note}”</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:ml-15 sm:max-w-sm">
              <Button onClick={() => { respondToConnection(c.id, true); toast(`You accepted ${from.name}'s request.`) }}>Accept</Button>
              <Button variant="secondary" onClick={() => { respondToConnection(c.id, false); toast('Request declined. They will not be notified.') }}>Decline</Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
