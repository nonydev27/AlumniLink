// Loads demo data for development. Safe to run more than once. Refuses to run in production.
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { db, pool, tx } from '../src/db.js';
import { ensureBatchGroup } from '../src/modules/groups/batchGroups.js';

if (config.isProd) {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const PASSWORD = 'Demo#Pass2026';
const ADMIN_PASSWORD = 'Admin#Pass2026';
const hash = await bcrypt.hash(PASSWORD, config.bcryptRounds);
const adminHash = await bcrypt.hash(ADMIN_PASSWORD, config.bcryptRounds);
const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function person({ email, role, firstName, lastName, verified = true, profile = {}, password = hash }) {
  const found = await db.one('select id from users where lower(email) = $1', [email]);
  if (found) return found.id;
  return tx(async (t) => {
    const u = await t.one(
      `insert into users (email, password_hash, role, first_name, last_name, verification_status, verified_at)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [email, password, role, firstName, lastName, verified ? 'verified' : 'pending', verified ? new Date() : null],
    );
    await t.run(
      `insert into profiles (user_id, headline, bio, programme, graduation_year, batch, current_company, job_title, industry,
                             location, skills, interests, career_goals, willing_to_mentor, avatar_url, avatar_alt)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [u.id, profile.headline ?? null, profile.bio ?? null, profile.programme ?? null, profile.year ?? null,
        profile.year ? String(profile.year) : null, profile.company ?? null, profile.title ?? null, profile.industry ?? null,
        profile.location ?? null, profile.skills ?? [], profile.interests ?? [], profile.goals ?? [], profile.mentor ?? false,
        null, null],
    );
    if (profile.programme && profile.year) await ensureBatchGroup(t, u.id, profile.programme, profile.year);
    return u.id;
  });
}

try {
  await person({ email: 'admin@alumnilink.test', role: 'admin', firstName: 'Site', lastName: 'Admin', password: adminHash });

  await person({
    email: 'esi@alumnilink.test', role: 'student', firstName: 'Esi', lastName: 'Appiah',
    profile: { headline: 'Final-year Computer Science student', programme: 'Computer Science', year: 2027, location: 'Accra',
      skills: ['Python', 'JavaScript'], interests: ['Machine Learning', 'Web Development'], goals: ['Data Science'] },
  });
  await person({
    email: 'kwame@alumnilink.test', role: 'student', firstName: 'Kwame', lastName: 'Boateng',
    profile: { headline: 'Business Administration student', programme: 'Business Administration', year: 2026, location: 'Kumasi',
      skills: ['Excel'], interests: ['Finance', 'Entrepreneurship'], goals: ['Finance'] },
  });

  const ama = await person({
    email: 'ama@alumnilink.test', role: 'alumni', firstName: 'Ama', lastName: 'Mensah',
    profile: { headline: 'Data analyst', programme: 'Computer Science', year: 2018, company: 'Sample Bank', title: 'Data Analyst',
      industry: 'Data Analytics', location: 'Accra', skills: ['Python', 'SQL'], interests: ['Machine Learning'], mentor: true,
      bio: 'I help students move from coursework to their first data role.' },
  });
  const yaw = await person({
    email: 'yaw@alumnilink.test', role: 'alumni', firstName: 'Yaw', lastName: 'Owusu',
    profile: { headline: 'Finance manager', programme: 'Business Administration', year: 2015, company: 'Sample Insurance', title: 'Finance Manager',
      industry: 'Finance', location: 'Kumasi', skills: ['Excel', 'Budgeting'], interests: ['Finance', 'Entrepreneurship'], mentor: true },
  });
  await person({
    email: 'efua@alumnilink.test', role: 'alumni', firstName: 'Efua', lastName: 'Darko', verified: false,
    profile: { programme: 'Computer Science', year: 2020, headline: 'Waiting for verification' },
  });

  const exists = await db.one("select 1 as ok from opportunities where title = 'Data Analyst Internship'");
  if (!exists) {
    await db.run(
      `insert into opportunities (posted_by, type, title, description, company, location, industry, is_remote, apply_url, deadline, tags)
       values ($1, 'internship', 'Data Analyst Internship', 'Three-month internship working with the analytics team. Python and SQL preferred.',
               'Sample Bank', 'Accra', 'Data Analytics', false, 'https://example.com/apply', $2, $3)`,
      [ama, days(30), ['python', 'sql', 'data']],
    );
    await db.run(
      `insert into opportunities (posted_by, type, title, description, location, industry, is_remote, event_date, tags)
       values ($1, 'webinar', 'Careers in Finance: an alumni panel', 'Three alumni talk about their first jobs. Captions and a transcript will be provided.',
               'Online', 'Finance', true, $2, $3)`,
      [yaw, days(14), ['finance', 'careers']],
    );
    await db.run(
      `insert into opportunities (posted_by, type, title, description, location, event_date, tags)
       values ($1, 'reunion', 'Computer Science class of 2018 reunion', 'An evening of catching up on campus.', 'Accra', $2, $3)`,
      [ama, days(45), ['reunion', 'computer science']],
    );
  }

  console.log('Demo data ready.\n');
  console.log(`  Admin     admin@alumnilink.test   ${ADMIN_PASSWORD}`);
  console.log(`  Students  esi@alumnilink.test, kwame@alumnilink.test   ${PASSWORD}`);
  console.log(`  Alumni    ama@alumnilink.test, yaw@alumnilink.test (verified), efua@alumnilink.test (pending)   ${PASSWORD}`);
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
