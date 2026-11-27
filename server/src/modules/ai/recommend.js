import { clean, humanList, norm, tokens } from '../../utils/text.js';
import { fitLevel } from './explain.js';

export const MIN_OPPORTUNITY_SCORE = 20;

export const hasEnoughForOpportunities = (u) =>
  (u.interests?.length || 0) + (u.careerGoals?.length || 0) + (u.skills?.length || 0) > 0;

export const missingForOpportunities = (u) =>
  hasEnoughForOpportunities(u) ? [] : ['interests', 'careerGoals', 'skills'];

// Items whose words (at least half of them) appear in the opportunity's title, industry or tags.
const relatedItems = (list, oppTokens) =>
  (list || []).filter((item) => {
    const t = tokens(item);
    return t.length > 0 && t.filter((w) => oppTokens.has(w)).length / t.length >= 0.5;
  }).map(clean);

/** Opportunity alerts: explainable keyword overlap with the person's interests, goals, skills and location. */
export function scoreOpportunity(user, opp) {
  const oppTokens = new Set(tokens([opp.title, opp.industry, opp.company, ...(opp.tags || [])].filter(Boolean).join(' ')));
  const reasons = [];

  const interests = relatedItems(user.interests, oppTokens);
  if (interests.length) {
    reasons.push({
      code: 'interest',
      weight: interests.length >= 2 ? 30 : 20,
      text: `It matches your interest in ${humanList(interests.slice(0, 2))}.`,
    });
  }
  const goals = relatedItems(user.careerGoals, oppTokens);
  if (goals.length) {
    reasons.push({
      code: 'career_goal',
      weight: goals.length >= 2 ? 30 : 20,
      text: `It relates to your career goal: ${humanList(goals.slice(0, 2))}.`,
    });
  }
  const skills = relatedItems(user.skills, oppTokens);
  if (skills.length) {
    reasons.push({
      code: 'skills',
      weight: skills.length >= 2 ? 20 : 10,
      text: `It uses skills you listed: ${humanList(skills.slice(0, 3))}.`,
    });
  }

  if (reasons.length) { // location only adds weight to an already relevant match
    const userLoc = norm(user.location);
    const oppLoc = norm(opp.location);
    if (userLoc && oppLoc && (userLoc === oppLoc || userLoc.includes(oppLoc) || oppLoc.includes(userLoc))) {
      reasons.push({ code: 'location', weight: 10, text: `It is in ${clean(opp.location)}.` });
    } else if (opp.isRemote) {
      reasons.push({ code: 'remote', weight: 5, text: 'It can be done remotely.' });
    }
    if (opp.posterProgramme && user.programme && norm(opp.posterProgramme) === norm(user.programme)) {
      reasons.push({ code: 'same_programme_poster', weight: 10, text: 'It was shared by someone from your programme.' });
    }
  }

  reasons.sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, reasons.reduce((s, r) => s + r.weight, 0));
  return { score, confidence: fitLevel(score), reasons };
}

export function rankOpportunities(user, opps, { limit = 5, minScore = MIN_OPPORTUNITY_SCORE } = {}) {
  return opps
    .map((opportunity) => ({ opportunity, ...scoreOpportunity(user, opportunity) }))
    .filter((o) => o.score >= minScore)
    .sort((a, b) => b.score - a.score || String(a.opportunity.id).localeCompare(String(b.opportunity.id)))
    .slice(0, limit);
}
