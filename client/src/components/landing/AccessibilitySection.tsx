import React from 'react'
import { Icon, type IconName } from '../ui/Icon'

const items: { icon: IconName; title: string; body: string }[] = [
  { icon: 'eye', title: 'Screen reader ready', body: 'Labelled controls, alt text on profile photos, and AI explanations as real, readable text.' },
  { icon: 'contrast', title: 'High contrast, never colour alone', body: 'At least 4.5:1 text contrast. Status always shows an icon and a label too.' },
  { icon: 'keyboard', title: 'Full keyboard access', body: 'Every feature works without a mouse, with clear focus outlines.' },
  { icon: 'type', title: 'Resizable text', body: 'Text scales with your browser settings without breaking the layout.' },
  { icon: 'mic', title: 'Voice input & captions', body: 'Search and write by voice. Webinars come with captions and transcripts.' },
  { icon: 'wifi', title: 'Light on data', body: 'Fast, text-first pages that work well on older phones and slow connections.' },
]

export const AccessibilitySection: React.FC = () => (
  <section id="accessibility" aria-labelledby="a11y-title" className="py-16 sm:py-24">
    <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Built for everyone</p>
        <h2 id="a11y-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          A network is only useful if every student can use it
        </h2>
        <p className="mt-4 text-lg text-slate-700">
          AlumniLink follows WCAG 2.2 from the start, with large touch targets, simple layouts and consistent navigation.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
          <Icon name="check" className="h-4 w-4" />
          Designed to WCAG 2.2 AA
        </p>
      </div>

      <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.title} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
              <Icon name={it.icon} className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">{it.title}</h3>
              <p className="mt-1 leading-relaxed text-slate-700">{it.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default AccessibilitySection
