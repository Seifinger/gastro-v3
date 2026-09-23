import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} .bp-grid{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.md}px;}
@media(min-width:768px){.${scope} .bp-grid{grid-template-columns:repeat(6,1fr);grid-auto-flow:dense;}}
.${scope} .bp-card{background:#fff;border-radius:2px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);}
@media(min-width:768px){
  .${scope} .bp-card:nth-child(6n+1){grid-column:span 4;}
  .${scope} .bp-card:nth-child(6n+2){grid-column:span 2;}
  .${scope} .bp-card:nth-child(6n+3){grid-column:span 2;}
  .${scope} .bp-card:nth-child(6n+4){grid-column:span 2;}
  .${scope} .bp-card:nth-child(6n+5){grid-column:span 2;}
  .${scope} .bp-card:nth-child(6n+6){grid-column:span 4;}
}
.${scope} .bp-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}
.${scope} .bp-card-body{padding:${tokens.spacing.sm}px ${tokens.spacing.sm}px;}
.${scope} .bp-name{font-size:${tokens.typography.scale[1]}px;margin:0 0 4px;}
.${scope} .bp-desc{font-size:${tokens.typography.scale[0]}px;opacity:.7;margin:0 0 6px;}
.${scope} .bp-price{font-family:${tokens.accentTypography.fontFamily};color:${tokens.color.accent};}
`;
}
