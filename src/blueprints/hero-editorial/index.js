import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('hero-editorial');
  const photos = confirmedPhotos(briefing);
  const photo = photos[0] || null;
  const name = escapeHtml(briefing.name);
  const lead = briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : (briefing.usp?.status === 'confirmed' ? briefing.usp.value : null);
  const cta = ctx.cta ? `<a class="bp-cta" href="${escapeAttr(ctx.cta.href)}">${escapeHtml(ctx.cta.label)}</a>` : '';
  const portrait = photo
    ? `<figure class="bp-portrait"><img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.caption || name)}" loading="eager"></figure>`
    : `<div class="bp-portrait" role="img" aria-label="${escapeAttr(name)}" style="background:${tokens.color.base}"></div>`;
  const html = `
<section class="${scope}" aria-label="${escapeAttr(name)}">
  <div class="bp-grid">
    ${portrait}
    <div class="bp-copy">
      <h1>${name}</h1>
      ${lead ? `<p>${escapeHtml(lead)}</p>` : ''}
      ${photo?.caption ? `<p class="bp-caption">${escapeHtml(photo.caption)}</p>` : ''}
      ${cta}
    </div>
  </div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: photo?.caption ? escapeHtml(photo.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
