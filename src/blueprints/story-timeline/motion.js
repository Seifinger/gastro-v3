import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal === 'none') return '';
  const stagger = tokens.motion.reveal === 'stagger';
  const rule = stagger
    ? Array.from({ length: 8 }, (_, i) => `.${scope} li:nth-child(${i + 1}){animation-delay:${i * 0.08}s;}`).join('')
    : '';
  return reducedMotionGuard(`.${scope} li{animation:${scope}-in .5s ease-out both;}${rule}@keyframes ${scope}-in{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}`);
}
