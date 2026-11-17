/**
 * ResearchWithME v3.4 Checksummed Scholarly Export Engine (`lib/v34/exports.ts`).
 *
 * Implements Part V §6.13 (`POST /api/exports`, `GET /api/exports/[id]`):
 * Generates BibTeX, CSL-JSON, Markdown-with-Provenance, and JSON-LD export
 * bundles with SHA-256 verification checksums.
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getContributionById, getSourceWithDetails } from './store';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import { listCitationCollections } from './wave5-store';
import type { ExportFormat } from './wave6-contracts';

export interface ScholarlyExportRecord {
  id: string;
  userId: string;
  targetType: 'contribution' | 'source' | 'citation-collection';
  targetId: string;
  format: ExportFormat;
  status: 'COMPLETED';
  checksumSha256: string;
  contentType: string;
  filename: string;
  payload: string;
  byteSize: number;
  createdAt: string;
}

const exportStore = new Map<string, ScholarlyExportRecord>();

export function resetExportsStoreForTesting() {
  exportStore.clear();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function sanitizeBibKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function createScholarlyExport(input: {
  userId: string;
  targetType: 'contribution' | 'source' | 'citation-collection';
  targetId: string;
  format: ExportFormat;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; exportRecord: ScholarlyExportRecord }
  | { ok: false; status: 404; message: string }
> {
  let title = '';
  let authors: string[] = [];
  let publishedYear = '2026';
  let url = '';
  let identifier = '';
  let summary = '';
  let items: Array<{ key: string; title: string; note: string }> = [];

  if (input.targetType === 'contribution') {
    const c = getContributionById(input.targetId);
    if (!c) return { ok: false, status: 404, message: 'Contribution not found.' };
    title = c.title;
    authors = [c.authorName];
    publishedYear = (c.publishedAt ?? c.updatedAt).slice(0, 4);
    url = `/contribution/${c.id}`;
    identifier = c.id;
    summary = c.summary;
    items = [{ key: sanitizeBibKey(c.id), title: c.title, note: c.summary }];
  } else if (input.targetType === 'source') {
    const details = await getSourceWithDetails(input.targetId);
    if (!details) return { ok: false, status: 404, message: 'Source not found.' };
    title = details.source.title;
    authors = details.source.authors;
    publishedYear = (details.source.publishedDate ?? details.source.createdAt).slice(0, 4);
    url = details.source.canonicalUrl ?? `/source/${details.source.id}`;
    identifier = details.source.identifierValue ?? details.source.id;
    summary = `${details.source.sourceType} (${details.source.integrityStatus})`;
    items = [
      {
        key: sanitizeBibKey(details.source.id),
        title: details.source.title,
        note: summary,
      },
    ];
  } else {
    const col = listCitationCollections(input.userId).find((c) => c.id === input.targetId);
    if (!col) return { ok: false, status: 404, message: 'Citation collection not found.' };
    title = col.name;
    authors = ['ResearchWithME Curator'];
    publishedYear = col.updatedAt.slice(0, 4);
    url = `/library`;
    identifier = col.id;
    summary = col.description;
    items = col.items.map((it, idx) => ({
      key: sanitizeBibKey(it.sourceId ?? it.contributionId ?? it.evidenceId ?? `item-${idx + 1}`),
      title: `ResearchWithME ${it.sourceId ? 'Source' : it.contributionId ? 'Contribution' : 'Evidence'}: ${it.sourceId ?? it.contributionId ?? it.evidenceId}`,
      note: it.note || col.name,
    }));
  }

  let payload = '';
  let contentType = 'text/plain; charset=utf-8';
  let ext = 'txt';

  if (input.format === 'bibtex') {
    contentType = 'application/x-bibtex; charset=utf-8';
    ext = 'bib';
    payload = items
      .map(
        (it) =>
          `@misc{${it.key},\n  title = {${it.title.replace(/[{}]/g, '')}},\n  author = {${authors.join(' and ').replace(/[{}]/g, '')}},\n  year = {${publishedYear}},\n  note = {${it.note.replace(/[{}]/g, '')}},\n  howpublished = {ResearchWithME (${identifier})}\n}`,
      )
      .join('\n\n');
  } else if (input.format === 'csl-json') {
    contentType = 'application/vnd.citationstyles.csl+json; charset=utf-8';
    ext = 'csl.json';
    payload = JSON.stringify(
      items.map((it) => ({
        id: it.key,
        type: input.targetType === 'source' ? 'article' : 'document',
        title: it.title,
        author: authors.map((a) => ({ literal: a })),
        issued: { 'date-parts': [[Number(publishedYear) || 2026]] },
        URL: url,
        note: it.note,
      })),
      null,
      2,
    );
  } else if (input.format === 'json-ld') {
    contentType = 'application/ld+json; charset=utf-8';
    ext = 'jsonld';
    payload = JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'ScholarlyArticle',
        identifier,
        name: title,
        author: authors.map((a) => ({ '@type': 'Person', name: a })),
        datePublished: publishedYear,
        url,
        description: summary,
      },
      null,
      2,
    );
  } else {
    contentType = 'text/markdown; charset=utf-8';
    ext = 'md';
    payload = [
      `# ${title}`,
      '',
      `- **Target:** \`${input.targetType}:${input.targetId}\``,
      `- **Identifier:** \`${identifier}\``,
      `- **Authors:** ${authors.join(', ') || 'Unspecified'}`,
      `- **Year:** ${publishedYear}`,
      '',
      '## Summary & Provenance',
      '',
      summary || 'Verified ResearchWithME canonical export.',
      '',
      '## Included Items',
      ...items.map((it) => `- \`${it.key}\`: ${it.title} — ${it.note}`),
      '',
    ].join('\n');
  }

  const record: ScholarlyExportRecord = {
    id: makeId('exp'),
    userId: input.userId,
    targetType: input.targetType,
    targetId: input.targetId,
    format: input.format,
    status: 'COMPLETED',
    checksumSha256: sha256(payload),
    contentType,
    filename: `${sanitizeBibKey(input.targetId)}.${ext}`,
    payload,
    byteSize: Buffer.byteLength(payload, 'utf8'),
    createdAt: new Date().toISOString(),
  };

  exportStore.set(record.id, record);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_scholarly_exports').insert({
        id: record.id,
        user_id: input.userId,
        target_type: record.targetType,
        target_id: record.targetId,
        format: record.format,
        status: record.status,
        checksum_sha256: record.checksumSha256,
        content_type: record.contentType,
        payload: record.payload,
        byte_size: record.byteSize,
      }),
    );
  }

  return { ok: true, exportRecord: record };
}

export function getScholarlyExport(userId: string, exportId: string): ScholarlyExportRecord | null {
  const rec = exportStore.get(exportId);
  if (!rec || rec.userId !== userId) return null;
  return rec;
}
