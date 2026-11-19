// End-to-end check against a RUNNING server and database:
//   npm run dev            (in one terminal, after `npm run migrate && npm run seed`)
//   npm run smoke          (in another)
// Walks through the main flows from the project report. Uses throw-away accounts.
const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@alumnilink.test', password: process.env.ADMIN_PASSWORD || 'Admin#Pass2026' };

let passed = 0;
async function call(method, path, { token, body, expect } = {}) {
  const res = await fetch(`${BASE}${path}`, {
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
const step = async (name, fn) => { await fn(); passed += 1; console.log(`  ok  ${name}`); };

const run = Date.now().toString(36);
const pw = 'Smoke#Test2026';
const student = { email: `student-${run}@smoke.test`, password: pw, firstName: 'Sam', lastName: 'Student', role: 'student', programme: 'Computer Science', graduationYear: 2027 };
const alumni = { email: `alumni-${run}@smoke.test`, password: pw, firstName: 'Alex', lastName: 'Alumni', role: 'alumni', programme: 'Computer Science', graduationYear: 2018 };
let s; let a; let alumnusId; let admin; let suggestion; let connection; let conversationId;

console.log(`Smoke test against ${BASE}`);
try {
  await step('health', async () => { await fetch(BASE.replace('/api/v1', '/health/ready')).then((r) => { if (!r.ok) throw new Error('not ready'); }); });
  await step('register student + alumni', async () => {
    s = (await call('POST', '/auth/register', { body: student, expect: 201 })).tokens;
    const registeredAlumni = await call('POST', '/auth/register', { body: alumni, expect: 201 });
    a = registeredAlumni.tokens;
    alumnusId = registeredAlumni.user.id;
  });
  await step('validation errors are friendly', async () => {
    const r = await call('POST', '/auth/register', { body: { ...student, email: 'nope', password: '123' }, expect: 400 });
    if (!r.error.fields.email || !r.error.fields.password) throw new Error('missing field messages');
  });
  await step('unverified alumni are blocked from networking', async () => { await call('GET', '/directory', { token: a.accessToken, expect: 403 }); });
  await step('admin verifies the alumnus', async () => {
    admin = (await call('POST', '/auth/login', { body: ADMIN, expect: 200 })).tokens;
    const pending = await call('GET', '/admin/verifications?limit=50', { token: admin.accessToken, expect: 200 });
    const target = pending.data.find((u) => u.email === alumni.email);
    if (!target) throw new Error('pending alumnus not found in admin queue');
    await call('PATCH', `/admin/verifications/${target.id}`, { token: admin.accessToken, body: { decision: 'approve' }, expect: 200 });
  });
  await step('alumni profile + open to mentoring', async () => {
    await call('PATCH', '/me/profile', { token: a.accessToken, expect: 200, body: {
      headline: 'Data analyst', industry: 'Data Analytics', jobTitle: 'Data Analyst', currentCompany: 'Smoke Co',
      skills: ['Python', 'SQL'], interests: ['Machine Learning', `Topic ${run}`], willingToMentor: true } });
  });
  await step('AI says it needs more details when the profile is empty', async () => {
    const r = await call('GET', '/ai/mentors', { token: s.accessToken, expect: 200 });
    if (r.status !== 'needs_more_details') throw new Error(`expected needs_more_details, got ${r.status}`);
  });
  await step('student profile, then explainable mentor suggestion', async () => {
    await call('PATCH', '/me/profile', { token: s.accessToken, expect: 200, body: {
      skills: ['Python'], interests: ['Machine Learning', `Topic ${run}`], careerGoals: ['Data Science'] } });
    const r = await call('GET', '/ai/mentors', { token: s.accessToken, expect: 200 });
      suggestion = r.suggestions.find((x) => x.mentor.id === alumnusId);
    if (!suggestion) throw new Error('expected the new alumnus to be suggested');
    if (suggestion.label !== 'AI suggestion' || !suggestion.explanation.summary) throw new Error('missing label or explanation');
  });
  await step('request mentorship -> accept -> message', async () => {
    const created = await call('POST', '/connections', { token: s.accessToken, expect: 201, body: { recipientId: suggestion.mentor.id, kind: 'mentorship', message: 'Hello!' } });
    connection = created.connection;
    await call('POST', '/messages', { token: s.accessToken, expect: 403, body: { recipientId: suggestion.mentor.id, body: 'Too early' } });
    await call('PATCH', `/connections/${connection.id}`, { token: a.accessToken, expect: 200, body: { action: 'accept' } });
    const sent = await call('POST', '/messages', { token: s.accessToken, expect: 201, body: { recipientId: suggestion.mentor.id, body: 'Thank you for accepting.' } });
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
    const c = await call('POST', '/ai/message-coach', { token: s.accessToken, expect: 200, body: { recipientId: suggestion.mentor.id, draft: 'give me a job asap' } });
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
    const next = await call('POST', '/auth/refresh', { body: { refreshToken: s.refreshToken }, expect: 200 });
    await call('POST', '/auth/refresh', { body: { refreshToken: s.refreshToken }, expect: 401 });
    s = next.tokens;
  });
  await step('dashboard loads', async () => { await call('GET', '/dashboard', { token: s.accessToken, expect: 200 }); });
  console.log(`\nAll ${passed} checks passed.`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passing checks:\n${err.message}`);
  process.exitCode = 1;
}
