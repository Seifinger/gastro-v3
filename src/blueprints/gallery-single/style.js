import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{padding:0;}
.${scope} figure{margin:0;position:relative;}
.${scope} img{width:100%;max-height:86vh;object-fit:cover;display:block;}
.${scope} figcaption{font-size:${tokens.typography.scale[0]}px;padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;opacity:.75;}
`;
}
