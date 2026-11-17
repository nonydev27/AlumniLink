import React from 'react'
import { Icon, type IconName } from '../ui/Icon'

const principles: { icon: IconName; title: string; body: string }[] = [
  { icon: 'info', title: 'Every suggestion explains why', body: 'You see the reason behind each match, like a shared course or interest.' },
  { icon: 'sparkles', title: 'Always labelled as AI', body: 'Machine-generated content carries an “AI suggestion” tag. No guessing.' },
  { icon: 'check', title: 'You stay in control', body: 'Accept, dismiss or edit suggestions, report bad matches, or turn AI off entirely.' },
  { icon: 'heart', title: 'No false promises or pressure', body: 'Honest wording like “may be a good fit”. Never fake urgency or guaranteed outcomes.' },
  { icon: 'lock', title: 'Privacy first', body: 'Only your profile and interests are used. Alumni contact details are never shared without consent.' },
  { icon: 'users', title: 'Fair by design', body: 'Matching never favours anyone based on gender, background or university ranking.' },
]

export const TrustedAISection: React.FC = () => (
  <section id="trusted-ai" aria-labelledby="ai-title" className="bg-brand-950 py-16 text-white sm:py-24">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">AI you can trust</p>
        <h2 id="ai-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          AI that supports your judgement, never replaces it
        </h2>
        <p className="mt-4 text-lg text-brand-100">
          AlumniLink uses AI to suggest mentors, improve your profile, coach your first message and surface opportunities, always openly and on your terms.
        </p>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {principles.map((p) => (
          <li key={p.title} className="bg-brand-950 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-brand-200">
              <Icon name={p.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-bold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-100">{p.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-brand-200">
        Something look wrong? You can always reach a human administrator from any suggestion.
      </p>
    </div>
  </section>
)

export default TrustedAISection
