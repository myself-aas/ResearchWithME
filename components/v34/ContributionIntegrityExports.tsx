'use client';

import { useState } from 'react';
import { Download, FileCheck2, History, ShieldCheck } from 'lucide-react';
import type { AiProvenanceRecord } from '@/lib/v34/ai-governance';
import type { ContributionVersionSnapshot } from '@/lib/v34/store';
import { formatShortDate } from '@/lib/formatting/locale';

interface ContributionIntegrityExportsProps {
  contributionId: string;
  sourceIds: string[];
  evidenceIds: string[];
  claimIds: string[];
  initialVersions: ContributionVersionSnapshot[];
  initialProvenance: AiProvenanceRecord[];
}

const EXPORT_FORMATS = [
  { id: 'bibtex', label: 'BibTeX (.bib)' },
  { id: 'csl-json', label: 'CSL-JSON' },
  { id: 'markdown-provenance', label: 'Markdown + Provenance' },
  { id: 'json-ld', label: 'JSON-LD' },
] as const;

export function ContributionIntegrityExports({
  contributionId,
  sourceIds,
  evidenceIds,
  claimIds,
  initialVersions,
  initialProvenance,
}: ContributionIntegrityExportsProps) {
  const [provenance, setProvenance] = useState<AiProvenanceRecord[]>(initialProvenance);
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [lastExport, setLastExport] = useState<{
    id: string;
    format: string;
    checksumSha256: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleExport(format: (typeof EXPORT_FORMATS)[number]['id']) {
    setBusyFormat(format);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'contribution',
          targetId: contributionId,
          format,
        }),
      });
      const data = (await res.json()) as {
        export?: { id: string; format: string; checksumSha256: string };
        error?: string;
      };
      if (!res.ok || !data.export) {
        setStatusMessage(data.error || 'Sign in to generate checksummed scholarly exports.');
        return;
      }
      setLastExport(data.export);
      setStatusMessage(
        `Generated ${data.export.format} export (SHA-256: ${data.export.checksumSha256.slice(0, 16)}…).`,
      );
    } catch {
      setStatusMessage('Network error generating scholarly export.');
    } finally {
      setBusyFormat(null);
    }
  }

  async function handleValidateCitations() {
    setValidating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/ai/validate-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'contribution',
          targetId: contributionId,
          sourceIds,
          evidenceIds,
          claimIds,
        }),
      });
      const data = (await res.json()) as {
        passed?: boolean;
        blockers?: Array<{ code: string; message: string }>;
        provenance?: AiProvenanceRecord;
        error?: string;
      };
      if (!res.ok) {
        setStatusMessage(data.error || 'Sign in to run deterministic citation verification.');
        return;
      }
      if (data.provenance) {
        setProvenance((prev) => [data.provenance!, ...prev]);
      }
      if (data.passed) {
        setStatusMessage('Citation & integrity verification passed with zero publication blockers.');
      } else {
        setStatusMessage(
          `Detected ${data.blockers?.length ?? 1} publication blocker(s): ${data.blockers?.[0]?.code ?? 'CHECK_FAILED'}.`,
        );
      }
    } catch {
      setStatusMessage('Network error verifying citations.');
    } finally {
      setValidating(false);
    }
  }

  return (
    <section
      aria-labelledby="integrity-exports-heading"
      className="rounded-xl border border-line bg-surface p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Provenance, Versions &amp; Checksummed Exports
          </p>
          <h2 id="integrity-exports-heading" className="font-serif text-xl font-semibold text-ink">
            Scholarly Integrity &amp; Reproducible Artifacts
          </h2>
        </div>
        <button
          type="button"
          disabled={validating}
          onClick={handleValidateCitations}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
          {validating ? 'Verifying citations…' : 'Verify citations'}
        </button>
      </div>

      {statusMessage ? (
        <p
          role="status"
          className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 font-sans text-xs font-medium text-brand"
        >
          {statusMessage}
        </p>
      ) : null}

      {/* Checksummed Export Controls */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase text-ink-secondary">
          Export With SHA-256 Verification
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              disabled={busyFormat !== null}
              onClick={() => handleExport(fmt.id)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {busyFormat === fmt.id ? 'Generating…' : fmt.label}
            </button>
          ))}
        </div>
        {lastExport ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink-secondary">
            <span>SHA-256: {lastExport.checksumSha256}</span>
            <a
              href={`/api/exports/${encodeURIComponent(lastExport.id)}?download=1`}
              className="font-semibold text-brand hover:underline"
            >
              Download {lastExport.format}
            </a>
          </div>
        ) : null}
      </div>

      {/* Version History & AI Provenance Split */}
      <div className="grid gap-4 sm:grid-cols-2 border-t border-line pt-4">
        <div className="space-y-2">
          <h3 className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Immutable Versions ({initialVersions.length})
          </h3>
          <ul className="space-y-1.5">
            {initialVersions.map((ver) => (
              <li
                key={ver.id}
                className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink"
              >
                <span>
                  v{ver.versionNumber} · {ver.lifecycle}
                </span>
                <span className="text-ink-secondary">{formatShortDate(ver.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-mono text-xs font-semibold uppercase text-ink-secondary">
            AI Provenance Ledger ({provenance.length})
          </h3>
          {provenance.length === 0 ? (
            <p className="rounded-lg border border-line bg-canvas px-3 py-2 font-sans text-xs text-ink-secondary">
              No AI assistance or automated verification records logged for this contribution yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {provenance.slice(0, 4).map((rec) => (
                <li
                  key={rec.id}
                  className="rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink space-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{rec.transformationType}</span>
                    <span className="text-brand">{rec.citationValidationStatus}</span>
                  </div>
                  <p className="text-ink-secondary">
                    {rec.provider}/{rec.model} · Review: {rec.humanReviewStatus}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
