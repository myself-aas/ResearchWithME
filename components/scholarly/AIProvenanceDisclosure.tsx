/**
 * AIProvenanceDisclosure — πeme v3.1 §26 (stage 3, beta).
 *
 * Makes AI assistance inspectable, editable, rejectable, and reversible:
 * shows provider/model, operation, source set, tool calls, generation time,
 * transformation type, citation validation, and human approval — never hidden
 * chain-of-thought. Lists publication blockers explicitly.
 * Actions: inspect / edit / regenerate / reject / history (capability-checked).
 * Token mapping: provenance-* semantic tokens. Tests: dialogue.test.ts.
 */
import type { AIProvenance, AIValidation, PermissionDecision, ObjectId } from '@/lib/schemas/scholarly';
import { disclosureView } from '@/lib/scholarly/ai-provenance';
import { can } from '@/lib/scholarly/claim-card';
import Alert from '@/components/ui/Alert';

export interface AIProvenanceDisclosureProps {
  provenance: AIProvenance;
  validation?: AIValidation;
  retractionImpactUnresolved?: boolean;
  permissions: PermissionDecision[];
  onInspect?: (id: ObjectId) => void;
  onEdit?: (id: ObjectId) => void;
  onRegenerate?: (id: ObjectId) => void;
  onReject?: (id: ObjectId) => void;
  onHistory?: (id: ObjectId) => void;
  outputId: ObjectId;
}

export default function AIProvenanceDisclosure({
  provenance,
  validation,
  retractionImpactUnresolved = false,
  permissions,
  onInspect,
  onEdit,
  onRegenerate,
  onReject,
  onHistory,
  outputId,
}: AIProvenanceDisclosureProps) {
  const view = disclosureView(provenance, validation, retractionImpactUnresolved);
  const actionBtn =
    'min-h-11 rounded-sm bg-surface px-3 py-2 font-sans text-sm font-medium text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  const caps: Array<[string, string, ((id: ObjectId) => void) | undefined]> = [
    ['Inspect', 'ai:inspect', onInspect],
    ['Edit', 'ai:edit', onEdit],
    ['Regenerate', 'ai:regenerate', onRegenerate],
    ['Reject', 'ai:reject', onReject],
    ['History', 'ai:history', onHistory],
  ];

  return (
    <section aria-label="AI provenance disclosure" className="rounded-md border border-provenance-ai-assisted/40 bg-surface p-4">
      <p className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-provenance-ai-assisted">
        {view.headline}
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 font-sans text-sm sm:grid-cols-2">
        {view.rows.map((r) => (
          <div key={r.label}>
            <dt className="inline font-semibold text-text-secondary">{r.label}: </dt>
            <dd className="inline text-text-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-2 font-sans text-xs ${provenance.humanApproval ? 'text-trust-verified' : 'text-destructive'}`}>
        {view.approvalLabel}
      </p>
      {view.blockers.length > 0 ? (
        <div className="mt-3">
          <Alert tone="error" title="Publication blocked">
            <ul className="list-disc pl-4">
              {view.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Alert>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {caps.map(([label, cap, handler]) =>
          handler && can(permissions, cap) ? (
            <button key={cap} type="button" className={actionBtn} onClick={() => handler(outputId)}>
              {label}
            </button>
          ) : null,
        )}
      </div>
    </section>
  );
}
