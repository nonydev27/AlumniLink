// End-to-end check against a RUNNING server and database:
//   npm run dev            (in one terminal, after `npm run migrate && npm run seed`)
//   npm run smoke          (in another)
// Walks through the main flows from the project report. Uses throw-away accounts.
// Auth goes through v2; the frozen v1 auth surface is checked separately.
import { db, pool } from '../src/db.js';
import { deriveActionToken } from '../src/modules/v2/auth/email-actions.js';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const AUTH_BASE = process.env.AUTH_API_URL || 'http://localhost:4000/api/v2';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@alumnilink.test', password: process.env.ADMIN_PASSWORD || 'Admin#Pass2026' };

let passed = 0;
async function call(method, path, { token, body, expect, base = BASE } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (expect && res.status !== expect) {
    throw new Error(`${method} ${path} -> ${res.status} (expected ${expect}): ${text.slice(0, 300)}`);
  }
  return json;
}
const authCall = (method, path, options = {}) => call(method, path, { ...options, base: AUTH_BASE });
const step = async (name, fn) => { await fn(); passed += 1; console.log(`  ok  ${name}`); };

// The default email adapter does not deliver messages. The outbox deliberately
// stores only a token id, so derive the same HMAC token the message would carry.
async function verifyEmail(email) {
  const outbox = await db.one(
    `select payload from notification_outbox
      where notification_type = 'email_verification' and payload->>'to' = $1
      order by created_at desc limit 1`,
    [email],
  );
  if (!outbox?.payload?.tokenId) throw new Error(`No verification message queued for ${email}`);
  const token = deriveActionToken(outbox.payload.tokenId, 'verify_email');
  await authCall('POST', '/auth/verify-email', { body: { token }, expect: 200 });
}

const run = Date.now().toString(36);
const pw = 'Smoke#Test2026';
const student = {
  email: `student-${run}@smoke.test`, password: pw, fullName: 'Sam Student', role: 'student',
  programme: 'Computer Science', graduationYear: 2027, acceptTerms: true,
};
const alumni = {
  email: `alumni-${run}@smoke.test`, password: pw, fullName: 'Alex Alumni', role: 'alumni',
  programme: 'Computer Science', graduationYear: 2018, acceptTerms: true,
};
let s; let a; let alumnusId; let admin; let suggestion; let connection; let conversationId;

