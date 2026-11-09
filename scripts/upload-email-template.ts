/**
 * Uploads the submission receipt to Resend Templates and publishes it.
 *
 *     RESEND_API_KEY=re_... npx tsx scripts/upload-email-template.ts
 *
 * The template is a *derived* artifact. emails/submission-receipt.tsx is the
 * source of truth; this script renders it, creates the template from the
 * result, and publishes it. Editing the template only in Resend's visual editor
 * means the next run of this script silently reverts that edit -- which is the
 * point. One source, one direction.
 *
 * It prints the template ID, which goes in RESEND_RECEIPT_TEMPLATE_ID to switch
 * the app from local rendering to template rendering.
 *
 * Not wired into `npm run deploy`: uploading is a deliberate act, not something
 * that should happen as a side effect of shipping code.
 */
import { Resend } from 'resend';
import {
  buildSubmissionReceiptTemplateSource,
  SUBMISSION_RECEIPT_TEMPLATE_NAME,
} from '../lib/submission-email';

const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
if (!apiKey) {
  console.error(
    'RESEND_API_KEY is not set. This script needs a key with access to the Templates API.',
  );
  process.exit(1);
}

// Set to reuse an existing template instead of creating a new one on every run.
const existingId = (process.env.RESEND_TEMPLATE_ID ?? '').trim();

async function main() {
  const source = await buildSubmissionReceiptTemplateSource();
  const resend = new Resend(apiKey);

  console.log(
    `Rendered ${source.name}: html ${source.html.length} chars, ` +
      `text ${source.text.length} chars, ${source.variables.length} variables.`,
  );
  for (const definition of source.variables) {
    console.log(`  - ${definition.key} (${definition.type})`);
  }

  let id: string;

  if (existingId) {
    const { error } = await resend.templates.update(existingId, {
      html: source.html,
      text: source.text,
      subject: source.subject,
      variables: source.variables,
    });
    if (error) {
      console.error(`Update failed: ${error.message}`);
      process.exit(1);
    }
    id = existingId;
    console.log(`\nUpdated existing template ${id}.`);
  } else {
    // `create` is chainable: awaiting it yields the response, and `.publish()`
    // promotes the draft. A template that is never published cannot be sent.
    const created = await resend.templates.create({
      name: source.name,
      html: source.html,
      text: source.text,
      subject: source.subject,
      variables: source.variables,
    });
    if (created.error) {
      console.error(`Create failed: ${created.error.message}`);
      process.exit(1);
    }
    id = created.data?.id ?? '';
    if (!id) {
      console.error('Create returned no template id.');
      process.exit(1);
    }

    const published = await resend.templates.publish(id);
    if (published.error) {
      console.error(
        `Created ${id} but publishing failed: ${published.error.message}`,
      );
      process.exit(1);
    }
    console.log(`\nCreated and published template ${id}.`);
  }

  // Read it back rather than trusting the write.
  const { data, error } = await resend.templates.get(id);
  if (error) {
    console.error(`Could not read the template back: ${error.message}`);
    process.exit(1);
  }
  console.log(
    `Verified: name=${data.name} status=${data.status} ` +
      `hasText=${Boolean(data.text)} variables=${data.variables?.length ?? 0}`,
  );
  if (data.status !== 'published') {
    console.error('Template is not published; sends against it will fail.');
    process.exit(1);
  }

  console.log('\nNext step:');
  console.log(`  wrangler secret put RESEND_RECEIPT_TEMPLATE_ID   # value: ${id}`);
  console.log(
    '\nOr leave it unset to keep rendering locally -- both paths send the same content.',
  );
  console.log(`\nTemplate name for future runs: ${SUBMISSION_RECEIPT_TEMPLATE_NAME}`);
}

main().catch((err) => {
  console.error('Unexpected failure:', err instanceof Error ? err.message : err);
  process.exit(1);
});
