import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { RoleSelector } from '../components/auth/RoleSelector'
import { Button } from '../components/ui/Button'
import { SelectField, TextField } from '../components/ui/Field'
import { PROGRAMMES } from '../data/seed'
import { messageOf } from '../lib/api'
import { useStore } from '../lib/store'

const thisYear = new Date().getFullYear()

export default function RegisterPage() {
  const [params] = useSearchParams()
  const { register } = useStore()
  const navigate = useNavigate()
  const [role, setRole] = useState<'student' | 'alumni'>(params.get('role') === 'alumni' ? 'alumni' : 'student')
  const [form, setForm] = useState({ name: '', email: '', password: '', programme: '', gradYear: '', acceptTerms: false })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string; checked?: boolean } }) =>
    setForm((f) => ({ ...f, [k]: k === 'acceptTerms' ? e.target.checked === true : e.target.value }))

  const years =
    role === 'student'
      ? Array.from({ length: 6 }, (_, i) => thisYear + i)
      : Array.from({ length: 50 }, (_, i) => thisYear - i)

  const validate = () => {
    const e: typeof errors = {}
    if (form.name.trim().length < 3 || form.name.trim().split(/\s+/).length < 2) e.name = 'Enter your first and last name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid institutional email address.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    if (!form.programme) e.programme = 'Choose your programme.'
    if (!form.gradYear) e.gradYear = role === 'student' ? 'Choose your expected graduation year.' : 'Choose your graduation year.'
    if (!form.acceptTerms) e.acceptTerms = 'Accept the current terms to continue.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setBusy(true)
    setServerError(null)
    try {
      await register({
        role,
        fullName: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        programme: form.programme,
        graduationYear: Number(form.gradYear),
        acceptTerms: form.acceptTerms,
      })
      navigate('/verify-email?sent=1', { replace: true })
    } catch (cause) {
      setServerError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Join AlumniLink"
      subtitle="Your programme, graduation year and institutional email start your verification."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <form noValidate onSubmit={submit} className="space-y-5">
        <RoleSelector value={role} onChange={(r) => { setRole(r); setForm((f) => ({ ...f, gradYear: '' })) }} />
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Institutional email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters; avoid common passwords." value={form.password} onChange={set('password')} error={errors.password} />
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
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
            className="mt-1 h-5 w-5 shrink-0 accent-brand-700"
          />
          <span>I accept the current Terms of Use and Privacy Policy.</span>
        </label>
        {errors.acceptTerms && <p role="alert" className="-mt-3 text-sm font-medium text-red-700">{errors.acceptTerms}</p>}
        {serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{serverError}</p>}
        {role === 'alumni' && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Alumni accounts are checked by the Alumni Relations Office. You can set up your profile while you wait.
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
        <p className="text-xs text-slate-600">
          We only use your profile to connect you with people and opportunities. Your contact details are never shared without your consent.
        </p>
      </form>
    </AuthCard>
  )
}
