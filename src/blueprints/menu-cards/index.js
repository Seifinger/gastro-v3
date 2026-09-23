import { escapeHtml, escapeAttr, confirmed, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('menu-cards');
  const items = confirmed(briefing.speisekarte) || [];
  const photos = confirmedPhotos(briefing);
  const cards = items.map((m) => {
    const photo = photos.find((p) => p.caption?.toLowerCase().includes(m.name.toLowerCase())) || m.photoUrl;
    const img = photo
      ? `<img src="${escapeAttr(photo.url || m.photoUrl)}" alt="${escapeAttr(m.name)}" loading="lazy">`
      : '';
    return `<article class="bp-card">${img}<div class="bp-card-body"><h3 class="bp-name">${escapeHtml(m.name)}</h3>${m.description ? `<p class="bp-desc">${escapeHtml(m.description)}</p>` : ''}${m.price ? `<p class="bp-price">${escapeHtml(m.price)}</p>` : ''}</div></article>`;
  }).join('');
  const html = `
<section class="${scope}" aria-label="Karte" id="speisekarte">
  <h2>Von der Karte</h2>
  <div class="bp-grid">${cards}</div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
