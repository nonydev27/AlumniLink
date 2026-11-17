import { useState } from 'react'
import { useStore } from '../../lib/store'
import type { ConnectionKind, User } from '../../types'
import { MessageCoach } from '../ai/MessageCoach'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { TextAreaField } from '../ui/Field'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  recipient: User
  kind: ConnectionKind
}

export function MentorshipRequestDialog({ open, onClose, recipient, kind }: Props) {
  const { me, myState, requestConnection } = useStore()
  const toast = useToast()
  const [note, setNote] = useState('')
  if (!me) return null
  const isMentorship = kind === 'mentorship'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isMentorship ? `Request mentorship from ${recipient.name}` : `Connect with ${recipient.name}`}
      description={isMentorship ? 'A short, specific note makes it easier for alumni to say yes.' : 'Add a note so they know why you would like to connect.'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          requestConnection(recipient.id, kind, note.trim() || undefined)
          toast(isMentorship ? `Mentorship request sent to ${recipient.name}.` : `Connection request sent to ${recipient.name}.`)
          setNote('')
          onClose()
        }}
        className="space-y-4"
      >
        <TextAreaField label="Your note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder={`Hello ${recipient.name.split(' ')[0]}, …`} />
        {myState.settings.aiEnabled && me.role === 'student' && (
          <MessageCoach draft={note} recipient={recipient} sender={me} onUseExample={setNote} />
        )}
        <p className="text-xs text-slate-600">They can accept or decline. Replies are never guaranteed, and alumni respond when they have time.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="lg">Send request</Button>
        </div>
      </form>
    </Dialog>
  )
}
