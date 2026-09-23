import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBriefing } from '../src/briefing/validator.js';
import { compose } from '../src/composer/index.js';
import { renderSite } from '../src/renderer/index.js';
import { PROSPECT_DEMO_VIDEO_URL } from '../src/blueprints/_shared/util.js';
import pkg from '../package.json' with { type: 'json' };

const { briefing } = validateBriefing({
  id: 'trattoria-verde', name: 'Trattoria Verde', kueche: 'italienisch', ort: 'Köln', hauptaktion: 'reservieren',
  konzept: { status: 'confirmed', value: 'Familiäre italienische Küche im Herzen von Köln.' },
  telefon: { status: 'confirmed', value: '0221 1234567' },
  adresse: { status: 'confirmed', value: 'Ringstraße 5, 50667 Köln' },
  oeffnungszeiten: { status: 'confirmed', value: { montag: '11:00-22:00' } },
  preisklasse: { status: 'confirmed', value: 'mittel' },
  fotos: { status: 'confirmed', value: [
    { url: 'https://example.org/hero.jpg', caption: 'Hero Außenansicht', confirmed: true },
    { url: 'https://example.org/raum.jpg', caption: 'Gastraum', confirmed: true },
    { url: 'https://example.org/team.jpg', caption: 'Team', confirmed: true },
  ] },
  speisekarte: { status: 'confirmed', value: [
    { name: 'Tagliatelle al Ragù', description: 'Hausgemachte Pasta', price: '14,00 €' },
    { name: 'Tiramisù', description: 'Klassisch', price: '6,00 €' },
    { name: 'Bruschetta', description: 'Tomate, Basilikum', price: '7,50 €' },
  ] },
});

const composed = compose(briefing);
const result = renderSite(briefing, composed, { canonicalUrl: 'https://example.org/trattoria-verde/' });

test('renderer produces a complete, valid-looking HTML document', () => {
  assert.match(result.html, /^<!doctype html>/);
  assert.match(result.html, /<html lang="de">/);
  assert.match(result.html, /<title>Trattoria Verde<\/title>/);
  assert.match(result.html, /<\/html>$/);
});

test('renderer embeds an engine version and archetype comment', () => {
  assert.match(result.html, new RegExp(`gastro-v3 engine v${pkg.version.replace(/\./g, '\\.')} · archetype: ${composed.archetype}`));
  assert.equal(result.engineVersion, pkg.version);
});

test('renderer includes Google Fonts preconnect and display=swap', () => {
  assert.match(result.html, /fonts\.googleapis\.com/);
  assert.match(result.html, /fonts\.gstatic\.com/);
  assert.match(result.html, /display=swap/);
});

test('renderer includes OG/Twitter tags and a canonical URL', () => {
  assert.match(result.html, /property="og:title" content="Trattoria Verde"/);
  assert.match(result.html, /name="twitter:card"/);
  assert.match(result.html, /rel="canonical" href="https:\/\/example\.org\/trattoria-verde\/"/);
});

test('renderer builds LocalBusiness JSON-LD only from confirmed fields', () => {
  const match = result.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(match);
  const jsonLd = JSON.parse(match[1]);
  assert.equal(jsonLd['@type'], 'Restaurant');
  assert.equal(jsonLd.telephone, '0221 1234567');
  assert.equal(jsonLd.address.streetAddress, 'Ringstraße 5, 50667 Köln');
  assert.ok(Array.isArray(jsonLd.openingHoursSpecification));
});

test('the real build pipeline (compose + renderSite) never contains the local prospect-demo video, even for a briefing with a confirmed video field', () => {
  const { briefing: withVideo } = validateBriefing({
    id: 'trattoria-video', name: 'Trattoria Video', kueche: 'italienisch', ort: 'Köln', hauptaktion: 'reservieren',
    video: { status: 'confirmed', value: 'https://example.org/echtes-kundenvideo.mp4' },
    fotos: { status: 'confirmed', value: [
      { url: 'https://example.org/hero.jpg', caption: 'Hero Außenansicht', confirmed: true },
    ] },
  });
  const composedWithVideo = compose(withVideo);
  const renderedWithVideo = renderSite(withVideo, composedWithVideo);
  assert.doesNotMatch(renderedWithVideo.html, /cloudfront\.net/);

  // Even if the demo asset URL somehow ended up in a real briefing's confirmed
  // video field, the pipeline must still never render it as customer material.
  const { briefing: abused } = validateBriefing({
    id: 'trattoria-abuse', name: 'Trattoria Abuse', kueche: 'italienisch', ort: 'Köln', hauptaktion: 'informieren',
    video: { status: 'confirmed', value: PROSPECT_DEMO_VIDEO_URL },
  });
  const composedAbused = compose(abused);
  const renderedAbused = renderSite(abused, composedAbused);
  assert.doesNotMatch(renderedAbused.html, /cloudfront\.net/);
});

test('renderer does not invent JSON-LD fields for unconfirmed data', () => {
  const { briefing: bare } = validateBriefing({ id: 'bare-haus', name: 'Bare Haus', kueche: 'international', ort: 'Berlin', hauptaktion: 'informieren' });
  const bareComposed = compose(bare);
  const bareResult = renderSite(bare, bareComposed);
  const match = bareResult.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  const jsonLd = JSON.parse(match[1]);
  assert.equal(jsonLd.telephone, undefined);
  assert.equal(jsonLd.address.streetAddress, undefined);
});
