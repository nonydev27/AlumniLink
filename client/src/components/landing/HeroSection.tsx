import React, { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '../ui/Icon'
import { AISuggestionCard } from './AISuggestionCard'
import { searchFieldLabels, type SearchField } from './sampleData'

interface HeroSectionProps {
  onSearch: (query: string, field: SearchField) => void
}

const quickSearches = ['Software engineering', 'Finance', 'Healthcare', 'Accra']

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('')
  const [field, setField] = useState<SearchField>('all')

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white">
      {/* soft decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,var(--color-slate-300)_1px,transparent_0)] [background-size:28px_28px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Icon name="shield" className="h-4 w-4 text-brand-700" />
            Verified students &amp; alumni only
          </p>

          <h1 id="hero-title" className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Meet the alumni who've <span className="text-brand-700">walked your path.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700">
            AlumniLink connects students with graduates for mentorship, career advice and real
            opportunities. Reconnect with your batch, find a mentor in your field, and never miss an
            internship again.
          </p>

          <form
            role="search"
            aria-label="Search alumni"
            onSubmit={(e) => {
              e.preventDefault()
              onSearch(query, field)
            }}
            className="mt-8 rounded-2xl bg-white p-2 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">Search alumni by name, industry, company, programme or location</label>
              <div className="relative flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “data analytics” or “Kumasi”"
                  className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                />
              </div>
              <div className="flex gap-2">
                <label htmlFor="hero-field" className="sr-only">Filter by</label>
                <select
                  id="hero-field"
                  value={field}
                  onChange={(e) => setField(e.target.value as SearchField)}
                  className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:flex-none"
                >
                  {(Object.keys(searchFieldLabels) as SearchField[]).map((k) => (
                    <option key={k} value={k}>{searchFieldLabels[k]}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Popular:</span>
            {quickSearches.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q)
                  setField('all')
                  onSearch(q, 'all')
                }}
                className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:border-brand-300 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register?role=student" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              I'm a student
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link to="/register?role=alumni" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600">
              I'm an alumnus
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-100 via-white to-accent-100 blur-2xl" />
          <AISuggestionCard />
          <p className="mt-3 text-center text-xs text-slate-600">Interactive preview. Try the buttons.</p>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
