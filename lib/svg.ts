/** Builds a data URI safe for `<img src>`; the SVG cannot execute script there. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
