import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/format'

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 aria-[invalid=true]:border-red-600'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: (ids: { id: string; describedBy?: string }) => ReactNode
  className?: string
}

/** Visible label + hint + error, wired up with aria-describedby. */
export function FieldShell({ label, hint, error, optional, children, className }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-600">(optional)</span>}
      </label>
      {hint && <p id={hintId} className="mt-0.5 text-sm text-slate-600">{hint}</p>}
      <div className="mt-1.5">{children({ id, describedBy })}</div>
      {error && (
        <p id={errId} className="mt-1.5 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label: string; hint?: string; error?: string; optional?: boolean; wrapperClassName?: string }

export function TextField({ label, hint, error, optional, wrapperClassName, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={!!error} className={cx(inputClass, 'h-12', className)} {...props} />
      )}
    </FieldShell>
  )
}

export function TextAreaField({ label, hint, error, optional, wrapperClassName, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={!!error} className={cx(inputClass, 'min-h-28 py-3 leading-relaxed', className)} {...props} />
      )}
    </FieldShell>
  )
}

export function SelectField({ label, hint, error, optional, wrapperClassName, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={!!error} className={cx(inputClass, 'h-12', className)} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}
