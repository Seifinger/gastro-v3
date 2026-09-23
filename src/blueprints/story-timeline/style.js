import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} ol{list-style:none;margin:0;padding:0;border-left:2px solid ${tokens.color.accent};max-width:44rem;}
.${scope} li{position:relative;padding:0 0 ${tokens.spacing.lg}px ${tokens.spacing.md}px;}
.${scope} li::before{content:"";position:absolute;left:-7px;top:6px;width:12px;height:12px;border-radius:50%;background:${tokens.color.accent};}
.${scope} .bp-year{font-family:${tokens.accentTypography.fontFamily};font-size:${tokens.typography.scale[0]}px;color:${tokens.color.accent};display:block;margin-bottom:4px;}
.${scope} p{font-size:${tokens.typography.scale[1]}px;margin:0;}
`;
}
