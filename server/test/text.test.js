import test from 'node:test';
import assert from 'node:assert/strict';
import { humanList, likeEscape, norm, tokens, uniqueClean } from '../src/utils/text.js';

test('norm strips accents, case and punctuation but keeps c++ / c#', () => {
  assert.equal(norm('  Caf\u00e9   Management! '), 'cafe management');
  assert.equal(norm('C++'), 'c++');
  assert.equal(norm('C#'), 'c#');
});

test('tokens drops filler words and plural s', () => {
  assert.deepEqual(tokens('Career in Data Science'), ['data', 'science']);
  assert.deepEqual(tokens('skills'), ['skill']);
});

test('uniqueClean de-duplicates case-insensitively and enforces limits', () => {
  assert.deepEqual(uniqueClean(['Python', ' python ', 'SQL', '', 'sql']), ['Python', 'SQL']);
  assert.equal(uniqueClean(['x'.repeat(100)])[0].length, 40);
  assert.equal(uniqueClean(Array.from({ length: 50 }, (_, i) => `t${i}`)).length, 25);
});

test('likeEscape neutralises SQL LIKE wildcards', () => {
  assert.equal(likeEscape('100%_done\\'), '100\\%\\_done\\\\');
});

test('humanList reads naturally', () => {
  assert.equal(humanList(['a']), 'a');
  assert.equal(humanList(['a', 'b']), 'a and b');
  assert.equal(humanList(['a', 'b', 'c']), 'a, b and c');
});
