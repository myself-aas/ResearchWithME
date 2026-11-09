/**
 * Creates or updates every scenario's Resend template, then publishes it.
 *
 *     RESEND_API_KEY=re_... npx tsx scripts/sync-templates.ts
 *
 * Idempotent: it lists what already exists, matches by alias (falling back to
 * name), updates what it finds and creates what it does not, then publishes.
 * Running it twice changes nothing the second time.
 *
 * The templates are *derived* artifacts. emails/ is the source of truth and the
 * direction is one way -- editing a template only in the Resend dashboard means
 * the next run of this script reverts that edit. That is deliberate: one source,
 * so what is in git is what subscribers receive.
 *
 * On success it prints the env vars to set, one per scenario. Set them with
 * `wrangler secret put <NAME>` (they are not secret, but the Worker has nowhere
 * else to read them from); until one is set, that scenario sends by rendering
 * the same component locally instead.
 */
import { writeFileSync } from 'node:fs';
import { Resend } from 'resend';
import { buildTemplateSource } from '../lib/email/render';
import { listScenarios, type ScenarioDefinition } from '../lib/email/scenarios';

const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
if (!apiKey) {
  console.error('RESEND_API_KEY is not set. This script needs the Templates API.');
  process.exit(1);
}

/** Optional: where to write the resolved IDs, for a deploy step to source. */
const envOutput = (process.env.TEMPLATE_ENV_OUTPUT ?? '').trim();

interface ExistingTemplate {
  id: string;
  name: string;
  alias: string | null;
  status: string;
}

async function main() {
  const resend = new Resend(apiKey);
  const scenarios = listScenarios();

  console.log(`Syncing ${scenarios.length} templates...\n`);

  // List once, not per scenario: the Templates API paginates, and this keeps the
  // whole run inside a handful of requests against a 10 req/s limit.
  const existing = new Map<string, ExistingTemplate>();
  let cursor: string | undefined;
  for (;;) {
    const { data, error } = await resend.templates.list(
      cursor ? { after: cursor } : undefined,
    );
    if (error) {
      console.error(`Could not list templates: ${error.message}`);
      process.exit(1);
    }
    for (const item of data?.data ?? []) {
      const record = item as unknown as ExistingTemplate;
      if (record.alias) existing.set(record.alias, record);
      existing.set(record.name, record);
    }
    if (!data?.has_more) break;
    cursor = (data as unknown as { last_id?: string }).last_id;
    if (!cursor) break;
  }
  console.log(`Found ${existing.size} existing template name/alias entries.\n`);

  const resolved: Array<{ key: string; env: string; id: string }> = [];
  let failures = 0;

  for (const scenario of scenarios) {
    const outcome = await syncOne(resend, scenario, existing);
    if (outcome.ok) {
      resolved.push({ key: scenario.key, env: scenario.templateEnv, id: outcome.id });
      console.log(`  ${scenario.key.padEnd(24)} ${outcome.action} ${outcome.id}`);
    } else {
      failures += 1;
      console.error(`  ${scenario.key.padEnd(24)} FAILED: ${outcome.error}`);
    }
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} of ${scenarios.length} templates failed to sync.`);
    process.exit(1);
  }

  console.log('All templates published. Set these on the Worker:\n');
  for (const entry of resolved) {
    console.log(`  wrangler secret put ${entry.env}   # ${entry.id}`);
  }

  if (envOutput) {
    const contents =
      resolved.map((entry) => `${entry.env}=${entry.id}`).join('\n') + '\n';
    writeFileSync(envOutput, contents, 'utf8');
    console.log(`\nWrote ${resolved.length} ids to ${envOutput}`);
  }

  console.log(
    '\nLeaving an id unset is safe: that scenario then renders the same\n' +
      'component locally, which is also the only mode with a plain-text part.',
  );
}

type SyncOutcome =
  | { ok: true; id: string; action: 'created' | 'updated' }
  | { ok: false; error: string };

async function syncOne(
  resend: Resend,
  scenario: ScenarioDefinition,
  existing: Map<string, ExistingTemplate>,
): Promise<SyncOutcome> {
  let source;
  try {
    source = await buildTemplateSource(scenario);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const found =
    existing.get(scenario.templateAlias) ?? existing.get(scenario.templateAlias);
  let id: string;
  let action: 'created' | 'updated';

  if (found) {
    const { error } = await resend.templates.update(found.id, {
      name: source.name,
      alias: source.alias,
      from: source.from,
      subject: source.subject,
      html: source.html,
      text: source.text,
      variables: source.variables,
    });
    if (error) return { ok: false, error: `update: ${error.message}` };
    id = found.id;
    action = 'updated';
  } else {
    // `create` is chainable: awaiting it yields the response, and `.publish()`
    // promotes the draft. A template that is never published cannot be sent.
    const created = await resend.templates.create({
      name: source.name,
      alias: source.alias,
      from: source.from,
      subject: source.subject,
      html: source.html,
      text: source.text,
      variables: source.variables,
    });
    if (created.error) return { ok: false, error: `create: ${created.error.message}` };
    const createdId = created.data?.id;
    if (!createdId) return { ok: false, error: 'create returned no id' };
    id = createdId;
    action = 'created';
    existing.set(scenario.templateAlias, {
      id,
      name: source.name,
      alias: source.alias,
      status: 'draft',
    });
  }

  // Publish every time, including after an update: updating a published template
  // leaves an unpublished version pending, and only the published one sends.
  const published = await resend.templates.publish(id);
  if (published.error) return { ok: false, error: `publish: ${published.error.message}` };

  // Read it back rather than trusting the write.
  const { data, error } = await resend.templates.get(id);
  if (error) return { ok: false, error: `verify: ${error.message}` };
  if (data.status !== 'published') {
    return { ok: false, error: `verify: status is "${data.status}", expected "published"` };
  }

  return { ok: true, id, action };
}

main().catch((err) => {
  console.error('Unexpected failure:', err instanceof Error ? err.message : err);
  process.exit(1);
});
