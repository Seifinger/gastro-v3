import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBriefing } from '../src/briefing/validator.js';
import { compose } from '../src/composer/index.js';
import { renderSite } from '../src/renderer/index.js';
import { judge } from '../src/judge/index.js';

const richInput = {
  id: 'osteria-nord', name: 'Osteria Nord', kueche: 'italienisch', ort: 'Hamburg', hauptaktion: 'reservieren',
  konzept: { status: 'confirmed', value: 'Norddeutsch-italienische Küche am Hafen.' },
  fotos: { status: 'confirmed', value: [
    { url: 'https://example.org/1.jpg', caption: 'Hero', confirmed: true },
    { url: 'https://example.org/2.jpg', caption: 'Raum', confirmed: true },
    { url: 'https://example.org/3.jpg', caption: 'Team', confirmed: true },
  ] },
  speisekarte: { status: 'confirmed', value: [
    { name: 'Risotto', description: 'Meeresfrüchte', price: '18,00 €' },
    { name: 'Pasta', description: 'Vongole', price: '16,00 €' },
    { name: 'Panna Cotta', description: 'Vanille', price: '6,50 €' },
  ] },
  testimonials: { status: 'confirmed', value: [
    { text: 'Bestes Risotto der Stadt.', name: 'Google-Bewertung' },
    { text: 'Immer wieder gerne.', name: 'TripAdvisor' },
  ] },
};

test('a well-formed, rich briefing passes the judge with no errors', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  const rendered = renderSite(briefing, composed);
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, true, JSON.stringify(result.findings));
});

test('an insufficient composition (missing confirmed phone for anrufen) fails the judge', () => {
  const { briefing } = validateBriefing({ id: 'call-only', name: 'Call Only', kueche: 'international', ort: 'Bremen', hauptaktion: 'anrufen' });
  const composed = compose(briefing);
  const rendered = renderSite(briefing, composed);
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'insufficient-content'));
});

test('judge rejects a forbidden multi-hue decorative gradient', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  const rendered = renderSite(briefing, composed);
  rendered.html = rendered.html.replace('</style>', 'body{background:linear-gradient(45deg,#ff00aa,#00aaff);}</style>');
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'forbidden-gradient'));
});

test('judge rejects the three-equal-tiles-only grid pattern', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  const rendered = renderSite(briefing, composed);
  rendered.html = rendered.html.replace('</style>', '.x{grid-template-columns:repeat(3,1fr);}</style>');
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'three-tile-pattern'));
});

test('judge rejects generic icon library markup', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  const rendered = renderSite(briefing, composed);
  rendered.html = rendered.html.replace('<main>', '<main><i class="fa-solid fa-utensils"></i>');
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'generic-icons'));
});

test('judge requires exactly one signature moment', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  composed.sections.forEach((s) => { s.ctx.signature = false; });
  const rendered = renderSite(briefing, composed);
  const result = judge(briefing, composed, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'signature-moment'));
});

test('judge requires at least one asymmetric section', () => {
  const { briefing } = validateBriefing(richInput);
  const composed = compose(briefing);
  const symmetricOnly = {
    ...composed,
    sections: [
      { blueprint: 'hero-typographic', ctx: { signature: true } },
      { blueprint: 'menu-list', ctx: {} },
      { blueprint: 'reservation-form', ctx: {} },
    ],
  };
  const rendered = renderSite(briefing, symmetricOnly);
  const result = judge(briefing, symmetricOnly, rendered);
  assert.equal(result.pass, false);
  assert.ok(result.findings.some((f) => f.code === 'no-asymmetry'));
});
