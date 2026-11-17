import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { followUpQuestions } from '../../lib/ai'
import { cx, formatDate, formatTime } from '../../lib/format'
import { isConnected, useStore } from '../../lib/store'
import type { Conversation } from '../../types'
import { AIBadge } from '../ai/AIBadge'
import { MessageCoach } from '../ai/MessageCoach'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { VoiceInputButton } from '../ui/VoiceInputButton'

export function ChatThread({ conversation }: { conversation: Conversation }) {
  const { me, db, myState, sendMessage, markRead } = useStore()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLLIElement>(null)
  const other = db.users.find((u) => u.id === conversation.participantIds.find((p) => p !== me?.id))
  const count = conversation.messages.length

  useEffect(() => {
    markRead(conversation.id)
    endRef.current?.scrollIntoView({ block: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, count])

  if (!me || !other) return null
  const blocked = myState.blocked.includes(other.id)
  const allowed = !blocked && (isConnected(db.connections, me.id, other.id) || other.privacy.allowMessagesFrom === 'everyone')
  const ai = myState.settings.aiEnabled
  // Follow-up ideas once a mentoring chat has some back-and-forth, and the student isn't mid-message.
  const showFollowUps = ai && me.role === 'student' && other.role === 'alumni' && count >= 2 && !draft

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <Link to="/messages" aria-label="Back to conversations" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden">
          <Icon name="arrowLeft" />
        </Link>
        <Avatar name={other.name} color={other.avatarColor} size="sm" />
        <div className="min-w-0">
          <h2 className="truncate font-bold text-slate-900"><Link to={`/people/${other.id}`} className="hover:underline">{other.name}</Link></h2>
          <p className="truncate text-xs text-slate-600">{other.headline}</p>
        </div>
      </div>

      <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-label={`Messages with ${other.name}`}>
        {conversation.messages.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-600">Say hello to {other.name.split(' ')[0]}. Introduce yourself and say why you're reaching out.</li>
        )}
        {conversation.messages.map((m, i) => {
          const mineMsg = m.senderId === me.id
          const day = formatDate(m.sentAt)
          const showDay = i === 0 || day !== formatDate(conversation.messages[i - 1].sentAt)
          return (
            <li key={m.id}>
              {showDay && <p className="my-2 text-center text-xs font-semibold text-slate-600">{day}</p>}
              <div className={cx('flex', mineMsg ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%]', mineMsg ? 'rounded-br-md bg-brand-700 text-white' : 'rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200')}>
                  <p className="sr-only">{mineMsg ? 'You' : other.name} said:</p>
                  <p className="whitespace-pre-line text-[0.95rem] leading-relaxed">{m.body}</p>
                  <p className={cx('mt-1 text-right text-[0.7rem]', mineMsg ? 'text-brand-100' : 'text-slate-600')}>{formatTime(m.sentAt)}</p>
                </div>
              </div>
            </li>
          )
        })}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      {showFollowUps && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2"><AIBadge label="AI follow-up ideas" /><span className="text-xs text-slate-600">Tap to use as a draft</span></div>
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {followUpQuestions(other).map((q) => (
              <li key={q} className="shrink-0">
                <button type="button" onClick={() => setDraft(q)} className="min-h-11 max-w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-600">
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allowed ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(conversation.id, draft)
            setDraft('')
          }}
          className="border-t border-slate-200 bg-white p-3"
        >
          {ai && me.role === 'student' && count === 0 && (
            <div className="mb-2"><MessageCoach draft={draft} recipient={other} sender={me} onUseExample={setDraft} /></div>
          )}
          <label htmlFor="msg" className="sr-only">Message {other.name}</label>
          <div className="flex items-end gap-2">
            <textarea
              id="msg"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Write a message"
              className={`${inputClass} max-h-40 min-h-12 resize-y py-3`}
            />
            <VoiceInputButton onText={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} label="Dictate message" className="h-12 w-12" />
            <Button type="submit" size="lg" disabled={!draft.trim()} aria-label="Send message" className="w-12 px-0 sm:w-auto sm:px-5">
              <Icon name="send" className="h-5 w-5" /><span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="mt-1 hidden text-xs text-slate-600 sm:block">Enter to send · Shift + Enter for a new line</p>
        </form>
      ) : (
        <p className="border-t border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-700">
          {blocked ? 'You have blocked this person.' : `${other.name.split(' ')[0]} only accepts messages from connections.`}
        </p>
      )}
    </div>
  )
}
