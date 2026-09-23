import { escapeHtml, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('testimonial-solo');
  const quotes = confirmed(briefing.testimonials) || [];
  const quote = quotes[0];
  const html = quote ? `
<section class="${scope}" aria-label="Stimme">
  <blockquote>${escapeHtml(quote.text)}</blockquote>
  <cite>${escapeHtml(quote.name)}</cite>
</section>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
