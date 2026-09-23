import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} .bp-strip{display:flex;gap:${tokens.spacing.sm}px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:${tokens.spacing.sm}px;}
.${scope} .bp-strip figure{flex:0 0 auto;width:min(78vw,420px);scroll-snap-align:start;margin:0;border-radius:2px;overflow:hidden;}
.${scope} .bp-strip img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}
.${scope} figcaption{font-size:${tokens.typography.scale[0]}px;opacity:.7;padding-top:4px;}
`;
}
