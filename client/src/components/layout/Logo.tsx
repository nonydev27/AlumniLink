import { Link } from 'react-router'
import { Icon } from '../ui/Icon'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
        <Icon name="graduation" className="h-5 w-5" />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">
        Alumni<span className="text-brand-700">Link</span>
      </span>
    </Link>
  )
}
