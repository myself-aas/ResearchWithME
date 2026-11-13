/**
 * Deterministic, domain-customized SVG avatars — used by the Next author-avatar
 * route and the Pages author-avatar handler. Pure string building; no Node APIs,
 * no network. Every interpolated value is XML-escaped.
 *
 * Colors are drawn from the πeme design-system palette (lib/tokens) via the
 * brand #1D4ED8 anchor rather than ad-hoc indigo/slate/emerald hexes.
 */

/** Escapes text interpolated into SVG so a name cannot inject markup. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// πeme-tone palette used by fallback avatars. These match the semantic colors
// declared in lib/tokens so an avatar never introduces a stray hex.
const TONES = {
  brand:       { start: '#1D4ED8', end: '#1E3A8A', accent: '#60A5FA', motif: '⚡' }, // anchor blue
  ink:         { start: '#0F172A', end: '#020617', accent: '#94A3B8', motif: '🖋' }, // literary
  teal:        { start: '#0F766E', end: '#134E4A', accent: '#5EEAD4', motif: '🌐' }, // environment/earth
  rose:        { start: '#9F1239', end: '#4C0519', accent: '#FDA4AF', motif: '🧬' }, // medicine/biology
  amber:       { start: '#92400E', end: '#451A03', accent: '#FCD34D', motif: '📊' }, // policy/economics
  violet:      { start: '#5B21B6', end: '#2E1065', accent: '#C4B5FD', motif: '📐' }, // math/theory
} as const;

type ToneKey = keyof typeof TONES;

function pickTone(domain: string, role: string): (typeof TONES)[ToneKey] {
  const hay = (domain + ' ' + role).toLowerCase();
  if (/(^|\W)(computer|ai|system|infrastructure|software|engineer)($|\W)/.test(hay)) return TONES.brand;
  if (/(^|\W)(medicine|medical|health|clinical|biolog|neuro)($|\W)/.test(hay)) return TONES.rose;
  if (/(^|\W)(climate|environment|geophysic|earth|ecolog)($|\W)/.test(hay)) return TONES.teal;
  if (/(^|\W)(sociolog|policy|economic|political|governance)($|\W)/.test(hay)) return TONES.amber;
  if (/(^|\W)(mathematic|physics|theor|philosophy|logic)($|\W)/.test(hay)) return TONES.violet;
  return TONES.ink;
}

/**
 * Generates an SVG avatar customized to the author's academic domain and expertise.
 * Every interpolated value is escaped; this runs without any external call.
 */
export function createDomainFallbackSvg(name: string, domain: string, role: string): string {
  const initials = escapeXml(
    name
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  const tone = pickTone(domain, role);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="${escapeXml(name)} initials avatar">
    <defs>
      <linearGradient id="grad-${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${tone.start}" />
        <stop offset="100%" stop-color="${tone.end}" />
      </linearGradient>
      <pattern id="grid-${initials}" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${tone.accent}" stroke-opacity="0.12" stroke-width="1" />
      </pattern>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#grad-${initials})" />
    <rect width="200" height="200" rx="24" fill="url(#grid-${initials})" />

    <circle cx="100" cy="100" r="70" fill="none" stroke="${tone.accent}" stroke-opacity="0.28" stroke-width="1.5" stroke-dasharray="4 4" />
    <circle cx="100" cy="100" r="85" fill="none" stroke="${tone.accent}" stroke-opacity="0.16" stroke-width="1" />

    <circle cx="160" cy="40" r="18" fill="${tone.end}" stroke="${tone.accent}" stroke-width="1.5" />
    <text x="160" y="46" font-size="14" text-anchor="middle" dominant-baseline="middle">${tone.motif}</text>

    <text x="100" y="110" font-family="ui-sans-serif, system-ui, sans-serif" font-size="52" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="-1">${initials}</text>

    <rect x="40" y="152" width="120" height="22" rx="11" fill="${tone.accent}" fill-opacity="0.2" stroke="${tone.accent}" stroke-width="1" />
    <text x="100" y="166" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">GUEST WRITER</text>
  </svg>`;

  return svg;
}
