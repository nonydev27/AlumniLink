import { useState } from 'react'
import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { PostOpportunityDialog } from '../components/opportunities/PostOpportunityDialog'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { inputClass } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { recommendOpportunities } from '../lib/ai'
import { useStore } from '../lib/store'

type Filter = 'all' | 'jobs' | 'internships' | 'events' | 'saved'

export default function OpportunitiesPage() {
  const { me, db, myState } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [postOpen, setPostOpen] = useState(false)
  if (!me) return null

  const reasons = new Map(myState.settings.aiEnabled ? recommendOpportunities(me, db.opportunities, 50).map((r) => [r.opportunity.id, r.reasons]) : [])
  const needle = q.trim().toLowerCase()
  const list = db.opportunities
    .filter((o) => {
      if (filter === 'jobs' && o.type !== 'job') return false
      if (filter === 'internships' && o.type !== 'internship') return false
      if (filter === 'events' && !['webinar', 'event', 'reunion'].includes(o.type)) return false
      if (filter === 'saved' && !myState.savedOpportunities.includes(o.id)) return false
      if (!needle) return true
      return [o.title, o.organisation, o.location, o.description, ...o.tags].some((f) => f.toLowerCase().includes(needle))
    })
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))

  const canPost = me.verification === 'verified' && (me.role === 'alumni' || me.role === 'admin')

  return (
    <>
      <PageHeader
        title="Opportunities & events"
        description="Jobs, internships, webinars and reunions shared by verified alumni and the university."
        actions={canPost ? <Button size="lg" onClick={() => setPostOpen(true)}><Icon name="plus" className="h-5 w-5" />Post opportunity</Button> : undefined}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          label="Filter opportunities"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'jobs', label: 'Jobs' },
            { value: 'internships', label: 'Internships' },
            { value: 'events', label: 'Events' },
            { value: 'saved', label: 'Saved', count: myState.savedOpportunities.length },
          ]}
        />
        <div className="relative lg:w-72">
          <label htmlFor="opp-q" className="sr-only">Search opportunities</label>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input id="opp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities" className={`${inputClass} h-11 pl-11`} />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-700" aria-live="polite">{list.length} {list.length === 1 ? 'result' : 'results'}</p>

      {list.length ? (
        <ul className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => <li key={o.id}><OpportunityCard opp={o} reasons={reasons.get(o.id)} /></li>)}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState icon="briefcase" title={filter === 'saved' ? 'Nothing saved yet' : 'No opportunities found'} body={filter === 'saved' ? 'Tap the bookmark on any opportunity to save it for later.' : 'Try a different filter or search term.'} />
        </div>
      )}

      <PostOpportunityDialog open={postOpen} onClose={() => setPostOpen(false)} />
    </>
  )
}
