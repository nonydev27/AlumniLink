import { Button } from './Button'
import { Dialog } from './Dialog'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel: string
}

/** Destructive actions always go through a confirmation step. */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-slate-700">{body}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Dialog>
  )
}
