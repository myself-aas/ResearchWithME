'use client';

/**
 * MotionLab — the interactive half of the πeme motion system.
 *
 * This is a design-system surface, not a marketing page: every demo below is
 * the same variant/token pair the product ships, so changing a demo changes
 * the product (or reveals that it is not using the token layer yet). It also
 * exposes the three motion modes and the lazy-loading primitives so reviewers
 * can test them without hunting for a page that happens to use them.
 *
 * Twelve principles → twelve demos, in Disney's canonical order, each with its
 * πeme pattern, duration, easing, guardrail, and the primitives that implement
 * it. Below the grid: the loading contract, the lazy boundary, and the raw
 * token tables.
 */

import { useCallback, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, useAnimationControls, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  DURATION_MS,
  EASING,
  SPRING,
  STAGGER,
  TRANSITION,
  type MotionEasingName,
} from '@/lib/motion/tokens';
import { PRINCIPLES, easingToCss, type PrincipleId, type PrincipleSpec } from '@/lib/motion/principles';
import { revealVariants } from '@/lib/motion/variants';
import { useDelayedLoading, useHydrated } from '@/lib/motion/hooks';
import { useMotionMode } from './MotionModeProvider';
import LazyMount from './LazyMount';
import { SkeletonShard } from './LoadingState';
import Pressable from './Pressable';
import Reveal from './Reveal';
import SuccessCheck from './SuccessCheck';
import { Stagger, StaggerItem } from './Stagger';
import type { MotionMode } from '@/lib/motion/mode';
import { AttentionMark, ConnectMark, SynthesizeMark, VerifyMark, type MicroInteractionProps } from '@/components/lottie';
import { WorkflowDiagram } from '@/components/workflows';
import { LOTTIE_ANIMATIONS, lottieDurationMs, type LottieAnimationName } from '@/lib/lottie/animations';
import { RESEARCH_WORKFLOWS } from '@/lib/workflows/research-workflows';
import { Card, Text } from '@/components/primitives';

// ---------------------------------------------------------------------------
// Shared demo scaffolding
// ---------------------------------------------------------------------------

function useDemo() {
  const controls = useAnimationControls();
  const play = useCallback(() => {
    void controls.start('play');
  }, [controls]);
  return { controls, play };
}

function Stage({
  children,
  className = '',
  height = 'h-32',
}: {
  children: React.ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`relative flex ${height} items-center justify-center overflow-hidden rounded-sm border border-line bg-canvas ${className}`}
    >
      {children}
    </div>
  );
}

