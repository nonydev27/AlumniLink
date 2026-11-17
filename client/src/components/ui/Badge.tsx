import type { ReactNode } from 'react'
import { cx } from '../../lib/format'
import { Icon, type IconName } from './Icon'

const tones = {
  neutral: 'bg-slate-100 text-slate-800 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
}

export type BadgeTone = keyof typeof tones

/** Always pairs colour with text (and optionally an icon), never colour alone. */
export function Badge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', tones[tone], className)}>
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

export function VerifiedBadge({ status }: { status: 'verified' | 'pending' | 'rejected' }) {
  if (status === 'verified') return <Badge tone="success" icon="shield">Verified</Badge>
  if (status === 'pending') return <Badge tone="warning" icon="clock">Verification pending</Badge>
  return <Badge tone="danger" icon="x">Not verified</Badge>
}
