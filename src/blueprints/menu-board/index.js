import { escapeHtml, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('menu-board');
  const items = confirmed(briefing.speisekarte) || [];
  const mid = Math.ceil(items.length / 2);
  const columns = [items.slice(0, mid), items.slice(mid)];
  const col = (list) => list.map((m) => `<div class="bp-row"><span>${escapeHtml(m.name)}</span>${m.price ? `<span class="bp-price">${escapeHtml(m.price)}</span>` : ''}</div>`).join('');
  const html = `
<section class="${scope}" aria-label="Tageskarte" id="speisekarte">
  <h2>Tageskarte</h2>
  <div class="bp-columns"><div>${col(columns[0])}</div><div>${col(columns[1])}</div></div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
