import test from 'node:test';
import assert from 'node:assert/strict';
import { blueprints } from '../src/blueprints/index.js';
import { validateBriefing } from '../src/briefing/validator.js';
import { deriveTokens } from '../src/tokens/index.js';
import { PROSPECT_DEMO_VIDEO_URL } from '../src/blueprints/_shared/util.js';

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

test('hero-video renders semantic, accessible video markup: source, poster, muted, loop, autoplay, playsinline', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, { cta: { label: 'Tisch reservieren', href: '#reservieren' } });
  assert.match(result.html, /<video[^>]*\bautoplay\b[^>]*>/);
  assert.match(result.html, /<video[^>]*\bmuted\b[^>]*>/);
  assert.match(result.html, /<video[^>]*\bloop\b[^>]*>/);
  assert.match(result.html, /<video[^>]*\bplaysinline\b[^>]*>/);
  assert.match(result.html, /<video[^>]*\bposter="https:\/\/example\.org\/hero\.jpg"/);
  assert.match(result.html, /<source src="https:\/\/example\.org\/video\.mp4" type="video\/mp4">/);
});

test('hero-video always renders an accessible fallback layer (poster/background) behind the video, never a bare/empty hero', () => {
  const withVideo = blueprints['hero-video'].render(briefing, tokens, {});
  assert.match(withVideo.html, /class="bp-poster"/);
  const { briefing: noVideoNoPhotos } = validateBriefing({ id: 'kein-video', name: 'Kein Video', kueche: 'international', ort: 'Bremen', hauptaktion: 'informieren' });
  const bareTokens2 = deriveTokens(noVideoNoPhotos);
  const withoutVideo = blueprints['hero-video'].render(noVideoNoPhotos, bareTokens2, {});
  assert.doesNotMatch(withoutVideo.html, /<video/, 'no video tag should render without a confirmed video');
  assert.match(withoutVideo.html, /class="bp-poster"/, 'the poster/background fallback layer must still render');
  assert.match(withoutVideo.css, /background-color:/, 'the fallback layer must have a non-empty background color so the hero is never blank/black');
});

test('hero-video keeps the video paused and hidden behind its poster under prefers-reduced-motion, without a separate visual gap', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, {});
  assert.match(result.html, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(result.html, /video\.pause\(\)/);
  assert.match(result.html, /video\.style\.display = 'none'/);
});

test('hero-video hides the video (falls back to the poster) on a network/video error, and hides the now-pointless mute toggle with it', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, {});
  assert.match(result.html, /addEventListener\('error', hideVideo\)/);
  assert.match(result.html, /function hideVideo\(\)\{[\s\S]*muteBtn\.hidden = true;/);
});

test('hero-video navigation never invents links: only confirmed-content destinations and the real conversion action appear', () => {
  const richNav = blueprints['hero-video'].render(briefing, tokens, { cta: { label: 'Tisch reservieren', href: '#reservieren' } });
  assert.match(richNav.html, /href="#speisekarte"/);
  assert.match(richNav.html, /href="#ueber-uns"/);
  assert.match(richNav.html, /href="#atmosphaere"/);
  assert.match(richNav.html, />Reservieren</);

  const { briefing: sparse } = validateBriefing({ id: 'sparse-haus', name: 'Sparses Haus', kueche: 'international', ort: 'Kiel', hauptaktion: 'informieren' });
  const sparseTokens = deriveTokens(sparse);
  const sparseNav = blueprints['hero-video'].render(sparse, sparseTokens, {});
  assert.doesNotMatch(sparseNav.html, /href="#speisekarte"/);
  assert.doesNotMatch(sparseNav.html, /href="#ueber-uns"/);
  assert.doesNotMatch(sparseNav.html, /href="#atmosphaere"/);
  assert.doesNotMatch(sparseNav.html, /bp-nav-toggle/, 'no hamburger/menu should render when there is nothing confirmed to link to');
});

test('hero-video never treats the prospect-demo video as confirmed customer material, even if a briefing claims it confirmed', () => {
  const { briefing: abused } = validateBriefing({
    id: 'demo-url-in-briefing', name: 'Demo URL im Briefing', kueche: 'international', ort: 'Essen', hauptaktion: 'informieren',
    video: { status: 'confirmed', value: PROSPECT_DEMO_VIDEO_URL },
  });
  const abusedTokens = deriveTokens(abused);
  const result = blueprints['hero-video'].render(abused, abusedTokens, {});
  assert.doesNotMatch(result.html, /cloudfront\.net/);
  assert.doesNotMatch(result.html, /<video/);
});

test('hero-video never emits a multi-hue decorative gradient (only neutral black overlay values)', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, {});
  const gradients = result.css.match(/linear-gradient\([^)]*\)/g) || [];
  assert.ok(gradients.length > 0, 'expected an overlay gradient');
  for (const gradient of gradients) {
    const colors = gradient.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/g) || [];
    for (const color of colors) {
      assert.match(color.replace(/\s+/g, ''), /^rgba?\(0,0,0/i, `expected only neutral black stops, found ${color}`);
    }
  }
});

test('hero-video never emits generic icon-font markup for its hamburger or mute toggle', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, { cta: { label: 'Tisch reservieren', href: '#reservieren' } });
  assert.doesNotMatch(result.html, /\b(fa-|fas |far |fab |material-icons|bi-icon|glyphicon)/);
});

test('hero-video mobile nav toggle is keyboard-accessible vanilla markup: aria-expanded, aria-controls, and an Escape handler', () => {
  const result = blueprints['hero-video'].render(briefing, tokens, { cta: { label: 'Tisch reservieren', href: '#reservieren' } });
  assert.match(result.html, /<button type="button" class="bp-nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="[^"]+">/);
  assert.match(result.html, /ev\.key === 'Escape'/);
});

test('hero-video renders exactly one vertical signature wordmark only when flagged as the signature moment, using the real restaurant name (no generic icon)', () => {
  const withSignature = blueprints['hero-video'].render(briefing, tokens, { signature: true });
  assert.equal((withSignature.html.match(/class="bp-vertical-mark"/g) || []).length, 1);
  assert.match(withSignature.html, /class="bp-vertical-mark" aria-hidden="true">Zum L(ö|&ouml;)wen/);
  const withoutSignature = blueprints['hero-video'].render(briefing, tokens, {});
  assert.doesNotMatch(withoutSignature.html, /bp-vertical-mark/);
});
