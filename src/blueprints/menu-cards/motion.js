import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal !== 'stagger') return '';
  return reducedMotionGuard(`.${scope} .bp-card{animation:${scope}-in .4s ease-out both;}` +
    Array.from({ length: 6 }, (_, i) => `.${scope} .bp-card:nth-child(${i + 1}){animation-delay:${i * 0.06}s;}`).join('') +
    `@keyframes ${scope}-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}`);
}
