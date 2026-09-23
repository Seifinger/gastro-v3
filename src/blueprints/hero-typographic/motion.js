import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.hero === 'none') return '';
  return reducedMotionGuard(`.${scope} h1{animation:${scope}-in .6s ease-out both;}@keyframes ${scope}-in{from{opacity:0;letter-spacing:.05em;}to{opacity:1;letter-spacing:${tokens.typography.tracking};}}`);
}
