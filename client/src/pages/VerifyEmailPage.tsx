import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { authApi, messageOf } from '../lib/api'
import { useStore } from '../lib/store'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { me, gate, markVerified } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState(me?.email ?? '')
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>(token ? 'working' : 'idle')
  const [message, setMessage] = useState<string | null>(null)
  const attempted = useRef<string | null>(null)

  useEffect(() => {
    if (!token || attempted.current === token) return
    attempted.current = token
    setStatus('working')
    authApi.verifyEmail(token)
      .then(async () => {
        const next = await markVerified()
        setStatus('done')
        setMessage('Your email is verified. You can continue to your account.')
        if (next.termsAcceptanceRequired) navigate('/accept-terms', { replace: true })
      })
      .catch((cause: unknown) => {
        setStatus('error')
        setMessage(messageOf(cause))
      })
  }, [token, markVerified, navigate])

  const resend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setMessage('Enter the email address you registered with.')
      return
    }
    setStatus('working')
    setMessage(null)
    try {
      await authApi.resendVerification(email.trim())
      setStatus('done')
      setMessage('If that address has a pending verification, a new link is on its way.')
    } catch (cause) {
      setStatus('error')
      setMessage(messageOf(cause))
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="A verified institutional address keeps the alumni directory trustworthy."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link>}
    >
      {token ? (
        <div className="space-y-4">
          <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {status === 'working' ? 'Checking your verification link…' : message}
          </p>
          {status === 'done' && gate.termsAcceptanceRequired === false && (
            <Button size="lg" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>Continue to dashboard</Button>
          )}
          {status === 'error' && (
            <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/verify-email', { replace: true })}>Request a new link</Button>
          )}
        </div>
      ) : (
        <form noValidate onSubmit={resend} className="space-y-4">
          {params.get('sent') === '1' && (
            <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
              We queued a verification email. Open the link in it to confirm your address.
            </p>
          )}
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {message && (
            <p role={status === 'error' ? 'alert' : 'status'} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={status === 'working'}>
            {status === 'working' ? 'Sending…' : 'Resend verification email'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
