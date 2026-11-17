import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { RoleSelector } from '../components/auth/RoleSelector'
import { Button } from '../components/ui/Button'
import { SelectField, TextField } from '../components/ui/Field'
import { PROGRAMMES } from '../data/seed'
import { useStore } from '../lib/store'

const thisYear = new Date().getFullYear()

export default function RegisterPage() {
  const [params] = useSearchParams()
  const { db, register } = useStore()
  const navigate = useNavigate()
  const [role, setRole] = useState<'student' | 'alumni'>(params.get('role') === 'alumni' ? 'alumni' : 'student')
  const [form, setForm] = useState({ name: '', email: '', password: '', indexNumber: '', programme: '', gradYear: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const years =
    role === 'student'
      ? Array.from({ length: 6 }, (_, i) => thisYear + i)
      : Array.from({ length: 50 }, (_, i) => thisYear - i)

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address, like name@example.com.'
    else if (db.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) e.email = 'An account with this email already exists. Try logging in instead.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    if (!/^\d{6,10}$/.test(form.indexNumber.trim())) e.indexNumber = 'Enter your index number using digits only (6 to 10 digits).'
    if (!form.programme) e.programme = 'Choose your programme.'
    if (!form.gradYear) e.gradYear = role === 'student' ? 'Choose your expected graduation year.' : 'Choose your graduation year.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <AuthCard
      title="Join AlumniLink"
      subtitle="Your graduation year, programme and batch verify your account."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!validate()) return
          register({ role, name: form.name, email: form.email, indexNumber: form.indexNumber, programme: form.programme, gradYear: Number(form.gradYear) })
          navigate('/profile/edit?welcome=1')
        }}
        className="space-y-5"
      >
        <RoleSelector value={role} onChange={(r) => { setRole(r); setForm((f) => ({ ...f, gradYear: '' })) }} />
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={form.password} onChange={set('password')} error={errors.password} />
        <TextField label="Index number" inputMode="numeric" hint="Used only to verify you studied here. Never shown publicly." value={form.indexNumber} onChange={set('indexNumber')} error={errors.indexNumber} />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Programme" value={form.programme} onChange={set('programme')} error={errors.programme}>
            <option value="">Select…</option>
            {PROGRAMMES.map((p) => <option key={p}>{p}</option>)}
          </SelectField>
          <SelectField label={role === 'student' ? 'Expected graduation' : 'Graduation year'} value={form.gradYear} onChange={set('gradYear')} error={errors.gradYear}>
            <option value="">Select…</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </SelectField>
        </div>
        {role === 'alumni' && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Alumni accounts are checked by the Alumni Relations Office. You can set up your profile while you wait.
          </p>
        )}
        <Button type="submit" size="lg" className="w-full">Create account</Button>
        <p className="text-xs text-slate-600">
          We only use your profile to connect you with people and opportunities. Your contact details are never shared without your consent.
        </p>
      </form>
    </AuthCard>
  )
}
