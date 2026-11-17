import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AIBadge } from '../components/ai/AIBadge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SelectField, TextAreaField, TextField } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { Switch } from '../components/ui/Switch'
import { useToast } from '../components/ui/Toast'
import { INDUSTRIES } from '../data/seed'
import { profileTips } from '../lib/ai'
import { splitList } from '../lib/format'
import { useStore } from '../lib/store'

export default function EditProfilePage() {
  const { me, myState, updateProfile } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const welcome = params.get('welcome') === '1'
  const [f, setF] = useState(() => ({
    headline: me?.headline ?? '',
    bio: me?.bio ?? '',
    location: me?.location ?? '',
    jobTitle: me?.jobTitle ?? '',
    company: me?.company ?? '',
    industry: me?.industry ?? '',
    skills: me?.skills.join(', ') ?? '',
    interests: me?.interests.join(', ') ?? '',
    careerGoals: me?.careerGoals ?? '',
    mentoring: me?.mentoring ?? false,
  }))
  if (!me) return null
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const tips = myState.settings.aiEnabled ? profileTips({ ...me, ...f, skills: splitList(f.skills), interests: splitList(f.interests) }) : []

  return (
    <>
      <PageHeader
        title={welcome ? 'Set up your profile' : 'Edit profile'}
        description={welcome ? 'A complete profile helps people find you and improves your mentor matches.' : undefined}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateProfile({
            headline: f.headline.trim(), bio: f.bio.trim(), location: f.location.trim(), careerGoals: f.careerGoals.trim(),
            jobTitle: f.jobTitle.trim() || undefined, company: f.company.trim() || undefined, industry: f.industry || undefined,
            skills: splitList(f.skills), interests: splitList(f.interests), mentoring: me.role === 'alumni' ? f.mentoring : false,
          })
          toast('Profile saved.')
          navigate(welcome ? '/dashboard' : '/profile')
        }}
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Basics</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Name" value={me.name} disabled hint="Contact an administrator to change your name." />
              <TextField label="Programme and batch" value={`${me.programme}, ${me.gradYear}`} disabled hint="Verified details can't be edited." />
            </div>
            <TextField label="Headline" hint="One line about you, e.g. “Final-year CS student interested in data”." value={f.headline} onChange={set('headline')} maxLength={100} />
            <TextAreaField label="Bio" optional hint="What would you like to talk about or help with?" value={f.bio} onChange={set('bio')} maxLength={600} />
            <TextField label="Location" optional hint="City or “Remote”." value={f.location} onChange={set('location')} />
          </Card>

          <Card className="space-y-5">
            <h2 className="text-lg font-bold text-slate-900">{me.role === 'student' ? 'Career interests' : 'Work'}</h2>
            {me.role === 'alumni' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Job title" optional value={f.jobTitle} onChange={set('jobTitle')} />
                <TextField label="Company" optional value={f.company} onChange={set('company')} />
                <SelectField label="Industry" optional value={f.industry} onChange={set('industry')}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </SelectField>
              </div>
            )}
            {me.role === 'student' && (
              <TextField label="Career goals" hint="E.g. “Data analytics or machine learning engineering”." value={f.careerGoals} onChange={set('careerGoals')} maxLength={120} />
            )}
            <TextField label="Skills" hint="Separate with commas." value={f.skills} onChange={set('skills')} />
            <TextField label="Interests" hint="Separate with commas. Used to suggest mentors and opportunities." value={f.interests} onChange={set('interests')} />
          </Card>

          {me.role === 'alumni' && (
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Mentoring</h2>
              <Switch label="I'm open to mentoring" description="Students can send you mentorship requests. You can accept or decline each one, and turn this off any time." checked={f.mentoring} onChange={(v) => setF((x) => ({ ...x, mentoring: v }))} />
            </Card>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" size="lg">Save profile</Button>
          </div>
        </div>

        <aside className="space-y-6">
          {tips.length > 0 && (
            <Card>
              <AIBadge label="AI tips" />
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {tips.map((t) => <li key={t.id} className="flex gap-2"><Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />{t.text}</li>)}
              </ul>
            </Card>
          )}
          <Card>
            <h2 className="font-bold text-slate-900">Privacy</h2>
            <p className="mt-1 text-sm text-slate-700">Choose who sees your contact details and who can message you.</p>
            <Link to="/settings#privacy" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Privacy settings <Icon name="arrowRight" className="h-4 w-4" /></Link>
          </Card>
        </aside>
      </form>
    </>
  )
}
