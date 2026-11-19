import test from 'node:test';
import assert from 'node:assert/strict';
import { explain } from '../src/modules/ai/explain.js';
import { hasEnoughForMatching, missingForMatching, rankMentors, scoreMentor } from '../src/modules/ai/matching.js';

const student = {
  programme: 'Computer Science',
  interests: ['Machine Learning', 'Web Dev'],
  careerGoals: ['Data Science'],
  skills: ['Python'],
};
const mentor = {
  id: 'm1',
  firstName: 'Ama',
  lastName: 'Mensah',
  programme: 'computer science',
  industry: 'Data Analytics',
  jobTitle: 'Data Analyst',
  skills: ['python', 'SQL'],
  interests: ['machine learning'],
};

test('scores programme, interests, career goal and skills with reasons', () => {
  const m = scoreMentor(student, mentor);
  assert.deepEqual(m.reasons.map((r) => r.code).sort(), ['career_goal', 'same_programme', 'shared_interests', 'shared_skills']);
  assert.equal(m.score, 30 + 12 + 15 + 5);
  assert.equal(m.confidence, 'strong');
  assert.match(m.reasons.find((r) => r.code === 'career_goal').text, /works in Data Analytics/);
});

test('fairness: extra attributes never change the score', () => {
  const plain = scoreMentor(student, mentor);
  const noisy = scoreMentor(
    { ...student, gender: 'female', ethnicity: 'x', universityRank: 1, familyIncome: 'high' },
    { ...mentor, gender: 'male', ethnicity: 'y', universityRank: 99, familyIncome: 'low' },
  );
  assert.deepEqual(noisy, plain);
});

test('no overlap means no suggestion', () => {
  const stranger = { id: 'z', firstName: 'Kofi', programme: 'Nursing', industry: 'Health', skills: [], interests: [] };
  assert.equal(scoreMentor(student, stranger).score, 0);
  assert.deepEqual(rankMentors(student, [stranger]), []);
});

test('ranking: higher score first, then mentors with fewer pending requests', () => {
  const a = { ...mentor, id: 'a', pendingRequests: 5 };
  const b = { ...mentor, id: 'b', pendingRequests: 1 };
  const weaker = { ...mentor, id: 'c', interests: [], skills: [] };
  const ranked = rankMentors(student, [weaker, a, b], { limit: 3 });
  assert.deepEqual(ranked.map((r) => r.mentor.id), ['b', 'a', 'c']);
});

test('honest failure when there is not enough information', () => {
  assert.equal(hasEnoughForMatching({ interests: [], careerGoals: [] }), false);
  assert.deepEqual(missingForMatching({ interests: [], careerGoals: [] }), ['interests', 'careerGoals']);
  assert.equal(hasEnoughForMatching({ interests: ['AI'], careerGoals: [] }), true);
});

test('explanations: short is one sentence, detailed lists reasons and limits', () => {
  const m = scoreMentor(student, mentor);
  const short = explain(m.reasons, { level: 'short' });
  assert.match(short.summary, /^Suggested because you both chose the same programme/);
  const detailed = explain(m.reasons, { level: 'detailed', intro: 'Ama Mensah may be a good mentor for you.' });
  assert.equal(detailed.reasons.length, 4);
  assert.match(detailed.notUsed, /never used/);
  assert.match(detailed.disclaimer, /does not promise/);
});
