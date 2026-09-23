import { escapeHtml, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('menu-list');
  const items = confirmed(briefing.speisekarte) || [];
  const rows = items.map((m) => `<li><span class="bp-name">${escapeHtml(m.name)}${m.description ? `<span class="bp-desc">${escapeHtml(m.description)}</span>` : ''}</span>${m.price ? `<span class="bp-price">${escapeHtml(m.price)}</span>` : ''}</li>`).join('');
  const html = `
<section class="${scope}" aria-label="Speisekarte" id="speisekarte">
  <h2>Speisekarte</h2>
  <ul>${rows}</ul>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
