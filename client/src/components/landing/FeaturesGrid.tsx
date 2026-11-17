import React from 'react'
import { Icon, type IconName } from '../ui/Icon'

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield', title: 'Verified accounts', body: 'Everyone signs up with their graduation year, programme and batch, so you know who you are talking to.' },
  { icon: 'users', title: 'Batch & programme directory', body: 'Browse your year group or programme and reconnect with the people you studied with.' },
  { icon: 'user', title: 'Rich alumni profiles', body: 'See current work, skills and whether someone is open to mentoring, all in one place.' },
  { icon: 'filter', title: 'Advanced search', body: 'Filter by industry, company, programme or location to find exactly the right person.' },
  { icon: 'chat', title: 'Connect & message', body: 'Send connection requests, chat directly, and join group pages for your batch.' },
  { icon: 'briefcase', title: 'Opportunity board', body: 'Discover and share jobs, internships, webinars and reunions posted by alumni.' },
]

export const FeaturesGrid: React.FC = () => (
  <section id="features" aria-labelledby="features-title" className="py-16 sm:py-24">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Everything in one place</p>
        <h2 id="features-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          One trusted hub instead of scattered group chats
        </h2>
        <p className="mt-4 text-lg text-slate-700">
          Contact details get lost across social media and relationships fade after graduation. AlumniLink keeps your community together.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <li key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-200">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Icon name={f.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-700">{f.body}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default FeaturesGrid
