import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { messageOf } from '../lib/api'
import { useStore } from '../lib/store'

export default function AcceptTermsPage() {
  const { me, acceptCurrentTerms } = useStore()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accepted) {
      setError('Accept the current terms to continue.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await acceptCurrentTerms()
      if (next.verificationRequired) navigate('/verify-email', { replace: true })
      else navigate('/dashboard', { replace: true })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Updated terms"
      subtitle={`Hi ${me?.name.split(' ')[0] ?? 'there'}, please review and accept the current terms before continuing.`}
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Use a different account</Link>}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-brand-700"
          />
          <span>I accept the current Terms of Use and Privacy Policy.</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Accept and continue'}</Button>
      </form>
    </AuthCard>
  )
}
