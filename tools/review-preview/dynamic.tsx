/** Preview-only adapter; production uses Next's real dynamic import boundary. */
import { lazy, Suspense, type ComponentType } from 'react';
export default function dynamic<P extends object>(
  load: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
  options: { ssr?: boolean; loading?: ComponentType } = {},
) {
  const Loaded = lazy(async () => {
    const result = await load();
    return typeof result === 'function' ? { default: result } : result as { default: ComponentType<P> };
  });
  const Loading = options.loading;
  return function PreviewDynamic(props: P) {
    return <Suspense fallback={Loading ? <Loading /> : null}><Loaded {...props} /></Suspense>;
  };
}
