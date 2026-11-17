// AI feedback helpers.
//
// These run in the browser with transparent, rule-based scoring so every
// suggestion can explain itself. The backend can later replace them with a
// model-backed service, but must keep the same contract:
//   - every result carries human-readable `reasons`
//   - uncertain wording ("may be a good fit"), never guarantees
//   - honest failure when there is not enough information
//   - only profile fields (programme, interests, skills, goals) are used.
//     Never gender, background, photo or university ranking.
import type { Opportunity, User } from '../types'

const norm = (s: string) => s.trim().toLowerCase()
const words = (s: string) => norm(s).split(/[^a-z0-9+#]+/).filter((w) => w.length > 2)

function overlap(a: string[], b: string[]): string[] {
  const bn = new Set(b.map(norm))
  return a.filter((x) => bn.has(norm(x)))
}

function goalHits(goals: string, target: User): string[] {
  const g = new Set(words(goals))
  if (!g.size) return []
  const fields = [target.industry ?? '', target.jobTitle ?? '', ...target.skills, ...target.interests]
  return fields.filter((f) => f && words(f).some((w) => g.has(w)))
}

export interface MentorMatch {
  user: User
  score: number
  reasons: string[]
}

export type MatchResult =
  | { status: 'ok'; matches: MentorMatch[] }
  | { status: 'insufficient'; missing: string[] }

/** Suggest alumni mentors for a student. */
export function suggestMentors(student: User, candidates: User[], exclude: string[] = [], limit = 3): MatchResult {
  const missing: string[] = []
  if (!student.interests.length) missing.push('your interests')
  if (!student.careerGoals.trim()) missing.push('your career goals')
  if (missing.length === 2 && !student.skills.length) return { status: 'insufficient', missing }

  const matches: MentorMatch[] = []
  for (const c of candidates) {
    if (c.id === student.id || c.role !== 'alumni' || !c.mentoring || c.verification !== 'verified' || exclude.includes(c.id)) continue
    let score = 0
    const reasons: string[] = []

    if (norm(c.programme) === norm(student.programme)) {
      score += 3
      reasons.push(`You both studied ${c.programme}.`)
    }
    const goals = goalHits(student.careerGoals, c)
    if (goals.length) {
      score += 3
      reasons.push(`You want a career in ${student.careerGoals.toLowerCase()}, and ${firstName(c)} works ${c.jobTitle ? `as ${aOrAn(c.jobTitle)} ${c.jobTitle}` : `in ${c.industry}`}.`)
    }
    const shared = overlap(student.interests, [...c.interests, ...c.skills])
    if (shared.length) {
      score += 2 * shared.length
      reasons.push(`You both listed ${listJoin(shared.map((s) => s.toLowerCase()))} as ${shared.length > 1 ? 'interests' : 'an interest'}.`)
    }
    const skills = overlap(student.skills, c.skills)
    if (skills.length) {
      score += skills.length
      reasons.push(`You share skills in ${listJoin(skills)}.`)
    }
    if (score >= 3) matches.push({ user: c, score, reasons })
  }

  matches.sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name))
  return { status: 'ok', matches: matches.slice(0, limit) }
}

export interface ProfileTip {
  id: string
  text: string
  field: keyof User
}

/** Short, actionable tips to improve a profile. Ordered by impact. */
export function profileTips(user: User): ProfileTip[] {
  const tips: ProfileTip[] = []
  if (!user.interests.length) tips.push({ id: 'interests', field: 'interests', text: 'Add a few interests to get better mentor matches.' })
  if (user.role === 'student' && !user.careerGoals.trim()) tips.push({ id: 'goals', field: 'careerGoals', text: 'Tell us your career goals so we can suggest relevant alumni and opportunities.' })
  if (user.skills.length < 2) tips.push({ id: 'skills', field: 'skills', text: 'Add your skills to get better mentor matches.' })
  if (!user.bio.trim()) tips.push({ id: 'bio', field: 'bio', text: 'Write a short bio so people know what you would like to talk about.' })
  if (user.role === 'alumni' && !user.jobTitle) tips.push({ id: 'job', field: 'jobTitle', text: 'Add your current role so students can find you by career.' })
  if (!user.location.trim()) tips.push({ id: 'location', field: 'location', text: 'Add your location to appear in location searches.' })
  return tips
}

