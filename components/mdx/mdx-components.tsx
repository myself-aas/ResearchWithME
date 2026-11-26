import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Info, Lightbulb, TriangleAlert, CircleAlert, BookOpenCheck } from 'lucide-react';
import CodeBlock from './CodeBlock';
import BenchmarkChart from '@/components/post/BenchmarkChart';
import PipelineExplorer from '@/components/post/PipelineExplorer';
import { FIGURES } from '@/lib/figures/registry';
import {
  AirflowLayerStack,
  AirflowEvidenceMatrix,
  AirflowPilotSwitches,
  AirflowQuiz,
} from '@/components/post/airflow-teardown-figures';
import {
  SvelteLayerStack,
  SvelteBoundaryMatrix,
  SvelteAdoptionSwitches,
  SvelteQuiz,
} from '@/components/post/svelte-teardown-figures';
import {
  PValueMisreadingMatrix,
  PValueAssumptionSwitches,
  PValueResultsAtlas,
  PValueQuiz,
} from '@/components/post/pvalue-figures';
import {
  WelcomeAnatomyAtlas,
  WelcomeGatesMatrix,
  WelcomeBudgetSplit,
  WelcomeQuiz,
} from '@/components/post/welcome-figures';

/**
 * Components available inside every MDX post without an import.
 *
 * MDX's value over Markdown is that prose can use the design system: a figure
 * that renders a caption, a callout with a tone, a video with a poster, and a
 * code block with a copy control. Authors write the component, the site owns
 * the appearance.
 */

const TONES = {
  note: {
    icon: Info,
    label: 'Note',
    className: 'border-brand/40 bg-selection/60',
    iconClassName: 'text-brand',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    className: 'border-trust-verified/40 bg-trust-verified/5',
    iconClassName: 'text-trust-verified',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Warning',
    className: 'border-trust-emerging/50 bg-trust-emerging/10',
    iconClassName: 'text-trust-emerging',
  },
  danger: {
    icon: CircleAlert,
    label: 'Correction',
    className: 'border-destructive/40 bg-destructive/5',
    iconClassName: 'text-destructive',
  },
} as const;

export type CalloutTone = keyof typeof TONES;

export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
}) {
  const config = TONES[tone] ?? TONES.note;
  const Icon = config.icon;
  return (
    <aside
      className={`my-7 rounded-2xl border px-5 py-4 font-sans ${config.className}`}
      aria-label={typeof title === 'string' ? title : config.label}
    >
      <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
        <Icon className={`h-4 w-4 shrink-0 ${config.iconClassName}`} aria-hidden="true" />
        {title ?? config.label}
      </p>
      <div className="mt-2 font-sans text-[0.9375rem] leading-relaxed text-ink-secondary [&>p]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_code]:text-ink">
        {children}
      </div>
    </aside>
  );
}

export function Figure({
  src,
  alt,
  caption,
  href,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: ReactNode;
  href?: string;
  /** Intrinsic pixel dimensions, required: they reserve space and prevent CLS. */
  width: number;
  height: number;
  priority?: boolean;
}) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- MDX figures may point at any https host
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="h-auto w-full rounded-xl border border-line bg-surface"
    />
  );

  return (
    <figure className="my-8">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className="block">
          {image}
        </a>
      ) : (
        image
      )}
      {caption && (
        <figcaption className="mt-2 font-mono text-xs leading-relaxed text-ink-secondary">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function Video({
  src,
  poster,
  caption,
  title = 'Embedded video',
}: {
  src: string;
  poster?: string;
  caption?: ReactNode;
  title?: string;
}) {
  return (
    <figure className="my-8">
      <video
        className="w-full rounded-xl border border-line bg-surface"
        controls
        preload="metadata"
        playsInline
        poster={poster}
        aria-label={title}
      >
        <source src={src} />
        Your browser does not support the video element.
      </video>
      {caption && (
        <figcaption className="mt-2 font-mono text-xs leading-relaxed text-ink-secondary">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Highlighted summary box, typically the first block after the intro. */
export function KeyTakeaways({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Key takeaways"
      className="my-8 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
        <BookOpenCheck className="h-4 w-4 text-brand" aria-hidden="true" />
        Key takeaways
      </div>
      <div className="mt-3 font-sans text-[0.9375rem] leading-relaxed text-ink-secondary [&_li]:my-2 [&_li]:marker:text-brand [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** Small, muted footnote-style aside that stays inline with the prose. */
export function Sidenote({ children }: { children: ReactNode }) {
  return (
    <aside className="my-5 border-l-2 border-line pl-4 font-sans text-sm leading-relaxed text-ink-secondary">
      {children}
    </aside>
  );
}

function MdxLink({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const internal = href.startsWith('/') || href.startsWith('#');
  const isAnchor = href.startsWith('#');
  const common = {
    className:
      'font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:text-brand-pressed hover:decoration-brand-pressed',
  };

  if (internal) {
    return (
      <Link href={href} {...common} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      {...common}
      {...(isAnchor ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
      {...props}
    >
      {children}
      {!isAnchor && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

function MdxImage({ alt = '', className, ...props }: ComponentPropsWithoutRef<'img'>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- MDX images carry no build-time dimensions
    <img
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`my-7 w-full rounded-xl border border-line bg-surface ${className ?? ''}`}
      {...props}
    />
  );
}

/**
 * Every registry figure is available inside MDX by its `mdxName`, derived
 * from the registry so an entry cannot exist in the thread but miss from the
 * article or vice versa (FIGURE_CONSTITUTION.md Article 3). Legacy prop-fed
 * components (BenchmarkChart, PipelineExplorer) stay hand-registered until
 * they migrate onto the library.
 */
const figureComponents = Object.fromEntries(
  FIGURES.map((figure) => [figure.mdxName, figure.component]),
);

export const mdxComponents = {
  a: MdxLink,
  img: MdxImage,
  pre: CodeBlock,
  Callout,
  Figure,
  Video,
  KeyTakeaways,
  BenchmarkChart,
  PipelineExplorer,
  Sidenote,
  ...figureComponents,
  // Post bindings (Article 2): thin compositions of library components with
  // the post's own data module. One entry per adopted figure, per post.
  AirflowLayerStack,
  AirflowEvidenceMatrix,
  AirflowPilotSwitches,
  AirflowQuiz,
  SvelteLayerStack,
  SvelteBoundaryMatrix,
  SvelteAdoptionSwitches,
  SvelteQuiz,
  PValueMisreadingMatrix,
  PValueAssumptionSwitches,
  PValueResultsAtlas,
  PValueQuiz,
  WelcomeAnatomyAtlas,
  WelcomeGatesMatrix,
  WelcomeBudgetSplit,
  WelcomeQuiz,
};
