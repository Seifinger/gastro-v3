import { deriveTokens } from '../tokens/index.js';
import { blueprints } from '../blueprints/index.js';
import { confirmed, confirmedPhotos, confirmedVideoUrl } from '../blueprints/_shared/util.js';
import { meta as telCtaMeta } from './telCta.js';

// Deterministic, seed-stable variety: a djb2-style hash of the briefing id
// picks between equally valid alternatives. Never Math.random().
export function seedHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

function pick(seed, options) {
  return options[seed % options.length];
}

function chooseHero(briefing, seed) {
  const videoOk = Boolean(confirmedVideoUrl(briefing));
  const photos = confirmedPhotos(briefing);
  const fineDining = briefing.preisklasse?.status === 'confirmed' && briefing.preisklasse.value === 'fine-dining';
  if (videoOk) return 'hero-video';
  if (fineDining && photos.length) return 'hero-editorial';
  if (photos.length >= 2) return pick(seed, ['hero-split', 'hero-fullbleed', 'hero-editorial']);
  if (photos.length === 1) return 'hero-fullbleed';
  return 'hero-typographic';
}

function chooseStory(briefing) {
  const historie = confirmed(briefing.historie);
  const konzeptOk = briefing.konzept?.status === 'confirmed';
  const uspOk = briefing.usp?.status === 'confirmed';
  if (historie && historie.length) return 'story-timeline';
  if (konzeptOk || uspOk) {
    const hasFounderPhoto = confirmedPhotos(briefing).some((p) => /team|inhaber|wirt|portrait|gr(ü|u)nder/i.test(p.caption || ''));
    return hasFounderPhoto ? 'story-founder' : 'story-manifesto';
  }
  return null;
}

function chooseProduct(briefing, seed) {
  const menu = confirmed(briefing.speisekarte) || [];
  const signature = confirmed(briefing.signaturgericht);
  const ids = [];
  if (signature && menu.some((m) => m.name === signature)) ids.push('dish-hero');
  if (menu.length >= 3) {
    ids.push(pick(seed, ['menu-cards', 'menu-board', 'menu-list']));
  } else if (menu.length) {
    ids.push('menu-list');
  }
  return ids;
}

function chooseGallery(briefing) {
  const count = confirmedPhotos(briefing).length;
  if (count >= 6) return 'gallery-mosaic';
  if (count >= 3) return 'gallery-strip';
  if (count >= 1) return 'gallery-single';
  return null;
}

function chooseSocialProof(briefing) {
  const quotes = confirmed(briefing.testimonials) || [];
  if (quotes.length >= 2) return 'testimonial-grid';
  if (quotes.length === 1) return 'testimonial-solo';
  return null;
}

function chooseConversion(briefing) {
  const action = briefing.hauptaktion;
  if (action === 'reservieren') return { blueprint: 'reservation-form', ok: true };
  if (action === 'bestellen') {
    const menu = confirmed(briefing.speisekarte) || [];
    return menu.length
      ? { blueprint: 'order-embed', ok: true }
      : { blueprint: 'order-embed', ok: false, reason: 'Hauptaktion "bestellen" verlangt eine bestätigte Speisekarte für die Online-Bestellung.' };
  }
  if (action === 'anrufen') {
    const tel = briefing.telefon?.status === 'confirmed' ? briefing.telefon.value : null;
    return tel
      ? { blueprint: 'tel-cta', ok: true, tel }
      : { blueprint: 'tel-cta', ok: false, reason: 'Hauptaktion "anrufen" verlangt eine bestätigte Telefonnummer.' };
  }
  return { blueprint: null, ok: true };
}

function primaryCta(briefing, conversion) {
  if (briefing.hauptaktion === 'reservieren') return { label: 'Tisch reservieren', href: '#reservieren' };
  if (briefing.hauptaktion === 'bestellen' && conversion.ok) return { label: 'Jetzt bestellen', href: '#bestellen' };
  if (briefing.hauptaktion === 'anrufen' && conversion.ok) return { label: 'Jetzt anrufen', href: `tel:${conversion.tel.replace(/[^+\d]/g, '')}` };
  return null;
}

