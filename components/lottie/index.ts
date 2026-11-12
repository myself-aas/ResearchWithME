/**
 * πeme Lottie layer — public surface.
 *
 * Compositions are built from motion tokens in `lib/lottie/`; this folder
 * holds the client player and the named micro-interactions. See
 * docs/motion-system.md §Lottie for the contract.
 */

export { default as LottiePlayer, type LottiePlayerProps } from './LottiePlayer';
export {
  VerifyMark,
  ConnectMark,
  SynthesizeMark,
  AttentionMark,
  type MicroInteractionProps,
} from './MicroInteractions';
