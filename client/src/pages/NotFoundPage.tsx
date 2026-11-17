import { ButtonLink } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-700">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink to="/" size="lg" className="mt-6">Back to home</ButtonLink>
    </div>
  )
}
