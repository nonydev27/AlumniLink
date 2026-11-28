import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { badRequest } from './errors.js';

/**
 * Opaque, viewer-bound cursors for high-traffic feeds. A cursor is meaningless
 * without its signing key, cannot be replayed by another account, and is tied
 * to the exact filter/sort set that produced it.
 */
const CURSOR_VERSION = 1;
const invalid = () => badRequest('That page link is no longer valid. Start again from the beginning.', undefined, 'invalid_cursor');

export function signCursor({ audience, scope, keys }) {
  const body = Buffer.from(JSON.stringify({ v: CURSOR_VERSION, aud: audience, scope, keys })).toString('base64url');
  const signature = createHmac('sha256', config.cursorHmacSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function readCursor(token, { audience, scope }) {
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) throw invalid();
  const [body, signature, ...extra] = token.split('.');
  if (!body || !signature || extra.length) throw invalid();
  const expected = createHmac('sha256', config.cursorHmacSecret).update(body).digest('base64url');
  const got = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw invalid();
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (parsed?.v !== CURSOR_VERSION || parsed.aud !== audience || parsed.scope !== scope
      || !Array.isArray(parsed.keys) || !parsed.keys.length) throw invalid();
  return parsed.keys;
}

/**
 * Rows are fetched with limit + 1. Returns either the classic page meta
 * (offset mode) or a cursor meta, so admin pages keep their existing contract.
 */
export function keysetResponse(rows, q, mapRow, { audience, scope, keysOf }) {
  const hasMore = rows.length > q.limit;
  const pageRows = hasMore ? rows.slice(0, q.limit) : rows;
  const last = pageRows.at(-1);
  return {
    data: pageRows.map(mapRow),
    meta: {
      limit: q.limit,
      hasMore,
      nextCursor: hasMore && last ? signCursor({ audience, scope, keys: keysOf(last) }) : null,
      mode: 'cursor',
    },
  };
}
