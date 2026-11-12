/**
 * Shared API reference surface — used by the Next app (app/api-docs/page.tsx)
 * and the Pages target (cloudflare-pages/src/routes/api-docs.tsx). Renders
 * the catalog and OpenAPI document from lib/api-catalog.ts and lib/openapi.ts;
 * one source of truth in both runtimes.
 */
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import { API_CATALOG_PATH, API_GROUPS, OPENAPI_PATH } from '@/lib/api-catalog';
import SectionNavigation from '@/components/layout/SectionNavigation';
import { API_OPERATIONS, OPENAPI_DOCUMENT, type ApiOperation } from '@/lib/openapi';
import { SITE_URL } from '@/lib/seo';

type FieldSchema = {
  type?: string | string[];
  $ref?: string;
  oneOf?: FieldSchema[];
  anyOf?: FieldSchema[];
};

function fieldType(field: FieldSchema): string {
  const choices = field.oneOf ?? field.anyOf;
  if (choices) return choices.map(fieldType).join(' or ');
  if (field.$ref) return field.$ref.split('/').pop() ?? 'object';
  return Array.isArray(field.type) ? field.type.join(' or ') : field.type ?? 'object';
}

/** Resolve the simple request schemas used by this reference page. */
function requestFields(operation: ApiOperation) {
  const schema = operation.requestBody?.content['application/json']?.schema;
  if (!schema) return [];
  const ref = typeof schema.$ref === 'string' ? schema.$ref.split('/').pop() : undefined;
  const resolved = ref ? OPENAPI_DOCUMENT.components.schemas[ref] : schema;
  if (!resolved || typeof resolved.properties !== 'object' || !resolved.properties) return [];
  const required = Array.isArray(resolved.required) ? resolved.required : [];
  return Object.entries(resolved.properties as Record<string, FieldSchema>).map(([name, field]) => ({
    name,
    type: fieldType(field),
    required: required.includes(name),
  }));
}

export default function ApiDocsReference() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-brand">Developer reference</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">ResearchWithMe API</h1>
          <p className="mt-4 max-w-3xl font-sans text-base leading-relaxed text-ink">
            Discover the archive, assistant, and editorial routes. The catalog and OpenAPI document describe the same operations listed below.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm font-semibold">
            <a href={OPENAPI_PATH} className="text-brand underline underline-offset-4">OpenAPI JSON</a>
            <a href={API_CATALOG_PATH} className="text-brand underline underline-offset-4">API catalog</a>
          </div>
        </header>

        <section aria-labelledby="using-the-api" className="border-b border-line py-8 font-sans text-sm leading-relaxed text-ink">
          <h2 id="using-the-api" className="font-serif text-2xl font-bold text-ink">Using the API</h2>
          <p className="mt-3">
            Paths are relative to the site serving this reference. Public reads need no login. Studio operations require a signed-in Supabase session and editor privileges; writer applications require a signed-in session, and the revalidation webhook requires its configured secret. Local demo mode may relax the studio gate when Supabase is not configured.
          </p>
          <p className="mt-3">
            Send JSON where a request body is specified. Some writes reject cross-site browser origins and are rate limited; a 429 response indicates that the caller should retry later. Availability and data depend on the deployment&apos;s configured services.
          </p>
          <p className="mt-4 font-semibold text-ink">Example: list five articles</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-inverse p-4 text-xs leading-relaxed text-text-inverse"><code>{`curl '${SITE_URL}/api/articles?limit=5'`}</code></pre>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2">
            <SectionNavigation
              items={API_GROUPS.map((group) => ({ id: group.id, label: group.name }))}
              ariaLabel="API groups"
              heading="API groups"
            />
          </div>
          <div data-layout-content="reading" className="order-2 min-w-0 max-w-[48rem] lg:col-start-1 lg:order-1">
            {API_GROUPS.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="scroll-mt-6 border-b border-line py-9">
                <h2 id={`${group.id}-heading`} className="font-serif text-3xl font-bold text-ink">{group.name}</h2>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink">{group.description}</p>
                <div className="mt-6 space-y-6">
                  {API_OPERATIONS.filter((operation) => operation.group === group.id).map((operation) => {
                    const fields = requestFields(operation);
                    return (
                      <article key={`${operation.method}-${operation.path}`} className="rounded-lg border border-line bg-surface-raised p-5 sm:p-6">
                        <h3 className="font-serif text-xl font-bold text-ink">{operation.summary}</h3>
                        <p className="mt-2 break-all font-mono text-sm font-semibold text-brand">{operation.method.toUpperCase()} {operation.path}</p>
                        <p className="mt-3 font-sans text-sm leading-relaxed text-ink">{operation.description}</p>
                        {operation.parameters && (
                          <div className="mt-4 font-sans text-sm text-ink">
                            <h4 className="font-semibold text-ink">Parameters</h4>
                            <ul className="mt-1.5 list-disc space-y-1 pl-5">
                              {operation.parameters.map((parameter) => (
                                <li key={`${parameter.in}-${parameter.name}`}>
                                  <code>{parameter.name}</code> ({parameter.in}{parameter.required ? ', required' : ', optional'}): {parameter.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {operation.requestBody && (
                          <div className="mt-4 font-sans text-sm text-ink">
                            <h4 className="font-semibold text-ink">JSON body{operation.requestBody.required ? '' : ' (optional)'}</h4>
                            <p className="mt-1.5">{operation.requestBody.description}</p>
                            {fields.length > 0 && (
                              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                                {fields.map((field) => (
                                  <li key={field.name}><code>{field.name}</code> ({field.type}{field.required ? ', required' : ', optional'})</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <div className="mt-4 font-sans text-sm text-ink">
                          <h4 className="font-semibold text-ink">Responses</h4>
                          <ul className="mt-1.5 list-disc space-y-1 pl-5">
                            {Object.entries(operation.responses).map(([code, response]) => <li key={code}><code>{code}</code> — {response.description}</li>)}
                          </ul>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
