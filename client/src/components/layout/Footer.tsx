import { Link } from 'react-router'
import { Logo } from './Logo'

const columns: { title: string; links: [string, string][] }[] = [
  { title: 'Platform', links: [['Directory', '/#directory'], ['Opportunities', '/#opportunities'], ['How it works', '/#how-it-works']] },
  { title: 'Trust', links: [['How we use AI', '/#trusted-ai'], ['Accessibility', '/#accessibility'], ['Privacy & consent', '/#trusted-ai']] },
  { title: 'Get started', links: [['Join as a student', '/register?role=student'], ['Join as an alumnus', '/register?role=alumni'], ['Log in', '/login']] },
]

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-700">
            A trusted, verified network connecting current students with graduates for mentorship, networking and careers.
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-bold text-slate-900">{c.title}</h2>
            <ul className="mt-3 space-y-1">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith('/#') ? (
                    <a href={href} className="inline-flex min-h-9 items-center text-sm text-slate-700 hover:text-brand-700 hover:underline">{label}</a>
                  ) : (
                    <Link to={href} className="inline-flex min-h-9 items-center text-sm text-slate-700 hover:text-brand-700 hover:underline">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} AlumniLink. Built by Group 30.</p>
          <p>People shown in this demo are fictional.</p>
        </div>
      </div>
    </footer>
  )
}
