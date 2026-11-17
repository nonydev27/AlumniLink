import { useState } from 'react'
import { useStore } from '../../lib/store'
import { splitList } from '../../lib/format'
import type { Opportunity, OpportunityType } from '../../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { SelectField, TextAreaField, TextField } from '../ui/Field'
import { useToast } from '../ui/Toast'
import { typeMeta } from './typeMeta'

const empty = { type: 'job' as OpportunityType, title: '', organisation: '', location: '', mode: 'On-site' as Opportunity['mode'], description: '', tags: '', date: '', link: '', accessibilityNote: '' }

export function PostOpportunityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { postOpportunity } = useStore()
  const toast = useToast()
  const [f, setF] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  return (
    <Dialog open={open} onClose={onClose} title="Post an opportunity" description="Share a job, internship, webinar, event or reunion with the community.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const errs: Record<string, string> = {}
          if (!f.title.trim()) errs.title = 'Add a title.'
          if (!f.organisation.trim()) errs.organisation = 'Add the organisation or host.'
          if (!f.description.trim()) errs.description = 'Add a short description.'
          if (f.link && !/^https?:\/\//.test(f.link)) errs.link = 'Links must start with http:// or https://'
          setErrors(errs)
          if (Object.keys(errs).length) return
          postOpportunity({
            type: f.type, title: f.title.trim(), organisation: f.organisation.trim(), location: f.location.trim() || (f.mode === 'Online' ? 'Online' : 'TBC'),
            mode: f.mode, description: f.description.trim(), tags: splitList(f.tags), date: f.date || undefined, link: f.link || undefined,
            accessibilityNote: f.accessibilityNote.trim() || undefined,
          })
          toast('Your opportunity is now on the board.')
          setF(empty)
          onClose()
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Type" value={f.type} onChange={set('type')}>
            {(Object.keys(typeMeta) as OpportunityType[]).map((t) => <option key={t} value={t}>{typeMeta[t].label}</option>)}
          </SelectField>
          <SelectField label="Format" value={f.mode} onChange={set('mode')}>
            {['On-site', 'Hybrid', 'Remote', 'Online'].map((m) => <option key={m}>{m}</option>)}
          </SelectField>
        </div>
        <TextField label="Title" value={f.title} onChange={set('title')} error={errors.title} />
        <TextField label="Organisation or host" value={f.organisation} onChange={set('organisation')} error={errors.organisation} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Location" optional value={f.location} onChange={set('location')} />
          <TextField label={typeMeta[f.type].dateLabel === 'Apply by' ? 'Apply by' : 'Date'} optional type="date" value={f.date} onChange={set('date')} />
        </div>
        <TextAreaField label="Description" value={f.description} onChange={set('description')} error={errors.description} maxLength={1000} />
        <TextField label="Tags" optional hint="Comma-separated, e.g. Python, Data, Internship. Helps match the right people." value={f.tags} onChange={set('tags')} />
        <TextField label="Link" optional type="url" placeholder="https://" value={f.link} onChange={set('link')} error={errors.link} />
        <TextField label="Accessibility information" optional hint="E.g. captions provided, step-free access." value={f.accessibilityNote} onChange={set('accessibilityNote')} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="lg">Post opportunity</Button>
        </div>
      </form>
    </Dialog>
  )
}
