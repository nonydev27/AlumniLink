import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { useStore } from '../lib/store'

const demoAccounts = [
  { email: 'student@alumnilink.demo', label: 'Student', who: 'Akosua, CS final year' },
  { email: 'alumni@alumnilink.demo', label: 'Alumnus', who: 'Dr. Mensah, Class of 2012' },
  { email: 'admin@alumnilink.demo', label: 'Admin', who: 'Alumni Relations Office' },
]

export default function LoginPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const signIn = (addr: string) => {
    const user = login(addr)
    if (!user) {
      setError('We could not find an account with that email. Check the spelling or create an account.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your AlumniLink account."
      footer={<>New to AlumniLink? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.trim() || !password) {
            setError('Enter your email and password.')
            return
          }
          signIn(email)
        }}
        className="space-y-4"
      >
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</p>}
        <Button type="submit" size="lg" className="w-full">Log in</Button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-bold text-slate-900">Try a demo account</h2>
        <p className="text-sm text-slate-600">No password needed for the demo.</p>
        <ul className="mt-3 space-y-2">
          {demoAccounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => signIn(a.email)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 text-left hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Continue as {a.label}</span>
                  <span className="block text-xs text-slate-600">{a.who}</span>
                </span>
                <span aria-hidden="true" className="text-brand-700">→</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AuthCard>
  )
}
