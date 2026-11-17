import { useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../lib/store'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'

const links = [
  { href: '/#directory', label: 'Directory' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#opportunities', label: 'Opportunities' },
  { href: '/#trusted-ai', label: 'Trusted AI' },
  { href: '/#accessibility', label: 'Accessibility' },
]

/** Public site header (landing, login, register). */
export function Navbar() {
  const [open, setOpen] = useState(false)
  const { me } = useStore()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-600">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {me ? (
            <ButtonLink to="/dashboard">Go to dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
              <ButtonLink to="/register">Join AlumniLink</ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600 lg:hidden"
        >
          <Icon name={open ? 'x' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-slate-200 bg-white px-4 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-slate-800 hover:bg-slate-100">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            {me ? (
              <Link to="/dashboard" className="col-span-2 flex min-h-12 items-center justify-center rounded-xl bg-brand-700 font-semibold text-white">Go to dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 font-semibold text-slate-800">Log in</Link>
                <Link to="/register" className="flex min-h-12 items-center justify-center rounded-xl bg-brand-700 font-semibold text-white">Join</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
