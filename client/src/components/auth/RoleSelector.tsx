import { cx } from '../../lib/format'
import { Icon, type IconName } from '../ui/Icon'

type R = 'student' | 'alumni'
const options: { value: R; label: string; body: string; icon: IconName }[] = [
  { value: 'student', label: "I'm a student", body: 'Find mentors and opportunities', icon: 'graduation' },
  { value: 'alumni', label: "I'm an alumnus", body: 'Reconnect and give back', icon: 'users' },
]

export function RoleSelector({ value, onChange }: { value: R; onChange: (r: R) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">I am joining as</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
              value === o.value ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <input type="radio" name="role" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="flex items-center justify-between">
              <Icon name={o.icon} className={cx('h-6 w-6', value === o.value ? 'text-brand-700' : 'text-slate-600')} />
              {value === o.value && <Icon name="check" className="h-5 w-5 text-brand-700" />}
            </span>
            <span className="mt-2 font-bold text-slate-900">{o.label}</span>
            <span className="text-sm text-slate-600">{o.body}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
