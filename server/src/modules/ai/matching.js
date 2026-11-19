import { clean, humanList, norm, tokens } from '../../utils/text.js';
import { fitLevel } from './explain.js';

export { AI_LABEL, FIT } from './explain.js';

/**
 * Transparent, rule-based mentor matching.
 *
 * FAIRNESS: only the fields below are read - programme, interests, career goals, skills and what the
 * mentor does (industry, job title). Gender, ethnicity, family background, university ranking and
 * similar attributes are never collected or used, and test/matching.test.js checks that extra
 * properties cannot change a score.
 */
export const WEIGHTS = { programme: 30, interests: 25, goals: 25, skills: 10 };
export const MIN_SCORE = 25;

const phraseSet = (list) => new Set((list || []).map(norm).filter(Boolean));

/** Items of `a` (in a's wording) that also appear in `b`, compared case/accents/punctuation-insensitively. */
export function sharedPhrases(a, b) {
  const other = phraseSet(b);
  const seen = new Set();
  const out = [];
  for (const item of a || []) {
    const key = norm(item);
    if (key && other.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(clean(item));
    }
  }
  return out;
}

function goalSources(mentor) {
  const sources = [];
  if (mentor.industry) sources.push({ kind: 'industry', text: clean(mentor.industry) });
  if (mentor.jobTitle) sources.push({ kind: 'job', text: clean(mentor.jobTitle) });
  for (const s of mentor.skills || []) sources.push({ kind: 'skill', text: clean(s) });
  for (const s of mentor.interests || []) sources.push({ kind: 'interest', text: clean(s) });
  return sources.map((s) => ({ ...s, phrase: norm(s.text), toks: new Set(tokens(s.text)) }));
}

// A goal matches a source when the phrases are equal, or at least half of the goal's words appear in it.
function matchGoal(goal, sources) {
  const phrase = norm(goal);
  const toks = tokens(goal);
  if (!phrase || !toks.length) return null;
  for (const s of sources) {
    if (s.phrase === phrase) return s;
    if (toks.filter((t) => s.toks.has(t)).length / toks.length >= 0.5) return s;
  }
  return null;
}

const describeSource = (first, s) => {
  switch (s.kind) {
    case 'industry': return `${first} works in ${s.text}`;
    case 'job': return `${first} works as ${s.text}`;
    case 'skill': return `${first} has skills in ${s.text}`;
    default: return `${first} is interested in ${s.text}`;
  }
};

export function scoreMentor(student, mentor) {
  const first = clean(mentor.firstName) || 'This person';
  const reasons = [];

  if (student.programme && mentor.programme && norm(student.programme) === norm(mentor.programme)) {
    reasons.push({ code: 'same_programme', weight: WEIGHTS.programme, text: `You both chose the same programme: ${clean(mentor.programme)}.` });
  }

  const interests = sharedPhrases(student.interests, mentor.interests);
  if (interests.length) {
    const weight = interests.length >= 3 ? 25 : interests.length === 2 ? 20 : 12;
    reasons.push({
      code: 'shared_interests',
      weight,
      text: `You both listed ${humanList(interests.slice(0, 3))} as ${interests.length > 1 ? 'interests' : 'an interest'}.`,
    });
  }

  const sources = goalSources(mentor);
  const goals = [];
  for (const goal of student.careerGoals || []) {
    const hit = matchGoal(goal, sources);
    if (hit) goals.push({ goal: clean(goal), hit });
  }
  if (goals.length) {
    reasons.push({
      code: 'career_goal',
      weight: goals.length >= 2 ? 25 : 15,
      text: `You want a career in ${goals[0].goal}, and ${describeSource(first, goals[0].hit)}.`,
    });
  }

  const skills = sharedPhrases(student.skills, mentor.skills);
  if (skills.length) {
    reasons.push({
      code: 'shared_skills',
      weight: skills.length >= 2 ? 10 : 5,
      text: `You both list ${humanList(skills.slice(0, 3))} in your skills.`,
    });
  }

  reasons.sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0));
  return { score, confidence: fitLevel(score), reasons };
}

/** Honest failure: without interests or goals there is nothing meaningful to match on. */
export const hasEnoughForMatching = (s) => (s.interests?.length || 0) + (s.careerGoals?.length || 0) > 0;

export function missingForMatching(s) {
  const missing = [];
  if (!s.interests?.length) missing.push('interests');
  if (!s.careerGoals?.length) missing.push('careerGoals');
  return missing;
}

/**
 * Highest score first. Ties go to the mentor with fewer pending requests (so a few people aren't
 * overwhelmed), then to a stable but arbitrary id order - never to anything about who the person is.
 */
export function rankMentors(student, candidates, { limit = 5, minScore = MIN_SCORE } = {}) {
  return candidates
    .map((mentor) => ({ mentor, ...scoreMentor(student, mentor) }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) =>
      b.score - a.score
      || (a.mentor.pendingRequests ?? 0) - (b.mentor.pendingRequests ?? 0)
      || String(a.mentor.id).localeCompare(String(b.mentor.id)))
    .slice(0, limit);
}
