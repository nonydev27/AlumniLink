import { cx } from '../../lib/format'

interface TabsProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string; count?: number }[]
  onChange: (v: T) => void
}

/** Segmented filter control (buttons with aria-pressed), scrollable on small screens. */
export function Tabs<T extends string>({ label, value, options, onChange }: TabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600',
            value === o.value ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-xs', value === o.value ? 'bg-white/20' : 'bg-slate-100 text-slate-700')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
