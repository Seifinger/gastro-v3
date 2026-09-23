import { escapeHtml, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('story-timeline');
  const events = confirmed(briefing.historie) || [];
  const sorted = [...events].sort((a, b) => a.year.localeCompare(b.year));
  const items = sorted.map((e) => `<li><span class="bp-year">${escapeHtml(e.year)}</span><p>${escapeHtml(e.text)}</p></li>`).join('');
  const html = `
<section class="${scope}" aria-label="Geschichte" id="ueber-uns">
  <h2>Geschichte</h2>
  <ol>${items}</ol>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
