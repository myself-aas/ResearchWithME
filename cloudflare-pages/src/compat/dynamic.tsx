/**
 * Temporary `next/dynamic` compatibility shim for shared client components.
 *
 * Two modes, both matching next's contract closely enough for the app:
 *
 * - `ssr: false` — the server (and the first client pass) render the
 *   placeholder; after mount the chunk is imported and swapped in. Hydration
 *   matches because server and first client render are identical by
 *   construction.
 *
 * - default (`ssr` not false) — React.lazy inside Suspense; the server emits
 *   the nearest fallback, the browser resolves it and hydrates.
 *
 * `loading` is an optional placeholder component rendered with no props, as
 * next does.
 */
import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentType,
  type ReactElement,
} from 'react';

export interface DynamicOptions {
  ssr?: boolean;
  loading?: ComponentType;
}

export function dynamic<P extends object>(
  importer: () => Promise<{ default: ComponentType<P> }>,
  options: DynamicOptions = {},
): ComponentType<P> {
  const Loading = options.loading;

  if (options.ssr === false) {
    function DynamicClientOnly(props: P): ReactElement | null {
      const [Loaded, setLoaded] = useState<ComponentType<P> | null>(null);
      useEffect(() => {
        let alive = true;
        importer().then((mod) => {
          if (alive) setLoaded(() => mod.default);
        });
        return () => {
          alive = false;
        };
        // Import once per mounted instance; the module itself is cached by the bundler.
      }, []);
      if (!Loaded) return Loading ? <Loading /> : null;
      return <Loaded {...props} />;
    }
    DynamicClientOnly.displayName = 'DynamicClientOnly';
    return DynamicClientOnly as ComponentType<P>;
  }

  const Lazy = lazy(importer);
  function DynamicSuspense(props: P): ReactElement {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  DynamicSuspense.displayName = 'DynamicSuspense';
  return DynamicSuspense as ComponentType<P>;
}

export default dynamic;
