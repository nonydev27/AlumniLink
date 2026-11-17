import { useState } from 'react'
import { Link } from 'react-router'
import { PersonCard } from '../components/directory/PersonCard'
import { RequestList } from '../components/network/RequestList'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { timeAgo } from '../lib/format'
import { useStore } from '../lib/store'

type Tab = 'connections' | 'received' | 'sent'

export default function NetworkPage() {
  const { me, db, removeConnection } = useStore()
  const [tab, setTab] = useState<Tab>('connections')
  const [withdraw, setWithdraw] = useState<string | null>(null)
  if (!me) return null

  const mine = db.connections.filter((c) => c.fromId === me.id || c.toId === me.id)
  const accepted = mine.filter((c) => c.status === 'accepted')
  const received = mine.filter((c) => c.toId === me.id && c.status === 'pending')
  const sent = mine.filter((c) => c.fromId === me.id && c.status === 'pending')
  const userById = (id: string) => db.users.find((u) => u.id === id)

  return (
    <>
      <PageHeader title="My network" description="Your connections, mentors and pending requests." actions={<ButtonLink to="/directory" variant="secondary">Find people</ButtonLink>} />
      <Tabs
        label="Network sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'connections', label: 'Connections', count: accepted.length },
          { value: 'received', label: 'Received', count: received.length },
          { value: 'sent', label: 'Sent', count: sent.length },
        ]}
      />

      <div className="mt-6">
        {tab === 'connections' &&
          (accepted.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {accepted.map((c) => {
                const other = userById(c.fromId === me.id ? c.toId : c.fromId)
                return other ? <li key={c.id}><PersonCard user={other} /></li> : null
              })}
            </ul>
          ) : (
            <EmptyState icon="users" title="No connections yet" body="Find classmates and alumni in the directory and send a request." action={<ButtonLink to="/directory">Browse directory</ButtonLink>} />
          ))}

        {tab === 'received' && (received.length ? <RequestList connections={received} /> : <EmptyState icon="inbox" title="No pending requests" body="When someone asks to connect or for mentorship, it will appear here." />)}

        {tab === 'sent' &&
          (sent.length ? (
            <ul className="space-y-3">
              {sent.map((c) => {
                const to = userById(c.toId)
                if (!to) return null
                return (
                  <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3">
                      <Avatar name={to.name} color={to.avatarColor} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/people/${to.id}`} className="font-bold text-slate-900 hover:underline">{to.name}</Link>
                          {c.kind === 'mentorship' && <Badge tone="brand">Mentorship</Badge>}
                        </div>
                        <p className="text-sm text-slate-600">Sent {timeAgo(c.createdAt)} · Waiting for a reply</p>
                      </div>
                    </div>
                    <Button variant="danger-subtle" size="sm" onClick={() => setWithdraw(c.id)}>Withdraw</Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="send" title="No requests waiting" body="Requests you send will show here until they are answered." />
          ))}
      </div>

      <ConfirmDialog open={!!withdraw} onClose={() => setWithdraw(null)} onConfirm={() => withdraw && removeConnection(withdraw)} title="Withdraw this request?" body="You can send a new request later." confirmLabel="Withdraw" />
    </>
  )
}
