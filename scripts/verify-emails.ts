/**
 * Live verification: sends every scenario to Resend's own test inboxes.
 *
 *     RESEND_API_KEY=re_... npx tsx scripts/verify-emails.ts
 *
 * Uses Resend's documented test addresses rather than invented ones. Sending to
 * a made-up address produces a bounce against researchwith.me, and repeated
 * bounces damage the domain's sending reputation -- which is why this script
 * has a fixed recipient list and takes no arguments.
 *
 * Run `npm run email:template:sync` first if you want to verify template mode;
 * otherwise each scenario renders locally, which is also worth verifying.
 */
import { sendAllScenariosTo, sendScenario } from '../lib/email/send';
import { listScenarios } from '../lib/email/scenarios';

/** Resend's own test inboxes. Do not replace these with real addresses. */
const DELIVERED = 'delivered@resend.dev';
const FAILURE_INBOXES = [
  'bounced@resend.dev',
  'complained@resend.dev',
  'suppressed@resend.dev',
] as const;

async function main() {
  if (!(process.env.RESEND_API_KEY ?? '').trim()) {
    console.error('RESEND_API_KEY is not set.');
    process.exit(1);
  }

  const scenarios = listScenarios();
  const mode = process.env[scenarios[0].templateEnv] ? 'template' : 'local';
  console.log(`Sending ${scenarios.length} scenarios in ${mode} mode.\n`);

  console.log(`Deliverable inbox: ${DELIVERED}`);
  const results = await sendAllScenariosTo(DELIVERED, 'verify');
  let failed = 0;
  for (const { key, result } of results) {
    if (result.ok) {
      console.log(`  ok   ${key.padEnd(24)} ${result.id} (${result.mode})`);
    } else {
      failed += 1;
      console.error(
        `  FAIL ${key.padEnd(24)} ${result.skipped ? `skipped: ${result.reason}` : result.error}`,
      );
    }
  }

  // One send each, to confirm the failure paths are handled rather than thrown.
  console.log('\nFailure inboxes, one send each:');
  const probe = scenarios[0];
  for (const inbox of FAILURE_INBOXES) {
    const result = await sendScenario(probe.key, {
      to: inbox,
      variables: probe.sample,
      entityId: `failure-probe-${inbox}`,
    });
    const label = result.ok ? `accepted (${result.id})` : result.skipped ? `skipped: ${result.reason}` : result.error;
    console.log(`  ${inbox.padEnd(26)} ${label}`);
  }

  console.log(
    '\nCheck the Resend dashboard: each message must show the correct sender\n' +
      'name and address, and the scenario tag under category.',
  );

  if (failed > 0) {
    console.error(`\n${failed} of ${scenarios.length} sends failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected failure:', err instanceof Error ? err.message : err);
  process.exit(1);
});
