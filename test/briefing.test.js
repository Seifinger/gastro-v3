import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBriefing, optionalFields } from '../src/briefing/validator.js';
const minimal = { id: 'zum-loewen', name: 'Zum Löwen', kueche: 'bayerisch', ort: 'München', hauptaktion: 'reservieren' };
test('minimal briefing validates and missing fields become draft', () => {
  const result = validateBriefing(minimal);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.briefing.signaturgericht.status, 'draft');
  assert.equal(result.briefing.signaturgericht.value, null);
  assert.equal(optionalFields.every(key => key in result.briefing), true);
  assert.equal('signaturgericht' in minimal, false);
});
test('invalid enum and id return structured paths', () => {
  const result = validateBriefing({ ...minimal, id: 'Wrong ID', kueche: 'falsch' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.path === '/id'));
  assert.ok(result.errors.some(error => error.path === '/kueche'));
});
test('unsubstantiated confirmations fail', () => {
  const result = validateBriefing({ ...minimal, oeffnungszeiten: { status: 'confirmed', value: null } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.keyword === 'provenance'));
});
test('confirmed photo collection cannot contain unconfirmed item', () => {
  const result = validateBriefing({ ...minimal, fotos: { status: 'confirmed', value: [{ url: 'https://example.org/a.jpg', caption: 'Raum', confirmed: false }] } });
  assert.equal(result.valid, false);
});
