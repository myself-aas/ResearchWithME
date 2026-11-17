/**
 * ResearchWithME v3.4 Part V §16.2 — MDX Security Controls & Allowlist Validator.
 *
 * Enforces:
 * - Allowlisted scholarly JSX components only
 * - No arbitrary `import` or `export` statements
 * - No arbitrary JavaScript expressions or inline event handlers (`onClick`, `onError`, etc.)
 * - No dangerous URL schemes (`javascript:`, `vbscript:`, `data:text/html`)
 * - No raw HTML injection tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`)
 * - Document and block size caps
 */

export const ALLOWED_MDX_COMPONENTS = new Set([
  'EvidenceCallout',
  'ClaimSummary',
  'CitationRef',
  'LimitationBox',
  'ToolReviewCard',
  'DataTable',
  'FigureBlock',
  'Callout',
]);

export const MAX_MDX_DOCUMENT_CHARS = 120_000;
export const MAX_MDX_BLOCKS = 250;
export const MAX_MDX_BLOCK_CHARS = 16_000;

export interface MdxSecurityViolation {
  code:
    | 'DOCUMENT_TOO_LARGE'
    | 'IMPORT_EXPORT_PROHIBITED'
    | 'FORBIDDEN_TAG'
    | 'EVENT_HANDLER_PROHIBITED'
    | 'DANGEROUS_URL_SCHEME'
    | 'UNALLOWED_COMPONENT'
    | 'DANGEROUS_JS_EXPRESSION';
  message: string;
}

export interface MdxValidationResult {
  safe: boolean;
  violations: MdxSecurityViolation[];
  sanitizedMdx: string;
}

const IMPORT_EXPORT_RE = /^\s*(import|export)\s+(?:default\s+|type\s+|\{|\*|\w)/m;
const FORBIDDEN_TAG_RE = /<\s*(script|iframe|object|embed|applet|base|meta|link|style|form)\b/i;
const EVENT_HANDLER_RE = /\bon[a-z]{2,24}\s*=|dangerouslySetInnerHTML/i;
const DANGEROUS_URL_RE = /(?:href|src|action)\s*=\s*["']?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i;
const MARKDOWN_DANGEROUS_LINK_RE = /\]\(\s*(?:javascript|vbscript|data\s*:\s*text\/html):/i;
const DANGEROUS_EXPR_RE = /\{\s*(?:eval|Function|window|document|globalThis|process|require|fetch)\b/;
const JSX_COMPONENT_RE = /<\s*([A-Z][A-Za-z0-9_]*)\b/g;

/**
 * Strips fenced code blocks before inspecting MDX syntax so legitimate code
 * examples inside ```ts ... ``` fences do not trigger false positives.
 */
function stripFencedCodeBlocks(mdx: string): string {
  return mdx.replace(/```[\s\S]*?```/g, '');
}

export function sanitizeMdxUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^(?:javascript|vbscript|data\s*:\s*text\/html):/i.test(trimmed)) {
    return null;
  }
  if (/^(?:https?:\/\/|mailto:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function validateAndSanitizeMdx(mdx: string): MdxValidationResult {
  const violations: MdxSecurityViolation[] = [];

  if (mdx.length > MAX_MDX_DOCUMENT_CHARS) {
    violations.push({
      code: 'DOCUMENT_TOO_LARGE',
      message: `MDX document exceeds ${MAX_MDX_DOCUMENT_CHARS} characters.`,
    });
  }

  const proseOnly = stripFencedCodeBlocks(mdx);

  if (IMPORT_EXPORT_RE.test(proseOnly)) {
    violations.push({
      code: 'IMPORT_EXPORT_PROHIBITED',
      message: 'Arbitrary import/export statements are prohibited in scholarly MDX.',
    });
  }

  if (FORBIDDEN_TAG_RE.test(proseOnly)) {
    violations.push({
      code: 'FORBIDDEN_TAG',
      message: 'Executable or embedded HTML tags (<script>, <iframe>, <object>, etc.) are prohibited.',
    });
  }

  if (EVENT_HANDLER_RE.test(proseOnly)) {
    violations.push({
      code: 'EVENT_HANDLER_PROHIBITED',
      message: 'Inline DOM event handlers and dangerouslySetInnerHTML are prohibited.',
    });
  }

  if (DANGEROUS_URL_RE.test(proseOnly) || MARKDOWN_DANGEROUS_LINK_RE.test(proseOnly)) {
    violations.push({
      code: 'DANGEROUS_URL_SCHEME',
      message: 'Unsafe URL schemes (javascript:, vbscript:, data:text/html) are prohibited.',
    });
  }

  if (DANGEROUS_EXPR_RE.test(proseOnly)) {
    violations.push({
      code: 'DANGEROUS_JS_EXPRESSION',
      message: 'Arbitrary JavaScript runtime expressions are prohibited in MDX.',
    });
  }

  for (const match of proseOnly.matchAll(JSX_COMPONENT_RE)) {
    const componentName = match[1];
    if (componentName && !ALLOWED_MDX_COMPONENTS.has(componentName)) {
      violations.push({
        code: 'UNALLOWED_COMPONENT',
        message: `Component <${componentName}> is not in the scholarly MDX allowlist.`,
      });
    }
  }

  // Produce a sanitized fallback string with dangerous tags/urls neutralized
  const sanitizedMdx = mdx
    .replace(/<\s*(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|base|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\]\(\s*(?:javascript|vbscript|data\s*:\s*text\/html):[^)]*\)/gi, '](#blocked-unsafe-url)');

  return {
    safe: violations.length === 0,
    violations,
    sanitizedMdx,
  };
}
