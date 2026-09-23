import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal === 'none') return '';
  return reducedMotionGuard(`.${scope} .bp-portrait{animation:${scope}-in .55s ease-out both;}@keyframes ${scope}-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}`);
}
