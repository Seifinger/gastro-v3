import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal === 'none') return '';
  return reducedMotionGuard(`.${scope} img{animation:${scope}-in .6s ease-out both;}@keyframes ${scope}-in{from{opacity:0;}to{opacity:1;}}`);
}
