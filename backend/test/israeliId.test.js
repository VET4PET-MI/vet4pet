const { test } = require('node:test');
const assert   = require('node:assert');
const { isValidIsraeliId } = require('../utils/israeliId');

test('accepts a valid 9-digit ID and returns it normalized', () => {
  assert.strictEqual(isValidIsraeliId('123456782'), '123456782');
});

test('left-pads short IDs to 9 digits before validating', () => {
  // "18" -> "000000018" is a valid checksum
  assert.strictEqual(isValidIsraeliId('18'), '000000018');
});

test('rejects an ID with a bad check digit', () => {
  assert.strictEqual(isValidIsraeliId('123456789'), null);
});

test('rejects non-numeric input', () => {
  assert.strictEqual(isValidIsraeliId('12a456782'), null);
});

test('rejects empty / nullish input', () => {
  assert.strictEqual(isValidIsraeliId(''), null);
  assert.strictEqual(isValidIsraeliId(null), null);
  assert.strictEqual(isValidIsraeliId(undefined), null);
});

test('rejects input longer than 9 digits', () => {
  assert.strictEqual(isValidIsraeliId('1234567820'), null);
});

test('trims surrounding whitespace', () => {
  assert.strictEqual(isValidIsraeliId('  123456782  '), '123456782');
});
