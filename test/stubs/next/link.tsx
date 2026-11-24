/**
 * `next/link` stand-in for vitest: a plain anchor.
 *
 * Tests exercise data loaders, not navigation, so the shim only needs to
 * accept the props the components pass and render an href.
 */
import { forwardRef, type AnchorHTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';

export interface LinkShimProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

export const LinkShim = forwardRef(function LinkShim(
  {
    href,
    children,
    prefetch: _prefetch,
    replace: _replace,
    scroll: _scroll,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    ...anchorProps
  }: LinkShimProps,
  ref: Ref<HTMLAnchorElement>,
): ReactElement {
  return (
    <a ref={ref} href={href} {...anchorProps}>
      {children}
    </a>
  );
});

export default LinkShim;
