import { useParams } from 'react-router'
import { ChatThread } from '../components/messages/ChatThread'
import { ConversationList } from '../components/messages/ConversationList'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { cx } from '../lib/format'
import { useStore } from '../lib/store'

export default function MessagesPage() {
  const { conversationId } = useParams()
  const { me, db, myState } = useStore()
  if (!me) return null

  const convs = db.conversations
    .filter((c) => c.participantIds.includes(me.id) && !c.participantIds.some((p) => myState.blocked.includes(p)))
    .filter((c) => c.messages.length > 0 || c.id === conversationId)
    .sort((a, b) => (b.messages.at(-1)?.sentAt ?? '').localeCompare(a.messages.at(-1)?.sentAt ?? ''))
  const active = convs.find((c) => c.id === conversationId)

  return (
    <>
      <h1 className={cx('mb-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl', active && 'max-md:sr-only')}>Messages</h1>
      <div className="grid h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:h-[calc(100dvh-10rem)] md:grid-cols-[18rem_1fr]">
        <nav aria-label="Conversations" className={cx('overflow-y-auto border-r border-slate-200', active && 'max-md:hidden')}>
          {convs.length ? (
            <ConversationList conversations={convs} />
          ) : (
            <div className="p-4"><EmptyState icon="chat" title="No conversations yet" body="Message a connection from their profile to start chatting." action={<ButtonLink to="/network" variant="secondary">My network</ButtonLink>} /></div>
          )}
        </nav>
        <section aria-label="Conversation" className={cx('min-h-0 bg-slate-50', !active && 'max-md:hidden')}>
          {active ? (
            <ChatThread key={active.id} conversation={active} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-slate-600">Select a conversation to read it.</div>
          )}
        </section>
      </div>
    </>
  )
}
