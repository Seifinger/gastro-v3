import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('story-founder');
  const konzept = briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : null;
  const usp = briefing.usp?.status === 'confirmed' ? briefing.usp.value : null;
  const photos = confirmedPhotos(briefing);
  const portrait = photos.find((p) => /team|inhaber|wirt|portrait/i.test(p.caption || '')) || photos[0] || null;
  const portraitHtml = portrait
    ? `<div class="bp-portrait"><img src="${escapeAttr(portrait.url)}" alt="${escapeAttr(portrait.caption || briefing.name)}" loading="lazy"></div>`
    : '';
  const html = `
<section class="${scope}" aria-label="Über uns" id="ueber-uns">
  ${portraitHtml}
  <div>
    <h2>Unsere Geschichte</h2>
    ${konzept ? `<p>${escapeHtml(konzept)}</p>` : ''}
    ${usp ? `<p class="bp-usp">${escapeHtml(usp)}</p>` : ''}
  </div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: portrait?.caption ? escapeHtml(portrait.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
