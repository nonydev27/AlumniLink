import React, { useState } from 'react'

type Audience = 'student' | 'alumni'

const steps: Record<Audience, { title: string; body: string }[]> = {
  student: [
    { title: 'Create your verified profile', body: 'Add your programme, year and the career you are curious about.' },
    { title: 'Get mentor suggestions', body: 'See alumni who may be a good fit, with a clear reason for every match.' },
    { title: 'Reach out with confidence', body: 'Send a request. Optional message tips help you write a clear, polite first note.' },
  ],
  alumni: [
    { title: 'Verify your graduation details', body: 'Confirm your batch and programme so students know you are genuine.' },
    { title: 'Choose how you help', body: 'Set whether you mentor, how often, and what contact details students can see.' },
    { title: 'Give back on your terms', body: 'Share openings, answer questions, and reconnect with your year group.' },
  ],
}

export const HowItWorksSection: React.FC = () => {
  const [audience, setAudience] = useState<Audience>('student')

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">How it works</p>
            <h2 id="how-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Three simple steps
            </h2>
          </div>

          <div role="group" aria-label="Show steps for" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200">
            {(['student', 'alumni'] as Audience[]).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={audience === a}
                onClick={() => setAudience(a)}
                className={`min-h-11 rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${
                  audience === a ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {a === 'student' ? 'For students' : 'For alumni'}
              </button>
            ))}
          </div>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps[audience].map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-bold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-slate-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorksSection
