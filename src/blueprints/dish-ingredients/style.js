import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.lg}px;max-width:60rem;margin:0 auto;}
@media(min-width:768px){.${scope}{grid-template-columns:1fr 1fr;align-items:center;}}
.${scope} .bp-media{aspect-ratio:1;border-radius:2px;overflow:hidden;background:${tokens.color.base};}
.${scope} .bp-media img{width:100%;height:100%;object-fit:cover;display:block;}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} .bp-price{color:${tokens.color.accent};font-weight:600;font-size:${tokens.typography.scale[1]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} ul{list-style:none;margin:0;padding:0;font-size:${tokens.typography.scale[0]}px;line-height:1.9;}
.${scope} li::before{content:"— ";color:${tokens.color.accent};}
`;
}
