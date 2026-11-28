import { useState } from 'react'
import { Link } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { authApi, messageOf } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setFailed(false)
    try {
      await authApi.forgotPassword(email.trim())
      // The server intentionally gives the same answer for unknown addresses.
      setMessage('If that address has an account, a password reset link is on its way.')
    } catch (cause) {
      setFailed(true)
      setMessage(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your account email and we will send you a one-time link."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link>}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {message && <p role={failed ? 'alert' : 'status'} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
      </form>
    </AuthCard>
  )
}
