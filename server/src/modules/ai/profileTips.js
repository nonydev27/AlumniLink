import { AI_LABEL } from './explain.js';

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

/** Friendly, specific suggestions for improving a profile, plus a 0-100 completeness figure. */
export function profileFeedback(p) {
  const alumni = p.role === 'alumni';

  const checks = [
    { code: 'add_headline', field: 'headline', weight: 10, ok: has(p.headline),
      text: alumni ? 'Add a short headline, like "Data analyst at a bank in Accra".' : 'Add a short headline, like "Final-year Computer Science student".' },
    { code: 'add_bio', field: 'bio', weight: 15, ok: has(p.bio), text: 'Write two or three sentences about yourself.' },
    { code: 'add_skills', field: 'skills', weight: 15, ok: has(p.skills),
      text: alumni ? 'Add your skills so students can see how you might help.' : 'Add your skills to get better mentor matches.' },
    { code: 'add_interests', field: 'interests', weight: 15, ok: has(p.interests),
      text: 'Add a few interests so we can explain why we suggest people to you.' },
  ];
  if (alumni) {
    checks.push(
      { code: 'add_company', field: 'currentCompany', weight: 10, ok: has(p.currentCompany), text: 'Add where you work so students know what you do.' },
      { code: 'add_job_title', field: 'jobTitle', weight: 10, ok: has(p.jobTitle), text: 'Add your job title.' },
      { code: 'add_industry', field: 'industry', weight: 10, ok: has(p.industry), text: 'Add your industry so students can find you in the directory.' },
      { code: 'open_to_mentoring', field: 'willingToMentor', weight: 0, ok: Boolean(p.willingToMentor),
        text: "Turn on \"open to mentoring\" if you'd like students to be able to ask you for guidance." },
    );
  } else {
    checks.push({ code: 'add_career_goals', field: 'careerGoals', weight: 15, ok: has(p.careerGoals),
      text: 'Add a career goal so we can suggest alumni who work in that area.' });
  }
  if (p.avatarUrl) {
    checks.push({ code: 'add_photo_description', field: 'avatarAlt', weight: 0, ok: has(p.avatarAlt),
      text: 'Add a short description of your photo so people who use screen readers can understand it.' });
  }

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.weight, 0);
  const tips = checks.filter((c) => !c.ok).map(({ code, field, text }) => ({ code, field, text }));

  return {
    label: AI_LABEL,
    completeness: total ? Math.round((earned / total) * 100) : 100,
    tips,
    message: tips.length ? null : 'Your profile looks complete. Nice work!',
  };
}
