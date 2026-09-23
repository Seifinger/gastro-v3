// Small provenance and markup helpers shared across blueprints. This is
// deliberately not a template: every blueprint still builds its own HTML
// structure and CSS. It only centralizes escaping and the
// confirmed-only-data contract so no blueprint accidentally renders a
// draft/unknown value as if it were a fact.

export function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function escapeAttr(input) {
  return escapeHtml(input);
}

// Returns the value only when its provenance is confirmed; otherwise null.
// This is the single gate that keeps unconfirmed prices, dishes, hours,
// photos and quotes out of rendered markup.
export function confirmed(field) {
  if (!field || field.status !== 'confirmed') return null;
  if (field.value === null || field.value === undefined) return null;
  if (Array.isArray(field.value) && field.value.length === 0) return null;
  return field.value;
}

export function confirmedPhotos(briefing) {
  const photos = confirmed(briefing.fotos);
  if (!photos) return [];
  return photos.filter((p) => p.confirmed);
}

let seedCounter = 0;
export function scopeClass(id) {
  seedCounter += 1;
  return `bp-${id}-${seedCounter.toString(36)}`;
}

export function reducedMotionGuard(css) {
  if (!css) return '';
  return `@media (prefers-reduced-motion: no-preference){${css}}`;
}

export function baseSectionCss(scope, tokens) {
  return `.${scope}{font-family:${tokens.typography.fontFamily};color:${tokens.color.text};background:${tokens.color.background};padding:${tokens.spacing.xl}px ${tokens.spacing.md}px;box-sizing:border-box;}` +
    `.${scope} *{box-sizing:border-box;}` +
    `.${scope} a{color:inherit;}` +
    `.${scope} :focus-visible{outline:3px solid ${tokens.color.accent};outline-offset:3px;}`;
}