function isAsymmetric(blueprintId) {
  if (blueprintId === 'tel-cta') return telCtaMeta.asymmetric;
  return Boolean(blueprints[blueprintId]?.meta.asymmetric);
}

function isSignatureCapable(blueprintId) {
  if (blueprintId === 'tel-cta') return telCtaMeta.signatureCapable;
  return Boolean(blueprints[blueprintId]?.meta.signatureCapable);
}

function ensureAsymmetry(sections, briefing) {
  if (sections.some((s) => isAsymmetric(s.blueprint))) return;
  const photos = confirmedPhotos(briefing);
  const menuIdx = sections.findIndex((s) => s.blueprint === 'menu-list' || s.blueprint === 'menu-board');
  if (menuIdx !== -1) { sections[menuIdx].blueprint = 'menu-cards'; return; }
  const galleryIdx = sections.findIndex((s) => s.blueprint === 'gallery-single' || s.blueprint === 'gallery-strip');
  if (galleryIdx !== -1 && photos.length >= 1) { sections[galleryIdx].blueprint = 'gallery-mosaic'; return; }
  const quotes = confirmed(briefing.testimonials) || [];
  const socialIdx = sections.findIndex((s) => s.blueprint === 'testimonial-solo');
  if (socialIdx !== -1 && quotes.length >= 2) { sections[socialIdx].blueprint = 'testimonial-grid'; return; }
  const heroSection = sections[0];
  if (heroSection && photos.length >= 2 && heroSection.blueprint !== 'hero-video') {
    heroSection.blueprint = pick(seedHash(briefing.id), ['hero-split', 'hero-editorial']);
  }
}

function ensureSignatureMoment(sections) {
  const already = sections.find((s) => s.ctx.signature);
  if (already) return;
  const candidate = sections.find((s) => isSignatureCapable(s.blueprint));
  if (candidate) candidate.ctx.signature = true;
}

// Deterministic rule engine: validated briefing + tokens -> 6-9 dramaturgically
// ordered sections (Hook -> Vertrauen -> Produkt -> Beweis -> Aktion). Never
// fabricates filler content: when confirmed data is too thin to reach a
// publishable site, buildStatus reports why instead of inventing copy.
export function compose(briefing) {
  const tokens = deriveTokens(briefing);
  const seed = seedHash(briefing.id);
  const conversion = chooseConversion(briefing);
  const cta = primaryCta(briefing, conversion);

  const heroId = chooseHero(briefing, seed);
  const storyId = chooseStory(briefing);
  const productIds = chooseProduct(briefing, seed);
  const galleryId = chooseGallery(briefing);
  const socialId = chooseSocialProof(briefing);

  const sections = [];
  sections.push({ blueprint: heroId, ctx: { cta } }); // Hook
  if (storyId) sections.push({ blueprint: storyId, ctx: {} }); // Vertrauen
  for (const id of productIds) sections.push({ blueprint: id, ctx: {} }); // Produkt
  if (galleryId) sections.push({ blueprint: galleryId, ctx: {} }); // Beweis (Ambiente)
  if (socialId) sections.push({ blueprint: socialId, ctx: {} }); // Beweis (Social Proof)
  if (conversion.blueprint && conversion.ok) {
    sections.push({ blueprint: conversion.blueprint, ctx: conversion.tel ? { tel: conversion.tel } : {} }); // Aktion
  }

  ensureAsymmetry(sections, briefing);
  ensureSignatureMoment(sections);

  const reasons = [];
  if (conversion.blueprint && !conversion.ok) reasons.push(conversion.reason);
  if (sections.length < 6) {
    reasons.push(`Nur ${sections.length} von mindestens 6 nötigen Sektionen lassen sich aus bestätigten Inhalten aufbauen. Fehlende bestätigte Angaben ergänzen, statt Inhalte zu erfinden.`);
  }
  const buildStatus = reasons.length === 0 && sections.length >= 6 ? 'ready' : 'insufficient';

  return {
    archetype: tokens.archetype,
    tokens,
    seed,
    sections: sections.slice(0, 9),
    buildStatus,
    reasons,
  };
}
