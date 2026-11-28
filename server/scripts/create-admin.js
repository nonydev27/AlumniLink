// Creates (or promotes) an administrator.
//   ADMIN_EMAIL=you@school.edu ADMIN_PASSWORD='a long passphrase' npm run create-admin
// Credentials come from the environment so they never end up in shell history as command-line arguments.
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { db, pool, tx } from '../src/db.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
const lastName = process.env.ADMIN_LAST_NAME || 'User';
const termsVersion = Object.values(config.terms).every(Boolean) ? config.terms.version : null;

try {
  if (!email || password.length < 10) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters).');
  }
  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const existing = await db.one('select id from users where lower(email) = $1', [email]);
  if (existing) {
    await db.run(
      `update users
       set role = 'admin', password_hash = $2, status = 'active', verification_status = 'verified',
           verified_at = coalesce(verified_at, now()), email_verified_at = coalesce(email_verified_at, now()),
           terms_accepted_version = coalesce($3, terms_accepted_version),
           terms_accepted_at = coalesce(case when $3 is null then null else now() end, terms_accepted_at)
       where id = $1`,
      [existing.id, hash, termsVersion],
    );
    console.log(`Updated ${email} to an administrator with the new password.`);
  } else {
    await tx(async (t) => {
      const handle = (process.env.ADMIN_HANDLE || email.split('@')[0]).replace(/[^a-z0-9_-]/g, '').slice(0, 30) || 'admin';
      const u = await t.one(
        `insert into users
           (email, password_hash, role, first_name, last_name, handle, verification_status, verified_at,
            email_verified_at, terms_accepted_version, terms_accepted_at)
         values ($1, $2, 'admin', $3, $4, $5, 'verified', now(), now(), $6, $7) returning id`,
        [email, hash, firstName, lastName, handle, termsVersion, termsVersion ? new Date() : null],
      );
      await t.run('insert into profiles (user_id) values ($1)', [u.id]);
    });
    console.log(`Created administrator ${email}.`);
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
