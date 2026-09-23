import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{text-align:center;padding:${tokens.spacing['2xl']}px ${tokens.spacing.md}px;}
.${scope} blockquote{margin:0 auto;max-width:38ch;font-size:${tokens.typography.scale[3]}px;line-height:${tokens.typography.lineHeights[2]};font-style:italic;}
.${scope} blockquote::before{content:"\\201C";color:${tokens.color.accent};}
.${scope} blockquote::after{content:"\\201D";color:${tokens.color.accent};}
.${scope} cite{display:block;margin-top:${tokens.spacing.sm}px;font-style:normal;font-family:${tokens.accentTypography.fontFamily};font-size:${tokens.typography.scale[0]}px;opacity:.75;}
`;
}