export function profileCompleteness(user: User): number {
  const checks = [
    !!user.headline, !!user.bio, !!user.location, user.skills.length > 0, user.interests.length > 0,
    user.role === 'student' ? !!user.careerGoals : !!user.jobTitle,
    user.role === 'student' ? true : !!user.industry,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export interface OpportunityMatch {
  opportunity: Opportunity
  reasons: string[]
}

/** Recommend opportunities based on interests, skills, goals and programme. */
export function recommendOpportunities(user: User, opps: Opportunity[], limit = 3): OpportunityMatch[] {
  const profileTerms = new Set([...user.interests, ...user.skills, ...words(user.careerGoals)].map(norm))
  const out: (OpportunityMatch & { score: number })[] = []
  for (const o of opps) {
    if (o.postedById === user.id) continue
    if (user.role === 'student' && o.type === 'reunion') continue
    if (o.type === 'reunion' && !o.tags.some((t) => t.includes(String(user.gradYear)))) continue
    const hits = o.tags.filter((t) => profileTerms.has(norm(t)) || words(t).some((w) => profileTerms.has(w)))
    const reasons: string[] = []
    let score = 0
    if (hits.length) {
      score += hits.length * 2
      reasons.push(`Matches your interest in ${listJoin(hits.slice(0, 2).map((h) => h.toLowerCase()))}.`)
    }
    if (o.type === 'reunion') {
      score += 5
      reasons.push(`It's for your batch, the Class of ${user.gradYear}.`)
    }
    if (user.role === 'student' && o.type === 'internship' && hits.length) {
      score += 1
      reasons.push('Internships are a good next step for students.')
    }
    if (score > 0) out.push({ opportunity: o, reasons, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export interface CoachTip {
  ok: boolean
  text: string
}

/** Feedback on a first message to an alumnus. Only shown when the user asks for it. */
export function coachMessage(draft: string, recipient: User, sender: User): { tips: CoachTip[]; example: string } {
  const d = draft.trim()
  const lower = d.toLowerCase()
  const wc = d ? d.split(/\s+/).length : 0
  const tips: CoachTip[] = [
    { ok: /\b(hi|hello|dear|good (morning|afternoon|evening))\b/.test(lower), text: 'Start with a friendly greeting using their name.' },
    { ok: /\b(i am|i'm|my name)\b/.test(lower), text: 'Briefly introduce yourself: your programme and year.' },
    { ok: /\?/.test(d) || /\b(could you|would you|can you|advice|help)\b/.test(lower), text: 'Make one clear, specific request or question.' },
    { ok: wc >= 25 && wc <= 150, text: wc > 150 ? 'Keep it shorter. Aim for under 150 words.' : 'Add a little more detail. Around 40–120 words works well.' },
    { ok: /\b(thank|thanks|appreciate)\b/.test(lower), text: 'Close politely, for example by thanking them for their time.' },
  ]
  const topic = sender.careerGoals || recipient.industry || 'your field'
  const example =
    `Hello ${recipient.name.split(' ').slice(0, 2).join(' ')},\n\n` +
    `I'm ${sender.name.split(' ')[0]}, a ${sender.programme} student graduating in ${sender.gradYear}. ` +
    `I'm interested in ${topic.toLowerCase()} and saw that you work ${recipient.jobTitle ? `as ${aOrAn(recipient.jobTitle)} ${recipient.jobTitle}` : `in ${recipient.industry ?? 'this area'}`}. ` +
    `Could you share what helped you most when you were starting out?\n\n` +
    `Thank you for your time.`
  return { tips, example }
}

/** Follow-up question ideas after a mentoring conversation. */
export function followUpQuestions(other: User): string[] {
  const field = other.industry?.toLowerCase() ?? 'your field'
  return [
    `What skills should I focus on this year to prepare for ${field}?`,
    'Is there a project or course you would recommend I start with?',
    `Do you know anyone else in ${field} who might be open to a short chat?`,
  ]
}

// ---- helpers ----
function firstName(u: User) {
  const parts = u.name.split(' ')
  return parts[0].endsWith('.') ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]
}
function aOrAn(w: string) {
  return /^[aeiou]/i.test(w) ? 'an' : 'a'
}
function listJoin(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
