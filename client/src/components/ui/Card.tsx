import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/format'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6', className)} {...props} />
}

export function SectionTitle({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-bold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}
