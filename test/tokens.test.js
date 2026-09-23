import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, deriveTokens, chooseArchetype } from '../src/tokens/index.js';
import archetypes from '../src/tokens/archetypes.json' with { type: 'json' };
import typography from '../src/tokens/typography.json' with { type: 'json' };
import color from '../src/tokens/color.json' with { type: 'json' };

test('black on white is 21:1', () => assert.equal(contrast('#000000', '#ffffff'), 21));

test('CTA contrast and deterministic archetype', () => {
  const t = deriveTokens({ kueche: 'bayerisch' });
  assert.equal(t.archetype, 'traditionell');
  assert.ok(contrast(t.color.accent, t.color.ctaText) >= 7);
});

test('body text on background meets WCAG AA (>= 4.5:1)', () => {
  assert.ok(contrast(color.text, color.background) >= color.textContrast);
});

test('all six archetypes exist and use all six typography profiles between primary and accent fonts', () => {
  const names = Object.keys(archetypes);
  assert.equal(names.length, 6);
  const usedFonts = new Set();
  for (const a of names) {
    usedFonts.add(archetypes[a].font);
    usedFonts.add(archetypes[a].accentFont);
  }
  assert.deepEqual([...usedFonts].sort(), Object.keys(typography).sort());
});

test('all three motion profiles are assigned to at least one archetype', () => {
  const motions = new Set(Object.values(archetypes).map(a => a.motion));
  assert.deepEqual([...motions].sort(), ['lebendig', 'still', 'subtil']);
});

test('every typography profile keeps body size at or above 17px', () => {
  for (const profile of Object.values(typography)) {
    assert.ok(profile.scale[0] >= 17, JSON.stringify(profile));
  }
});

test('CTA contrast holds for an arbitrary confirmed primary color, including a light one', () => {
  const t = deriveTokens({ kueche: 'international', primaerfarbe: { status: 'confirmed', value: '#f5e642' } });
  assert.ok(contrast(t.color.accent, t.color.ctaText) >= 7);
});

test('unjustified purple/indigo primary colors are overridden by the archetype fallback', () => {
  const t = deriveTokens({ kueche: 'international', primaerfarbe: { status: 'confirmed', value: '#6a3fd6' } });
  assert.notEqual(t.color.base.toLowerCase(), '#6a3fd6');
});

test('chooseArchetype is deterministic for the same briefing', () => {
  const briefing = { kueche: 'international', preisklasse: { status: 'confirmed', value: 'fine-dining' } };
  assert.equal(chooseArchetype(briefing), 'editorial');
  assert.equal(chooseArchetype(briefing), chooseArchetype(briefing));
});
