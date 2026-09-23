import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('gallery-mosaic');
  const photos = confirmedPhotos(briefing);
  const figures = photos.map((p) => `<figure><img src="${escapeAttr(p.url)}" alt="${escapeAttr(p.caption || briefing.name)}" loading="lazy"></figure>`).join('');
  const html = photos.length ? `
<section class="${scope}" aria-label="Impressionen">
  <h2>Impressionen</h2>
  <div class="bp-grid">${figures}</div>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
