import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBriefing } from '../src/briefing/validator.js';
import { compose } from '../src/composer/index.js';
import { blueprints } from '../src/blueprints/index.js';

function build(input) {
  const { briefing, valid, errors } = validateBriefing(input);
  assert.equal(valid, true, JSON.stringify(errors));
  return briefing;
}

const photos = (n, roleWords = ['hero', 'raum', 'team', 'gericht', 'aussen', 'theke']) =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://example.org/${i}.jpg`,
    caption: `${roleWords[i % roleWords.length]} Foto ${i}`,
    confirmed: true,
  }));

const menu = (n) => Array.from({ length: n }, (_, i) => ({ name: `Gericht ${i}`, description: 'Zutat A, Zutat B', price: `${10 + i},00 €` }));

// 1. Reservation-driven wirtshaus with rich confirmed content.
const wirtshaus = build({
  id: 'wirtshaus-alt', name: 'Wirtshaus Alt', kueche: 'bayerisch', ort: 'Rosenheim', hauptaktion: 'reservieren',
  konzept: { status: 'confirmed', value: 'Traditionelle Wirtshausküche seit drei Generationen.' },
  signaturgericht: { status: 'confirmed', value: 'Gericht 0' },
  fotos: { status: 'confirmed', value: photos(7) },
  speisekarte: { status: 'confirmed', value: menu(5) },
  testimonials: { status: 'confirmed', value: [{ text: 'Sehr gut!', name: 'A' }, { text: 'Immer wieder', name: 'B' }] },
});

// 2. Order-driven street-food place, thin content.
const streetfood = build({
  id: 'streetfood-bowl', name: 'Streetfood Bowl', kueche: 'vietnamesisch', ort: 'Berlin', hauptaktion: 'bestellen',
  speisekarte: { status: 'confirmed', value: menu(4) },
  fotos: { status: 'confirmed', value: photos(2) },
});

// 3. Call-driven, minimal confirmed data -> should be insufficient.
const minimalCall = build({
  id: 'kleines-eck', name: 'Kleines Eck', kueche: 'international', ort: 'Kassel', hauptaktion: 'anrufen',
});

// 4. Fine-dining with video and testimonials.
const fineDining = build({
  id: 'maison-lumiere', name: 'Maison Lumière', kueche: 'franzoesisch', ort: 'Hamburg', hauptaktion: 'reservieren',
  preisklasse: { status: 'confirmed', value: 'fine-dining' },
  video: { status: 'confirmed', value: 'https://example.org/video.mp4' },
  usp: { status: 'confirmed', value: 'Zwei Sterne, ein Raum, ein Menü.' },
  fotos: { status: 'confirmed', value: photos(3) },
  testimonials: { status: 'confirmed', value: [{ text: 'Unvergesslich.', name: 'Guide' }] },
});

// 5. Informieren-only cafe with a historie timeline, no photos/menu.
const cafeHistorie = build({
  id: 'cafe-jahre', name: 'Café der Jahre', kueche: 'international', ort: 'Leipzig', hauptaktion: 'informieren',
  historie: { status: 'confirmed', value: [{ year: '1980', text: 'Eröffnung.' }, { year: '2010', text: 'Umbau.' }] },
  konzept: { status: 'confirmed', value: 'Ein Wohnzimmer für die Nachbarschaft.' },
});

test('reservieren briefing with rich content composes a ready, 6-9 section site with reservation-form and one signature moment', () => {
  const result = compose(wirtshaus);
  assert.equal(result.buildStatus, 'ready');
  assert.ok(result.sections.length >= 6 && result.sections.length <= 9);
  assert.ok(result.sections.some((s) => s.blueprint === 'reservation-form'));
  const signatureCount = result.sections.filter((s) => s.ctx.signature).length;
  assert.equal(signatureCount, 1);
});

test('bestellen briefing includes order-embed and its section carries no fabricated content flag', () => {
  const result = compose(streetfood);
  assert.ok(result.sections.some((s) => s.blueprint === 'order-embed'));
});

test('anrufen briefing without a confirmed phone number is reported insufficient, not silently dropped', () => {
  const result = compose(minimalCall);
  assert.equal(result.buildStatus, 'insufficient');
  assert.ok(result.reasons.some((r) => /Telefonnummer/.test(r)));
});

test('fine-dining briefing with confirmed video prefers hero-video and includes a signature moment', () => {
  const result = compose(fineDining);
  assert.equal(result.sections[0].blueprint, 'hero-video');
  assert.ok(result.sections.some((s) => s.ctx.signature));
});

test('informieren briefing with historie uses story-timeline and reports insufficiency without inventing a conversion section', () => {
  const result = compose(cafeHistorie);
  assert.ok(result.sections.some((s) => s.blueprint === 'story-timeline'));
  assert.ok(!result.sections.some((s) => s.blueprint === 'reservation-form' || s.blueprint === 'order-embed'));
});

test('composition is deterministic for the same briefing (same seed, same section list)', () => {
  const a = compose(wirtshaus);
  const b = compose(wirtshaus);
  assert.deepEqual(a.sections.map((s) => s.blueprint), b.sections.map((s) => s.blueprint));
  assert.equal(a.seed, b.seed);
});

test('at least one composed section is asymmetric on desktop, when any confirmed content exists', () => {
  for (const briefing of [wirtshaus, streetfood, fineDining]) {
    const result = compose(briefing);
    const hasAsymmetric = result.sections.some((s) => blueprints[s.blueprint]?.meta.asymmetric);
    assert.ok(hasAsymmetric, `expected an asymmetric section for ${briefing.id}`);
  }
});

test('dramaturgical order places hero first and the mandatory conversion element last when present', () => {
  const result = compose(wirtshaus);
  assert.match(result.sections[0].blueprint, /^hero-/);
  const last = result.sections[result.sections.length - 1];
  assert.equal(last.blueprint, 'reservation-form');
});
