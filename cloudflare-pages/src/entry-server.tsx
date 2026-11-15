import { handleRequest as dispatchRequest } from './server/dispatch';
import { createCmsServices } from './server/cms-services';
import type { AppEnv, RuntimeMode } from './server/context';

/** Deployable Pages entry: other provider services remain fail-closed. */
export function handleRequest(request: Request, env: AppEnv, runtime: RuntimeMode): Promise<Response> {
  return dispatchRequest(request, env, runtime, createCmsServices());
}
