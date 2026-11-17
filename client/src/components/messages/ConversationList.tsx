import { NavLink } from 'react-router'
import { unreadCount, useStore } from '../../lib/store'
import { cx, timeAgo } from '../../lib/format'
import type { Conversation } from '../../types'
import { Avatar } from '../ui/Avatar'

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  const { me, db } = useStore()
  if (!me) return null
  return (
    <ul className="divide-y divide-slate-100">
      {conversations.map((c) => {
        const other = db.users.find((u) => u.id === c.participantIds.find((p) => p !== me.id))
        const last = c.messages[c.messages.length - 1]
        const unread = unreadCount(c, me.id)
        if (!other) return null
        return (
          <li key={c.id}>
            <NavLink
              to={`/messages/${c.id}`}
              className={({ isActive }) => cx('flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600', isActive ? 'bg-brand-50' : 'hover:bg-slate-50')}
            >
              <Avatar name={other.name} color={other.avatarColor} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cx('truncate text-sm', unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800')}>{other.name}</p>
                  {last && <p className="shrink-0 text-xs text-slate-600">{timeAgo(last.sentAt)}</p>}
                </div>
                <p className={cx('truncate text-sm', unread ? 'font-medium text-slate-900' : 'text-slate-600')}>
                  {last ? `${last.senderId === me.id ? 'You: ' : ''}${last.body}` : 'No messages yet'}
                </p>
              </div>
              {unread > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-bold text-white">
                  {unread}<span className="sr-only"> unread</span>
                </span>
              )}
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}
