import React from 'react'
import { Link } from 'react-router'
import { Icon, type IconName } from '../ui/Icon'

const posts: { type: string; icon: IconName; badge: string; title: string; org: string; meta: string; postedBy: string }[] = [
  { type: 'Internship', icon: 'briefcase', badge: 'bg-brand-50 text-brand-800 ring-brand-200', title: 'Data Analyst Intern', org: 'Volta Insights · Accra', meta: '3 months · Paid', postedBy: 'Kwame M., Class of 2012' },
  { type: 'Job', icon: 'briefcase', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', title: 'Junior Frontend Engineer', org: 'Kente Pay · Hybrid', meta: 'Full-time', postedBy: 'Abena O., Class of 2017' },
  { type: 'Webinar', icon: 'calendar', badge: 'bg-violet-50 text-violet-800 ring-violet-200', title: 'Breaking into product management', org: 'Online · Captions provided', meta: 'Sat, 10:00 GMT', postedBy: 'Efua A., Class of 2016' },
  { type: 'Reunion', icon: 'users', badge: 'bg-amber-50 text-amber-900 ring-amber-200', title: 'Class of 2015 — 10-year reunion', org: 'Main campus · Great Hall', meta: 'December', postedBy: 'Batch 2015 group' },
]

export const OpportunitiesPreview: React.FC = () => (
  <section id="opportunities" aria-labelledby="opps-title" className="py-16 sm:py-24">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Opportunity board</p>
          <h2 id="opps-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Opportunities shared by people who've been there
          </h2>
          <p className="mt-3 text-lg text-slate-700">Internships, jobs, webinars and reunions, posted directly by verified alumni.</p>
        </div>
        <Link to="/register" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-1 font-semibold text-brand-700 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-brand-600 md:self-auto">
          See all opportunities
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p) => (
          <li key={p.title}>
            <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${p.badge}`}>
                <Icon name={p.icon} className="h-3.5 w-3.5" />
                {p.type}
              </span>
              <h3 className="mt-4 font-bold leading-snug text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{p.org}</p>
              <p className="text-sm text-slate-600">{p.meta}</p>
              <p className="mt-auto border-t border-slate-100 pt-3 text-xs text-slate-600">
                Posted by <span className="font-medium text-slate-800">{p.postedBy}</span>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default OpportunitiesPreview
