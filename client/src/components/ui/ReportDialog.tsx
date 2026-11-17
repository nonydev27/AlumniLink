import { useState } from 'react'
import { useStore } from '../../lib/store'
import type { ReportTarget } from '../../types'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { TextAreaField } from './Field'
import { useToast } from './Toast'

const reasons = ['Spam or scam', 'Inappropriate content', 'Fake or misleading profile', 'Harassment', 'Something else']

export function ReportDialog({ open, onClose, targetType, targetId, what }: { open: boolean; onClose: () => void; targetType: ReportTarget; targetId: string; what: string }) {
  const { report } = useStore()
  const toast = useToast()
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')

  return (
    <Dialog open={open} onClose={onClose} title={`Report ${what}`} description="Reports are private and reviewed by the Alumni Relations Office.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          report(targetType, targetId, details.trim() ? `${reason}: ${details.trim()}` : reason)
          toast('Thanks. Your report has been sent to an administrator.')
          setDetails('')
          onClose()
        }}
        className="space-y-4"
      >
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">What is the problem?</legend>
          <div className="mt-2 space-y-1">
            {reasons.map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-50">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-brand-700" />
                <span className="text-slate-800">{r}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextAreaField label="Details" optional value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Send report</Button>
        </div>
      </form>
    </Dialog>
  )
}
