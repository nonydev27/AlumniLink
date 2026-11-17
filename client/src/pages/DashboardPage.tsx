import { Link } from 'react-router'
import { AIBadge } from '../components/ai/AIBadge'
import { MentorSuggestionCard } from '../components/ai/MentorSuggestionCard'
import { ProfileTipsCard } from '../components/ai/ProfileTipsCard'
import { RequestList } from '../components/network/RequestList'
import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { recommendOpportunities, suggestMentors } from '../lib/ai'
import { shortName } from '../lib/format'
import { useStore } from '../lib/store'
import { useState } from 'react'
import { PostOpportunityDialog } from '../components/opportunities/PostOpportunityDialog'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const { me, db, myState, undismissMatch } = useStore()
  const [postOpen, setPostOpen] = useState(false)
  if (!me) return null
  const ai = myState.settings.aiEnabled
  const visibleUsers = db.users.filter((u) => !myState.blocked.includes(u.id))
  const incoming = db.connections.filter((c) => c.toId === me.id && c.status === 'pending')
  const mentorResult = me.role === 'student' && ai ? suggestMentors(me, visibleUsers, myState.dismissedMatches) : null
  const recs = ai && me.role !== 'admin' ? recommendOpportunities(me, db.opportunities) : []
  const batchmates = db.users.filter((u) => u.gradYear === me.gradYear && u.id !== me.id && u.role !== 'admin').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{greeting()}{me.role === 'admin' ? '' : `, ${shortName(me.name)}`}</h1>
          <p className="mt-1 text-slate-700">
            {me.role === 'student' ? 'Here are people and opportunities that may help your next step.' : me.role === 'alumni' ? 'Here is how you can help students and reconnect with your batch.' : 'Platform overview.'}
          </p>
        </div>
        {me.role === 'admin' ? (
          <ButtonLink to="/admin" size="lg"><Icon name="shield" className="h-5 w-5" />Open admin panel</ButtonLink>
        ) : me.role === 'alumni' ? (
          <Button size="lg" onClick={() => setPostOpen(true)}><Icon name="plus" className="h-5 w-5" />Post an opportunity</Button>
        ) : (
          <ButtonLink to="/directory?mentoring=1" size="lg"><Icon name="search" className="h-5 w-5" />Find a mentor</ButtonLink>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {incoming.length > 0 && (
            <section aria-labelledby="req-title">
              <SectionTitle id="req-title" title={me.role === 'alumni' ? 'Mentorship & connection requests' : 'Connection requests'} action={<Link to="/network" className="text-sm font-semibold text-brand-700 hover:underline">See all</Link>} />
              <RequestList connections={incoming.slice(0, 3)} />
            </section>
          )}

          {me.role === 'student' && (
            <section aria-labelledby="mentors-title">
              <SectionTitle id="mentors-title" title="Suggested mentors" action={ai ? <AIBadge /> : undefined} />
              {!ai ? (
                <EmptyState icon="sparkles" title="AI suggestions are turned off" body="You can still browse the directory yourself, or turn suggestions back on in Settings." action={<ButtonLink to="/directory" variant="secondary">Browse directory</ButtonLink>} />
              ) : mentorResult?.status === 'insufficient' ? (
                <EmptyState icon="info" title="We need more details to suggest mentors" body={`Add ${mentorResult.missing.join(' and ')} to your profile, and we'll suggest alumni who may be a good fit.`} action={<ButtonLink to="/profile/edit">Complete your profile</ButtonLink>} />
              ) : mentorResult && mentorResult.matches.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {mentorResult.matches.map((m) => <MentorSuggestionCard key={m.user.id} match={m} />)}
                </div>
              ) : (
                <EmptyState icon="users" title="No new suggestions right now" body="We couldn't find a strong match. Try adding more interests, or browse the directory." action={<ButtonLink to="/directory" variant="secondary">Browse directory</ButtonLink>} />
              )}
              {ai && myState.dismissedMatches.length > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  You hid {myState.dismissedMatches.length} suggestion{myState.dismissedMatches.length > 1 ? 's' : ''}.{' '}
                  <button type="button" onClick={() => myState.dismissedMatches.forEach(undismissMatch)} className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline">Show them again</button>
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="opps-title">
            <SectionTitle id="opps-title" title={recs.length ? 'Opportunities for you' : 'Latest opportunities'} action={<Link to="/opportunities" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">View all</Link>} />
            {ai && recs.length > 0 ? (
              <>
                <div className="mb-3"><AIBadge label="AI recommendation" /></div>
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {recs.map((r) => <OpportunityCard key={r.opportunity.id} opp={r.opportunity} reasons={r.reasons} />)}
                </div>
              </>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {db.opportunities.slice(0, 3).map((o) => <OpportunityCard key={o.id} opp={o} />)}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {me.role !== 'admin' && <ProfileTipsCard />}
          {me.role !== 'admin' && (
            <Card>
              <h2 className="font-bold text-slate-900">Your batch</h2>
              <p className="mt-1 text-sm text-slate-700">{me.role === 'student' ? `Graduating ${me.gradYear}` : `Class of ${me.gradYear}`} · {batchmates} {batchmates === 1 ? 'member' : 'members'}</p>
              <ButtonLink to={`/batches/${me.gradYear}`} variant="secondary" className="mt-4 w-full">Open batch group</ButtonLink>
            </Card>
          )}
          <Card>
            <h2 className="font-bold text-slate-900">Need help?</h2>
            <p className="mt-1 text-sm text-slate-700">If a suggestion seems wrong or something feels unsafe, the Alumni Relations Office can help.</p>
            <a href="mailto:alumni-relations@university.example" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
              <Icon name="mail" className="h-4 w-4" />Contact an administrator
            </a>
          </Card>
        </aside>
      </div>

      <PostOpportunityDialog open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  )
}
