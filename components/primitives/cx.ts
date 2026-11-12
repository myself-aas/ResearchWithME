/**
 * Class concatenation for primitives — deliberately not `cn()`.
 *
 * `cn()` runs tailwind-merge (~8 KB gzip). Primitives render inside client
 * components on the home shell, so importing it put tailwind-merge in the
 * initial bundle (§18 budget). Primitive variants never conflict with each
 * other, and callers change a variant through its prop (`padding`, `color`,
 * `variant`), not by overriding classes — so plain joining is enough.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
