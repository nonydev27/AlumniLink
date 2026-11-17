import { initials } from '../../lib/format'
import { cx } from '../../lib/format'

const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' }

/** Initials avatar. Decorative: the person's name is always shown as text next to it. */
export function Avatar({ name, color, size = 'md', className }: { name: string; color: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-bold', color, sizes[size], className)}>
      {initials(name)}
    </span>
  )
}
