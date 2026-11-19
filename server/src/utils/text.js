// Small text helpers shared by validation, search and the suggestion engine (pure functions).

export const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Trim, drop blanks, de-duplicate case-insensitively, cap length and count. */
export function uniqueClean(list = [], { max = 25, maxLen = 40 } = {}) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const value = clean(raw).slice(0, maxLen);
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
    if (out.length >= max) break;
  }
  return out;
}

/** Lower-case, strip accents and punctuation (keeps + and # so "C++" and "C#" survive). */
export const norm = (s) =>
  clean(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}+#\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP = new Set([
  'a', 'an', 'and', 'the', 'of', 'in', 'to', 'for', 'on', 'at', 'with', 'or', 'my', 'be', 'as', 'is', 'are',
  'career', 'work', 'working', 'job', 'jobs', 'role',
]);

// Very light plural stemming so "skills" matches "skill". Deliberately simple and predictable.
const stem = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

export const tokens = (s) =>
  norm(s)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem);

/** Escapes % _ \ so user input can't act as wildcards inside ILIKE. */
export const likeEscape = (s) => String(s).replace(/[\\%_]/g, '\\$&');

export const humanList = (items) => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

export const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
