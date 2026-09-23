import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} .bp-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:110px;gap:${tokens.spacing.xs}px;}
@media(max-width:767px){.${scope} .bp-grid{grid-template-columns:repeat(2,1fr);grid-auto-rows:130px;}}
.${scope} .bp-grid figure{margin:0;overflow:hidden;border-radius:2px;position:relative;}
.${scope} .bp-grid img{width:100%;height:100%;object-fit:cover;display:block;}
.${scope} .bp-grid figure:nth-child(6n+1){grid-column:span 2;grid-row:span 2;}
.${scope} .bp-grid figure:nth-child(6n+4){grid-column:span 2;}
`;
}