console.log(`Smoke test against ${BASE} (auth: ${AUTH_BASE})`);
try {
  await step('health', async () => {
    await fetch(BASE.replace('/api/v1', '/health/ready')).then((r) => { if (!r.ok) throw new Error('not ready'); });
  });
  await step('v1 auth is frozen', async () => {
    await call('POST', '/auth/login', { body: ADMIN, expect: 410 });
  });
  await step('approved institution domains are publicly discoverable', async () => {
    const catalog = await authCall('GET', '/public/institutions', { expect: 200 });
    if (!catalog.data.some((row) => row.domain === 'smoke.test')) throw new Error('reviewed domain missing');
  });
  await step('register student + alumni through v2, then verify their emails', async () => {
    const registeredStudent = await authCall('POST', '/auth/register', { body: student, expect: 202 });
    await verifyEmail(student.email);
    s = registeredStudent.data.tokens;
    const registeredAlumni = await authCall('POST', '/auth/register', { body: alumni, expect: 202 });
    await verifyEmail(alumni.email);
    a = registeredAlumni.data.tokens;
    alumnusId = registeredAlumni.data.user.id;
  });
  await step('validation errors are friendly', async () => {
    const r = await authCall('POST', '/auth/register', {
      body: { ...student, email: 'nope', password: '123' }, expect: 400,
    });
    if (!r.error.fields.email || !r.error.fields.password) throw new Error('missing field messages');
  });
  await step('unverified alumni are blocked from networking', async () => {
    await call('GET', '/directory', { token: a.accessToken, expect: 403 });
  });
  await step('admin verifies the alumnus', async () => {
    admin = (await authCall('POST', '/auth/login', { body: ADMIN, expect: 200 })).data.tokens;
    const pending = await call('GET', '/admin/verifications?limit=50', { token: admin.accessToken, expect: 200 });
    const target = pending.data.find((u) => u.email === alumni.email);
    if (!target) throw new Error('pending alumnus not found in admin queue');
    await call('PATCH', `/admin/verifications/${target.id}`, {
      token: admin.accessToken, body: { decision: 'approve' }, expect: 200,
    });
  });
  await step('alumni profile + open to mentoring', async () => {
    await call('PATCH', '/me/profile', { token: a.accessToken, expect: 200, body: {
      headline: 'Data analyst', industry: 'Data Analytics', jobTitle: 'Data Analyst', currentCompany: 'Smoke Co',
      skills: ['Python', 'SQL'], interests: ['Machine Learning', `Topic ${run}`], willingToMentor: true } });
    await authCall('PATCH', '/me/mentor-preferences', {
      token: a.accessToken, body: { featuredMentorOptIn: true }, expect: 200,
    });
  });
  await step('approved alumni identity fields are locked', async () => {
    await call('PATCH', '/me/profile', {
      token: a.accessToken, expect: 409, body: { graduationYear: 2019 },
    });
  });
  await step('AI says it needs more details when the profile is empty', async () => {
    const r = await call('GET', '/ai/mentors', { token: s.accessToken, expect: 200 });
    if (r.status !== 'needs_more_details') throw new Error(`expected needs_more_details, got ${r.status}`);
  });
  await step('student profile, then explainable mentor suggestion', async () => {
    await call('PATCH', '/me/profile', { token: s.accessToken, expect: 200, body: {
      skills: ['Python'], interests: ['Machine Learning', `Topic ${run}`], careerGoals: ['Data Science'] } });
    await authCall('PATCH', '/me/mentor-preferences', {
      token: s.accessToken, body: { seekingMentorship: true }, expect: 200,
    });
    const r = await call('GET', '/ai/mentors', { token: s.accessToken, expect: 200 });
    suggestion = r.suggestions.find((x) => x.mentor.id === alumnusId);
    if (!suggestion) throw new Error('expected the new alumnus to be suggested');
    if (suggestion.label !== 'AI suggestion' || !suggestion.explanation.summary) throw new Error('missing label or explanation');
  });
  await step('batch groups only accept the member’s own programme and year', async () => {
    const groups = await call('GET', '/groups', { token: s.accessToken, expect: 200 });
    const own = groups.mine.find((g) => g.programme === 'Computer Science' && g.graduationYear === 2027);
    if (!own) throw new Error('student was not added to their own batch group');
    const foreign = await db.one(
      `select id from groups where kind = 'batch' and lower(programme) = lower($1) and graduation_year = $2 limit 1`,
      ['Computer Science', 2018],
    );
    if (foreign) await call('POST', `/groups/${foreign.id}/join`, { token: s.accessToken, expect: 403 });
  });
  await step('request mentorship -> accept -> message', async () => {
    const created = await call('POST', '/connections', {
      token: s.accessToken, expect: 201, body: { recipientId: suggestion.mentor.id, kind: 'mentorship', message: 'Hello!' },
    });
    connection = created.connection;
    await call('POST', '/messages', {
      token: s.accessToken, expect: 403, body: { recipientId: suggestion.mentor.id, body: 'Too early' },
    });
    await call('PATCH', `/connections/${connection.id}`, { token: a.accessToken, expect: 200, body: { action: 'accept' } });
    const sent = await call('POST', '/messages', {
      token: s.accessToken, expect: 201, body: { recipientId: suggestion.mentor.id, body: 'Thank you for accepting.' },
    });
    conversationId = sent.message.conversationId;
  });
  await step('alumnus sees unread message, thread and follow-up ideas', async () => {
    const list = await call('GET', '/conversations', { token: a.accessToken, expect: 200 });
    if (list.data[0]?.unread !== 1) throw new Error('expected 1 unread');
    await call('GET', `/conversations/${conversationId}/messages`, { token: a.accessToken, expect: 200 });
    await call('POST', `/conversations/${conversationId}/read`, { token: a.accessToken, expect: 200 });
    const f = await call('GET', `/ai/conversations/${conversationId}/follow-ups`, { token: s.accessToken, expect: 200 });
    if (!f.questions.length) throw new Error('no follow-up questions');
  });
  await step('message coaching and feedback on a suggestion', async () => {
    const c = await call('POST', '/ai/message-coach', {
      token: s.accessToken, expect: 200, body: { recipientId: suggestion.mentor.id, draft: 'give me a job asap' },
    });
    if (!c.draftReview.tips.length) throw new Error('expected tips');
    await call('POST', `/ai/suggestions/${suggestion.id}/feedback`, { token: s.accessToken, expect: 200, body: { helpful: true } });
  });
  await step('turning AI off is respected', async () => {
    await call('PATCH', '/me/preferences', { token: s.accessToken, expect: 200, body: { aiEnabled: false } });
    await call('GET', '/ai/mentors', { token: s.accessToken, expect: 403 });
    await call('PATCH', '/me/preferences', { token: s.accessToken, expect: 200, body: { aiEnabled: true } });
  });
  await step('privacy: contact details stay hidden without consent', async () => {
    const p = await call('GET', `/users/${suggestion.mentor.id}`, { token: s.accessToken, expect: 200 });
    if (p.user.email) throw new Error('email leaked');
  });
  await step('token refresh rotates and rejects reuse', async () => {
    const next = await authCall('POST', '/auth/refresh', { body: { refreshToken: s.refreshToken }, expect: 200 });
    await authCall('POST', '/auth/refresh', { body: { refreshToken: s.refreshToken }, expect: 401 });
    s = next.data.tokens;
  });
  await step('dashboard loads', async () => { await call('GET', '/dashboard', { token: s.accessToken, expect: 200 }); });
  await step('approved alumni identity changes go through re-review', async () => {
    const request = await authCall('POST', '/me/alumni-transition', {
      token: a.accessToken, expect: 201,
      body: {
        programme: 'Computer Science', graduationYear: 2017,
        evidenceUrl: 'https://example.com/evidence/alumni-details',
      },
    });
    await authCall('PATCH', `/admin/alumni-transitions/${request.data.id}`, {
      token: admin.accessToken, expect: 200, body: { decision: 'approve' },
    });
    const updated = await call('GET', '/me', { token: a.accessToken, expect: 200 });
    if (updated.user.profile.graduationYear !== 2017) throw new Error('transition did not apply the reviewed year');
    const queue = await call('GET', '/admin/verifications?limit=50', { token: admin.accessToken, expect: 200 });
    const target = queue.data.find((u) => u.email === alumni.email);
    if (!target) throw new Error('re-review was not queued');
    await call('PATCH', `/admin/verifications/${target.id}`, {
      token: admin.accessToken, body: { decision: 'approve' }, expect: 200,
    });
  });
  console.log(`\nAll ${passed} checks passed.`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passing checks:\n${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
