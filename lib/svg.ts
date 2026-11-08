/**
 * Sanitises SVG markup before it is handed to a browser.
 *
 * The author-avatar route interpolates a model's output, so its markup is
 * untrusted. Rendering unfiltered SVG inline executes `<script>` elements and
 * `on*` handlers in the page's origin. The caller additionally renders the
 * result through an `<img>` data URI, which cannot execute script at all; this
 * module is the second line of defence for any future inline use.
 */

/** Elements that can execute script or pull in remote content. */
const FORBIDDEN_ELEMENTS = [
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'animation',
  'handler',
  'set',
];

/** URL schemes that are never acceptable inside an avatar. */
const FORBIDDEN_URL = /^\s*(javascript|data|vbscript|file)\s*:/i;

const URL_ATTRIBUTES = ['href', 'xlink:href', 'src', 'from', 'to', 'values'];

function stripForbiddenElements(svg: string): string {
  let result = svg;
  for (const tag of FORBIDDEN_ELEMENTS) {
    // Paired form first, then any self-closing or orphan opening tag.
    result = result.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi'), '');
    result = result.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '');
  }
  return result;
}

function stripEventHandlers(svg: string): string {
  // on<event>= with a double-quoted, single-quoted, or bare value.
  return svg
    .replace(/\son[a-z-]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z-]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z-]+\s*=\s*[^\s>]+/gi, '');
}

function stripUnsafeUrls(svg: string): string {
  let result = svg;
  for (const attribute of URL_ATTRIBUTES) {
    const pattern = new RegExp(`(\\s${attribute.replace(':', '\\:')}\\s*=\\s*)(["'])([\\s\\S]*?)\\2`, 'gi');
    result = result.replace(pattern, (match, prefix: string, quote: string, value: string) => {
      const trimmed = value.trim();
      // Fragment references to gradients and patterns inside the same document
      // are legitimate; anything with a scheme must be a plain http(s) URL.
      if (trimmed.startsWith('#')) return match;
      if (FORBIDDEN_URL.test(trimmed)) return `${prefix}${quote}${quote}`;
      if (/^https?:\/\//i.test(trimmed)) return match;
      return `${prefix}${quote}${quote}`;
    });
  }
  return result;
}

/**
 * Returns a single `<svg>` root with script-bearing constructs removed, or null
 * when the input is not recognisably an SVG document.
 */
export function sanitizeSvgMarkup(input: string): string | null {
  const start = input.indexOf('<svg');
  const end = input.lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end <= start) return null;

  let svg = input.slice(start, end + '</svg>'.length);
  svg = stripForbiddenElements(svg);
  svg = stripEventHandlers(svg);
  svg = stripUnsafeUrls(svg);

  // Anything left that still opens a script-bearing tag means the markup did not
  // survive sanitisation cleanly; refuse it rather than shipping a partial document.
  if (/<\s*script/i.test(svg)) return null;
  if (!/^<svg[\s>]/i.test(svg.trim())) return null;

  return svg;
}

/** Builds a data URI safe for `<img src>`; the SVG cannot execute script there. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
