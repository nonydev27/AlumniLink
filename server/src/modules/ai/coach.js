import { clean, humanList } from '../../utils/text.js';
import { AI_LABEL } from './explain.js';

export const COACH_NOTE = 'This is a starting point. Please edit it so it sounds like you - you decide what to send.';

const GREETING = /^\s*(hi|hello|hey|dear|good\s+(morning|afternoon|evening))\b/i;
const ASK = /\?|\b(would you|could you|can you|i would like|i'd like|i was hoping|may i)\b/i;
const THANKS = /\b(thank|thanks|appreciate|grateful)\b/i;
const PRESSURE = /\b(urgent|urgently|asap|immediately|right now|must reply|need (a|your) reply)\b/i;
const JOB_ASK = /\b(give me a job|get me a job|find me a job|hire me|offer me a job)\b/i;

/** A polite first message built only from details on the two public profiles. */
export function buildSuggestedMessage({ student, mentor, sharedInterests = [] }) {
  const studentFirst = clean(student.firstName);
  const mentorFirst = clean(mentor.firstName);
  const programme = clean(student.programme);
  const year = student.graduationYear;

  const who = student.role === 'alumni'
    ? `I studied ${programme || 'at the same university'}${year ? ` (class of ${year})` : ''}`
    : `I'm a ${programme ? `${programme} ` : ''}student${year ? ` (class of ${year})` : ''}`;

  const hook = sharedInterests.length
    ? `I noticed on your profile that we're both interested in ${humanList(sharedInterests.slice(0, 2))}.`
    : mentor.jobTitle
      ? `I came across your profile, and your work as ${clean(mentor.jobTitle)}${mentor.industry ? ` in ${clean(mentor.industry)}` : ''} really interested me.`
      : 'I came across your profile and would value hearing about your experience.';

  const topic = sharedInterests[0] || student.careerGoals?.[0] || clean(mentor.industry) || 'your career path';
  const ask = `Would you be open to a short 15\u201320 minute chat, or to answering a couple of questions by message, about ${topic}?`;

  return [
    `Hello ${mentorFirst},`,
    '',
    `My name is ${studentFirst}. ${who}. ${hook}`,
    '',
    ask,
    '',
    "Thank you for considering this. I understand if you're busy, and I'd be grateful for any advice you can share.",
    '',
    'Kind regards,',
    studentFirst,
  ].join('\n');
}

/** Plain-language feedback on a draft. Never blocks sending; it only suggests. */
export function reviewDraft(draft, { mentorFirstName } = {}) {
  const text = String(draft ?? '').trim();
  if (!text) return { tips: [] };
  const tips = [];
  const words = text.split(/\s+/).length;
  const letters = text.replace(/[^A-Za-z]/g, '');
  const upper = letters.replace(/[^A-Z]/g, '');

  if (text.length < 120) tips.push({ code: 'too_short', text: 'Your message is quite short. Say who you are and what you hope to learn.' });
  if (words > 180) tips.push({ code: 'too_long', text: 'Try to keep a first message under about 150 words. Shorter messages are easier to answer.' });
  if (!GREETING.test(text)) tips.push({ code: 'no_greeting', text: 'Start with a friendly greeting, like "Hello" followed by their name.' });
  if (mentorFirstName && !new RegExp(`\\b${clean(mentorFirstName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
    tips.push({ code: 'no_name', text: `Use ${clean(mentorFirstName)}'s name so the message feels personal.` });
  }
  if (!ASK.test(text)) tips.push({ code: 'no_ask', text: 'Say clearly what you are asking for, such as a short chat or advice on one topic.' });
  if (!THANKS.test(text)) tips.push({ code: 'no_thanks', text: 'Finish by thanking them for their time.' });
  if (PRESSURE.test(text)) tips.push({ code: 'pressure', text: 'Try to avoid words that put pressure on the person, like "urgent" or "ASAP".' });
  if (JOB_ASK.test(text)) tips.push({ code: 'job_ask', text: 'For a first message, asking for advice usually goes better than asking directly for a job.' });
  if (letters.length > 20 && upper.length / letters.length > 0.3) tips.push({ code: 'all_caps', text: 'Writing in capital letters can feel like shouting. Normal capitalisation is friendlier.' });

  return { tips };
}

export function coachMessage({ student, mentor, sharedInterests = [], draft }) {
  const review = reviewDraft(draft, { mentorFirstName: mentor.firstName });
  return {
    label: AI_LABEL,
    suggestedMessage: buildSuggestedMessage({ student, mentor, sharedInterests }),
    generalTips: [
      'Keep it short - a few sentences is enough.',
      'Mention one specific thing from their profile.',
      'Ask for one clear thing, like a short chat or advice on one topic.',
    ],
    draftReview: draft && String(draft).trim()
      ? { ...review, summary: review.tips.length ? 'A few ideas to make your message clearer.' : 'Your message looks clear and polite.' }
      : null,
    note: COACH_NOTE,
  };
}
