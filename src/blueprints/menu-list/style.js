import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{max-width:44rem;margin:0 auto;}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} ul{list-style:none;margin:0;padding:0;}
.${scope} li{display:flex;justify-content:space-between;align-items:baseline;gap:${tokens.spacing.sm}px;padding:${tokens.spacing.sm}px 0;border-bottom:1px solid rgba(0,0,0,.1);}
.${scope} .bp-name{font-size:${tokens.typography.scale[1]}px;}
.${scope} .bp-desc{display:block;font-size:${tokens.typography.scale[0]}px;opacity:.7;margin-top:2px;}
.${scope} .bp-price{font-family:${tokens.accentTypography.fontFamily};font-size:${tokens.typography.scale[1]}px;white-space:nowrap;}
`;
}
