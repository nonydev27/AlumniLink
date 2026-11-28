import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { messageOf } from '../lib/api'
import { useStore } from '../lib/store'

export default function LoginPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const gate = await login(email.trim(), password)
      if (gate.verificationRequired) navigate('/verify-email?sent=1', { replace: true })
      else if (gate.termsAcceptanceRequired) navigate('/accept-terms', { replace: true })
      else navigate(from, { replace: true })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your AlumniLink account."
      footer={<>New to AlumniLink? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      <form noValidate onSubmit={signIn} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</p>}
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot your password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</Button>
      </form>
    </AuthCard>
  )
}
