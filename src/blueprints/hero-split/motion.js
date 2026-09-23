import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal === 'none') return '';
  const anim = tokens.motion.reveal === 'stagger'
    ? `.${scope} .bp-text{animation:${scope}-in .5s ease-out both;}.${scope} .bp-media{animation:${scope}-in .5s .12s ease-out both;}`
    : `.${scope} .bp-text,.${scope} .bp-media{animation:${scope}-in .6s ease-out both;}`;
  return reducedMotionGuard(`${anim}@keyframes ${scope}-in{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}`);
}
