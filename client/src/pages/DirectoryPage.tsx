import { useSearchParams } from 'react-router'
import { PersonCard } from '../components/directory/PersonCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { inputClass } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { VoiceInputButton } from '../components/ui/VoiceInputButton'
import { INDUSTRIES, PROGRAMMES } from '../data/seed'
import { useStore } from '../lib/store'

const selectClass = `${inputClass} h-11 text-sm`

export default function DirectoryPage() {
  const { me, db, myState } = useStore()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const role = params.get('role') ?? 'alumni'
  const programme = params.get('programme') ?? ''
  const industry = params.get('industry') ?? ''
  const year = params.get('year') ?? ''
  const location = params.get('location') ?? ''
  const mentoring = params.get('mentoring') === '1'

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const people = db.users.filter((u) => u.role !== 'admin' && u.verification === 'verified' && u.id !== me?.id && !myState.blocked.includes(u.id))
  const years = [...new Set(people.map((u) => u.gradYear))].sort((a, b) => b - a)
  const locations = [...new Set(people.map((u) => u.location).filter(Boolean))].sort()

  const needle = q.trim().toLowerCase()
  const results = people.filter((u) => {
    if (role !== 'all' && u.role !== role) return false
    if (programme && u.programme !== programme) return false
    if (industry && u.industry !== industry) return false
    if (year && String(u.gradYear) !== year) return false
    if (location && u.location !== location) return false
    if (mentoring && !(u.role === 'alumni' && u.mentoring)) return false
    if (!needle) return true
    const company = u.privacy.showCompany ? u.company ?? '' : ''
    return [u.name, u.headline, u.jobTitle ?? '', company, u.industry ?? '', u.programme, u.location, ...u.skills, ...u.interests].some((f) => f.toLowerCase().includes(needle))
  })

  const activeFilters = [programme, industry, year, location, mentoring ? '1' : ''].filter(Boolean).length

  return (
    <>
      <PageHeader title="Directory" description="Find alumni and students by batch, programme, industry, company or location." />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="dir-q" className="sr-only">Search by name, company, skill or interest</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input id="dir-q" type="search" value={q} onChange={(e) => update('q', e.target.value)} placeholder="Search name, company, skill or interest" className={`${inputClass} h-12 pl-11`} />
          </div>
          <VoiceInputButton onText={(t) => update('q', t)} label="Search by voice" className="h-12 w-12" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label htmlFor="f-role" className="mb-1 block text-xs font-semibold text-slate-700">Show</label>
            <select id="f-role" value={role} onChange={(e) => update('role', e.target.value === 'alumni' ? '' : e.target.value)} className={selectClass}>
              <option value="alumni">Alumni</option>
              <option value="student">Students</option>
              <option value="all">Everyone</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-prog" className="mb-1 block text-xs font-semibold text-slate-700">Programme</label>
            <select id="f-prog" value={programme} onChange={(e) => update('programme', e.target.value)} className={selectClass}>
              <option value="">Any</option>
              {PROGRAMMES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-year" className="mb-1 block text-xs font-semibold text-slate-700">Batch</label>
            <select id="f-year" value={year} onChange={(e) => update('year', e.target.value)} className={selectClass}>
              <option value="">Any</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-ind" className="mb-1 block text-xs font-semibold text-slate-700">Industry</label>
            <select id="f-ind" value={industry} onChange={(e) => update('industry', e.target.value)} className={selectClass}>
              <option value="">Any</option>
              {INDUSTRIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-loc" className="mb-1 block text-xs font-semibold text-slate-700">Location</label>
            <select id="f-loc" value={location} onChange={(e) => update('location', e.target.value)} className={selectClass}>
              <option value="">Any</option>
              {locations.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <label className="col-span-2 flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl px-1 md:col-span-1">
            <input type="checkbox" checked={mentoring} onChange={(e) => update('mentoring', e.target.checked ? '1' : '')} className="h-5 w-5 accent-brand-700" />
            <span className="text-sm font-semibold text-slate-800">Open to mentoring</span>
          </label>
        </div>
      </form>

      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-between gap-2" aria-live="polite">
        <p className="text-sm text-slate-700"><strong className="text-slate-900">{results.length}</strong> {results.length === 1 ? 'person' : 'people'} found</p>
        {(activeFilters > 0 || q) && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}><Icon name="x" className="h-4 w-4" />Clear all filters</Button>
        )}
      </div>

      {results.length ? (
        <ul className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((u) => <li key={u.id}><PersonCard user={u} /></li>)}
        </ul>
      ) : (
        <div className="mt-3"><EmptyState icon="search" title="No one matches those filters" body="Try removing a filter or searching for a broader term." /></div>
      )}
    </>
  )
}
