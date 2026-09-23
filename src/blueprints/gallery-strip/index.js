import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('gallery-strip');
  const photos = confirmedPhotos(briefing);
  const figures = photos.map((p) => `<figure><img src="${escapeAttr(p.url)}" alt="${escapeAttr(p.caption || briefing.name)}" loading="lazy">${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ''}</figure>`).join('');
  const html = photos.length ? `
<section class="${scope}" aria-label="Galerie">
  <h2>Einblicke</h2>
  <div class="bp-strip" tabindex="0">${figures}</div>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
