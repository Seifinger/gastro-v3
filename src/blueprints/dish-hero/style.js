import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{position:relative;min-height:70vh;display:flex;align-items:center;background-size:cover;background-position:center;}
.${scope}::before{content:"";position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,.62),rgba(0,0,0,.05) 60%);}
.${scope} .bp-inner{position:relative;max-width:32rem;color:#fff;}
.${scope} .bp-kicker{font-family:${tokens.accentTypography.fontFamily};text-transform:uppercase;letter-spacing:.14em;font-size:${tokens.typography.scale[0]}px;margin:0 0 ${tokens.spacing.xs}px;color:${tokens.color.accent};}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} p{font-size:${tokens.typography.scale[1]}px;margin:0 0 ${tokens.spacing.sm}px;color:#f4f1ec;}
.${scope} .bp-price{font-size:${tokens.typography.scale[2]}px;font-weight:600;}
`;
}
