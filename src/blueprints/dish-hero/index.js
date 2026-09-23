import { escapeHtml, escapeAttr, confirmed, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('dish-hero');
  const name = confirmed(briefing.signaturgericht);
  const menu = confirmed(briefing.speisekarte) || [];
  const menuItem = menu.find((m) => m.name === name);
  const photos = confirmedPhotos(briefing);
  const dishPhoto = photos.find((p) => /gericht|dish|signatur/i.test(p.caption || '')) || photos[0] || null;
  const style = dishPhoto ? ` style="background-image:url('${escapeAttr(dishPhoto.url)}')"` : '';
  const html = `
<section class="${scope}" aria-label="Signaturgericht"${style}>
  <div class="bp-inner">
    <p class="bp-kicker">Unser Signature Moment</p>
    <h2>${escapeHtml(name)}</h2>
    ${menuItem?.description ? `<p>${escapeHtml(menuItem.description)}</p>` : ''}
    ${menuItem?.price ? `<p class="bp-price">${escapeHtml(menuItem.price)}</p>` : ''}
  </div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: dishPhoto?.caption ? escapeHtml(dishPhoto.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
