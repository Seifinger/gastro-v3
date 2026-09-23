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

// The temporary local prospect-concept-demo video (see dashboard/prospect-server.js)
// is deliberately never a legitimate confirmed customer video, even if it were ever
// copied into a briefing's `video.value` by mistake. This is the single source of
// truth for that asset, denylisted here rather than trusted by convention, so the
// renderer/composer path and the prospect-demo path stay structurally separate.
export const PROSPECT_DEMO_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260703_053131_1ec3dd1c-d627-44fb-ab20-6e1fce41b0d5.mp4';

// A confirmed video is only usable as real customer material when its URL came
// from the briefing itself; the prospect-demo asset never counts, no matter what
// provenance status a briefing claims for it.
export function confirmedVideoUrl(briefing) {
  const url = confirmed(briefing.video);
  if (!url || url === PROSPECT_DEMO_VIDEO_URL) return null;
  return url;
}

// Nav-availability predicates shared between the composer's hero selection and
// hero-video's own navigation, so a nav link is only ever offered when the
// matching confirmed content actually exists elsewhere on the same page.
export function hasConfirmedMenu(briefing) {
  return (confirmed(briefing.speisekarte) || []).length > 0;
}

export function hasConfirmedStory(briefing) {
  const historie = confirmed(briefing.historie);
  if (historie && historie.length) return true;
  return briefing.konzept?.status === 'confirmed' || briefing.usp?.status === 'confirmed';
}

export function hasConfirmedGallery(briefing) {
  return confirmedPhotos(briefing).length > 0;
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
