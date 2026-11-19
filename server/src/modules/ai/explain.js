import { lowerFirst } from '../../utils/text.js';

export const AI_LABEL = 'AI suggestion';

export const AI_NOTE =
  'Suggestions are generated automatically from profile details. You are always in control: you can accept, dismiss or ignore them, and turn them off in your settings.';

export const DISCLAIMER = 'This is a suggestion only. It does not promise a reply, a job or any other outcome.';
export const NOT_USED = 'Gender, family background and university ranking are never used.';
export const DATA_USED_MENTORS = "Your programme, interests, career goals and skills, and the public parts of the other person's profile.";
export const DATA_USED_OPPORTUNITIES = 'Your interests, career goals, skills and location, and the details of the opportunity.';

export const FIT = {
  strong: 'May be a strong fit',
  good: 'May be a good fit',
  possible: 'Worth a look',
};

export const fitLevel = (score) => (score >= 60 ? 'strong' : score >= 40 ? 'good' : 'possible');

/**
 * "Why this match?" - short (one plain sentence) or detailed (every reason, what data was used, what was not).
 * Reasons are written as clauses ("you both chose ...") so they read naturally after "Suggested because".
 */
export function explain(reasons, { level = 'short', intro = '', dataUsed = DATA_USED_MENTORS } = {}) {
  const texts = (reasons || []).map((r) => r.text);
  if (level === 'detailed') {
    return { level: 'detailed', summary: intro, reasons: texts, dataUsed, notUsed: NOT_USED, disclaimer: DISCLAIMER };
  }
  return {
    level: 'short',
    summary: texts.length ? `Suggested because ${lowerFirst(texts[0])}` : 'Suggested based on your profile.',
  };
}
