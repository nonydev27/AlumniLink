import React from 'react'
import { Link } from 'react-router'
import { Icon } from '../ui/Icon'
import { matchesSearch, sampleAlumni, searchFieldLabels, type SearchField } from './sampleData'

interface DirectoryPreviewProps {
  query: string
  field: SearchField
  onClear: () => void
}

export const DirectoryPreview: React.FC<DirectoryPreviewProps> = ({ query, field, onClear }) => {
  const results = sampleAlumni.filter((a) => matchesSearch(a, query, field))
  const hasQuery = query.trim().length > 0

  return (
    <section id="directory" aria-labelledby="directory-title" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Smart directory</p>
            <h2 id="directory-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Find people by batch, programme or career
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Every profile shows what they do now, their skills, and whether they're open to mentoring.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3" aria-live="polite">
          <p className="text-sm text-slate-700">
            {hasQuery ? (
              <>
                <strong className="font-semibold text-slate-900">{results.length}</strong>{' '}
                {results.length === 1 ? 'result' : 'results'} for “{query}”
                {field !== 'all' && <> in {searchFieldLabels[field].toLowerCase()}</>}
              </>
            ) : (
              <>Showing sample profiles</>
            )}
          </p>
          {hasQuery && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
              Clear search
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-900">No sample profiles match that search.</p>
            <p className="mt-1 text-sm text-slate-600">Try an industry like “Fintech” or a city like “Accra”.</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((a) => (
              <li key={a.id}>
                <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold ${a.avatarClass}`} aria-hidden="true">
                      {a.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">{a.name}</h3>
                      <p className="text-sm text-slate-700">{a.role}</p>
                      <p className="text-sm text-slate-600">{a.company}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate-600">Programme</dt>
                      <dd className="font-medium text-slate-800">{a.programme}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">Batch</dt>
                      <dd className="font-medium text-slate-800">Class of {a.batch}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">Industry</dt>
                      <dd className="font-medium text-slate-800">{a.industry}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">Location</dt>
                      <dd className="inline-flex items-center gap-1 font-medium text-slate-800">
                        <Icon name="mapPin" className="h-3.5 w-3.5 text-slate-500" />
                        {a.location}
                      </dd>
                    </div>
                  </dl>

                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills">
                    {a.skills.map((s) => (
                      <li key={s} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{s}</li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-5">
                    <p className={`mb-3 inline-flex items-center gap-1.5 text-xs font-semibold ${a.mentoring ? 'text-emerald-800' : 'text-slate-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${a.mentoring ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                      {a.mentoring ? 'Open to mentoring' : 'Not mentoring right now'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                        Connect<span className="sr-only"> with {a.name}</span>
                      </Link>
                      <Link to="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                        View profile<span className="sr-only"> of {a.name}</span>
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">Sample profiles for preview. Join to browse the full verified directory.</p>
      </div>
    </section>
  )
}

export default DirectoryPreview
