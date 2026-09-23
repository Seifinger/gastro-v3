// Maps our typography tokens' CSS font-family declarations to Google Fonts
// family names/weights. Keeps the renderer from hardcoding a URL per
// archetype while still only loading the (at most two) families a given
// site actually uses.
const WEIGHTS = {
  'Jost': '400;600',
  'DM Sans': '400;600',
  'Lora': '400;600',
  'Zilla Slab': '400;600',
  'Dancing Script': '400;600',
  'JetBrains Mono': '400;500',
};

function extractFamilyName(cssFontFamily) {
  const first = cssFontFamily.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

export function googleFontsHref(typography, accentTypography) {
  const names = new Set();
  names.add(extractFamilyName(typography.fontFamily));
  if (accentTypography) names.add(extractFamilyName(accentTypography.fontFamily));
  const params = [...names]
    .filter((name) => WEIGHTS[name])
    .map((name) => `family=${encodeURIComponent(name)}:wght@${WEIGHTS[name]}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
