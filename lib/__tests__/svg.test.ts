import { describe, expect, it } from 'vitest';
import { sanitizeSvgMarkup, svgToDataUri } from '@/lib/svg';

const VALID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#78350f" /></svg>';

describe('sanitizeSvgMarkup', () => {
  it('passes a well-formed avatar through unchanged', () => {
    expect(sanitizeSvgMarkup(VALID)).toBe(VALID);
  });

  it('extracts the document from model boilerplate around it', () => {
    const wrapped = '```svg\nHere is the avatar:\n' + VALID + '\nHope that helps!\n```';
    expect(sanitizeSvgMarkup(wrapped)).toBe(VALID);
  });

  it('removes a paired script element', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" /></svg>';
    const result = sanitizeSvgMarkup(markup)!;
    expect(result).not.toMatch(/script/i);
    expect(result).toContain('<rect');
  });

  it('removes a self-closing script element', () => {
    const result = sanitizeSvgMarkup('<svg xmlns="http://www.w3.org/2000/svg"><script src="https://evil.example/x.js" /></svg>')!;
    expect(result).not.toMatch(/script/i);
  });

  it('removes event handler attributes', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onload="alert(1)" /></svg>';
    const result = sanitizeSvgMarkup(markup)!;
    expect(result).not.toMatch(/onload/i);
    expect(result).toContain('<rect');
  });

  it('removes single-quoted and unquoted event handlers', () => {
    expect(sanitizeSvgMarkup('<svg><rect ONCLICK=\'alert(1)\' /></svg>')!).not.toMatch(/onclick/i);
    expect(sanitizeSvgMarkup('<svg><rect onmouseover=alert(1) /></svg>')!).not.toMatch(/onmouseover/i);
  });

  it('removes foreignObject, which can carry HTML and script', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>';
    const result = sanitizeSvgMarkup(markup)!;
    expect(result).not.toMatch(/foreignObject/i);
    expect(result).not.toMatch(/script/i);
  });

  it('neutralises javascript: URLs but keeps same-document fragment references', () => {
    const markup =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<a href="javascript:alert(1)"><text>x</text></a>' +
      '<rect fill="url(#grad-a)" width="10" height="10" />' +
      '</svg>';
    const result = sanitizeSvgMarkup(markup)!;
    expect(result).not.toMatch(/javascript:/i);
    expect(result).toContain('url(#grad-a)');
  });

  it('keeps ordinary https references', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="https://example.com/a.png" /></svg>';
    expect(sanitizeSvgMarkup(markup)).toContain('https://example.com/a.png');
  });

  it('blocks data: URLs used to smuggle HTML', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html,<script>alert(1)</script>" /></svg>';
    expect(sanitizeSvgMarkup(markup)).not.toMatch(/data:text\/html/);
  });

  it('returns null when there is no SVG document at all', () => {
    expect(sanitizeSvgMarkup('no markup here')).toBeNull();
    expect(sanitizeSvgMarkup('')).toBeNull();
  });

  it('returns null when the closing tag precedes the opening tag', () => {
    expect(sanitizeSvgMarkup('</svg><svg>')).toBeNull();
  });

  it('returns null rather than shipping a document that still contains script', () => {
    // A nested/obfuscated script tag that survives element stripping must fail closed.
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"><scr<script>ipt>alert(1)</script></svg>';
    const result = sanitizeSvgMarkup(markup);
    expect(result === null || !/script/i.test(result)).toBe(true);
  });
});

describe('svgToDataUri', () => {
  it('produces an image/svg+xml data URI with the markup percent-encoded', () => {
    const uri = svgToDataUri(VALID);
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(uri).not.toContain('<');
    expect(decodeURIComponent(uri.slice('data:image/svg+xml;utf8,'.length))).toBe(VALID);
  });
});
