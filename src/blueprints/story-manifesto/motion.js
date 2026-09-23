import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.reveal === 'none') return '';
  return reducedMotionGuard(`.${scope} p{animation:${scope}-in .6s ease-out both;}@keyframes ${scope}-in{from{opacity:0;transform:scale(.98);}to{opacity:1;transform:scale(1);}}`);
}
