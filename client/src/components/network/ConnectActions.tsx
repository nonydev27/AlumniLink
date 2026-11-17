import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { connectionBetween, useStore } from '../../lib/store'
import { cx } from '../../lib/format'
import type { User } from '../../types'
import { Button, ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/Toast'
import { MentorshipRequestDialog } from './MentorshipRequestDialog'

/**
 * Primary relationship actions for a person. Related actions are grouped
 * side by side (Fitts' Law); the main action is the larger, filled button.
 */
export function ConnectActions({ other, showViewProfile = false, className }: { other: User; showViewProfile?: boolean; className?: string }) {
  const { me, db, myState, respondToConnection, openConversation } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [dialog, setDialog] = useState<null | 'connect' | 'mentorship'>(null)
  if (!me || me.id === other.id) return null

  const conn = connectionBetween(db.connections, me.id, other.id)
  const connected = conn?.status === 'accepted'
  const blocked = myState.blocked.includes(other.id)
  const canMessage = !blocked && (connected || other.privacy.allowMessagesFrom === 'everyone')
  const canMentor = me.role === 'student' && other.role === 'alumni' && other.mentoring

  const message = () => navigate(`/messages/${openConversation(other.id)}`)
  const view = showViewProfile && (
    <ButtonLink to={`/people/${other.id}`} variant="secondary">View profile<span className="sr-only"> of {other.name}</span></ButtonLink>
  )

  let primary: ReactNode
  let secondary: ReactNode = view

  if (blocked) {
    primary = <p className="col-span-2 text-sm text-slate-600">You have blocked this person.</p>
    secondary = null
  } else if (connected) {
    primary = <Button onClick={message}><Icon name="chat" className="h-4 w-4" />Message</Button>
  } else if (conn && conn.toId === me.id) {
    primary = (
      <Button onClick={() => { respondToConnection(conn.id, true); toast(`You are now connected with ${other.name}.`) }}>Accept</Button>
    )
    secondary = <Button variant="secondary" onClick={() => respondToConnection(conn.id, false)}>Decline</Button>
  } else if (conn) {
    primary = (
      <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700">
        <Icon name="clock" className="h-4 w-4" /> Request sent
      </span>
    )
    secondary = canMessage ? <Button variant="secondary" onClick={message}>Message</Button> : view
  } else {
    primary = canMentor
      ? <Button onClick={() => setDialog('mentorship')}>Request mentorship</Button>
      : <Button onClick={() => setDialog('connect')}><Icon name="userPlus" className="h-4 w-4" />Connect</Button>
    secondary = canMentor
      ? <Button variant="secondary" onClick={() => setDialog('connect')}>Connect</Button>
      : canMessage ? <Button variant="secondary" onClick={message}>Message</Button> : view
  }

  return (
    <div className={cx('grid gap-2', secondary ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {primary}
      {secondary}
      {dialog && <MentorshipRequestDialog open onClose={() => setDialog(null)} recipient={other} kind={dialog} />}
    </div>
  )
}
