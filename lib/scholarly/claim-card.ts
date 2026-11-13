/**
 * ClaimCard presentation logic — reme v3.1 §27.4 (pure, unit-tested).
 */
import type { Claim, PermissionDecision } from '@/lib/schemas/scholarly';
import { component } from '@/tokens/generated/tokens';

/** Capability check — actions render only when the server granted the capability. */
export function can(permissions: PermissionDecision[], capability: string): boolean {
  return permissions.some((p) => p.capability === capability && p.granted);
}

export function claimCardLabel(claim: Claim): string {
  return `Claim (${claim.claimType}): ${claim.text.slice(0, 80)}`;
}

/** Calibrated counts line — counts only, never an aggregate score. */
export function evidenceCounts(supporting: number, contradicting: number): string {
  const parts = [`${supporting} supporting`, `${contradicting} contradicting`];
  return parts.join(' · ');
}

export const claimCardTokens = {
  background: `bg-[var(--reme-component-claim-card-background)]`,
  border: `border-[var(--reme-component-claim-card-border)]`,
  support: `text-[var(--reme-component-claim-card-support)]`,
  contradiction: `text-[var(--reme-component-claim-card-contradiction)]`,
  unresolved: `text-[var(--reme-component-claim-card-unresolved)]`,
} as const;

export const claimCardComponentTokens = component.claimCard;
