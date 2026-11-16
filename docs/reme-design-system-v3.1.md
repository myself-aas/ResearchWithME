---
name: reme
product: researchwith.me
version: 3.1.0
status: stable-candidate
updated: 2026-11-09
owners: [Design, Frontend, Research Integrity, Accessibility]
principles: [Provenance, Trust, Scholarship, Collaboration, Preservation]
engines:
  interface: CSS and Web Animations API
  react-video: Remotion
  web-video: HeyGen Hyperframes

color:
  primitive:
    neutral: {0: '#FFFFFF', 25: '#FCFCFD', 50: '#F8F7F3', 100: '#F0EEE8', 200: '#DEDCD5', 300: '#C6C4BD', 400: '#9D9C97', 500: '#737571', 600: '#555955', 700: '#3B403D', 800: '#252B29', 900: '#161C1A', 950: '#0B100F'}
    indigo: {50: '#EEF2FF', 100: '#E0E7FF', 300: '#A5B4FC', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA', 900: '#312E81'}
    emerald: {50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857'}
    cyan: {50: '#ECFEFF', 100: '#CFFAFE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490'}
    amber: {50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309'}
    red: {50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C'}
    violet: {50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9'}
  semantic:
    light:
      canvas: '#F8F7F3'
      surface: '#FFFFFF'
      surface-subtle: '#F0EEE8'
      surface-raised: '#FFFFFF'
      surface-inverse: '#161C1A'
      text-primary: '#161C1A'
      text-secondary: '#555955'
      text-tertiary: '#737571'
      text-inverse: '#FFFFFF'
      border-subtle: '#DEDCD5'
      border-strong: '#9D9C97'
      focus: '#4F46E5'
      selection: '#E0E7FF'
    dark:
      canvas: '#0B100F'
      surface: '#161C1A'
      surface-subtle: '#252B29'
      surface-raised: '#2F3633'
      surface-inverse: '#F8F7F3'
      text-primary: '#F8F7F3'
      text-secondary: '#C6C4BD'
      text-tertiary: '#9D9C97'
      text-inverse: '#161C1A'
      border-subtle: '#3B403D'
      border-strong: '#737571'
      focus: '#A5B4FC'
      selection: '#312E81'
  action: {primary: '#4F46E5', primary-hover: '#4338CA', primary-pressed: '#312E81', on-primary: '#FFFFFF', destructive: '#DC2626', link: '#4338CA', visited: '#6D28D9'}
  knowledge: {source: '#4F46E5', evidence: '#059669', insight: '#0891B2', discussion: '#D97706', contradiction: '#DC2626', publication: '#7C3AED', archive: '#555955'}
  trust: {verified: '#059669', replicated: '#047857', peer-reviewed: '#4F46E5', emerging: '#0891B2', uncertain: '#D97706', contested: '#DC2626', unknown: '#737571'}
  provenance: {direct-source: '#059669', cited-source: '#4F46E5', derived: '#0891B2', inferred: '#D97706', ai-assisted: '#7C3AED', unresolved: '#737571'}
  workflow: {discovered: '#0891B2', extracted: '#0D9488', validated: '#059669', synthesized: '#4F46E5', reviewed: '#7C3AED', published: '#6D28D9', archived: '#555955'}
  collaboration: {comment: '#0891B2', suggestion: '#0D9488', review: '#7C3AED', consensus: '#059669', disagreement: '#DC2626'}
  citation: {article: '#4F46E5', dataset: '#0891B2', book: '#047857', preprint: '#D97706', software: '#7C3AED', protocol: '#0D9488', webpage: '#555955'}

typography:
  family:
    editorial: 'Newsreader, Georgia, serif'
    interface: 'Inter, system-ui, sans-serif'
    metadata: 'JetBrains Mono, ui-monospace, monospace'
  style:
    display: {family: editorial, size: 'clamp(2.5rem, 5vw, 4.5rem)', weight: 450, line-height: 1.05, tracking: '-0.025em'}
    title-1: {family: editorial, size: 'clamp(2rem, 3.5vw, 3rem)', weight: 500, line-height: 1.12, tracking: '-0.02em'}
    title-2: {family: editorial, size: 'clamp(1.5rem, 2.5vw, 2.25rem)', weight: 500, line-height: 1.2, tracking: '-0.015em'}
    heading-1: {family: interface, size: '1.75rem', weight: 650, line-height: 1.25}
    heading-2: {family: interface, size: '1.375rem', weight: 650, line-height: 1.3}
    heading-3: {family: interface, size: '1.125rem', weight: 650, line-height: 1.35}
    body-reading: {family: editorial, size: '1.125rem', weight: 400, line-height: 1.7, max-line: '72ch'}
    body: {family: interface, size: '1rem', weight: 400, line-height: 1.625}
    body-small: {family: interface, size: '0.875rem', weight: 400, line-height: 1.55}
    label: {family: interface, size: '0.8125rem', weight: 600, line-height: 1.4}
    citation: {family: metadata, size: '0.8125rem', weight: 500, line-height: 1.5}
    metadata: {family: metadata, size: '0.75rem', weight: 500, line-height: 1.45, tracking: '0.015em'}

space: {0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem'}
radius: {xs: '0.25rem', sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', 2xl: '1.5rem', full: '9999px'}
shadow:
  raised: '0 1px 2px rgba(11,16,15,.08), 0 6px 18px rgba(11,16,15,.06)'
  floating: '0 4px 12px rgba(11,16,15,.10), 0 20px 48px rgba(11,16,15,.10)'
  dialog: '0 12px 32px rgba(11,16,15,.16), 0 36px 80px rgba(11,16,15,.14)'
layout:
  max-width: {reading: '48rem', workspace: '90rem', graph: '108rem'}
  grid:
    desktop: {columns: 12, gutter: '1.5rem', margin: '3rem'}
    tablet: {columns: 8, gutter: '1rem', margin: '2rem'}
    mobile: {columns: 4, gutter: '0.75rem', margin: '1rem'}
  breakpoint: {sm: '36rem', md: '48rem', lg: '64rem', xl: '80rem', 2xl: '96rem'}
  density: [compact, comfortable, spacious]

motion:
  duration: {instant: '0ms', fast: '120ms', standard: '200ms', deliberate: '320ms', connect: '480ms', synthesize: '700ms'}
  easing:
    standard: 'cubic-bezier(0.2, 0, 0, 1)'
    enter: 'cubic-bezier(0, 0, 0, 1)'
    exit: 'cubic-bezier(0.3, 0, 1, 1)'
    emphasize: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
  patterns: {reveal: standard, connect: connect, verify: deliberate, synthesize: synthesize, archive: deliberate}
  modes: [full, reduced, static]
  renderer: {interface: css, react-video: remotion, web-video: hyperframes}
  video:
    fps: {standard: 30, high-motion: 60}
    resolution: {landscape-hd: '1920x1080', portrait-hd: '1080x1920', square: '1080x1080'}
    scene: {minimum: '2.5s', standard: '5s', evidence-dense: '8s', citation-end-card: '5s'}
    frames-at-30fps: {transition-fast: 8, transition-standard: 12, transition-deliberate: 18}

focus: {width: '2px', offset: '2px', light: '#4F46E5', dark: '#A5B4FC'}
icon: {small: '1rem', medium: '1.25rem', large: '1.5rem', stroke: '1.75px', style: 'simple, geometric, non-decorative'}
graph:
  node: {source: '#4F46E5', evidence: '#059669', claim: '#0891B2', discussion: '#D97706', publication: '#7C3AED', archived: '#737571'}
  edge: {cites: '#6366F1', supports: '#10B981', contradicts: '#EF4444', derives: '#06B6D4', relates: '#9D9C97', direct-style: solid, inferred-style: dashed}
---

# reme Frontend Design System v3.1

> **2026-11-13:** the Aptos family leads each font stack (Aptos Serif, Aptos, Aptos Mono, requested by installed name only); the faces named below (Newsreader, Inter, JetBrains Mono) are now fallbacks.

reme is the frontend design system for **researchwith.me**, a scholarly workspace for discovering, evaluating, connecting, discussing, producing, and preserving knowledge. It combines editorial clarity with modern research tooling while avoiding the visual language of a developer console.

> **Manifesto:** reme makes knowledge traceable, trust visible, scholarship active, collaboration constructive, and the scholarly record enduring.

## 1. Core Principles

### Provenance: expose the origin
Every claim, summary, annotation, and AI-assisted output retains a visible path to its source.

- Link claims to evidence and evidence to an exact page, section, figure, table, timestamp, dataset row, or commit.
- Preserve author, date, method, license, funding, and surrounding context.
- Make provenance reachable in one interaction from every knowledge object.

**Review:** Can a researcher trace this information to its origin and understand how it was produced?

### Trust: show confidence and doubt
Trust comes from evidence, status, and context, not polished presentation.

- Distinguish verified, replicated, peer-reviewed, emerging, uncertain, contested, and unknown states.
- Present contradictory evidence next to supporting evidence.
- Label AI assistance and make it inspectable, editable, rejectable, and reversible.

**Review:** Why should users trust this, and what reasons exist not to?

### Scholarship: design for synthesis
Reading is active work involving annotation, comparison, extraction, interpretation, and writing.

- Keep annotation and citation capture in reading context.
- Support side-by-side comparison of methods, samples, findings, and limitations.
- Reveal complexity as summary, evidence, method, and source.

**Review:** Does this help create understanding rather than merely consume content?

### Collaboration: make knowledge challengeable
Scholarly work improves through connection, review, critique, rebuttal, and alternative interpretation.

- Make all research objects linkable and attributable.
- Distinguish comments, suggestions, reviews, rebuttals, and decisions.
- Preserve disagreement and resolved discussion in history.

**Review:** How can another researcher verify, challenge, or extend this work?

### Preservation: keep the record usable
Knowledge evolves without losing history, meaning, or identifiers.

- Maintain versions, attribution, timestamps, stable links, exports, and recovery.
- Archive instead of destructively deleting scholarly objects.
- Preserve superseded versions with a reason for change.

**Review:** Will this remain understandable, attributable, and reusable years from now?

## 2. Visual Identity

reme has two registers:

1. **Editorial:** Newsreader, parchment reading surfaces, restrained spacing, and long-form hierarchy for papers, abstracts, synthesis, and publishing.
2. **Workspace:** Inter, compact controls, structured panels, and explicit states for search, review, collaboration, and knowledge management.

JetBrains Mono is reserved for DOI, ORCID, accession numbers, BibTeX keys, versions, timestamps, code, and machine-readable metadata. Decorative glows, terminal motifs, constant motion, and glass blur behind dense text are excluded.

## 3. Token Architecture

Use three layers:

1. **Primitive:** raw colors and numeric scales.
2. **Semantic:** roles such as `text-primary`, `knowledge-evidence`, or `trust-contested`.
3. **Component:** aliases such as `evidence-card-border` derived only from semantic tokens.

Components must not reference primitive values directly. Tokens use lowercase kebab-case. A breaking semantic change increments the major version.

### Token example

```css
:root {
  --reme-canvas: #f8f7f3;
  --reme-surface: #fff;
  --reme-text-primary: #161c1a;
  --reme-text-secondary: #555955;
  --reme-source: #4f46e5;
  --reme-evidence: #059669;
  --reme-insight: #0891b2;
  --reme-discussion: #d97706;
  --reme-contradiction: #dc2626;
  --reme-publication: #7c3aed;
  --reme-border: #dedcd5;
  --reme-focus: #4f46e5;
  --reme-font-editorial: "Newsreader", Georgia, serif;
  --reme-font-interface: "Inter", system-ui, sans-serif;
  --reme-font-metadata: "JetBrains Mono", ui-monospace, monospace;
}
```

Color never carries meaning alone. Pair it with a label, icon, shape, line style, or accessible description.

## 4. Accessibility Baseline

reme targets **WCAG 2.2 AA** as the release minimum.

- Normal text contrast: at least 4.5:1.
- Large text and essential graphics: at least 3:1.
- Visible 2px focus ring with 2px offset.
- Minimum target: 24 × 24 CSS px; prefer 44 × 44 CSS px for primary touch actions.
- Full keyboard operation for core workflows.
- Reflow at 320 CSS px and usability at 200% zoom.
- Correct landmarks, headings, labels, names, roles, states, and live-region use.
- Honor `prefers-reduced-motion`; remove parallax, particles, and continuous animation.
- Graphs require keyboard-operable list or table alternatives.
- Do not use placeholder text as the sole form label.

## 5. Responsive Layout

### Reading mode

- Maximum width: 48rem.
- Preferred line length: 60–72 characters.
- Citations, figures, footnotes, and annotations stay anchored to their referents.
- Persistent actions remain visually secondary to the text.

### Workspace mode

- Desktop: resizable Sources, Synthesis, and Inspector regions on a 12-column grid.
- Tablet: 8 columns; secondary regions become tabs or drawers.
- Mobile: 4 columns; one primary task at a time, supporting context in sheets.

Density changes spacing, not information availability:

- **Compact:** bibliographies, tables, source lists, audit history.
- **Comfortable:** default reading, synthesis, and review.
- **Spacious:** onboarding, publication display, focused writing.

## 6. Navigation and Application Shell

- Global navigation contains Workspace, Library, Graph, Reviews, Publications, and Search.
- Breadcrumbs describe scholarly location, not browser history.
- Command palette supports search, create, cite, link, review, export, and navigation.
- Preserve focus when panels expand, collapse, or switch.
- Deep links open the exact knowledge object and source location.
- Mobile primary navigation uses a limited bottom bar; infrequent actions move to a menu.

## 7. Core Components

### Source Card
Required: title, type, author or organization, date, persistent identifier or stable URL, access state, provenance state. Expandable: abstract, methods, sample, setting, funding, conflicts, limitations, correction/retraction status.

### Evidence Card
Required: evidence statement, exact source location, source, extractor or AI label, trust state. Optional: quotation, structured data, method context, contradictions, replication, notes.

### Claim Card
Required: claim text, author, version, supporting and contradictory evidence counts, current state. Actions: inspect, support, contradict, request review, compare versions, cite, export.

### Citation Component
Supports short, full, and machine-readable views. Exports DOI, BibTeX, RIS, CSL-JSON, and a stable internal identifier. Copy actions provide visible and announced feedback.

### Research Workspace
Desktop regions: Sources, Synthesis, Inspector. Regions resize and collapse without losing focus or unsaved state. The inspector exposes citation, provenance, trust, history, and discussion.

### Provenance Graph
Nodes: sources, evidence, claims, discussions, publications. Edges are explicitly labeled `cites`, `supports`, `contradicts`, `derives from`, or `relates to`. Direct edges are solid; inferred edges are dashed with an explanation.

### Scholarly Dialogue
- **Comment:** contextual discussion.
- **Suggestion:** proposed change with accept/reject.
- **Review:** structured assessment with scope and status.
- **Rebuttal:** point-by-point response linked to review items.
- **Decision:** recorded resolution and rationale.

### AI-Assisted Output
Show AI involvement, source set, transformation type (`quoted`, `extracted`, `inferred`, `generated`), unresolved validation issues, responsible human reviewer, and inspect/edit/regenerate/reject/history actions. Do not expose hidden chain-of-thought; provide concise source-grounded rationale.

### Tables and Matrices
Sticky headers, tabular numerals, units in headers, text left-aligned, comparable numbers right-aligned. Render missing values as `Not reported`, never zero. Never animate research measurements. On narrow screens use column priority or record view.

### Forms
Primary actions use precise scholarly verbs such as `Save evidence`, `Request review`, and `Publish version`. Destructive actions state consequences. Checkboxes allow many, radios one, switches immediate settings. Errors identify the problem and recovery step.

### Feedback
- Toasts are for noncritical confirmation and never contain essential next steps.
- Inline feedback stays next to the affected object.
- Banners communicate workspace-wide status.
- Skeletons mirror the final layout and must not shimmer indefinitely.
- Empty states explain why the view is empty and offer one relevant action.

## 8. Content Design

Use precise verbs: `Cite`, `Add evidence`, `Request review`, `Archive`, `AI-assisted`.

Use calibrated statements: `Supported by 4 sources`, `Evidence is mixed`, `Not independently replicated`, `Method was not reported`, `Citation could not be resolved`.

Avoid `trusted`, `accurate`, `proven`, `AI-verified`, or `high quality` without a documented assessment method.

## 9. Interface Motion

Motion explains relationship, hierarchy, or state. Use CSS or the Web Animations API for ordinary UI transitions.

- **Reveal, 200ms:** source details, methods, annotations.
- **Connect, 480ms:** citation or provenance relationship.
- **Verify, 320ms:** confirmed state change with icon and text.
- **Synthesize, up to 700ms:** bounded, reversible evidence-to-draft transition.
- **Archive, 320ms:** reduce emphasis while preserving recovery.

Do not use infinite glow, particle streams, decorative telemetry, cursor-follow effects, number-count animations, or motion that implies verification without a real state change.

The reduced-motion contract does not kill motion outright — it converts
choreography into an instant, still state change. Hierarchy and status must
still be legible without the movement: it is the traversal that goes, not the
information.

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto !important; }

  [data-enter],
  [data-reveal],
  [data-reveal] > *,
  [class*="transition-colors"],
  [class*="transition-transform"],
  [class*="transition-opacity"],
  [class*="transition-shadow"],
  [class*="transition-all"] {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Scope, not `*`.** The selector names the families that animate rather than
every element. A universal rule also captures components added later, flattening
their timing with no way to opt back in, and it makes the contract impossible to
reason about at the call site.

**The loading affordances survive.** `animate-pulse` (skeleton shimmer) and
`animate-spin` (busy indicator) are intentionally excluded: they carry state, not
choreography. A frozen skeleton reads as a failed render, and a slow opacity
pulse is not vestibular motion. Remove transform, parallax, scale, and
scroll-driven movement — keep the signal that something is still working.

**Nothing may depend on animation to become visible.** Entrance choreography is
already gated behind `prefers-reduced-motion: no-preference`, and `Reveal` skips
arming entirely under reduced motion, so content is present at rest rather than
waiting for a keyframe that will not run.

## 10. Programmatic Animation and Video

Use the smallest suitable layer:

| Need | Renderer |
|---|---|
| UI state and panel transition | CSS / Web Animations API |
| Interactive graph | SVG / Canvas / WebGL |
| React-based embedded explainer | Remotion Player |
| React-generated MP4 | Remotion |
| Portable HTML/CSS/JS animation | HeyGen Hyperframes |
| GSAP, shader, or WebGL composition | HeyGen Hyperframes |
| HeyGen cloud-rendered web composition | HeyGen Hyperframes Cloud |

Do not use Remotion or Hyperframes for interactions CSS can implement reliably in under 700ms.

### Shared composition contract

```ts
export type MotionMode = 'full' | 'reduced' | 'static';
export type RenderEngine = 'remotion' | 'hyperframes';

export interface Citation {
  id: string;
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  url?: string;
  sourceType: 'article'|'dataset'|'book'|'preprint'|'software'|'protocol'|'webpage';
}

export interface EvidenceItem {
  id: string;
  statement: string;
  sourceId: string;
  sourceLocation: string;
  status: 'verified'|'replicated'|'peer-reviewed'|'emerging'|'uncertain'|'contested'|'unknown';
  extractionType: 'quoted'|'extracted'|'inferred'|'generated';
  limitation?: string;
}

export interface CompositionMetadata {
  compositionId: string;
  title: string;
  purpose: 'animated-abstract'|'evidence-synthesis'|'method-walkthrough'|'publication-trailer';
  author: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  theme: 'light'|'dark';
  locale: string;
  renderEngine: RenderEngine;
  motionMode: MotionMode;
  generatedAt: string;
  reviewedBy?: string;
  citations: Citation[];
  evidence: EvidenceItem[];
}
```

A final render is a scholarly artifact. Preserve its data, references, renderer version, token version, checksums, captions, transcript, reviewer, and configuration.

## 11. Remotion Implementation

Use Remotion when a composition is React-based, shares researchwith.me components, requires frame-accurate video, or needs an embedded parameterized preview.

### Register a composition

```tsx
import {Composition, Folder} from 'remotion';
import {EvidenceSynthesis} from './EvidenceSynthesis';
import {research} from './research-data';

export const RemotionRoot = () => (
  <Folder name="reme">
    <Composition
      id="EvidenceSynthesis"
      component={EvidenceSynthesis}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={900}
      defaultProps={{research, motionMode: 'full' as const}}
    />
    <Composition
      id="EvidenceSynthesisReduced"
      component={EvidenceSynthesis}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={900}
      defaultProps={{research, motionMode: 'reduced' as const}}
    />
  </Folder>
);
```

### Frame-driven evidence reveal

```tsx
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';

export const EvidenceSynthesis = ({research, motionMode}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = motionMode === 'static' ? 1 : interpolate(frame, [0, fps], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
  });
  const y = motionMode === 'full' ? interpolate(frame, [0, fps], [24, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  }) : 0;

  return <AbsoluteFill style={{background:'#F8F7F3', color:'#161C1A', padding:96}}>
    <header style={{opacity, transform:`translateY(${y}px)`}}>
      <p style={{color:'#4F46E5', fontFamily:'JetBrains Mono'}}>EVIDENCE SYNTHESIS</p>
      <h1 style={{fontFamily:'Newsreader', fontSize:88}}>{research.title}</h1>
    </header>
    <Sequence from={90} durationInFrames={390}><EvidencePath research={research} motionMode={motionMode}/></Sequence>
    <Sequence from={480} durationInFrames={240}><LimitationPanel research={research}/></Sequence>
    <Sequence from={720} durationInFrames={180}><CitationEndCard research={research}/></Sequence>
  </AbsoluteFill>;
};
```

Use `useCurrentFrame()` and `useVideoConfig()` as the time source, `interpolate()` for bounded transitions, `spring()` only for restrained entrances, and `Sequence` or `Series` for scene timing. Validate inputs and preload fonts and media.

### Embedded preview

```tsx
import {Player} from '@remotion/player';

export const EvidencePreview = ({research}) => <section aria-labelledby="preview-title">
  <h2 id="preview-title">Evidence synthesis preview</h2>
  <Player
    component={EvidenceSynthesis}
    inputProps={{research, motionMode:'reduced'}}
    durationInFrames={900}
    compositionWidth={1920}
    compositionHeight={1080}
    fps={30}
    controls
    style={{width:'100%', aspectRatio:'16 / 9', background:'#F8F7F3'}}
  />
  <p>Reduced-motion preview. Transcript and cited sources follow the player.</p>
</section>;
```

Do not autoplay with sound. Public compositions require reviewed captions, transcript, sufficient reading time, reduced-motion and static variants, and pausable keyboard-operable playback.

## 12. HeyGen Hyperframes Implementation

Use Hyperframes when a composition must remain a self-contained web project or needs HTML, CSS, JavaScript, GSAP, WebGL, shaders, catalog blocks, or HeyGen cloud rendering.

### Composition structure

```text
composition/
├── index.html
├── styles/tokens.css
├── styles/composition.css
├── scripts/data.js
├── scripts/timeline.js
├── assets/
├── citations.json
└── composition.json
```

### Timed HTML composition

```html
<main id="main" data-composition-id="evidence-synthesis-001"
  data-start="0" data-duration="30" data-width="1920" data-height="1080">
  <section data-hf-id="title" data-start="0" data-duration="3">
    <p class="eyebrow">Evidence synthesis</p>
    <h1>Evidence Synthesis Overview</h1>
  </section>
  <section class="provenance" data-hf-id="provenance" data-start="3" data-duration="13">
    <article class="node source" data-hf-id="source"><span>Source</span><h2>Example peer-reviewed study</h2></article>
    <div class="edge" data-hf-id="source-evidence" aria-label="Source supports evidence"></div>
    <article class="node evidence" data-hf-id="evidence"><span>Evidence</span><h2>The intervention was associated with an improvement.</h2></article>
    <div class="edge" data-hf-id="evidence-claim" aria-label="Evidence supports claim"></div>
    <article class="node claim" data-hf-id="claim"><span>Claim</span><h2>The result warrants further investigation.</h2></article>
  </section>
  <aside data-hf-id="limitation" data-start="16" data-duration="8">
    <strong>Limitation</strong><p>Single-site evidence requires wider replication.</p>
  </aside>
  <section data-hf-id="citation" data-start="24" data-duration="6">
    <h2>Source and provenance</h2><p>DOI: 10.0000/example</p><p>Results, Table 2, p. 8</p>
  </section>
</main>
```

### Deterministic timeline

```js
const mode = new URLSearchParams(location.search).get('motionMode') || 'full';
document.querySelector('#main').dataset.motionMode = mode;
const q = id => document.querySelector(`[data-hf-id="${id}"]`);

if (mode === 'static') {
  document.querySelectorAll('[data-hf-id]').forEach(el => {
    el.style.opacity = '1'; el.style.transform = 'none';
  });
} else {
  const distance = mode === 'reduced' ? 0 : 24;
  const timeline = gsap.timeline({paused:true, defaults:{ease:'power2.out'}})
    .fromTo(q('title'), {opacity:0, y:distance}, {opacity:1, y:0, duration:.7}, 0)
    .fromTo(q('source'), {opacity:0, scale:mode==='full'?.96:1}, {opacity:1, scale:1, duration:.5}, 3)
    .to(q('source-evidence'), {scaleX:1, duration:.48}, 5)
    .fromTo(q('evidence'), {opacity:0}, {opacity:1, duration:.5}, 6)
    .to(q('evidence-claim'), {scaleX:1, duration:.48}, 8)
    .fromTo(q('claim'), {opacity:0}, {opacity:1, duration:.5}, 9)
    .fromTo(q('limitation'), {opacity:0, y:distance}, {opacity:1, y:0, duration:.7}, 16)
    .fromTo(q('citation'), {opacity:0}, {opacity:1, duration:.4}, 24);
  window.remeTimeline = timeline; // register through the installed Hyperframes adapter
}
```

Do not call `timeline.play()` during a render. The renderer must seek the timeline. Avoid wall-clock time, uncontrolled randomness, network timing, and browser-specific state. Use deterministic seeds and stable `data-hf-id` identifiers.

### Cloud workflow

```text
Validate → Package standalone project → Upload bundle → Submit render
→ Store render ID → Poll or webhook → Download → Checksum → Attach provenance
```

Exclude `.git`, `node_modules`, caches, secrets, and unrelated build output. Treat uploaded compositions as executable code and render them in an isolated environment with network, CPU, memory, time, and output-size limits.

## 13. Scholarly Animation Patterns

### Evidence Reveal
Finding → source marker → trust state → exact citation. Never reveal the conclusion materially earlier than the source.

### Provenance Trace
Source → Extraction → Evidence → Claim → Synthesis. Keep contradictory paths visible.

### Citation Network
Show no more than 5–7 primary nodes in one explanatory scene. Label every edge. Provide a static list alternative.

### Method Walkthrough
Question → Sample → Method → Analysis → Result → Limitation. The limitation stage is mandatory.

### Publication Trailer
15–30s short, 30–60s standard, 60–90s conference. Sequence: research question → method → finding → limitation → DOI/stable URL.

## 14. Captions and Provenance

```ts
export const captions = [
  {startMs:0, endMs:3000, text:'Evidence synthesis overview.'},
  {startMs:3000, endMs:9000, text:'A peer-reviewed source reports an association with an improved outcome.'},
  {startMs:9000, endMs:16000, text:'The finding supports investigation but does not establish causation.'},
  {startMs:16000, endMs:24000, text:'A single-site sample limits generalization and requires replication.'},
  {startMs:24000, endMs:30000, text:'The DOI and exact evidence location appear on screen and in the transcript.'}
];
```

Citation cards remain visible for at least five seconds. Captions match narration verbatim. Store a provenance record with composition ID/version, reme version, renderer/version, render date, input/asset/output SHA-256 checksums, locale, citations, reviewer, captions, transcript, and motion mode.

## 15. Research Integrity and Security

Programmatic animation must not:

- Change axes or scales to exaggerate an effect.
- Animate values beyond observed ranges.
- Hide missing values or uncertainty.
- Convert association into causation.
- Imply replication, peer review, or verification through motion.
- Present generated imagery as observational evidence.
- Separate quotation from source or omit material limitations.

Render untrusted code in isolation. Allowlist packages, fonts, assets, and domains. Scan archives, prevent path traversal, set resource limits, keep API keys server-side, and human-review agent-generated code.

## 16. Frontend Architecture

Recommended packages:

```text
packages/
├── tokens/          # JSON/TS/CSS token outputs
├── icons/           # accessible SVG icons
├── react/           # headless and styled React components
├── graph/           # graph primitives and list alternatives
├── editor/          # scholarly editor integrations
├── remotion/        # React video compositions
├── hyperframes/     # portable web compositions
├── accessibility/   # test helpers and fixtures
└── docs/            # Storybook and usage guidance
```

Component API rules:

- Controlled and uncontrolled forms only when both are documented.
- Forward refs and preserve standard HTML attributes.
- Expose state through DOM and ARIA, not internal styling alone.
- Separate data/state primitives from visual components.
- Support server rendering and progressive enhancement.
- Avoid global CSS leakage.
- Every component ships with examples, keyboard behavior, accessibility notes, tests, and migration guidance.

## 17. Testing

Required gates:

- Unit tests for state and token mapping.
- Interaction tests for keyboard, pointer, touch, and focus recovery.
- Automated accessibility tests with axe-core.
- Visual regression in light, dark, high zoom, and reduced motion.
- Responsive tests at 320, 768, 1024, 1440, and 1920 CSS px.
- Screen-reader smoke tests with NVDA + Firefox/Chrome, VoiceOver + Safari, and TalkBack + Chrome for critical flows.
- Provenance validation: every evidence item resolves to a source and exact location.
- Motion validation: deterministic timing and citation visibility ≥5 seconds.

```ts
export const validateProvenance = composition => {
  const errors = [];
  const ids = new Set(composition.citations.map(x => x.id));
  for (const item of composition.evidence) {
    if (!ids.has(item.sourceId)) errors.push(`${item.id}: missing source ${item.sourceId}`);
    if (!item.sourceLocation?.trim()) errors.push(`${item.id}: missing source location`);
    if (item.extractionType === 'inferred' && !item.limitation) errors.push(`${item.id}: inferred evidence needs a limitation`);
  }
  if (!composition.reviewedBy) errors.push('Responsible human reviewer is missing');
  return errors;
};
```

## 18. Performance Budgets

- Initial application JavaScript: target ≤200 KB gzip for the shell, excluding editor/graph/video routes.
- Route-level code split editor, graph, Remotion Player, and Hyperframes tooling.
- Largest Contentful Paint: target ≤2.5s at the 75th percentile.
- Interaction to Next Paint: target ≤200ms at the 75th percentile.
- Cumulative Layout Shift: target ≤0.1.
- Reserve media dimensions, preload only critical fonts, subset font files, and prefer system fallback during failure.
- Virtualize bibliographies and tables above roughly 200 rows, while preserving accessible navigation and export.

## 19. Governance

Component maturity: `experimental`, `beta`, `stable`, `deprecated`, `archived`.

Use semantic versioning:

- Major: breaking token or component behavior.
- Minor: backward-compatible token or component addition.
- Patch: corrective visual, accessibility, documentation, or implementation fix.

Every release records accessibility impact, migration notes, affected components, visual baselines, and research-integrity implications.

## 20. Release Checklist

- [ ] Provenance is visible within one interaction.
- [ ] Trust, uncertainty, contradiction, and limitations are explicit.
- [ ] Context remains attached to quotations, findings, and claims.
- [ ] AI assistance is labeled, inspectable, editable, and reversible.
- [ ] Related objects are discoverable.
- [ ] Keyboard, focus, zoom, reflow, contrast, and reduced-motion checks pass.
- [ ] Changes are attributable and recoverable.
- [ ] Scholarly objects support stable identifiers and export.
- [ ] Color and motion do not overstate evidence.
- [ ] Light and dark themes pass visual and accessibility tests.
- [ ] Remotion/Hyperframes inputs and outputs retain citations and checksums.
- [ ] Captions, transcript, static/reduced variants, and human review are complete.
- [ ] Security and performance budgets pass.

# Part II: Normative v3.1 Implementation Contracts

The requirements in this part are normative. Where Part I conflicts with Part II, Part II takes precedence. Keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** follow RFC 2119 meanings.

## 21. Conformance Model

An implementation may claim reme v3.1 conformance only when it satisfies the relevant profile:

| Profile | Required scope |
|---|---|
| `reme-core` | Tokens, accessibility baseline, localization, security, error handling |
| `reme-scholarly` | Core plus source, evidence, claim, citation, review, provenance contracts |
| `reme-ai` | Scholarly plus AI disclosure, citation validation, approval, provider controls |
| `reme-motion` | Core plus Remotion/Hyperframes metadata, captions, provenance, render security |
| `reme-full` | All profiles |

Every conforming package MUST publish:

```json
{
  "remeVersion": "3.1.0",
  "profiles": ["reme-core", "reme-scholarly"],
  "packageVersion": "1.0.0",
  "buildTimestamp": "2026-11-09T16:05:00Z",
  "tokenChecksum": "sha256:<calculated-value>"
}
```

Checksums MUST be computed during build. Placeholder checksums MUST NOT ship.

## 22. Canonical Scholarly Domain Model

### 22.1 Shared primitives

```ts
export type ISODateTime = string; // ISO 8601 UTC, validated at runtime
export type ObjectId = string;    // UUIDv7 or equivalent sortable unique ID
export type WorkspaceId = string;
export type UserId = string;

export type ScholarlyObjectType =
  | 'research-project'
  | 'research-question'
  | 'source'
  | 'source-version'
  | 'evidence'
  | 'claim'
  | 'annotation'
  | 'dataset'
  | 'software'
  | 'protocol'
  | 'review'
  | 'review-item'
  | 'rebuttal'
  | 'decision'
  | 'publication'
  | 'contribution'
  | 'relationship';

export type LifecycleState =
  | 'draft'
  | 'active'
  | 'under-review'
  | 'validated'
  | 'published'
  | 'superseded'
  | 'withdrawn'
  | 'archived';

export type DataClassification =
  | 'public'
  | 'workspace'
  | 'confidential'
  | 'restricted'
  | 'embargoed';

export interface ScholarlyObjectBase {
  id: ObjectId;
  type: ScholarlyObjectType;
  schemaVersion: '3.1';
  objectVersion: number;
  workspaceId: WorkspaceId;
  lifecycle: LifecycleState;
  classification: DataClassification;
  createdAt: ISODateTime;
  createdBy: UserId;
  updatedAt: ISODateTime;
  updatedBy: UserId;
  deletedAt?: ISODateTime;
  deletionReason?: string;
}
```

Runtime validators MUST reject non-UTC timestamps, negative object versions, unknown lifecycle states, and references to inaccessible workspaces.

### 22.2 External identifiers

```ts
export type IdentifierScheme =
  | 'doi' | 'orcid' | 'pmid' | 'pmcid' | 'isbn' | 'issn'
  | 'arxiv' | 'handle' | 'ror' | 'rrid' | 'accession' | 'url';

export interface ExternalIdentifier {
  scheme: IdentifierScheme;
  value: string;
  normalizedValue: string;
  canonicalUrl?: string;
  sourceVersion?: string;
  resolutionStatus: 'resolved' | 'unresolved' | 'invalid' | 'temporarily-unavailable';
  resolvedAt?: ISODateTime;
}
```

DOIs MUST be normalized to lowercase without `https://doi.org/`. ORCID values MUST retain their canonical hyphenation. ISBN values MUST be checksum-validated. URLs MUST be canonicalized without deleting query parameters known to identify a version.

### 22.3 Source and source version

```ts
export interface Source extends ScholarlyObjectBase {
  type: 'source';
  title: string;
  translatedTitle?: string;
  transliteratedTitle?: string;
  language: string; // BCP 47
  sourceType: 'article'|'book'|'chapter'|'dataset'|'preprint'|'software'|'protocol'|'webpage'|'thesis'|'report';
  identifiers: ExternalIdentifier[];
  contributors: ContributorRef[];
  currentVersionId: ObjectId;
  access: 'open'|'subscription'|'restricted'|'unknown';
}

export interface SourceVersion extends ScholarlyObjectBase {
  type: 'source-version';
  sourceId: ObjectId;
  versionLabel: string;
  publishedAt?: ISODateTime;
  retrievedAt?: ISODateTime;
  checksum?: string;
  integrity: SourceIntegrity;
  replacesVersionId?: ObjectId;
  contentLocator?: string;
}

export interface ContributorRef {
  name: string;
  orcid?: string;
  role?: string;
  affiliation?: string;
}
```

### 22.4 Source locations

```ts
export type SourceLocator =
  | {kind:'page'; page:number; endPage?:number}
  | {kind:'section'; heading:string; path?:string[]}
  | {kind:'figure'; label:string; page?:number}
  | {kind:'table'; label:string; page?:number}
  | {kind:'timestamp'; startMs:number; endMs?:number}
  | {kind:'dataset'; row?:string; column?:string; query?:string}
  | {kind:'code'; repository:string; commit:string; path:string; startLine?:number; endLine?:number}
  | {kind:'web-fragment'; selector?:string; textQuote:string};
```

Evidence MUST contain at least one locator. A free-text page note alone is not sufficient when a structured locator is possible.

### 22.5 Evidence and claim

```ts
export interface Evidence extends ScholarlyObjectBase {
  type: 'evidence';
  statement: string;
  sourceVersionId: ObjectId;
  locators: SourceLocator[];
  extractionType: 'quoted'|'extracted'|'calculated'|'inferred'|'generated';
  quotation?: string;
  structuredValue?: {value:number|string|boolean; unit?:string};
  assessment: EvidenceAssessment;
  limitation?: string;
  aiProvenance?: AIProvenance;
}

export interface Claim extends ScholarlyObjectBase {
  type: 'claim';
  text: string;
  claimType: 'descriptive'|'comparative'|'causal'|'predictive'|'normative'|'methodological';
  supportRelationshipIds: ObjectId[];
  contradictionRelationshipIds: ObjectId[];
  qualificationRelationshipIds: ObjectId[];
  assessment: ClaimAssessment;
  responsibleReviewerId?: UserId;
}
```

A causal claim MUST NOT be created automatically from merely associative evidence. The UI MUST show the claim type and MUST warn when supporting evidence uses weaker epistemic language.

### 22.6 Relationships

```ts
export type RelationshipType =
  | 'cites' | 'supports' | 'contradicts' | 'qualifies'
  | 'replicates' | 'partially-replicates' | 'fails-to-replicate'
  | 'corrects' | 'retracts' | 'derives-from' | 'supersedes'
  | 'reviews' | 'responds-to' | 'uses-dataset' | 'uses-software';

export interface KnowledgeRelationship extends ScholarlyObjectBase {
  type: 'relationship';
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  relationshipType: RelationshipType;
  assertionMethod: 'manual'|'imported'|'ai-suggested';
  assertedBy: UserId;
  assertedAt: ISODateTime;
  evidenceIds: ObjectId[];
  confidence?: number; // 0..1, only with documented method
  status: 'proposed'|'accepted'|'contested'|'withdrawn';
  rationale?: string;
}
```

Graph edges MUST render relationship text in addition to color or line style. Inferred and AI-suggested relationships MUST remain visually and semantically distinguishable until accepted by a responsible human.

## 23. Multidimensional Trust and Assessment

Trust MUST NOT be represented as one aggregate enum.

```ts
export type SourceIntegrity =
  | 'active'
  | 'corrected'
  | 'expression-of-concern'
  | 'retracted'
  | 'withdrawn';

export interface EvidenceAssessment {
  review: 'not-reviewed'|'editorially-reviewed'|'peer-reviewed';
  replication: 'not-assessed'|'replicated'|'partially-replicated'|'failed-to-replicate';
  certainty: 'very-low'|'low'|'moderate'|'high';
  consensus: 'unknown'|'emerging'|'mixed'|'broad'|'contested';
  sourceIntegrity: SourceIntegrity;
  assessedBy: UserId;
  assessedAt: ISODateTime;
  method: string;
  rationale?: string;
}

export interface ClaimAssessment extends EvidenceAssessment {
  evidenceCount: number;
  contradictionCount: number;
  lastRecomputedAt: ISODateTime;
}
```

### Compact presentation

A compact assessment MUST expose at least:

```text
Peer reviewed · Replication not assessed · Moderate certainty
Mixed consensus · Source active
```

`Not assessed` MUST be visually and semantically different from a negative result. An aggregate score MAY be displayed only if the calculation, dimensions, weights, date, and responsible assessor are inspectable.

## 24. Permissions, Privacy, Embargo, and Audit

### 24.1 Roles and capabilities

```ts
export type Role =
  | 'viewer' | 'contributor' | 'reviewer' | 'editor'
  | 'principal-investigator' | 'workspace-admin';

export type Capability =
  | 'view' | 'annotate' | 'create-evidence' | 'edit' | 'export'
  | 'invite' | 'review' | 'approve' | 'publish'
  | 'manage-permissions' | 'manage-retention';

export interface PermissionDecision {
  allowed: boolean;
  capability: Capability;
  reasonCode: string;
  userMessage: string;
  requestAccessAllowed: boolean;
}
```

The server is authoritative. Hiding an action in the UI is not authorization. Disabled or hidden capabilities MUST have an inspectable reason when disclosure itself is permitted.

### 24.2 Embargo

```ts
export interface EmbargoPolicy {
  startsAt: ISODateTime;
  releasesAt?: ISODateTime;
  releaseCondition?: string;
  approvedBy: UserId;
  allowedRoles: Role[];
  exportAllowed: boolean;
  externalProcessingAllowed: boolean;
}
```

Embargoed content MUST NOT enter public search, public publication, public sharing, external AI processing, or video rendering unless the policy explicitly allows it.

### 24.3 Audit events

```ts
export interface AuditEvent {
  id: ObjectId;
  workspaceId: WorkspaceId;
  actorId: UserId;
  action: string;
  objectId?: ObjectId;
  occurredAt: ISODateTime;
  outcome: 'success'|'denied'|'failed';
  reasonCode?: string;
  metadata?: Record<string, string|number|boolean>;
}
```

Audit at minimum: restricted view, classification change, access grant/revoke, export, publication, AI approval, embargo change, redaction, destructive retention action, and render of non-public material.

### 24.4 Reviewer anonymity

Anonymous review MUST prevent identity leakage through names, avatars, URLs, notifications, exports, comments, document metadata, change history visible to authors, and rendered media. Privileged audit access MUST be restricted and logged.

## 25. Retraction and Correction Propagation

```ts
export interface IntegrityEvent {
  id: ObjectId;
  sourceId: ObjectId;
  sourceVersionId?: ObjectId;
  type: 'correction'|'expression-of-concern'|'retraction'|'withdrawal'|'replacement';
  issuedBy: string;
  issuedAt: ISODateTime;
  effectiveAt: ISODateTime;
  noticeUrl?: string;
  affectedLocators?: SourceLocator[];
  rationale?: string;
}

export type IntegrityImpact =
  | 'unaffected'
  | 'review-required'
  | 'potentially-affected'
  | 'materially-affected'
  | 'withdrawn';
```

### Required workflow

1. Ingest and authenticate the integrity event.
2. Create a new source version; never overwrite the historical version.
3. Find evidence linked to the source version or affected locators.
4. Calculate dependent claims, drafts, reviews, and publications.
5. Mark affected objects `review-required` or stronger.
6. Notify owners, editors, and responsible reviewers.
7. Block automated publication when material impact is unresolved.
8. Record reviewer disposition and rationale.
9. Recompute assessments while preserving prior states.
10. Close the event only after all required reviews finish or are explicitly waived by an authorized editor.

Propagation MUST be idempotent. Retries MUST NOT duplicate notifications, relationships, or audit records.

## 26. AI Validation and Human Approval

```ts
export interface AIProvenance {
  provider: string;
  model: string;
  modelVersion?: string;
  operation: 'search'|'extract'|'summarize'|'compare'|'draft'|'translate'|'classify';
  promptTemplateVersion?: string;
  retrievedAt?: ISODateTime;
  sourceIds: ObjectId[];
  toolCalls?: string[];
  generatedAt: ISODateTime;
}

export interface AIValidation {
  sourceResolution: 'resolved'|'partially-resolved'|'unresolved';
  citationEntailment: 'supports'|'partially-supports'|'does-not-support'|'not-assessed';
  quotationMatch: 'exact'|'normalized-match'|'mismatch'|'not-applicable';
  sourceIntegrity: SourceIntegrity|'not-assessed';
  humanReview: 'not-reviewed'|'changes-requested'|'approved'|'rejected';
  externalProcessing: 'local-only'|'approved-provider'|'restricted'|'prohibited';
  reviewedBy?: UserId;
  reviewedAt?: ISODateTime;
  notes?: string;
}
```

### Publication blockers

Publication MUST be blocked if any mandatory citation is unresolved, a quotation mismatches, the source does not support the claim, retraction impact is unresolved, the human reviewer is missing, external processing violates classification, or synthetic data/media lacks explicit disclosure.

### Prompt-injection defense

Retrieved source content is untrusted data. Systems MUST separate source text from control instructions, ignore commands embedded in sources, restrict tools by allowlist, prevent arbitrary URLs and code execution, and record excluded sources and reasons. A source suspected of prompt injection MUST remain available for human inspection but MUST NOT control tools or system behavior.

## 27. Complete Component Contract Template

Every stable component MUST document:

```text
Purpose
Anatomy
Variants and sizes
States
Props, events, and slots
Keyboard interaction
Focus behavior
Screen-reader behavior
Touch behavior
Responsive adaptation
Localization and bidirectionality
Permissions and classification behavior
Offline and synchronization behavior
Print/export behavior
Content limits and overflow
Token mapping
Analytics events without sensitive content
Examples and anti-patterns
Unit, interaction, accessibility, visual, and integrity tests
Migration notes
```

### 27.1 Universal state matrix

Data-bearing components MUST define behavior for:

```text
loading · ready · empty · stale · unresolved · partial
permission-denied · restricted · embargoed · offline
sync-pending · conflict · error · archived · corrected · retracted
```

### 27.2 Evidence Card contract

```ts
export interface EvidenceCardProps {
  evidence: Evidence;
  source: Source;
  sourceVersion: SourceVersion;
  variant?: 'default'|'compact'|'comparison'|'read-only'|'archived';
  density?: 'compact'|'comfortable'|'spacious';
  permissions: PermissionDecision[];
  selected?: boolean;
  onInspect?: (id:ObjectId) => void;
  onAddSupport?: (id:ObjectId) => void;
  onAddContradiction?: (id:ObjectId) => void;
  onRequestReview?: (id:ObjectId) => void;
  onCopyWithCitation?: (id:ObjectId) => void;
}
```

Anatomy: type/status line, evidence statement, source locator, multidimensional assessment summary, limitation, provenance/AI disclosure, relationship counts, actions, expandable details. Retraction and embargo messages MUST precede ordinary metadata. The card MUST use an `article` with an accessible label derived from its evidence type and source, not from status alone.

### 27.3 Source Card contract

The card MUST display source type, title, contributors, date, identifier, version, language, access state, integrity state, and correction/retraction notice when applicable. Original, translated, and transliterated titles MUST be labeled distinctly.

### 27.4 Claim Card contract

The card MUST show claim type, lifecycle, author/version, evidence and contradiction counts, assessment dimensions, unresolved integrity impacts, and responsible reviewer. Actions MUST be capability-checked.

### 27.5 Provenance Graph contract

The graph MUST provide an equivalent navigable list or table. Keyboard users MUST be able to move node-by-node, inspect relationships, and return focus. Canvas-only text is insufficient. Below 768 CSS px, default to the structured list unless the user chooses graph mode.

### 27.6 Dialog and sheet contract

Focus MUST move into the dialog, remain contained, return to the logical trigger, and remain recoverable when the trigger disappears. Escape closes non-destructive dialogs. Destructive confirmation MUST name the affected object and consequence.

## 28. Search and Discovery

Search MUST distinguish lexical, exact-identifier, semantic, and AI-expanded modes. Results MUST disclose source type, match reason, date, access, integrity, workspace annotations, and whether AI expansion or personalization affected ranking.

Required patterns:

- Facets for source type, year, language, access, integrity, author/institution, and workspace state.
- Duplicate and source-version grouping.
- Retraction-aware display and filtering.
- Saved searches and alerts with change history.
- No-result recovery with spelling, identifier normalization, and filter reset.
- Search provenance showing original query and automatic expansions.

AI-expanded terms MUST be editable and removable before rerunning the search.

## 29. Editor and Annotation

The editor MUST support selections, highlights, annotations, inline citations, footnotes/endnotes, suggestions, track changes, anchored comments, collaborative cursors, autosave, offline queue, and conflict resolution.

Annotation anchors SHOULD combine:

```ts
interface AnnotationAnchor {
  sourceVersionId: ObjectId;
  structuralPath?: string;
  textQuote: {exact:string; prefix?:string; suffix?:string};
  position?: {start:number; end:number};
  checksum?: string;
}
```

Anchors MUST be revalidated after source updates. Broken anchors MUST be marked unresolved, not silently relocated. Copy-with-citation MUST include source and locator while respecting classification and export permissions.

## 30. Internationalization, Bangla, and RTL

Core languages for v3.1 are English and Bangla. RTL architecture MUST be verified with Arabic test content.

```yaml
font:
  latin:
    editorial: 'Newsreader, Georgia, serif'
    interface: 'Inter, system-ui, sans-serif'
    metadata: 'JetBrains Mono, ui-monospace, monospace'
  bengali:
    editorial: 'Noto Serif Bengali, serif'
    interface: 'Noto Sans Bengali, sans-serif'
    metadata: 'Noto Sans Bengali, sans-serif'
  arabic:
    editorial: 'Noto Naskh Arabic, serif'
    interface: 'Noto Sans Arabic, sans-serif'
```

Requirements:

- Store language as BCP 47.
- Preserve original-language titles and label translation/transliteration.
- Use `Intl` APIs for dates, numbers, percentages, lists, and pluralization.
- Use CSS logical properties rather than hard-coded left/right.
- Keep DOI, ORCID, URLs, and code in an isolated LTR span inside RTL content.
- Test at 35% pseudo-localization expansion.
- Verify Bangla glyph coverage, line height, truncation, captions, and PDF/export rendering.
- Do not infer content language solely from interface locale.

## 31. Theme and Forced-Color Strategy

Theme selection order:

1. Explicit user preference.
2. Workspace-enforced preference, if policy requires it.
3. `prefers-color-scheme`.
4. Light default.

The server SHOULD render the resolved theme attribute to avoid hydration flash. Preferences MUST persist per user and MAY have a per-device override.

```css
@media (forced-colors: active) {
  .reme-status,
  .reme-knowledge-node,
  .reme-graph-edge {
    forced-color-adjust: auto;
    border: 1px solid CanvasText;
  }
  :focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}
```

Components MUST NOT rely on transition-end events for business logic because reduced-motion modes may eliminate transitions.

## 32. Data Visualization

- Sequential scales represent magnitude.
- Diverging scales require a meaningful midpoint.
- Qualitative palettes MUST remain distinguishable under common color-vision deficiencies.
- Confidence intervals and error bars remain visible in screen, print, and export.
- Missing data MUST be labeled and MUST NOT be plotted as zero.
- Axis truncation, logarithmic scale, smoothing, imputation, and normalization MUST be disclosed.
- Charts MUST provide a data table or accessible textual equivalent.
- Sample size, units, and statistical method MUST be visible or one interaction away.
- Semantic evidence colors MUST NOT be reused casually for ordinary good/bad numeric changes.

## 33. Print, PDF, and Export

Exports MUST preserve title, authorship, versions, identifiers, citations, provenance, classification, integrity notices, and generated-at time. Restricted exports MUST show classification and create an audit event.

```css
@media print {
  nav, [data-ui-only] { display: none !important; }
  article { max-width: none; color: #000; background: #fff; }
  figure, table, blockquote { break-inside: avoid; }
  a[href^="http"]::after { content: " (" attr(href) ")"; }
}
```

Tagged PDF output SHOULD include semantic headings, alt text, bookmarks, table headers, reading order, document language, and embedded fonts. Export manifests MUST list included objects, versions, checksums, and omitted restricted content.

## 34. Resilience, Offline, and Conflict Recovery

```ts
export type SyncState =
  | 'saved' | 'saving' | 'offline-saved'
  | 'sync-pending' | 'conflict' | 'failed';
```

Every failure message MUST state what happened, what data is safe, what the system is doing, what the user can do, whether retry is automatic, and where details are available.

Requirements:

- Local work MUST survive temporary network failure.
- Retryable writes MUST use idempotency keys.
- Failed imports/renders MUST NOT appear complete.
- Conflicts in claims, evidence, reviews, or decisions MUST preserve both versions.
- Conflict resolution MUST record author, timestamp, selected values, and rationale.
- Permission loss MUST stop unauthorized writes while preserving recoverable local work.
- Citation resolver and search-index outages MUST show stale/partial status separately from absence of evidence.

## 35. Executable Token Pipeline

```text
packages/tokens/
├── src/primitive.json
├── src/semantic-light.json
├── src/semantic-dark.json
├── src/component.json
├── src/motion.json
├── src/video.json
├── schema/tokens.schema.json
├── scripts/build.mjs
├── scripts/validate.mjs
├── scripts/check-contrast.mjs
└── dist/
    ├── tokens.css
    ├── tokens.scss
    ├── tokens.ts
    ├── tokens.json
    ├── tailwind-preset.cjs
    ├── remotion.ts
    └── hyperframes.css
```

### Component aliases

```json
{
  "component": {
    "button": {
      "primary": {
        "background": "{color.action.primary}",
        "backgroundHover": "{color.action.primary-hover}",
        "foreground": "{color.action.on-primary}",
        "radius": "{radius.md}",
        "focusRing": "{focus.light}"
      }
    },
    "evidenceCard": {
      "background": "{color.semantic.light.surface}",
      "border": "{color.semantic.light.border-subtle}",
      "accent": "{color.knowledge.evidence}",
      "title": "{color.semantic.light.text-primary}",
      "metadata": "{color.semantic.light.text-secondary}"
    },
    "claimCard": {
      "support": "{color.knowledge.evidence}",
      "contradiction": "{color.knowledge.contradiction}",
      "unresolved": "{color.trust.unknown}"
    }
  }
}
```

CI MUST fail for broken references, cycles, missing dark-theme resolution, unauthorized primitive use, contrast failures, or removal of a published semantic token without migration notes.

## 36. Token-Compliant Remotion Example

```tsx
import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {tokens} from '@researchwithme/tokens/remotion';
import {z} from 'zod';

const Input = z.object({
  title: z.string().min(1),
  finding: z.string().min(1),
  limitation: z.string().min(1),
  doi: z.string().min(1),
  sourceLocation: z.string().min(1),
  reviewedBy: z.string().min(1),
  motionMode: z.enum(['full','reduced','static'])
});
export type EvidenceVideoProps = z.infer<typeof Input>;

export const EvidenceVideo: React.FC<EvidenceVideoProps> = raw => {
  const props = Input.parse(raw);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = props.motionMode === 'static' ? 1 : interpolate(frame,[0,fps],[0,1],{
    extrapolateLeft:'clamp', extrapolateRight:'clamp', easing:Easing.out(Easing.cubic)
  });
  const y = props.motionMode === 'full' ? interpolate(frame,[0,fps],[tokens.motion.distance.md,0],{
    extrapolateLeft:'clamp', extrapolateRight:'clamp'
  }) : 0;
  return <AbsoluteFill style={{background:tokens.color.canvas, color:tokens.color.textPrimary, padding:tokens.video.safeArea.landscape}}>
    <header style={{opacity, transform:`translateY(${y}px)`}}>
      <p style={tokens.video.type.eyebrow}>EVIDENCE SYNTHESIS</p>
      <h1 style={tokens.video.type.title}>{props.title}</h1>
    </header>
    <Sequence from={90} durationInFrames={390}><EvidencePath {...props}/></Sequence>
    <Sequence from={480} durationInFrames={240}><LimitationPanel text={props.limitation}/></Sequence>
    <Sequence from={720} durationInFrames={180}><CitationEndCard {...props}/></Sequence>
  </AbsoluteFill>;
};

export const Root = () => <Composition
  id="EvidenceSynthesis"
  component={EvidenceVideo}
  schema={Input}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={900}
  defaultProps={{title:'Evidence synthesis', finding:'Finding', limitation:'Limitation', doi:'10.0000/example', sourceLocation:'p. 8', reviewedBy:'reviewer-id', motionMode:'reduced'}}
/>;
```

Implementations MUST supply typed `EvidencePath`, `LimitationPanel`, and `CitationEndCard` components from the package. `durationSeconds` MUST be derived from frames/fps or validated for equality. Fonts and media MUST be preloaded. Render tests MUST inspect representative frames and final citation visibility.

## 37. Token-Compliant Hyperframes Example

```html
<main id="main" data-composition-id="evidence-synthesis-001"
  data-start="0" data-duration="30" data-width="1920" data-height="1080">
  <section data-hf-id="title" data-start="0" data-duration="3">
    <p class="reme-eyebrow">Evidence synthesis</p>
    <h1 data-field="title"></h1>
  </section>
  <section data-hf-id="provenance" data-start="3" data-duration="13">
    <article class="reme-node reme-node--source" data-hf-id="source"></article>
    <div class="reme-edge" data-hf-id="source-evidence" aria-label="Source supports evidence"></div>
    <article class="reme-node reme-node--evidence" data-hf-id="evidence"></article>
    <div class="reme-edge" data-hf-id="evidence-claim" aria-label="Evidence supports claim"></div>
    <article class="reme-node reme-node--claim" data-hf-id="claim"></article>
  </section>
  <aside data-hf-id="limitation" data-start="16" data-duration="8"></aside>
  <section data-hf-id="citation" data-start="24" data-duration="6"></section>
</main>
```

```js
import {gsap} from 'gsap';
import {registerSeekableTimeline} from './hyperframes-adapter.js';
import './hyperframes.css';

const mode = new URLSearchParams(location.search).get('motionMode') || 'reduced';
const q = id => document.querySelector(`[data-hf-id="${CSS.escape(id)}"]`);
const distance = mode === 'full' ? 24 : 0;
const timeline = gsap.timeline({paused:true, defaults:{ease:'power2.out'}})
  .fromTo(q('title'), {opacity:0,y:distance}, {opacity:1,y:0,duration:.7}, 0)
  .fromTo(q('source'), {opacity:0}, {opacity:1,duration:.5}, 3)
  .to(q('source-evidence'), {scaleX:1,duration:.48}, 5)
  .fromTo(q('evidence'), {opacity:0}, {opacity:1,duration:.5}, 6)
  .to(q('evidence-claim'), {scaleX:1,duration:.48}, 8)
  .fromTo(q('claim'), {opacity:0}, {opacity:1,duration:.5}, 9)
  .fromTo(q('limitation'), {opacity:0,y:distance}, {opacity:1,y:0,duration:.7}, 16)
  .fromTo(q('citation'), {opacity:0}, {opacity:1,duration:.4}, 24);
registerSeekableTimeline(timeline);
```

Inputs MUST be schema-validated and inserted with `textContent`, not untrusted `innerHTML`. The Hyperframes adapter and GSAP versions MUST be pinned. Rendering MUST use deterministic seeds and isolated infrastructure.

## 38. Captions, Transcript, and Render Provenance

```ts
export interface CaptionCue { startMs:number; endMs:number; text:string; }

export interface RenderProvenance {
  artifactId: string;
  compositionId: string;
  compositionVersion: string;
  remeVersion: '3.1.0';
  renderEngine: 'remotion'|'hyperframes';
  rendererVersion: string;
  renderedAt: ISODateTime;
  inputChecksum: string;
  assetChecksum: string;
  outputChecksum: string;
  motionMode: 'full'|'reduced'|'static';
  locale: string;
  citations: Array<{sourceId:ObjectId; identifier?:string; sourceLocation:string}>;
  review: {status:'approved'|'rejected'; reviewer:UserId; reviewedAt:ISODateTime};
  accessibility: {captions:boolean; transcript:boolean; reducedMotionVariant:boolean; audioDescription:boolean};
}
```

Captions MUST match narration. Citation end cards MUST remain visible for at least five seconds. Full, reduced, and static variants MUST preserve equal information.

## 39. Package Architecture and Support Policy

```text
packages/
├── schemas/         @researchwithme/schemas
├── tokens/          @researchwithme/tokens
├── icons/           @researchwithme/icons
├── react/           @researchwithme/react
├── graph/           @researchwithme/graph
├── editor/          @researchwithme/editor
├── remotion/        @researchwithme/remotion
├── hyperframes/     @researchwithme/hyperframes
├── testing/         @researchwithme/testing
└── docs/            Storybook and specifications
```

Packages SHOULD ship ESM and TypeScript declarations. React packages MUST declare React as a peer dependency. Stable components receive at least one major-version migration window and six months of deprecation support. Critical security and accessibility fixes MAY change appearance in a patch release when necessary.

Browser support MUST be derived from product analytics and documented in `browserslist`. Until analytics are sufficient, support the latest two stable versions of Chrome, Edge, Firefox, and Safari, plus current iOS Safari and Android Chrome.

## 40. Route Performance Budgets

```yaml
budget:
  application-shell:
    initial-js-gzip: 200KB
    lcp-p75: 2.5s
    inp-p75: 200ms
    cls-p75: 0.1
  reading:
    route-js-gzip: 120KB
  editor:
    route-js-gzip: 350KB
    interaction-ready-p75: 3.0s
  graph:
    route-js-gzip: 300KB
    first-usable-graph-p75: 3.0s
  video-preview:
    load: lazy
    preload: metadata-only
```

Test with at least 10,000 citations, 5,000 graph nodes, 200 table rows before virtualization, and 100 concurrent annotations. Large datasets MUST degrade to summaries, pagination, clustering, or virtualized views without hiding export access.

## 41. Test Matrix

Required CI and release tests:

- Schema and migration validation.
- Token reference, cycle, theme, contrast, and snapshot checks.
- Unit and interaction tests.
- axe-core automated accessibility checks.
- Keyboard-only critical-flow tests.
- Visual regression: light, dark, forced colors, 200% zoom, reduced motion.
- Responsive widths: 320, 768, 1024, 1440, 1920 CSS px.
- Screen-reader smoke tests: NVDA + Firefox/Chrome; VoiceOver + Safari; TalkBack + Chrome.
- English, Bangla, mixed-script, pseudo-localized, and RTL fixtures.
- Permission matrix and reviewer-anonymity tests.
- Retraction propagation and idempotency tests.
- AI citation mismatch, fabricated identifier, prompt injection, and prohibited-provider tests.
- Offline, expired session, permission loss, sync conflict, resolver outage, and failed-render fault injection.
- Remotion/Hyperframes representative-frame and citation-duration tests.

## 42. Governance and Decision Rights

```yaml
approval:
  design: Design Systems Lead
  accessibility: Accessibility Owner
  frontend-api: Frontend Platform Lead
  research-integrity: Research Integrity Owner
  privacy-security: Security and Privacy Owner
  localization: Localization Owner
  breaking-change: Design System Council
```

Component maturity:

- `experimental`: no compatibility guarantee.
- `beta`: documented limitations and at least 30 days' notice for breaking changes.
- `stable`: all required reviews and tests complete.
- `deprecated`: supported for at least six months or one major release.
- `archived`: retained for compatibility and historical documentation.

Every change MUST include affected tokens/components, accessibility impact, localization impact, research-integrity impact, migration guidance, and visual baselines.

## 43. Delivery Sequence for v3.1

### Milestone 1: Foundation

1. Publish schemas for Source, SourceVersion, Evidence, Claim, Relationship.
2. Split trust into independent assessment dimensions.
3. Build token source, schema, transforms, and CI.
4. Publish permission and classification matrix.

### Milestone 2: Integrity

5. Implement integrity-event ingestion and dependency impact reports.
6. Implement AI source resolution, entailment, quotation check, and approval.
7. Add audit events and embargo enforcement.

### Milestone 3: Components

8. Publish component contracts and Storybook examples.
9. Implement Evidence Card as the reference component.
10. Implement Source Card, Claim Card, Citation, Review Thread, Workspace, Graph.

### Milestone 4: Globalization and motion

11. Add English, Bangla, pseudo-localization, RTL fixtures, and fonts.
12. Refactor Remotion and Hyperframes to generated tokens and schemas.
13. Add captions, transcripts, static/reduced outputs, and render provenance.

### Milestone 5: Resilience and audit

14. Implement offline queue, idempotent retries, conflict UI, and fault messages.
15. Run accessibility, security, privacy, localization, and research-integrity audits.
16. Publish migration guide, package versions, and release evidence.

## 44. Stable Release Gate

reme v3.1 MUST NOT be marked stable until:

### Domain and integrity

- [ ] All canonical objects and relationships have versioned schemas.
- [ ] Evidence resolves to a source version and structured locator.
- [ ] Trust dimensions are independent and attributable.
- [ ] Retraction/correction propagation passes end-to-end tests.
- [ ] AI citations are resolved and checked against associated claims.
- [ ] Human approval is required for publishable AI-assisted output.

### Privacy and permissions

- [ ] Server authorization matches UI capability behavior.
- [ ] Restricted and embargoed content cannot publish, export, or render accidentally.
- [ ] Reviewer anonymity survives UI, notifications, exports, and metadata.
- [ ] Sensitive actions produce immutable audit events.

### Design system

- [ ] Stable components have anatomy, API, state matrix, keyboard, responsive, and test contracts.
- [ ] Component tokens exist for the stable set.
- [ ] No stable implementation references primitive values directly.
- [ ] Storybook documentation and examples are complete.

### Accessibility and localization

- [ ] WCAG 2.2 AA audit passes.
- [ ] Keyboard and screen-reader critical flows pass.
- [ ] English and Bangla core flows pass.
- [ ] RTL and mixed-script smoke tests pass.
- [ ] Forced colors, 200% zoom, reflow, and reduced motion pass.

### Resilience and motion

- [ ] Offline work is recoverable and conflicts preserve both versions.
- [ ] Retries are idempotent and failures never appear complete.
- [ ] Remotion and Hyperframes use generated tokens.
- [ ] Captions, transcripts, citations, limitations, reviewer, and checksums are retained.
- [ ] Full, reduced, and static outputs preserve equal information.
- [ ] Security and performance budgets pass.

## 45. Final Product Principle

> A reme interface is complete only when a researcher can understand what is shown, trace where it came from, judge how much to trust it, challenge or extend it, recover from failure, and preserve the resulting scholarly record.
## 46. Final Implementation Checklist

Use this checklist as the final engineering, design, research-integrity, accessibility, security, localization, and release sign-off for reme v3.1. Each item requires verifiable evidence such as a pull request, test report, Storybook story, audit record, Architecture Decision Record, or release artifact. An unchecked release-blocking item prevents promotion to `stable`.

### 46.1 Program governance and ownership

- [ ] A named owner is assigned for design systems, frontend platform, accessibility, research integrity, privacy/security, localization, and motion/video.
- [ ] The Design System Council has approved the v3.1 scope and decision rights.
- [ ] All normative requirements have a traceable implementation issue or documented exception.
- [ ] Architecture Decision Records exist for schemas, token generation, permissions, offline storage, AI validation, graph rendering, Remotion, and Hyperframes.
- [ ] Component maturity labels are published and match implementation status.
- [ ] Deprecation and migration timelines comply with the six-month or one-major-release support policy.
- [ ] Release notes identify breaking changes, accessibility impact, localization impact, research-integrity impact, and required migrations.
- [ ] The final conformance manifest lists the implemented reme profiles and a calculated token checksum.

**Required evidence:** governance approval, ADR index, conformance manifest, release notes, migration guide.

### 46.2 Repository and package readiness

- [ ] The monorepo contains `schemas`, `tokens`, `icons`, `react`, `graph`, `editor`, `remotion`, `hyperframes`, `testing`, and `docs` packages as applicable.
- [ ] Package names, entry points, export maps, TypeScript declarations, and peer dependencies are documented.
- [ ] ESM builds succeed without unresolved imports or accidental Node-only dependencies in browser packages.
- [ ] React is declared as a peer dependency for React-facing packages.
- [ ] Package provenance, license, repository, and security-contact metadata are present.
- [ ] Dependency versions are pinned or constrained according to the support policy.
- [ ] Lockfiles are committed and reproducible builds are verified in clean CI environments.
- [ ] Software Bill of Materials generation is enabled for production releases.
- [ ] Secret scanning, dependency scanning, and license policy checks pass.
- [ ] Published packages contain only required source, distribution, license, and documentation files.

**Required evidence:** clean CI build, package manifests, SBOM, dependency report, package-content audit.

### 46.3 Canonical scholarly schemas

- [ ] `Source`, `SourceVersion`, `Evidence`, `Claim`, and `KnowledgeRelationship` schemas are versioned and exported as TypeScript and JSON Schema.
- [ ] Research projects, questions, annotations, datasets, software, protocols, reviews, rebuttals, decisions, publications, and contributions have compatible schemas or documented extension points.
- [ ] Runtime validation rejects malformed identifiers, invalid timestamps, unknown lifecycle states, and inaccessible workspace references.
- [ ] Evidence requires a source version and at least one structured locator.
- [ ] DOI, ORCID, PMID, PMCID, ISBN, ISSN, arXiv, ROR, RRID, accession, Handle, and URL identifiers normalize correctly.
- [ ] Source versions preserve checksums, retrieval dates, integrity states, and replacement relationships.
- [ ] Relationships retain assertion method, actor, timestamp, supporting evidence, status, and rationale.
- [ ] Deleted referenced objects remain representable through tombstones without exposing restricted content.
- [ ] Schema migrations are reversible or have a tested recovery strategy.
- [ ] Fixtures cover English, Bangla, mixed-script, RTL, corrected, retracted, restricted, embargoed, and AI-assisted records.

**Required evidence:** schema package, validation report, migration tests, fixture catalog.

### 46.4 Trust and assessment model

- [ ] Review status, replication status, certainty, consensus, and source integrity are stored as independent dimensions.
- [ ] `Not assessed` is distinct from a negative result in data, UI, exports, and accessibility text.
- [ ] Every assessment records assessor, method, rationale where applicable, and timestamp.
- [ ] Aggregate trust scores are absent or expose their calculation, dimensions, weights, date, and responsible assessor.
- [ ] Compact assessment summaries remain understandable without color.
- [ ] Corrected, expression-of-concern, retracted, and withdrawn sources receive distinct treatments.
- [ ] Assessment updates preserve history and trigger dependent-object recomputation where required.
- [ ] Claims cannot retain a validated appearance when supporting evidence requires reassessment.

**Required evidence:** assessment schema, UI stories, accessibility snapshots, recomputation tests.

### 46.5 Permissions, privacy, embargo, and audit

- [ ] Server-side capability checks enforce view, annotate, create evidence, edit, export, invite, review, approve, publish, permission, and retention actions.
- [ ] UI action visibility and disabled states accurately reflect server authorization.
- [ ] Public, workspace, confidential, restricted, and embargoed classifications are implemented.
- [ ] Embargo start, release date or condition, approving actor, allowed roles, export policy, and external-processing policy are enforced.
- [ ] Restricted and embargoed objects cannot enter public search, sharing, publication, external AI, or rendering workflows without explicit authorization.
- [ ] Request-access and permission-denied experiences explain available recovery actions without leaking protected metadata.
- [ ] Anonymous reviewer identity is protected across UI, URLs, notifications, exports, document metadata, history, analytics, and rendered media.
- [ ] Restricted views, classification changes, access changes, exports, publication, AI approval, embargo changes, redactions, retention actions, and non-public renders create audit events.
- [ ] Audit logs are access-controlled, tamper-evident, timestamped, searchable, and retained according to policy.
- [ ] Access revocation takes effect during active sessions and prevents subsequent unauthorized writes.
- [ ] Data retention, deletion, legal hold, and backup restoration procedures are documented.
- [ ] Sensitive analytics events exclude source text, unpublished claims, participant data, credentials, and reviewer identity.

**Required evidence:** permission matrix, API tests, privacy review, anonymity tests, sample audit trail, retention policy.

### 46.6 Retraction and correction propagation

- [ ] Integrity events support correction, expression of concern, retraction, withdrawal, and replacement.
- [ ] Ingested events record issuer, issue date, effective date, notice URL, affected locators, and rationale.
- [ ] Source integrity updates create new versions rather than overwrite history.
- [ ] Dependency analysis finds affected evidence, claims, drafts, reviews, and publications.
- [ ] Affected objects receive `review-required`, `potentially-affected`, `materially-affected`, or `withdrawn` states as appropriate.
- [ ] Owners, editors, and responsible reviewers receive deduplicated notifications.
- [ ] Publication is blocked while material impact remains unresolved.
- [ ] Reviewer dispositions and waiver decisions are attributable and auditable.
- [ ] Recomputed assessments preserve previous values and effective dates.
- [ ] Propagation is idempotent and safe to retry.
- [ ] End-to-end tests cover partial-locator corrections and whole-source retractions.

**Required evidence:** propagation workflow, dependency-impact report, notification tests, idempotency test, audit log.

### 46.7 AI validation and approval

- [ ] AI output records provider, model, version, operation, prompt-template version, sources, tool calls, and generation time.
- [ ] Identifier extraction and source resolution run for every mandatory citation.
- [ ] Claim-to-source entailment is assessed and displayed.
- [ ] Direct quotations are checked against source text and location.
- [ ] Source-integrity status is checked before approval.
- [ ] Unresolved, partially supporting, unsupported, mismatched, or retracted citations block publication when material.
- [ ] A responsible human reviewer is required for publishable AI-assisted output.
- [ ] Human approval, requested changes, rejection, and reversal are attributable and timestamped.
- [ ] AI-assisted, quoted, extracted, calculated, inferred, generated, translated, and synthetic content are distinguishable.
- [ ] Prompt injection inside sources cannot alter system instructions, tool permissions, destinations, or execution policy.
- [ ] Tool calls use allowlists, bounded inputs, network restrictions, and audit logs.
- [ ] Restricted data is not sent to unapproved external providers.
- [ ] Synthetic data and generated media are explicitly disclosed in the interface and export metadata.
- [ ] Model or provider changes trigger regression testing for citation resolution, entailment, extraction, and translation.

**Required evidence:** AI provenance record, validation pipeline report, red-team results, approval workflow test, provider policy.

### 46.8 Token pipeline and theming

- [ ] Primitive, semantic, component, motion, and video token sources validate against the token schema.
- [ ] Builds generate CSS, SCSS, TypeScript, JSON, Tailwind, Remotion, and Hyperframes outputs.
- [ ] Broken references, dependency cycles, missing dark aliases, and unauthorized primitive use fail CI.
- [ ] Published semantic-token removal requires migration documentation and an approved breaking change.
- [ ] Text-background combinations pass WCAG 2.2 AA contrast requirements.
- [ ] Stable components consume component or semantic aliases rather than raw visual values.
- [ ] Remotion and Hyperframes consume generated renderer-specific token outputs.
- [ ] Light, dark, system, workspace-enforced, and explicit user theme resolution is deterministic.
- [ ] Server-rendered theme metadata prevents avoidable hydration flash.
- [ ] Forced-colors mode preserves boundaries, focus, states, and relationship labels.
- [ ] Token snapshots and calculated checksums are attached to the release.

**Required evidence:** token build output, CI logs, contrast report, theme screenshots, checksum manifest.

### 46.9 Core component implementation

- [ ] Every stable component documents purpose, anatomy, variants, sizes, states, API, events, slots, and token mapping.
- [ ] Every data-bearing component covers loading, ready, empty, stale, unresolved, partial, permission-denied, restricted, embargoed, offline, sync-pending, conflict, error, archived, corrected, and retracted states.
- [ ] Buttons, inputs, selects, comboboxes, dialogs, sheets, cards, citations, tables, alerts, skeletons, and empty states have Storybook stories.
- [ ] Source Card exposes identifiers, language, version, access, and integrity state.
- [ ] Evidence Card exposes locator, extraction type, multidimensional assessment, limitation, provenance, and AI disclosure.
- [ ] Claim Card exposes claim type, evidence relationships, contradiction relationships, assessment, and reviewer.
- [ ] Citation Component supports short, full, DOI, BibTeX, RIS, CSL-JSON, and stable internal-identifier views.
- [ ] Review Thread distinguishes comment, suggestion, review, rebuttal, and decision.
- [ ] Provenance Graph has equivalent list/table access and mobile fallback.
- [ ] Dialogs and sheets manage focus, Escape behavior, trigger recovery, and destructive confirmation correctly.
- [ ] Components forward refs and standard HTML attributes where appropriate.
- [ ] Controlled and uncontrolled modes are documented when both are supported.
- [ ] Stable DOM or data-attribute contracts needed by testing and integrations are documented.

**Required evidence:** Storybook build, API documentation, state matrix, interaction tests, visual baselines.

### 46.10 Navigation, search, and discovery

- [ ] Global navigation includes Workspace, Library, Graph, Reviews, Publications, and Search as product scope requires.
- [ ] Breadcrumbs represent scholarly location rather than browser history.
- [ ] Command palette actions are permission-aware and keyboard accessible.
- [ ] Deep links open the exact object, version, and source location.
- [ ] Search distinguishes lexical, exact identifier, semantic, and AI-expanded modes.
- [ ] Results disclose match reason, source type, date, access, integrity, annotations, and ranking expansion.
- [ ] Facets cover source type, year, language, access, integrity, contributor/institution, and workspace state.
- [ ] Duplicate sources and versions group without hiding individual records.
- [ ] Retractions and corrections remain prominent in results and filters.
- [ ] Saved searches and alerts retain query, filters, expansion, and change history.
- [ ] No-result states offer spelling correction, identifier normalization, filter reset, and alternate search mode.
- [ ] Users can inspect, edit, and remove AI-expanded search terms.

**Required evidence:** search specification, ranking disclosure examples, keyboard tests, no-result stories.

### 46.11 Editor, annotation, and collaboration

- [ ] The editor supports selection, highlights, annotations, inline citations, footnotes/endnotes, suggestions, track changes, and anchored comments.
- [ ] Annotation anchors combine source version, text quote, structural context, position, or checksum as available.
- [ ] Anchors revalidate after source updates and never relocate silently.
- [ ] Broken anchors show unresolved status and recovery options.
- [ ] Copy-with-citation includes source and locator while respecting export permission.
- [ ] Autosave exposes saved, saving, offline-saved, sync-pending, conflict, and failed states.
- [ ] Collaborative cursors and presence indicators do not expose anonymous reviewer identity.
- [ ] Comment, suggestion, review, rebuttal, and decision histories remain attributable and recoverable.
- [ ] Concurrent conflicts preserve both versions and support field-level comparison.
- [ ] Merge decisions record actor, time, selected content, and rationale.
- [ ] Undo and redo boundaries are predictable and do not cross permission or publication boundaries silently.

**Required evidence:** editor interaction tests, anchoring migration test, offline demo, conflict-resolution audit record.

### 46.12 Accessibility

- [ ] An independent WCAG 2.2 AA audit has no unresolved critical or serious defects.
- [ ] Core flows are operable by keyboard alone.
- [ ] Focus order follows visual and task order.
- [ ] Focus remains visible and returns logically after overlays and panel changes.
- [ ] Text reflows at 320 CSS px and remains usable at 200% zoom.
- [ ] Primary touch targets prefer 44 × 44 CSS px and never fall below the documented minimum without justified exceptions.
- [ ] Status, evidence relationship, trust, and integrity never depend on color alone.
- [ ] Forms expose labels, instructions, errors, and recovery information programmatically.
- [ ] Live regions are limited to necessary status updates and do not overwhelm screen-reader users.
- [ ] Graphs, charts, and canvases provide equivalent semantic alternatives.
- [ ] Forced-colors, high contrast, reduced motion, color inversion, and text-spacing overrides are tested.
- [ ] Drag-and-drop interactions provide keyboard alternatives.
- [ ] NVDA with Firefox/Chrome, VoiceOver with Safari, and TalkBack with Chrome pass critical-flow smoke tests.
- [ ] Captions, transcripts, and audio-description decisions are documented for rendered media.

**Required evidence:** audit report, screen-reader test log, keyboard recordings, forced-color screenshots, issue closure report.

### 46.13 Localization and bidirectionality

- [ ] English and Bangla interface translations are complete for core flows.
- [ ] Original-language, translated, and transliterated titles are stored and labeled separately.
- [ ] BCP 47 language tags exist on sources, evidence, claims, captions, and transcripts.
- [ ] Dates, numbers, percentages, lists, and plurals use locale-aware formatting.
- [ ] Bangla fonts load without missing glyphs and meet reading-size and line-height requirements.
- [ ] Mixed Bangla-English content preserves punctuation, identifiers, and reading order.
- [ ] RTL smoke tests pass for navigation, forms, cards, dialogs, tables, editor, and graph alternatives.
- [ ] DOI, ORCID, URLs, code, and identifiers remain directionally isolated inside RTL content.
- [ ] CSS uses logical properties for layout and spacing.
- [ ] Pseudo-localization with at least 35% expansion does not clip or hide essential controls.
- [ ] Remotion, Hyperframes, PDF, and print outputs render Bangla and RTL fixtures correctly.
- [ ] Translation fallback never silently replaces original scholarly text.

**Required evidence:** localization coverage report, Bangla/RTL screenshots, pseudo-localization test, font-subset manifest.

### 46.14 Responsive and cross-platform behavior

- [ ] Core layouts are verified at 320, 768, 1024, 1440, and 1920 CSS px.
- [ ] Three-panel workspace preserves selection, scroll, and unsaved state when panels collapse into tabs or sheets.
- [ ] Provenance Graph defaults to structured list mode below 768 CSS px unless the user selects graph mode.
- [ ] Comparison matrices switch to prioritized columns or record comparison instead of unreadable compression.
- [ ] Citation inspector uses an accessible full-screen presentation on narrow screens.
- [ ] Review threads retain source anchors when moved into mobile sheets.
- [ ] Touch, pointer, keyboard, and screen-reader behavior are all documented.
- [ ] Supported Chrome, Edge, Firefox, Safari, iOS Safari, and Android Chrome versions pass the browser matrix.

**Required evidence:** responsive visual suite, device test report, browser matrix.

### 46.15 Data visualization and tables

- [ ] Sequential, diverging, and qualitative palettes have documented uses and accessible alternatives.
- [ ] Confidence intervals, error bars, sample sizes, units, and statistical methods remain available.
- [ ] Missing data is labeled and never plotted or exported as zero.
- [ ] Axis truncation, log scales, smoothing, imputation, normalization, and transformations are disclosed.
- [ ] Charts have data-table or textual alternatives.
- [ ] Table headers remain programmatically associated with cells.
- [ ] Numeric columns use tabular numerals and appropriate alignment.
- [ ] Long tables support sticky headers without breaking zoom or screen-reader navigation.
- [ ] Quantitative animations do not exaggerate differences or change scales without disclosure.
- [ ] Print and export preserve legends, notes, units, uncertainty, and source attribution.

**Required evidence:** visualization guidance, accessible chart examples, table tests, export comparisons.

### 46.16 Motion and interface animation

- [ ] CSS or Web Animations API is used for ordinary interface transitions.
- [ ] Reveal, connect, verify, synthesize, and archive patterns stay within documented timing ranges.
- [ ] Motion always communicates hierarchy, relationship, or state.
- [ ] No continuous glow, decorative telemetry, cursor-follow, parallax, or particle effects appear in scholarly workflows.
- [ ] Motion never implies verification, completion, replication, or confidence without a real state change.
- [ ] Reduced-motion mode removes nonessential movement without removing information.
- [ ] Static mode remains available where programmatic animation is exported.
- [ ] Business logic does not depend on animation or transition completion events.

**Required evidence:** motion inventory, reduced-motion recordings, timing-token test.

### 46.17 Remotion implementation

- [ ] Remotion compositions import generated reme tokens rather than raw values.
- [ ] Inputs validate through Zod, JSON Schema, or an equivalent runtime validator.
- [ ] Duration derives from frames and fps or is checked for equality.
- [ ] `useCurrentFrame()` and `useVideoConfig()` are the time source.
- [ ] Animation uses bounded interpolation and restrained springs.
- [ ] Fonts, images, audio, and video are preloaded.
- [ ] Full, reduced, and static compositions preserve equal information.
- [ ] Citation cards remain visible for at least five seconds.
- [ ] Captions are synchronized and reviewed; transcripts are downloadable.
- [ ] Embedded players are keyboard operable, pausable, and do not autoplay with sound.
- [ ] Representative-frame visual tests cover opening, evidence, limitation, and citation scenes.
- [ ] Renders fail early when required provenance, reviewer, source, or citation data is missing.

**Required evidence:** Remotion package, schema tests, render samples, frame snapshots, caption/transcript files.

### 46.18 HeyGen Hyperframes implementation

- [ ] Hyperframes projects are self-contained and include only required HTML, CSS, JavaScript, fonts, assets, data, citations, and manifest files.
- [ ] Generated `hyperframes.css` tokens are used instead of raw reme values.
- [ ] GSAP and Hyperframes versions are pinned.
- [ ] A documented adapter registers seekable timelines.
- [ ] Timelines remain paused and renderer-controlled rather than using wall-clock playback.
- [ ] Procedural animation uses deterministic seeds.
- [ ] Stable `data-hf-id` values exist on editable and timed elements.
- [ ] User, source, and AI text is inserted with safe text APIs and not untrusted `innerHTML`.
- [ ] Local validation completes before cloud submission.
- [ ] Cloud bundles exclude `.git`, `node_modules`, caches, secrets, and unrelated build output.
- [ ] Render IDs, statuses, errors, output URLs, and checksums are retained in the associated artifact record.
- [ ] Local and cloud rendering produce acceptable visual parity.
- [ ] Missing assets, unavailable fonts, timeouts, and failed cloud renders have explicit recovery behavior.

**Required evidence:** Hyperframes package, manifest, adapter test, cloud-render log, local/cloud comparison.

### 46.19 Render security and scholarly integrity

- [ ] Untrusted compositions render in isolated infrastructure.
- [ ] Network access is denied by default or restricted to an allowlist.
- [ ] CPU, memory, wall time, output size, filesystem, and process limits are enforced.
- [ ] Uploaded archives are scanned and extracted with path-traversal protection.
- [ ] API keys and provider credentials never enter client compositions or uploaded bundles.
- [ ] Agent-generated code requires human review before production rendering.
- [ ] Video and animation never alter axes, hide missing data, overstate uncertainty, convert association to causation, or imply peer review.
- [ ] Generated imagery is not presented as observational evidence.
- [ ] Limitations, citations, and source identifiers remain visible and available in transcripts.
- [ ] Inputs, assets, output, renderer version, reme version, reviewer, and SHA-256 checksums are retained.
- [ ] Restricted or embargoed material is redacted or blocked according to policy.

**Required evidence:** sandbox configuration, penetration test, sample provenance record, integrity review.

### 46.20 Offline, error, and recovery behavior

- [ ] Temporary disconnection does not lose draft text, annotations, or evidence.
- [ ] Saved, saving, offline-saved, sync-pending, conflict, and failed states are distinguishable.
- [ ] Retryable writes use idempotency keys.
- [ ] Citation resolver, DOI service, search index, import, extraction, and render failures have specific messages and recovery actions.
- [ ] Error messages explain what happened, what remains safe, what the system is doing, what the user can do, whether retry is automatic, and where details are available.
- [ ] Permission changes during a session stop unauthorized writes while preserving recoverable local work.
- [ ] Conflicts preserve both versions and do not use last-write-wins for evidence, claims, reviews, or decisions.
- [ ] Failed imports and renders never appear complete.
- [ ] Retried operations do not duplicate evidence, relationships, notifications, publications, or renders.
- [ ] Fault-injection tests cover network loss, session expiry, resolver outage, search lag, corrupt attachment, permission loss, and renderer failure.

**Required evidence:** offline test, conflict fixtures, fault-injection report, recovery screenshots.

### 46.21 Print, PDF, citation, and archival export

- [ ] Print removes UI-only controls while preserving scholarly content and provenance.
- [ ] Figures, tables, quotations, and evidence cards avoid inappropriate page breaks.
- [ ] Printed links, DOI, ORCID, and stable identifiers remain usable.
- [ ] Tagged PDFs include language, headings, reading order, alt text, bookmarks, table headers, and embedded fonts where supported.
- [ ] Black-and-white output remains understandable without semantic color.
- [ ] Exports retain title, authorship, versions, citations, integrity notices, classification, and generation time.
- [ ] Export manifests list included objects, versions, checksums, and omitted restricted content.
- [ ] BibTeX, RIS, and CSL-JSON exports validate against representative reference-manager imports.
- [ ] Bangla and mixed-script exports preserve glyphs and reading order.
- [ ] Restricted exports show classification and create an audit event.

**Required evidence:** print preview, tagged-PDF audit, citation-import tests, export manifest.

### 46.22 Performance and scalability

- [ ] Application-shell initial JavaScript meets the 200 KB gzip target or has an approved exception.
- [ ] Reading route meets its 120 KB route target.
- [ ] Editor and graph routes are code-split and meet documented route budgets.
- [ ] Remotion Player and Hyperframes tooling load lazily.
- [ ] LCP is at or below 2.5 seconds at the 75th percentile.
- [ ] INP is at or below 200 ms at the 75th percentile.
- [ ] CLS is at or below 0.1 at the 75th percentile.
- [ ] Media dimensions are reserved, critical fonts are subsetted, and noncritical assets do not block rendering.
- [ ] Bibliographies and tables above the chosen threshold virtualize or paginate without breaking accessibility or export.
- [ ] Tests cover 10,000 citations, 5,000 graph nodes, and 100 concurrent annotations.
- [ ] Performance telemetry excludes sensitive content and reviewer identities.

**Required evidence:** bundle report, Core Web Vitals dashboard, large-dataset test, approved exceptions.

### 46.23 Testing and quality gates

- [ ] Unit, integration, end-to-end, interaction, accessibility, visual, localization, security, and research-integrity tests run in CI.
- [ ] Schema migration and rollback tests pass.
- [ ] Token-reference, contrast, cycle, theme, and snapshot tests pass.
- [ ] Permission, embargo, reviewer-anonymity, and audit tests pass.
- [ ] Retraction propagation and idempotency tests pass.
- [ ] AI citation mismatch, fabricated identifier, prompt injection, prohibited-provider, and missing-reviewer tests pass.
- [ ] Offline, conflict, resolver outage, expired session, permission loss, and failed-render tests pass.
- [ ] Remotion and Hyperframes golden-frame tests pass.
- [ ] English, Bangla, mixed-script, pseudo-localized, and RTL fixtures pass.
- [ ] No open critical security, privacy, accessibility, data-loss, or research-integrity defect remains.
- [ ] Flaky tests are quarantined only with an owner, issue, and removal deadline.

**Required evidence:** CI summary, defect report, test matrix, flaky-test register.

### 46.24 Documentation and adoption

- [ ] Storybook documents every stable component and state.
- [ ] Design guidance includes examples and anti-patterns.
- [ ] Figma libraries map to published semantic and component tokens.
- [ ] Developer documentation includes installation, theming, SSR, localization, accessibility, and migration examples.
- [ ] Research-integrity documentation explains assessments, retractions, AI validation, and publication blockers.
- [ ] Privacy documentation explains classifications, embargoes, exports, and external processing.
- [ ] Motion documentation explains CSS, Remotion, and Hyperframes selection.
- [ ] Contribution guidance defines proposal, review, testing, release, and deprecation processes.
- [ ] A starter application demonstrates search, reading, evidence, claims, review, graph, and export.
- [ ] Adoption owners and support channels are published.

**Required evidence:** documentation site, Figma library, starter repository, support policy.

### 46.25 Final release approval

The release manager MUST attach all required evidence and obtain the following approvals:

| Approval | Owner | Status | Evidence |
|---|---|---|---|
| Design quality | Design Systems Lead | [ ] | |
| Frontend API and package quality | Frontend Platform Lead | [ ] | |
| Accessibility | Accessibility Owner | [ ] | |
| Research integrity | Research Integrity Owner | [ ] | |
| Privacy and security | Security and Privacy Owner | [ ] | |
| Localization | Localization Owner | [ ] | |
| Motion and rendering | Motion/Video Owner | [ ] | |
| Product readiness | Product Owner | [ ] | |
| Final release | Design System Council | [ ] | |

### 46.26 Release decision

- [ ] All release-blocking checklist items are complete.
- [ ] All exceptions have a documented owner, risk, mitigation, and expiry date.
- [ ] The package, token, schema, documentation, and artifact versions are aligned.
- [ ] The release candidate has completed the agreed soak period without a critical regression.
- [ ] The rollback plan and previous stable artifacts are available.
- [ ] The final conformance manifest and checksums are published.
- [ ] `status` may now change from `stable-candidate` to `stable`.

> **Final acceptance rule:** reme v3.1 is ready only when researchers can trace knowledge to its source, understand uncertainty and integrity, work accessibly in their language and device context, recover from failure, challenge or extend scholarly objects, and preserve an auditable record of every consequential change.
