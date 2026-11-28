import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { Switch } from '../components/ui/Switch'
import { cx } from '../lib/format'
import { useStore } from '../lib/store'
import type { AppSettings } from '../types'

function Segmented<T extends string>({ legend, value, options, onChange }: { legend: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="py-3">
      <legend className="font-semibold text-slate-900">{legend}</legend>
      <div className="mt-2 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {options.map((o) => (
          <label key={o.value} className={cx('inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600', value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700')}>
            <input type="radio" className="sr-only" name={legend} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function SettingsPage() {
  const { me, myState, updateSettings, updateProfile, logout, deleteAccount, resetDemo } = useStore()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!me) return null
  const s = myState.settings
  const set = (patch: Partial<AppSettings>) => updateSettings(patch)

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Accessibility</h2>
          <div className="divide-y divide-slate-100">
            <Segmented legend="Text size" value={s.textSize} onChange={(v) => set({ textSize: v })} options={[{ value: 'normal', label: 'Default' }, { value: 'large', label: 'Large' }, { value: 'larger', label: 'Larger' }]} />
            <Switch label="High contrast" description="Darker text and borders for easier reading." checked={s.highContrast} onChange={(v) => set({ highContrast: v })} />
            <Switch label="Reduce motion" description="Turn off animations and smooth scrolling." checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">AI suggestions</h2>
          <p className="mt-1 text-sm text-slate-700">
            AI uses only your profile, interests and career goals to suggest mentors, opportunities and writing tips. It never decides for you, and it never shares your contact details.
          </p>
          <div className="divide-y divide-slate-100">
            <Switch label="Show AI suggestions" description="Turn off to browse everything yourself." checked={s.aiEnabled} onChange={(v) => set({ aiEnabled: v })} />
            {s.aiEnabled && (
              <Segmented legend="Explanations" value={s.aiDetail} onChange={(v) => set({ aiDetail: v })} options={[{ value: 'short', label: 'Short' }, { value: 'detailed', label: 'Detailed' }]} />
            )}
          </div>
        </Card>

        <Card id="privacy">
          <h2 className="text-lg font-bold text-slate-900">Privacy</h2>
          <div className="divide-y divide-slate-100">
            <Switch label="Share my email with connections" description="Only people you have accepted can see it. Never shown publicly." checked={me.privacy.showEmailToConnections} onChange={(v) => updateProfile({ privacy: { ...me.privacy, showEmailToConnections: v } })} />
            <Switch label="Show my company" description="Displayed on your profile and in search." checked={me.privacy.showCompany} onChange={(v) => updateProfile({ privacy: { ...me.privacy, showCompany: v } })} />
            <Segmented
              legend="Who can message me"
              value={me.privacy.allowMessagesFrom}
              onChange={(v) => updateProfile({ privacy: { ...me.privacy, allowMessagesFrom: v } })}
              options={[{ value: 'everyone', label: 'Any verified member' }, { value: 'connections', label: 'Connections only' }]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">Account</h2>
          <p className="mt-1 text-sm text-slate-700">Signed in as <span className="font-semibold">{me.email}</span></p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" onClick={() => { void logout().finally(() => navigate('/')) }}><Icon name="logout" className="h-5 w-5" />Sign out</Button>
            <Button variant="ghost" onClick={() => { resetDemo(); navigate('/') }}>Reset local demo data</Button>
          </div>
          {/* Destructive action: small, separated from everything else, and confirmed. */}
          <div className="mt-8 border-t border-slate-200 pt-4">
            <Button variant="danger-subtle" size="sm" onClick={() => setConfirmDelete(true)}><Icon name="trash" className="h-4 w-4" />Delete my account</Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteAccount(); navigate('/') }}
        title="Delete your account?"
        body="This permanently removes your profile, connections, messages and posts. This cannot be undone."
        confirmLabel="Delete account"
      />
    </>
  )
}
