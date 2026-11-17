import { Icon } from '../ui/Icon'

/** Every machine-generated output carries this label. */
export function AIBadge({ label = 'AI suggestion' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
      <Icon name="sparkles" className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
