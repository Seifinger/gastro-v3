import { escapeHtml, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('testimonial-grid');
  const quotes = confirmed(briefing.testimonials) || [];
  const blocks = quotes.map((q) => `<blockquote>${escapeHtml(q.text)}<cite>${escapeHtml(q.name)}</cite></blockquote>`).join('');
  const html = quotes.length ? `
<section class="${scope}" aria-label="Stimmen unserer Gäste">
  <h2>Was Gäste sagen</h2>
  <div class="bp-columns">${blocks}</div>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
