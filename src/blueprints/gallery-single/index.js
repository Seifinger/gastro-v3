import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('gallery-single');
  const photos = confirmedPhotos(briefing);
  const photo = photos.find((p) => /raum|ambiente|interior|haus/i.test(p.caption || '')) || photos[0] || null;
  const html = photo ? `
<section class="${scope}" aria-label="Ambiente" id="atmosphaere">
  <figure><img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.caption || briefing.name)}" loading="lazy">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}</figure>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: photo?.caption ? escapeHtml(photo.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
