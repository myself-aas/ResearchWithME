/**
 * Temporary `next/link` compatibility shim for shared client components.
 *
 * The Pages build (client + SSR) aliases `next/link` here; the Next build
 * keeps resolving the real module. Deliberately narrow, matching exactly the
 * imports the codebase uses: an href-based anchor with any pass-through
 * anchor props. Internal URLs go through React Router for client-side
 * navigation; anything with an external scheme becomes a plain anchor.
 */
import { forwardRef, type AnchorHTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface LinkShimProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
  /** next/link flags accepted and ignored: navigation is always client-side. */
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

const EXTERNAL_SCHEME = /^(?:https?:)?\/\/|^(?:mailto:|tel:|sms:|data:|javascript:)/i;

export function isExternalHref(href: string): boolean {
  return EXTERNAL_SCHEME.test(href.trim());
}

export const LinkShim = forwardRef(function LinkShim(
  {
    href,
    children,
    prefetch: _prefetch,
    replace,
    scroll: _scroll,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    ...anchorProps
  }: LinkShimProps,
  ref: Ref<HTMLAnchorElement>,
): ReactElement {
  if (isExternalHref(href)) {
    return (
      <a ref={ref} href={href} {...anchorProps}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink ref={ref} to={href} replace={replace} {...anchorProps}>
      {children}
    </RouterLink>
  );
});

export default LinkShim;
