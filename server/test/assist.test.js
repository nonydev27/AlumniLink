import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestedMessage, coachMessage, reviewDraft } from '../src/modules/ai/coach.js';
import { suggestFollowUps } from '../src/modules/ai/followups.js';
import { profileFeedback } from '../src/modules/ai/profileTips.js';
import { rankOpportunities, scoreOpportunity } from '../src/modules/ai/recommend.js';

test('coach: suggested message is polite, specific and editable text', () => {
  const msg = buildSuggestedMessage({
    student: { firstName: 'Esi', programme: 'Computer Science', graduationYear: 2027, role: 'student' },
    mentor: { firstName: 'Ama', jobTitle: 'Data Analyst', industry: 'Data Analytics' },
    sharedInterests: ['machine learning'],
  });
  assert.match(msg, /^Hello Ama,/);
  assert.match(msg, /machine learning/);
  assert.match(msg, /Thank you/);
  assert.match(msg, /Esi$/);
});

test('coach: draft review flags missing greeting, pressure and job requests', () => {
  const { tips } = reviewDraft('Give me a job ASAP', { mentorFirstName: 'Ama' });
  const codes = tips.map((t) => t.code);
  for (const code of ['too_short', 'no_greeting', 'no_name', 'pressure', 'job_ask', 'no_thanks']) assert.ok(codes.includes(code), code);
});

test('coach: a good draft gets a clean bill of health', () => {
  const draft = 'Hello Ama, my name is Esi and I study Computer Science at the university. I admire your work in data analytics. Would you be open to a short chat about getting started in the field? Thank you very much for your time.';
  assert.deepEqual(reviewDraft(draft, { mentorFirstName: 'Ama' }).tips, []);
  const out = coachMessage({ student: { firstName: 'Esi' }, mentor: { firstName: 'Ama' }, draft });
  assert.equal(out.label, 'AI suggestion');
  assert.match(out.draftReview.summary, /looks clear/);
});

test('follow-ups use the other person profile and never exceed the limit', () => {
  const out = suggestFollowUps({ other: { jobTitle: 'Data Analyst', industry: 'Finance' }, sharedInterests: ['AI', 'Cloud', 'Web'], limit: 4 });
  assert.equal(out.questions.length, 4);
  assert.match(out.questions[0], /Data Analyst/);
});

test('profile tips: empty student profile gets the documented prompt', () => {
  const out = profileFeedback({ role: 'student', skills: [], interests: [], careerGoals: [] });
  assert.ok(out.tips.some((t) => t.text === 'Add your skills to get better mentor matches.'));
  assert.equal(out.completeness, 0);
  assert.equal(out.label, 'AI suggestion');
});

test('profile tips: complete alumni profile has no tips; photo needs alt text', () => {
  const full = {
    role: 'alumni', headline: 'x', bio: 'x', skills: ['a'], interests: ['b'], currentCompany: 'c', jobTitle: 'j',
    industry: 'i', willingToMentor: true, avatarUrl: 'https://x.test/a.png', avatarAlt: 'A smiling person',
  };
  assert.equal(profileFeedback(full).tips.length, 0);
  assert.equal(profileFeedback(full).completeness, 100);
  assert.ok(profileFeedback({ ...full, avatarAlt: '' }).tips.some((t) => t.code === 'add_photo_description'));
});

test('opportunities: only relevant items are suggested, with reasons', () => {
  const user = { interests: ['data'], careerGoals: ['Data Science'], skills: ['Python'], location: 'Accra', programme: 'Computer Science' };
  const good = { id: 'o1', title: 'Data Science Internship', tags: ['python'], industry: 'Technology', location: 'Accra', isRemote: false };
  const bad = { id: 'o2', title: 'Nursing Fair', tags: ['health'], industry: 'Healthcare', location: 'Kumasi' };
  const s = scoreOpportunity(user, good);
  assert.ok(s.score >= 20);
  assert.ok(s.reasons.some((r) => r.code === 'location'));
  assert.equal(scoreOpportunity(user, bad).score, 0);
  assert.deepEqual(rankOpportunities(user, [bad, good]).map((r) => r.opportunity.id), ['o1']);
});
