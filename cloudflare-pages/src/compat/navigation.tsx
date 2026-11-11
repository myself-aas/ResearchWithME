/**
 * Temporary `next/navigation` compatibility shim for shared client components.
 *
 * Maps the small used surface onto React Router: push/replace navigate,
 * refresh re-navigates to the current location (a same-URL navigation is a
 * loader revalidation in a data router), usePathname reads the location and
 * useParams reads the matched route params. Generic signature mirrors
 * next's `useParams<T>()`.
 */
import { useLocation, useNavigate, useParams as useRouterParams } from 'react-router-dom';

export interface RouterShim {
  push(path: string): void;
  replace(path: string): void;
  refresh(): void;
}

export function useRouter(): RouterShim {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    // Next's refresh() refetches the current route's server data. A same-URL
    // navigation re-renders the route and, under a data router, revalidates
    // its loaders — the closest equivalent available here.
    refresh: () => navigate(location.pathname + location.search + location.hash, { replace: true }),
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): Readonly<T> {
  return useRouterParams() as unknown as Readonly<T>;
}

// useSearchParams is not in the used surface; add it here when a shared
// component first needs it rather than guessing at its full contract.
