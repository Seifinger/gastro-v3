import { blueprints } from '../blueprints/index.js';
import { contrast } from '../tokens/index.js';

const ABSOLUTE_MIN_FONT_PX = 12;
const BODY_MIN_FONT_PX = 17;
const TEXT_MIN_CONTRAST = 4.5;
const CTA_MIN_CONTRAST = 7;
const GENERIC_ICON_CLASS = /\b(fa-|fas |far |fab |material-icons|bi-icon|glyphicon)/;

function neutralColor(token) {
  const t = token.trim().toLowerCase();
  return t === 'transparent' || t === '#fff' || t === '#ffffff' || t === '#000' || t === '#000000'
    || /^rgba?\(\s*0\s*,\s*0\s*,\s*0/.test(t) || /^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(t);
}

function findForbiddenGradients(css) {
  const findings = [];
  const gradientCalls = css.match(/linear-gradient\([^)]*\)/g) || [];
  for (const call of gradientCalls) {
    const colors = call.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g) || [];
    const nonNeutral = colors.filter((c) => !neutralColor(c));
    const uniqueHues = new Set(nonNeutral);
    if (uniqueHues.size >= 2) findings.push(`Verbotener mehrfarbiger Verlauf: ${call}`);
  }
  return findings;
}

function findThreeTilePattern(css) {
  return /repeat\(\s*3\s*,\s*1fr\s*\)/.test(css);
}

function findGenericIcons(html) {
  return GENERIC_ICON_CLASS.test(html);
}

function findTinyFonts(css) {
  const matches = css.match(/font-size:\s*(\d+(?:\.\d+)?)px/g) || [];
  return matches
    .map((m) => Number(m.match(/(\d+(?:\.\d+)?)/)[1]))
    .filter((px) => px < ABSOLUTE_MIN_FONT_PX);
}

function checkResponsiveGuard(sections) {
  const missing = [];
  for (const section of sections) {
    if (section.blueprint === 'tel-cta') continue;
    const bp = blueprints[section.blueprint];
    if (!bp || !bp.meta.asymmetric) continue;
    const css = bp.css(section.__tokens, 'judge-probe');
    if (!/@media\s*\(min-width:\s*768px\)/.test(css)) {
      missing.push(`${section.blueprint} definiert kein Desktop-Layout ab 768px, obwohl asymmetrisch`);
    }
  }
  return missing;
}

// Hard build gate: any 'error' finding blocks the build. 'warn' findings are
// reported but do not block, since they can be legitimate design choices
// the agency should still see.
export function judge(briefing, composed, rendered) {
  const findings = [];
  const { tokens, sections } = composed;

  if (tokens.typography.scale[0] < BODY_MIN_FONT_PX) {
    findings.push({ level: 'error', code: 'min-font-body', message: `Fließtext ${tokens.typography.scale[0]}px unterschreitet die Mindestgröße von ${BODY_MIN_FONT_PX}px.` });
  }

  const bodyContrast = contrast(tokens.color.text, tokens.color.background);
  if (bodyContrast < TEXT_MIN_CONTRAST) {
    findings.push({ level: 'error', code: 'contrast-body', message: `Text/Hintergrund-Kontrast ${bodyContrast.toFixed(2)}:1 unterschreitet WCAG AA (${TEXT_MIN_CONTRAST}:1).` });
  }
  const ctaContrast = contrast(tokens.color.accent, tokens.color.ctaText);
  if (ctaContrast < CTA_MIN_CONTRAST) {
    findings.push({ level: 'error', code: 'contrast-cta', message: `CTA-Kontrast ${ctaContrast.toFixed(2)}:1 unterschreitet die geforderten ${CTA_MIN_CONTRAST}:1.` });
  }

  const gradientFindings = findForbiddenGradients(rendered.html);
  for (const message of gradientFindings) findings.push({ level: 'error', code: 'forbidden-gradient', message });

  if (findThreeTilePattern(rendered.html)) {
    findings.push({ level: 'error', code: 'three-tile-pattern', message: 'Verbotenes Drei-gleichgroße-Kacheln-Muster als alleiniges Sektionslayout gefunden.' });
  }

  if (findGenericIcons(rendered.html)) {
    findings.push({ level: 'error', code: 'generic-icons', message: 'Generische Icon-Bibliothek gefunden (z. B. Font Awesome/Bootstrap Icons/Material Icons).' });
  }

  const tinyFonts = findTinyFonts(rendered.html);
  if (tinyFonts.length) {
    findings.push({ level: 'error', code: 'min-font-absolute', message: `Schriftgrößen unter ${ABSOLUTE_MIN_FONT_PX}px gefunden: ${tinyFonts.join(', ')}px.` });
  }

  const hasAsymmetric = sections.some((s) => s.blueprint !== 'tel-cta' && blueprints[s.blueprint]?.meta.asymmetric);
  if (!hasAsymmetric) {
    findings.push({ level: 'error', code: 'no-asymmetry', message: 'Keine asymmetrische Desktop-Sektion in der Komposition.' });
  }

  const signatureCount = sections.filter((s) => s.ctx?.signature).length;
  if (signatureCount !== 1) {
    findings.push({ level: 'error', code: 'signature-moment', message: `Es muss genau einen hervorgehobenen Signature Moment geben (gefunden: ${signatureCount}).` });
  }

  const responsiveMissing = checkResponsiveGuard(sections.map((s) => ({ ...s, __tokens: tokens })));
  for (const message of responsiveMissing) findings.push({ level: 'error', code: 'responsive-guard', message });

  if (composed.buildStatus === 'insufficient') {
    findings.push({ level: 'error', code: 'insufficient-content', message: `Komposition unvollständig: ${composed.reasons.join(' ')}` });
  }

  const pass = findings.every((f) => f.level !== 'error');
  return { pass, findings };
}
