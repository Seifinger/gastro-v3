export function css(tokens, scope) {
  return `
.${scope}{font-family:${tokens.accentTypography.fontFamily};background:#232019;color:#f2ead9;padding:${tokens.spacing.xl}px ${tokens.spacing.md}px;}
.${scope} *{box-sizing:border-box;}
.${scope} :focus-visible{outline:3px solid ${tokens.color.accent};outline-offset:3px;}
.${scope} h2{font-family:${tokens.typography.fontFamily};font-size:${tokens.typography.scale[3]}px;text-align:center;margin:0 0 ${tokens.spacing.lg}px;letter-spacing:.04em;}
.${scope} .bp-columns{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.md}px;max-width:56rem;margin:0 auto;}
@media(min-width:768px){.${scope} .bp-columns{grid-template-columns:1fr 1fr;}}
.${scope} .bp-row{display:flex;justify-content:space-between;gap:${tokens.spacing.sm}px;padding:6px 0;border-bottom:1px dashed rgba(242,234,217,.3);font-size:${tokens.typography.scale[0]}px;}
.${scope} .bp-row .bp-price{white-space:nowrap;}
`;
}