function Replay({ onPlay }: { onPlay: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onPlay}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 font-sans text-xs font-semibold text-ink transition-colors hover:bg-surface-subtle"
    >
      <Play className="h-3.5 w-3.5" aria-hidden="true" />
      Replay
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// One demo per principle
// ---------------------------------------------------------------------------

function SquashStretchDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage>
        <m.div
          animate={controls}
          variants={{
            idle: { scaleX: 1, scaleY: 1, y: 0 },
            play: {
              scaleX: [1, 1.18, 0.96, 1],
              scaleY: [1, 0.82, 1.04, 1],
              y: [0, 6, -2, 0],
              transition: { duration: 0.42, times: [0, 0.35, 0.72, 1], ease: [...EASING.emphasize] },
            },
          }}
          initial={false}
          className="flex h-16 w-16 items-center justify-center rounded-sm bg-brand font-mono text-xs font-semibold text-on-primary"
        >
          1
        </m.div>
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function AnticipationDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage>
        <m.div
          animate={controls}
          variants={{
            idle: { y: 0, scaleY: 1 },
            play: {
              y: [0, 10, -26, 0],
              scaleY: [1, 0.9, 1.04, 1],
              transition: { duration: 0.62, times: [0, 0.22, 0.6, 1], ease: [...EASING.standard] },
            },
          }}
          initial={false}
          className="h-14 w-14 rounded-sm border border-brand bg-surface-subtle"
        />
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function StagingDemo() {
  const [focus, setFocus] = useState<'subject' | 'support'>('subject');
  return (
    <div className="space-y-3">
      <Stage height="h-36">
        <m.div
          className="absolute left-4 top-4 h-14 w-24 rounded-sm border border-line bg-surface"
          animate={{ opacity: focus === 'support' ? 1 : 0.35, scale: focus === 'support' ? 1 : 0.96 }}
          transition={TRANSITION.reveal}
        >
          <span className="sr-only">Supporting layer</span>
        </m.div>
        <m.div
          className="absolute bottom-4 right-4 h-16 w-28 rounded-sm bg-brand"
          animate={{ opacity: focus === 'subject' ? 1 : 0.35, scale: focus === 'subject' ? 1 : 0.96 }}
          transition={TRANSITION.reveal}
        />
      </Stage>
      <Pressable
        type="button"
        onClick={() => setFocus((current) => (current === 'subject' ? 'support' : 'subject'))}
        className="inline-flex min-h-10 items-center rounded-sm border border-line bg-surface px-3 py-1.5 font-sans text-xs font-semibold text-ink hover:bg-surface-subtle"
      >
        Switch subject
      </Pressable>
    </div>
  );
}

function PoseToPoseDemo() {
  const [pose, setPose] = useState<'a' | 'b' | 'c'>('a');
  const poses = ['0%', '50%', '100%'] as const;
  return (
    <div className="space-y-3">
      <Stage>
        <m.div
          className="h-12 w-12 rounded-sm bg-brand"
          animate={{ x: pose === 'a' ? -90 : pose === 'b' ? 0 : 90, rotate: pose === 'c' ? 8 : 0 }}
          transition={{ layout: SPRING.layout, ...TRANSITION.connect }}
        />
      </Stage>
      <div className="flex gap-1.5">
        {(['a', 'b', 'c'] as const).map((option, index) => (
          <Pressable
            key={option}
            type="button"
            onClick={() => setPose(option)}
            aria-pressed={pose === option}
            className={`min-h-10 rounded-sm border px-3 py-1.5 font-mono text-xs ${
              pose === option ? 'border-brand bg-brand text-on-primary' : 'border-line bg-surface text-ink'
            }`}
          >
            pose {poses[index]}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

function FollowThroughDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage>
        <div className="relative flex items-center">
          {[0, 1, 2].map((index) => (
            <m.div
              key={index}
              animate={controls}
              variants={{
                idle: { x: 0 },
                play: {
                  x: [0, 70],
                  transition: {
                    duration: 0.5,
                    delay: index * 0.07,
                    times: [0, 1],
                    ease: [...EASING.standard],
                  },
                },
              }}
              initial={false}
              className={`h-10 w-10 rounded-full ${
                index === 0 ? 'bg-brand' : index === 1 ? 'bg-brand/60' : 'bg-brand/30'
              }`}
              style={{ marginLeft: index === 0 ? 0 : 6 }}
            />
          ))}
        </div>
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function SlowInOutDemo() {
  const { controls, play } = useDemo();
  const rows: Array<{ label: string; ease: MotionEasingName }> = [
    { label: 'linear', ease: 'standard' },
    { label: 'standard', ease: 'standard' },
    { label: 'emphasize', ease: 'emphasize' },
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-sm border border-line bg-canvas p-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <Text as="span" variant="eyebrow" color="secondary" className="w-20 shrink-0">
              {row.label}
            </Text>
            <div className="relative h-3 flex-1 rounded-full bg-surface-subtle">
              <m.div
                animate={controls}
                variants={{
                  idle: { x: 0 },
                  play: {
                    x: [0, 120],
                    transition: {
                      duration: 0.7,
                      ease: row.label === 'linear' ? 'linear' : [...EASING[row.ease]],
                    },
                  },
                }}
                initial={false}
                className="absolute left-0 top-0 h-3 w-3 rounded-full bg-brand"
              />
            </div>
          </div>
        ))}
      </div>
      <Replay onPlay={play} />
    </div>
  );
}

function ArcDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage>
        <m.div
          animate={controls}
          variants={{
            idle: { x: -80, y: 20, rotate: -12 },
            play: {
              x: [-80, 0, 80],
              y: [20, -28, 20],
              rotate: [-12, 0, 12],
              transition: { duration: 0.9, times: [0, 0.5, 1], ease: [...EASING.standard] },
            },
          }}
          initial={false}
          className="h-10 w-10 rounded-sm bg-brand"
        />
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function SecondaryActionDemo() {
  const [liked, setLiked] = useState(false);
  return (
    <Stage height="h-24">
      <Pressable
        type="button"
        feedback="lift"
        onClick={() => setLiked((value) => !value)}
        aria-pressed={liked}
        className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-sans text-sm ${
          liked ? 'border-brand bg-selection text-brand' : 'border-line bg-surface text-ink'
        }`}
      >
        <m.span
          aria-hidden="true"
          animate={liked ? { scale: [1, 1.4, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, times: [0, 0.45, 1], ease: [...EASING.emphasize] }}
          className="inline-flex"
        >
          ♥
        </m.span>
        {liked ? 'Liked' : 'Like'}
      </Pressable>
    </Stage>
  );
}

function TimingDemo() {
  const { controls, play } = useDemo();
  const durations: Array<keyof typeof DURATION_MS> = ['fast', 'standard', 'deliberate', 'connect', 'synthesize'];
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-sm border border-line bg-canvas p-4">
        {durations.map((name) => (
          <div key={name} className="flex items-center gap-3">
            <Text as="span" variant="eyebrow" color="secondary" className="w-20 shrink-0">
              {name}
            </Text>
            <div className="relative h-2 flex-1 rounded-full bg-surface-subtle">
              <m.div
                animate={controls}
                variants={{
                  idle: { width: '12%' },
                  play: {
                    width: ['12%', '100%'],
                    transition: { duration: DURATION_MS[name] / 1000, ease: [...EASING.standard] },
                  },
                }}
                initial={false}
                className="absolute inset-y-0 left-0 rounded-full bg-brand"
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs text-ink-secondary">
              {DURATION_MS[name]}ms
            </span>
          </div>
        ))}
      </div>
      <Replay onPlay={play} />
    </div>
  );
}

function ExaggerationDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage>
        <m.div
          animate={controls}
          variants={{
            idle: { scale: 1, rotate: 0 },
            play: {
              scale: [1, 1.28, 0.94, 1.06, 1],
              rotate: [0, 8, -5, 2, 0],
              transition: { duration: 0.7, times: [0, 0.25, 0.5, 0.75, 1], ease: [...EASING.standard] },
            },
          }}
          initial={false}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-primary"
        >
          <SuccessCheck size={22} className="text-on-primary" quiet />
        </m.div>
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function SolidDrawingDemo() {
  const { controls, play } = useDemo();
  return (
    <div className="space-y-3">
      <Stage height="h-36" className="[perspective:800px]">
        <m.div
          animate={controls}
          variants={{
            idle: { rotateX: 0, rotateY: 0, translateZ: 0 },
            play: {
              rotateX: [0, 18, 0],
              rotateY: [0, -22, 0],
              translateZ: [0, 24, 0],
              transition: { duration: 0.9, times: [0, 0.5, 1], ease: [...EASING.standard] },
            },
          }}
          initial={false}
          className="flex h-20 w-32 items-center justify-center rounded-sm border border-line bg-surface text-ink shadow-raised"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Text as="span" variant="eyebrow" color="inherit">plane</Text>
        </m.div>
      </Stage>
      <Replay onPlay={play} />
    </div>
  );
}

function AppealDemo() {
  return (
    <Stage height="h-36">
      <m.div
        whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 24px rgba(18,18,20,0.12)' }}
        whileTap={{ scale: 0.985 }}
        transition={SPRING.lift}
        className="w-40 rounded-sm border border-line bg-surface p-4"
      >
        <Text as="p" variant="eyebrow" color="secondary">Hover me</Text>
        <p className="mt-1 font-serif text-sm font-semibold text-ink">A composed card</p>
      </m.div>
    </Stage>
  );
}

const DEMOS: Record<PrincipleId, () => React.ReactElement> = {
  'squash-stretch': SquashStretchDemo,
  anticipation: AnticipationDemo,
  staging: StagingDemo,
  'straight-ahead': PoseToPoseDemo,
  'follow-through': FollowThroughDemo,
  'slow-in-out': SlowInOutDemo,
  arc: ArcDemo,
  'secondary-action': SecondaryActionDemo,
  timing: TimingDemo,
  exaggeration: ExaggerationDemo,
  'solid-drawing': SolidDrawingDemo,
  appeal: AppealDemo,
};

// ---------------------------------------------------------------------------
// Principle card + section
// ---------------------------------------------------------------------------

function PrincipleCard({ spec }: { spec: PrincipleSpec }) {
  const Demo = DEMOS[spec.id];
  return (
    <Reveal as="article" variant="rise" className="flex flex-col rounded-sm border border-line bg-surface">
      <header className="border-b border-line p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-ink">
            <span className="mr-2 font-mono text-xs text-ink-secondary">{String(spec.number).padStart(2, '0')}</span>
            {spec.name}
          </h3>
          <Text as="span" variant="eyebrow" color="secondary" className="shrink-0 rounded-xs border border-line bg-canvas px-1.5 py-0.5">
            {spec.pattern}
          </Text>
        </div>
        <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">{spec.intent}</p>
      </header>
      <div className="p-4">
        <Demo />
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line p-4 font-mono text-xs">
        <div>
          <dt className="uppercase tracking-wider text-ink-secondary">Duration</dt>
          <dd className="mt-0.5 text-ink">{spec.durationMs === null ? 'gestural' : `${spec.durationMs}ms`}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-ink-secondary">Easing</dt>
          <dd className="mt-0.5 truncate text-ink" title={easingToCss(spec.easing)}>
            {spec.easing}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="uppercase tracking-wider text-ink-secondary">Guardrail</dt>
          <dd className="mt-0.5 font-sans text-xs leading-relaxed text-ink">{spec.guardrail}</dd>
        </div>
        <div className="col-span-2">
          <dt className="uppercase tracking-wider text-ink-secondary">Primitives</dt>
          <dd className="mt-0.5 font-sans text-xs leading-relaxed text-ink-secondary">{spec.primitives.join(' · ')}</dd>
        </div>
      </dl>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Mode switch
// ---------------------------------------------------------------------------

const MODES: Array<{ id: MotionMode; label: string; description: string }> = [
  { id: 'full', label: 'Full', description: 'All reveals, arcs, and springs; still respects the OS preference.' },
  { id: 'reduced', label: 'Reduced', description: 'Transforms stop; opacity and colour still explain the change.' },
  { id: 'static', label: 'Static', description: 'No transitions at all — the print-grade baseline.' },
];

function ModeSwitch() {
  const { mode, setMode } = useMotionMode();
  const active = MODES.find((entry) => entry.id === mode) ?? MODES[0];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="p" variant="eyebrow" color="secondary">Motion mode (πeme §10)</Text>
          <p className="mt-1 font-sans text-xs text-ink-secondary">{active.description}</p>
        </div>
        <div role="group" aria-label="Motion mode" className="flex gap-1.5">
          {MODES.map((entry) => (
            <Pressable
              key={entry.id}
              type="button"
              aria-pressed={mode === entry.id}
              onClick={() => setMode(entry.id)}
              className={`min-h-10 rounded-sm border px-3 py-1.5 font-sans text-xs font-semibold ${
                mode === entry.id
                  ? 'border-brand bg-brand text-on-primary'
                  : 'border-line bg-canvas text-ink-secondary hover:bg-surface-subtle'
              }`}
            >
              {entry.label}
            </Pressable>
          ))}
        </div>
      </div>
      <p className="mt-3 font-mono text-xs text-ink-secondary">
        persisted as <code className="rounded-xs bg-canvas px-1">rwm-motion-mode</code> · mirrored to{' '}
        <code className="rounded-xs bg-canvas px-1">html[data-motion-mode]</code>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading + lazy loading demos
// ---------------------------------------------------------------------------

function LoadingContractDemo() {
  const [loading, setLoading] = useState(false);
  const visible = useDelayedLoading(loading, { delay: 200, minDuration: 500 });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <h3 className="font-sans text-sm font-semibold text-ink">Delayed indicator</h3>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Appears after 200ms and stays at least 500ms. A 120ms response never flashes a spinner.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Pressable
            type="button"
            onClick={() => setLoading((value) => !value)}
            className="min-h-10 rounded-sm border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-semibold text-ink hover:bg-surface-subtle"
          >
            {loading ? 'Cancel' : 'Start loading'}
          </Pressable>
          <Text as="span" variant="eyebrow" color="secondary">
            state: {loading ? 'pending' : 'idle'} · indicator: {visible ? 'shown' : 'hidden'}
          </Text>
        </div>
      </Card>

      <Card>
        <h3 className="font-sans text-sm font-semibold text-ink">Skeleton shard</h3>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Bounded shimmer (three cycles, 1500ms each) shaped like the content it replaces.
        </p>
        <div className="mt-4" aria-hidden="true">
          <SkeletonShard height={18} width="60%" />
          <div className="h-2" />
          <SkeletonShard lines={3} />
        </div>
      </Card>
    </div>
  );
}

function HeavyWidget() {
  return (
    <div className="rounded-sm border border-brand/40 bg-selection p-6 font-sans text-sm text-ink">
      <p className="font-semibold">Mounted on intersection.</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
        In production this slot holds a code-split widget (Recharts, a provenance graph, an editor). The skeleton above
        reserved its height, so nothing below moved when it arrived.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lottie micro-interactions + lifecycle diagrams
// ---------------------------------------------------------------------------

const LOTTIE_DEMOS: Array<{ name: LottieAnimationName; label: string; use: string; Mark: React.ComponentType<MicroInteractionProps> }> = [
  { name: 'verify', label: 'Verify', use: 'peer-verified, saved, copied', Mark: VerifyMark },
  { name: 'connect', label: 'Connect', use: 'citation or provenance link made', Mark: ConnectMark },
  { name: 'synthesize', label: 'Synthesize', use: 'evidence gathered into one result', Mark: SynthesizeMark },
  { name: 'attention', label: 'Attention', use: 'a count changed — three cycles, then rests', Mark: AttentionMark },
];

function LottieDemos() {
  const [plays, setPlays] = useState<Record<LottieAnimationName, number>>({ verify: 0, connect: 0, synthesize: 0, attention: 0 });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {LOTTIE_DEMOS.map(({ name, label, use, Mark }) => (
        <Card key={name} className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-sans text-sm font-semibold text-ink">{label}</h3>
              <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">{use}</p>
            </div>
            <span className="font-mono text-xs tabular-nums text-ink-secondary">
              {lottieDurationMs(LOTTIE_ANIMATIONS[name])}ms
            </span>
          </div>
          <div className="mt-4 flex flex-1 items-center justify-center rounded-sm border border-dashed border-line bg-canvas py-6 text-ink">
            <Mark size={48} autoplay={false} playKey={plays[name]} />
          </div>
          <div className="mt-3">
            <Replay onPlay={() => setPlays((current) => ({ ...current, [name]: current[name] + 1 }))} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

function TokenTables() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-sm border border-line bg-surface">
        <h3 className="border-b border-line p-4 font-sans text-sm font-semibold text-ink">Durations</h3>
        <table className="w-full text-left font-mono text-xs">
          <thead className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Token</th>
              <th scope="col" className="px-4 py-2 font-medium">Value</th>
              <th scope="col" className="px-4 py-2 font-medium">Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(Object.keys(DURATION_MS) as Array<keyof typeof DURATION_MS>).map((name) => (
              <tr key={name}>
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2 tabular-nums">{DURATION_MS[name]}ms</td>
                <td className="px-4 py-2 font-sans text-ink-secondary">
                  {name === 'fast'
                    ? 'press, toggle'
                    : name === 'standard'
                      ? 'reveal'
                      : name === 'deliberate'
                        ? 'verify, archive'
                        : name === 'connect'
                          ? 'provenance'
                          : name === 'synthesize'
                            ? 'evidence → draft'
                            : 'instant'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-sm border border-line bg-surface">
        <h3 className="border-b border-line p-4 font-sans text-sm font-semibold text-ink">Easings & springs</h3>
        <ul className="divide-y divide-line">
          {(Object.keys(EASING) as MotionEasingName[]).map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 px-4 py-2.5 font-mono text-xs">
              <span>{name}</span>
              <code className="truncate text-xs text-ink-secondary">{easingToCss(name)}</code>
            </li>
          ))}
          {(['press', 'lift', 'panel', 'expressive'] as const).map((name) => {
            const spring = SPRING[name];
            return (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-2.5 font-mono text-xs">
                <span>spring.{name}</span>
                <code className="truncate text-xs text-ink-secondary">
                  k {'stiffness' in spring ? spring.stiffness : '—'} · d {'damping' in spring ? spring.damping : '—'}
                </code>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 px-4 py-2.5 font-mono text-xs">
            <span>stagger</span>
            <code className="text-xs text-ink-secondary">
              {STAGGER.item * 1000}ms · cap {STAGGER.cap * 1000}ms
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lab
// ---------------------------------------------------------------------------

export default function MotionLab() {
  const reduce = useReducedMotion();
  // useReducedMotion() reads matchMedia on the client's first render, so the
  // badge must render the server's value ("unknown") until hydration is done.
  const hydrated = useHydrated();
  const [accordion, setAccordion] = useState<'none' | 'rise' | 'arc' | 'squash' | 'mask'>('arc');

  return (
    <div className="space-y-10">
      <ModeSwitch />

      <section aria-labelledby="principles-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <Text id="principles-heading" as="h2" variant="page-title">
              Twelve principles, twelve live demos
            </Text>
            <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
              Canonical order. Each card names the πeme pattern it belongs to, the exact duration and easing it may
              use, and the guardrail that keeps it out of decoration.
            </p>
          </div>
          <Text as="span" variant="eyebrow" color="secondary" className="rounded-sm border border-line bg-surface px-2.5 py-1">
            os reduced-motion: {!hydrated || reduce === null ? 'unknown' : reduce ? 'reduce' : 'no-preference'}
          </Text>
        </div>

        <Stagger as="div" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <StaggerItem key={principle.id} variant="rise" className="flex">
              <PrincipleCard spec={principle} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="reveal-heading" className="space-y-4">
        <div className="border-b border-line pb-3">
          <Text id="reveal-heading" as="h2" variant="page-title">
            Reveal variants on demand
          </Text>
          <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            Scroll reveals normally fire once when content enters the viewport. In the lab the same variants are
            mounted on demand so you can compare them.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reveal variant">
          {(['none', 'rise', 'arc', 'squash', 'mask'] as const).map((variant) => (
            <Pressable
              key={variant}
              type="button"
              aria-pressed={accordion === variant}
              onClick={() => setAccordion(variant)}
              className={`min-h-10 rounded-sm border px-3 py-1.5 font-sans text-xs font-semibold ${
                accordion === variant ? 'border-brand bg-brand text-on-primary' : 'border-line bg-surface text-ink'
              }`}
            >
              {variant}
            </Pressable>
          ))}
        </div>

        <div className="min-h-40 rounded-sm border border-dashed border-line bg-canvas p-6">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={accordion}
              variants={accordion === 'none' ? { visible: { opacity: 1 } } : revealVariants[accordion]}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="mx-auto flex max-w-md flex-col gap-2 rounded-sm border border-line bg-surface p-5"
            >
              <Text as="p" variant="eyebrow" color="secondary">
                variant · {accordion}
              </Text>
              <p className="font-serif text-lg font-semibold text-ink">A card that knows how it arrived</p>
              <p className="font-sans text-xs leading-relaxed text-ink-secondary">
                The same markup is used for source details, annotations, and evidence cards across the product.
              </p>
            </m.div>
          </AnimatePresence>
        </div>
      </section>

      <section aria-labelledby="loading-heading" className="space-y-4">
        <div className="border-b border-line pb-3">
          <Text id="loading-heading" as="h2" variant="page-title">
            Loading & lazy loading
          </Text>
          <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            Spinners wait 200ms, stay 500ms, and skeletons stop shimmering after three cycles. Widgets mount when they
            approach the viewport, never on page load.
          </p>
        </div>

        <LoadingContractDemo />

        <Card>
          <h3 className="font-sans text-sm font-semibold text-ink">Viewport-gated mount</h3>
          <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
            Scroll this box into view (or reload this page with it off-screen) to watch the skeleton hand over.
          </p>
          <div className="mt-4">
            <LazyMount
              label="Loading the demo widget"
              minHeight={140}
              fallback={
                <div className="rounded-sm border border-dashed border-line bg-canvas p-6" aria-hidden="true">
                  <SkeletonShard height={16} width="40%" />
                  <div className="mt-3">
                    <SkeletonShard lines={2} />
                  </div>
                </div>
              }
            >
              <HeavyWidget />
            </LazyMount>
          </div>
        </Card>
      </section>

      <section aria-labelledby="lottie-heading" className="space-y-4">
        <div className="border-b border-line pb-3">
          <Text id="lottie-heading" as="h2" variant="page-title">
            Lottie micro-interactions
          </Text>
          <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            Composed in code from the same tokens, recoloured to the current text colour, and loaded only when first
            played. In reduced and static modes, and without JavaScript, each shows its resting frame.
          </p>
        </div>
        <LottieDemos />
        <Card padding="lg">
          <WorkflowDiagram workflow={RESEARCH_WORKFLOWS.discovery} heading="h3" />
        </Card>
      </section>

      <section aria-labelledby="tokens-heading" className="space-y-4">
        <div className="border-b border-line pb-3">
          <Text id="tokens-heading" as="h2" variant="page-title">
            Token tables
          </Text>
          <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            Rendered from <code className="font-mono text-xs">lib/motion/tokens.ts</code>, which mirrors the generated
            πeme tokens. Nothing here is typed by hand at a call site.
          </p>
        </div>
        <TokenTables />
      </section>

      <Card aria-labelledby="reset-heading" as="section" padding="lg">
        <h2 id="reset-heading" className="font-serif text-lg font-semibold text-ink">
          Reset
        </h2>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Motion mode is stored per browser. Clearing it returns the reader to their operating-system preference.
        </p>
        <Pressable
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem('rwm-motion-mode');
            } catch {
              /* storage blocked */
            }
            window.location.reload();
          }}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-semibold text-ink hover:bg-surface-subtle"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Clear stored motion mode
        </Pressable>
      </Card>
    </div>
  );
}
