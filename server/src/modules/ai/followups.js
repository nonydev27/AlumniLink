import { clean } from '../../utils/text.js';
import { AI_LABEL } from './explain.js';

/** Follow-up questions to keep a mentoring conversation going, built from the other person's profile. */
export function suggestFollowUps({ other, sharedInterests = [], limit = 5 }) {
  const title = clean(other.jobTitle);
  const field = clean(other.industry);
  const questions = [];

  if (title) questions.push(`What does a typical week look like for you as a ${title}?`);
  if (field) questions.push(`Which skills helped you most when you started in ${field}?`);
  if (field) questions.push(`What would you do differently if you were starting out in ${field} today?`);
  for (const interest of sharedInterests.slice(0, 2)) {
    questions.push(`Is there a small project or resource you would recommend to build skills in ${interest}?`);
  }
  questions.push('Is there anything you wish you had known when you were at university?');
  questions.push('Do you know of any internships, events or people I should look out for?');

  return {
    label: AI_LABEL,
    questions: [...new Set(questions)].slice(0, limit),
    note: 'These are ideas only. Ask what feels right for your conversation.',
  };
}
