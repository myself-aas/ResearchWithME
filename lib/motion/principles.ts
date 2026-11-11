/**
 * πeme v3.1 — the twelve animation principles, as this product applies them.
 *
 * Source framework: `dylantarre/animation-principles` (Disney's twelve
 * principles mapped to interface motion). This registry is the contract
 * between three consumers:
 *
 *  1. `docs/motion-system.md` — the human-readable specification.
 *  2. `/motion` — the interactive Motion Lab, which renders one live demo per
 *     principle plus its tokens and implementation notes.
 *  3. `lib/__tests__/motion-system.test.tsx` — asserts nothing is orphaned.
 *
 * Each entry names the πeme pattern it belongs to (§9: reveal, connect,
 * verify, synthesize, archive) so a designer can answer "which principle is
 * this and how long may it last?" without reading component code.
 */

import { DURATION_MS, EASING, STAGGER, type MotionEasingName, type MotionPatternName } from './tokens';

export type PrincipleId =
  | 'squash-stretch'
  | 'anticipation'
  | 'staging'
  | 'straight-ahead'
  | 'follow-through'
  | 'slow-in-out'
  | 'arc'
  | 'secondary-action'
  | 'timing'
  | 'exaggeration'
  | 'solid-drawing'
  | 'appeal';

export interface PrincipleSpec {
  id: PrincipleId;
  /** 1–12, Disney's canonical order. */
  number: number;
  name: string;
  /** What the principle does perceptually. */
  intent: string;
  /** Where this product uses it, in product language. */
  appliedTo: string[];
  /** πeme §9 pattern this principle lives inside. */
  pattern: MotionPatternName;
  /** Canonical duration in ms (null when the principle is continuous/gestural). */
  durationMs: number | null;
  easing: MotionEasingName;
  /** Stagger/limit guidance where relevant. */
  guardrail: string;
  /** Primitives in this repository that implement it. */
  primitives: string[];
  /** Key used by the Motion Lab demo map. */
  demo: PrincipleId;
}

