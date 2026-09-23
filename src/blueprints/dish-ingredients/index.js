import { escapeHtml, escapeAttr, confirmed, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('dish-ingredients');
  const menu = confirmed(briefing.speisekarte) || [];
  const signature = confirmed(briefing.signaturgericht);
  const item = menu.find((m) => m.name === signature) || menu[0];
  const photos = confirmedPhotos(briefing);
  const photo = photos.find((p) => item && p.caption?.toLowerCase().includes(item.name.toLowerCase())) || photos[0] || null;
  const ingredients = item?.description
    ? item.description.split(/,|•|\+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const media = photo
    ? `<figure class="bp-media"><img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.caption || item?.name || '')}" loading="lazy"></figure>`
    : `<div class="bp-media"></div>`;
  const html = item ? `
<section class="${scope}" aria-label="Gericht im Detail">
  ${media}
  <div>
    <h2>${escapeHtml(item.name)}</h2>
    ${item.price ? `<p class="bp-price">${escapeHtml(item.price)}</p>` : ''}
    ${ingredients.length ? `<ul>${ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}
  </div>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: photo?.caption ? escapeHtml(photo.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
