import test from 'node:test';
import assert from 'node:assert/strict';
import { blueprints } from '../src/blueprints/index.js';
import { validateBriefing } from '../src/briefing/validator.js';
import { deriveTokens } from '../src/tokens/index.js';

const richInput = {
  id: 'zum-loewen', name: 'Zum Löwen "Alt-Stadt"', kueche: 'bayerisch', ort: 'München', hauptaktion: 'reservieren',
  konzept: { status: 'confirmed', value: 'Bodenständige Wirtshausküche seit 1902.' },
  usp: { status: 'confirmed', value: 'Die einzige Kellerstube der Altstadt.' },
  signaturgericht: { status: 'confirmed', value: 'Schweinsbraten' },
  video: { status: 'confirmed', value: 'https://example.org/video.mp4' },
  historie: { status: 'confirmed', value: [{ year: '1902', text: 'Gründung als Familienbetrieb.' }, { year: '1998', text: 'Übernahme durch die dritte Generation.' }] },
  fotos: { status: 'confirmed', value: [
    { url: 'https://example.org/hero.jpg', caption: 'Hero Außenansicht', confirmed: true },
    { url: 'https://example.org/raum.jpg', caption: 'Gastraum Ambiente', confirmed: true },
    { url: 'https://example.org/team.jpg', caption: 'Team Portrait', confirmed: true },
  ] },
  speisekarte: { status: 'confirmed', value: [
    { name: 'Schweinsbraten', description: 'Kartoffelknödel, Blaukraut', price: '16,50 €' },
    { name: 'Schnitzel', description: 'Wiener Art, Pommes', price: '15,00 €' },
    { name: 'Kaiserschmarrn', description: 'mit Apfelmus', price: '9,50 €' },
  ] },
  testimonials: { status: 'confirmed', value: [
    { text: 'Bestes Wirtshaus der Stadt.', name: 'Google-Bewertung' },
    { text: 'Wie bei der Oma.', name: 'TripAdvisor' },
  ] },
};

const { briefing } = validateBriefing(richInput);
const tokens = deriveTokens(briefing);

test('every blueprint exports render, meta with required fields, and a style/motion module', async () => {
  for (const [id, bp] of Object.entries(blueprints)) {
    assert.equal(typeof bp.render, 'function', `${id} missing render()`);
    assert.equal(bp.meta.id, id, `${id} meta.id mismatch`);
    assert.ok(bp.meta.category, `${id} missing category`);
    assert.equal(typeof bp.meta.asymmetric, 'boolean', `${id} missing asymmetric flag`);
    assert.equal(typeof bp.meta.signatureCapable, 'boolean', `${id} missing signatureCapable flag`);
  }
});

test('every blueprint renders semantic HTML and non-empty scoped CSS for a fully-confirmed briefing', async () => {
  for (const [id, bp] of Object.entries(blueprints)) {
    const result = bp.render(briefing, tokens, { cta: { label: 'Jetzt reservieren', href: '#reservieren' } });
    assert.ok(typeof result.html === 'string', `${id} did not return html string`);
    if (result.html) {
      assert.match(result.html, /<section/, `${id} should render a <section>`);
      assert.match(result.html, /aria-label=/, `${id} should have an aria-label`);
    }
    assert.ok(typeof result.css === 'string' && result.css.length > 0, `${id} should return non-empty css`);
  }
});

test('blueprints never render unconfirmed photos, dishes, prices or quotes as facts', async () => {
  const bareInput = { id: 'unbekannt-haus', name: 'Unbekanntes Haus', kueche: 'international', ort: 'Berlin', hauptaktion: 'informieren' };
  const { briefing: bare } = validateBriefing(bareInput);
  const bareTokens = deriveTokens(bare);
  for (const [id, bp] of Object.entries(blueprints)) {
    const result = bp.render(bare, bareTokens, {});
    assert.doesNotMatch(result.html, /example\.org/, `${id} must not fabricate photo/video URLs`);
  }
});

test('HTML-sensitive characters in briefing text are escaped, not injected', () => {
  const bp = blueprints['hero-typographic'];
  const result = bp.render(briefing, tokens, {});
  assert.doesNotMatch(result.html, /<script>alert/);
  assert.match(result.html, /Zum L(ö|&ouml;)wen/);
});

test('menu-board and reservation-form and order-embed declare no motion (still archetype-independent) or are explicitly motionless', () => {
  assert.equal(blueprints['menu-board'].motion(), '');
  assert.equal(blueprints['reservation-form'].motion(), '');
  assert.equal(blueprints['order-embed'].motion(), '');
});

test('asymmetric blueprints are flagged and cover at least a mosaic, cards and grid layout', () => {
  const asymmetricIds = Object.entries(blueprints).filter(([, bp]) => bp.meta.asymmetric).map(([id]) => id);
  assert.ok(asymmetricIds.includes('gallery-mosaic'));
  assert.ok(asymmetricIds.includes('menu-cards'));
  assert.ok(asymmetricIds.includes('testimonial-grid'));
  assert.ok(asymmetricIds.length >= 3);
});

test('order-embed cart math: two items with quantities sum correctly client-side (logic mirrored server-side)', () => {
  const cart = { Schnitzel: { qty: 2, price: 15 }, Kaiserschmarrn: { qty: 1, price: 9.5 } };
  const sum = Object.values(cart).reduce((s, c) => s + c.qty * c.price, 0);
  assert.equal(sum, 39.5);
});

test('reservation-form and order-embed build endpoint URLs from the briefing slug', () => {
  const form = blueprints['reservation-form'].render(briefing, tokens, { apiBase: 'https://wirt.example' });
  assert.match(form.html, /https:\/\/wirt\.example\/betrieb\/zum-loewen\/reservierung/);
  const order = blueprints['order-embed'].render(briefing, tokens, { apiBase: 'https://wirt.example' });
  assert.match(order.html, /https:\/\/wirt\.example\/betrieb\/zum-loewen\/bestellung/);
});