export const PRINCIPLES: readonly PrincipleSpec[] = [
  {
    id: 'squash-stretch',
    number: 1,
    name: 'Squash & Stretch',
    intent: 'Gives mass and elasticity to something that has none — a button that compresses, a card that settles.',
    appliedTo: ['Pressed buttons and pills', 'Save/like confirmations', 'Toast arrival'],
    pattern: 'verify',
    durationMs: DURATION_MS.fast,
    easing: 'emphasize',
    guardrail: 'Scale floor 0.97, ceiling 1.12. Never deform text enough to reflow a line.',
    primitives: ['Pressable', 'SuccessCheck', 'MotionToast'],
    demo: 'squash-stretch',
  },
  {
    id: 'anticipation',
    number: 2,
    name: 'Anticipation',
    intent: 'A short preparation before the main move so the action reads as intentional.',
    appliedTo: ['Filter changes', 'Panels opening', 'Save action before confirmation'],
    pattern: 'reveal',
    durationMs: DURATION_MS.standard,
    easing: 'enter',
    guardrail: 'At most 4px of pull-back. Never delay the response to a click by more than one frame.',
    primitives: ['Pressable', 'Reveal (variant="anticipate")', 'usePendingAction'],
    demo: 'anticipation',
  },
  {
    id: 'staging',
    number: 3,
    name: 'Staging',
    intent: 'Directs attention: one subject at a time, with supporting layers held back.',
    appliedTo: ['Hero beats', 'Dialog backdrop vs panel', 'Feed grids'],
    pattern: 'reveal',
    durationMs: DURATION_MS.standard,
    easing: 'standard',
    guardrail: 'One primary reveal per viewport. Supporting layers stop at 60% opacity, never animate forever.',
    primitives: ['Stagger', 'MotionDialog', 'Reveal (variant="stage")'],
    demo: 'staging',
  },
  {
    id: 'straight-ahead',
    number: 4,
    name: 'Straight Ahead / Pose to Pose',
    intent: 'Deciding between continuous motion and clean key poses. Interfaces prefer key poses.',
    appliedTo: ['Route changes', 'Filtered lists', 'Segmented controls'],
    pattern: 'connect',
    durationMs: DURATION_MS.connect,
    easing: 'standard',
    guardrail: 'Every state change has exactly one start pose and one end pose. No free-running tweens.',
    primitives: ['MotionList', 'MotionPillGroup', 'RouteTransition'],
    demo: 'straight-ahead',
  },
  {
    id: 'follow-through',
    number: 5,
    name: 'Follow Through & Overlapping Action',
    intent: 'Parts of a system do not start or stop together; the lag is what feels physical.',
    appliedTo: ['Card hover (shadow after lift)', 'Staggered lists', 'Toast stacks'],
    pattern: 'connect',
    durationMs: DURATION_MS.connect,
    easing: 'standard',
    guardrail: `Stagger ${STAGGER.item * 1000}ms per item, total sequence ≤ ${STAGGER.cap * 1000}ms.`,
    primitives: ['Stagger', 'Pressable (trailing icon)', 'MotionToast'],
    demo: 'follow-through',
  },
  {
    id: 'slow-in-out',
    number: 6,
    name: 'Slow In and Slow Out',
    intent: 'Eases make movement legible. Linear motion reads mechanical and cheap.',
    appliedTo: ['Every transition in the product'],
    pattern: 'reveal',
    durationMs: DURATION_MS.standard,
    easing: 'standard',
    guardrail: 'The only linear motion allowed is scroll-linked progress, where the user drives the rate.',
    primitives: ['EASING tokens', 'Reveal', 'MotionToast'],
    demo: 'slow-in-out',
  },
  {
    id: 'arc',
    number: 7,
    name: 'Arc',
    intent: 'Living things move on curves. A slight rotation during travel removes the "slide" feeling.',
    appliedTo: ['Theme toggle icon', 'Citation popover', 'Cards entering from the side'],
    pattern: 'connect',
    durationMs: DURATION_MS.connect,
    easing: 'emphasize',
    guardrail: '≤ 1.2° of rotation and paired X/Y travel. Never orbit a control that carries text.',
    primitives: ['Reveal (variant="arc")', 'ThemeToggle', 'InlineCitationPopover'],
    demo: 'arc',
  },
  {
    id: 'secondary-action',
    number: 8,
    name: 'Secondary Action',
    intent: 'A supporting motion that reinforces the main one without competing for attention.',
    appliedTo: ['Heart pop while the count settles', 'Checkmark while the label changes', 'Arrow nudge on lift'],
    pattern: 'verify',
    durationMs: DURATION_MS.deliberate,
    easing: 'emphasize',
    guardrail: 'One secondary action per interaction. It never changes the DOM order or the accessible name.',
    primitives: ['Pressable', 'SuccessCheck', 'LikeButton'],
    demo: 'secondary-action',
  },
  {
    id: 'timing',
    number: 9,
    name: 'Timing',
    intent: 'The same move at a different speed tells a different story.',
    appliedTo: ['All patterns: reveal 200ms, verify 320ms, connect 480ms, synthesize 700ms'],
    pattern: 'synthesize',
    durationMs: DURATION_MS.synthesize,
    easing: 'standard',
    guardrail: 'Nothing in the interface exceeds 700ms. Loading indicators appear after 200ms and stay ≥ 500ms.',
    primitives: ['DURATION tokens', 'TRANSITION presets', 'useDelayedLoading'],
    demo: 'timing',
  },
  {
    id: 'exaggeration',
    number: 10,
    name: 'Exaggeration',
    intent: 'A small, deliberate overstatement that makes a state change feel worth noticing.',
    appliedTo: ['Confirmation pops', 'Attention pulse on the reading-list badge', 'Motion Lab playground'],
    pattern: 'verify',
    durationMs: DURATION_MS.deliberate,
    easing: 'emphasize',
    guardrail: 'Overshoot ≤ 1.12 in product surfaces; pulses stop after 3 cycles. Never exaggerate a verification claim.',
    primitives: ['SuccessCheck', 'AttentionPulse', 'SPRING.expressive'],
    demo: 'exaggeration',
  },
  {
    id: 'solid-drawing',
    number: 11,
    name: 'Solid Drawing',
    intent: 'Objects occupy believable space: consistent perspective, weight, and silhouette.',
    appliedTo: ['Dialog depth', 'Card elevation', 'Icon geometry'],
    pattern: 'reveal',
    durationMs: DURATION_MS.deliberate,
    easing: 'standard',
    guardrail: '2px–24px offsets on a single z-axis. No fake 3D on text, no glass, no decorative depth.',
    primitives: ['MotionDialog', 'Pressable (elevation)', 'Motion Lab tilt demo'],
    demo: 'solid-drawing',
  },
  {
    id: 'appeal',
    number: 12,
    name: 'Appeal',
    intent: 'The sum of the other eleven. An interface that feels composed invites the next action.',
    appliedTo: ['Hover lifts', 'Reading progress', 'Every empty and loading state'],
    pattern: 'reveal',
    durationMs: DURATION_MS.standard,
    easing: 'enter',
    guardrail: 'Charm never overrides clarity: every animated element keeps a static, readable state.',
    primitives: ['Pressable', 'Reveal', 'SkeletonShard', 'ReadingProgress'],
    demo: 'appeal',
  },
] as const;

export const PRINCIPLE_BY_ID: Readonly<Record<PrincipleId, PrincipleSpec>> = Object.fromEntries(
  PRINCIPLES.map((principle) => [principle.id, principle]),
) as Record<PrincipleId, PrincipleSpec>;

/** Human-readable summary used in docs and the lab header. */
export function principleSummary(): string {
  return PRINCIPLES.map((principle) => `${principle.number}. ${principle.name}`).join(' · ');
}

/** Easing as a CSS timing function, for the lab's side-by-side comparisons. */
export function easingToCss(name: MotionEasingName): string {
  const [x1, y1, x2, y2] = EASING[name];
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}
