import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { authApi, messageOf } from '../lib/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) {
      setFailed(true)
      setMessage('This reset link is missing its token. Request a new one.')
      return
    }
    if (password !== confirm) {
      setFailed(true)
      setMessage('The two passwords do not match.')
      return
    }
    setBusy(true)
    setMessage(null)
    setFailed(false)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setMessage('Your password has been changed. You can now log in with the new password.')
    } catch (cause) {
      setFailed(true)
      setMessage(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Use at least 8 characters and avoid common passwords."
      footer={done ? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Go to log in</Link> : <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Request a new link</Link>}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {message && <p role={failed ? 'alert' : 'status'} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        {!done && <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</Button>}
      </form>
    </AuthCard>
  )
}
