const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const isPlainObject = (v) => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** Converts snake_case keys to camelCase, deeply (Dates, Buffers etc. are left alone). */
export function camelizeKeys(value) {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[toCamel(k)] = camelizeKeys(v);
    return out;
  }
  return value;
}
