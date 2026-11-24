/**
 * `next/navigation` stand-in for vitest.
 *
 * The tested modules are data loaders; navigation is inert here. Components
 * that call these hooks render their default state in tests.
 */

export interface RouterShim {
  push(path: string): void;
  replace(path: string): void;
  refresh(): void;
  back(): void;
  forward(): void;
}

const noop = () => {};

export function useRouter(): RouterShim {
  return { push: noop, replace: noop, refresh: noop, back: noop, forward: noop };
}

export function usePathname(): string {
  return '/';
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): Readonly<T> {
  return {} as Readonly<T>;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function notFound(): never {
  throw new Error('NEXT_NOT_FOUND');
}

export function redirect(): never {
  throw new Error('NEXT_REDIRECT');
}
