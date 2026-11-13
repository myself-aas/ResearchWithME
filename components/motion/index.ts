/**
 * reme motion primitives — public surface.
 *
 * Import from `@/components/motion` so a future refactor can move an
 * implementation without touching every caller.
 */

export { default as MotionScope, MotionBoundary, useInMotionScope, LAYOUT_TRANSITION } from './MotionScope';
export { default as MotionModeProvider, useMotionMode } from './MotionModeProvider';
export { default as Reveal, type RevealProps, type RevealTag } from './Reveal';
export { Stagger, StaggerItem, type StaggerProps, type StaggerItemProps } from './Stagger';
export { default as Pressable, type PressableProps, type PressableFeedback } from './Pressable';
export { MotionList, MotionItem, type MotionListProps, type MotionItemProps } from './MotionList';
export { default as MotionPillGroup, type MotionPillGroupProps, type MotionPillOption } from './MotionPillGroup';
export { default as SuccessCheck, type SuccessCheckProps } from './SuccessCheck';
export { default as AttentionPulse, type AttentionPulseProps } from './AttentionPulse';
export {
  Spinner,
  SkeletonShard,
  LoadingState,
  type SpinnerProps,
  type SkeletonShardProps,
  type LoadingStateProps,
} from './LoadingState';
export { default as LazyMount, type LazyMountProps } from './LazyMount';
export { default as RouteTransition, type RouteTransitionProps } from './RouteTransition';
export { useArmedReveal, type ArmedReveal, type ArmedRevealOptions } from './use-armed-reveal';
