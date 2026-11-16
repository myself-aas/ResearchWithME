---
name: ResearchWithME Master Refactor and Development Plan
version: 3.4.0
status: finalized-implementation-plan
product: ResearchWithME
design_system: pieme-v3.1
updated: 2026-11-17
scope:
  - product-strategy
  - fullstack-architecture
  - dashboard
  - responsive-web
  - mobile-pwa
  - component-system
  - scholarly-editor
  - offline-sync
  - accessibility
  - localization
  - research-integrity
  - ai-governance
  - experimentation
  - delivery-roadmap
---

# ResearchWithME Master Refactor and Development Plan v3.4

> Master implementation blueprint for transforming ResearchWithME from a publication-oriented web application into a contribution-centered research network, personal research operating system, and responsive scholarly workspace.

## Document authority and precedence

This document merges and supersedes the following implementation-planning artifacts:

1. `ResearchWithME-fullstack-refactor-development-plan-v2.md`
2. `ResearchWithME-mobile-responsive-specification.md`
3. `ResearchWithME-responsive-component-specs.md`

Where duplicated guidance differs, the precedence order is:

1. Part III, Responsive Component Contracts, for component anatomy, responsive behavior, and component-level acceptance.
2. Part II, Mobile Responsive Architecture, for mobile breakpoints, safe areas, mobile performance, and release checks.
3. Part I, Full-Stack Refactor Plan, for product strategy, information architecture, backend architecture, data models, experimentation, delivery, and governance.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

## Master contents

- **Part I:** Product strategy and full-stack refactor plan
- **Part II:** Mobile responsive architecture and implementation checklist
- **Part III:** Responsive component contracts
- **Part IV:** Integrated delivery gates and evidence package

---

# Part I: Product Strategy and Full-Stack Refactor Plan

# ResearchWithME Full-Stack Refactor and Development Plan

**Document type:** Advanced technical product, UX, frontend, backend, experimentation, accessibility, research-integrity, and delivery plan  
**Product:** ResearchWithME  
**Design system:** πeme / ResearchWithME Design System  
**Target:** Transform the current publication-oriented application into a contribution-centered research network and scholarly workspace  
**Status:** Implementation blueprint  

---

## 1. Executive Summary

ResearchWithME currently has a strong publication architecture: public feeds, article pages, authors, citations, bookmarks, a research assistant, editorial dashboards, writing tools, moderation, pricing, and API routes. The current page tree shows a largely single-column content platform, with a strong two-column article layout and dashboard grids. The strategic refactor is not primarily cosmetic. It is a product-model shift:

```text
Current center of gravity
Author → Article → Reader

Target center of gravity
Contributor → Project → Source → Evidence → Claim → Review → Publication
```

The desired user psychology is ownership. Visitors should not feel they are merely consuming reviews prepared by someone else. They should feel that:

- Their research identity lives on ResearchWithME.
- Their reviews and perspectives are valued.
- Their contributions can be saved, referenced, challenged, and extended.
- Their profile records a durable scholarly footprint.
- The platform helps them move from an observation to a structured, evidence-linked contribution in minutes.

The primary product loop becomes:

```text
Discover → Save → Contribute → Receive scholarly recognition
→ Build identity → Follow topics and people → Return → Contribute again
```

The MVP North Star metric should be **Weekly Active Contributors**, supported by these funnel metrics:

```text
Visitor → Saved item → Account created → First contribution
→ Evidence attached → Contribution published → Second contribution
```

Recommended activation definition:

> A new user publishes a perspective, paper review, tool review, research note, question, or replication report within seven days of account creation.

---

## 2. Existing Application Baseline

### 2.1 Current public routes

The current application includes:

```text
/
/post/[slug]
/category/[slug]
/authors
/author/[id]
/assistant
/cite
/pricing
/bookmarks
/contact
/about
/editorial-board
/login
/privacy
/settings
/motion
/api-docs
/write
```

### 2.2 Current dashboard and studio routes

```text
/dashboard/reading
/dashboard/account
/dashboard/access
/dashboard
/dashboard/writing
/dashboard/manage
/dashboard/edit/[id]
/dashboard/desk
/dashboard/comments
/dashboard/applications
```

### 2.3 Current strengths

- Root-level motion providers and route transitions.
- Theme initialization and semantic canvas colors.
- Skip-to-content support.
- Article pages with citation formats, archival records, workflow disclosure, verification notes, inline citations, comments, and related reviews.
- Reader and editorial dashboards with KPI grids and structured panels.
- Separate writer, moderation, application, and editorial-desk workflows.
- An existing Plate-based body editor and write/preview workflow.
- API routes for CMS content, comments, assistant answers, billing, API keys, dashboards, and public articles/authors.

### 2.4 Current structural shortcomings

- Most public pages remain single-column and publication-first.
- Sources, evidence, claims, reviews, projects, and relationships are not first-class navigable objects.
- The assistant is primarily a page, rather than a persistent contextual capability.
- The write experience is a publishing form, not a scholarly research workspace.
- Profiles emphasize authorship and articles instead of the contributor’s complete research footprint.
- The current navigation emphasizes Home, Writers, Assistant, and Products rather than contribution, projects, sources, and research identity.
- The social loop is weak: read, bookmark, and leave.
- Trust signals are fragmented rather than represented by a multidimensional assessment model.

---

## 3. Product Strategy: From Publication Platform to Research Contribution Network

### 3.1 New core entity: Contribution

Replace the mental model of “post” with “research contribution.” A contribution may be:

```ts
export type ContributionType =
  | 'paper-review'
  | 'tool-review'
  | 'perspective'
  | 'research-note'
  | 'dataset-review'
  | 'replication-report'
  | 'research-question'
  | 'literature-summary'
  | 'method-review'
  | 'implementation-note';
```

This lowers contribution friction while retaining scholarly structure.

### 3.2 Contribution hierarchy

```text
Quick contribution
├── Perspective
├── Research note
├── Research question
└── Tool recommendation

Structured review
├── Paper review
├── Tool review
├── Dataset review
├── Method review
└── Replication report

Long-form scholarly output
├── Literature summary
├── Technical guide
├── Comparative review
└── Publication
```

### 3.3 Reputation without generic vanity metrics

Avoid making likes and followers the main status mechanism. Use scholarly interaction signals:

- Helpful reviews
- Referenced contributions
- Saved perspectives
- Evidence used by others
- Validated insights
- Reviews completed
- Replications documented
- Projects contributed to
- Citations resolved
- Corrections accepted

Generic social metrics may exist, but should remain subordinate to these contribution-quality signals.

### 3.4 User identity

Profiles should display:

```text
Research interests
Affiliations and ORCID
Methods expertise
Projects
Contributions
Paper reviews
Tool reviews
Evidence records
Questions
Replication reports
Review history
Referenced contributions
Saved-by-researchers count
```

The profile is the user’s scholarly identity, not a simple author archive.

---

## 4. MVP User Journeys

### 4.1 Visitor-to-contributor journey

```text
1. Arrive from search, social media, GitHub, or a shared link.
2. Read a paper review, tool review, or perspective.
3. Save a source or contribution.
4. Create an account to retain it in the research library.
5. Receive a contextual prompt: “What is your perspective?”
6. Start the Contribution Wizard.
7. Select contribution type and source.
8. Complete a guided interview.
9. Review the generated structured draft.
10. Attach evidence and limitations.
11. Confirm AI disclosure and human authorship.
12. Publish.
13. View contribution profile impact.
14. Follow the topic, source, tool, or contributor.
15. Return after meaningful interaction or source update.
```

### 4.2 Developer journey

```text
1. Open a GitHub or GitLab tool page.
2. Review repository metadata, license, release activity, and known use cases.
3. Select “Review this tool.”
4. Import repository URL.
5. Describe use case, strengths, weaknesses, limitations, and alternatives.
6. Attach issue, release, commit, benchmark, or documentation evidence.
7. Publish a Tool Review.
8. Receive references, saves, comments, or build-on contributions.
```

### 4.3 Returning contributor journey

```text
Dashboard
├── Continue draft
├── Resolve citation
├── Respond to review
├── Review a correction/retraction impact
├── Add evidence to an existing claim
├── Continue project
└── Create another contribution
```

---

## 5. Target Information Architecture

### 5.1 MVP routes

```text
/
/feed
/contribute
/contribution/[id]
/review/[id]
/tool/[slug]
/source/[id]
/profile/[username]
/library
/dashboard
/settings
/assistant
```

### 5.2 Post-MVP routes

```text
/projects
/project/[id]
/sources
/evidence
/evidence/[id]
/claims
/claim/[id]
/reviews
/review/[id]
/graph
/workspace/[id]
/topics/[slug]
/labs
```

### 5.3 Navigation model

Primary desktop navigation:

```text
Explore | Sources | Tools | Projects | Assistant
```

Primary action:

```text
+ Contribute
```

Authenticated utility actions:

```text
Global search | Library | Notifications | Profile
```

Mobile bottom navigation:

```text
Explore | Library | Contribute | AI | Profile
```

---

## 6. Page-by-Page Refactor Plan

## 6.1 Home / Feed

### Current

Single-column `HomeFeed`, filtered by category and search.

### Target

Create a contribution-oriented research feed with modular sections.

```text
Hero
├── “Build knowledge together”
├── Explore research
└── Share an insight

Signed-in continuation strip
├── Continue reading
├── Continue draft
├── Review pending feedback
└── Continue project

Research feed
├── Perspectives
├── Paper reviews
├── Tool reviews
├── Research notes
├── Questions
└── Replication reports

Discovery modules
├── Most referenced sources
├── Most saved perspectives
├── Most debated claims
├── Recently corrected sources
└── Trending open-source tools
```

Desktop layout:

```text
12-column grid
Main feed: 8 columns
Discovery/identity rail: 4 columns
```

Mobile:

```text
Single feed
Filter sheet
Compact topic carousel
Persistent contribution CTA
```

### Experiments

- A: Article feed
- B: Mixed contribution feed
- A: Generic hero
- B: Ownership hero with personalized activity
- A: “Write article”
- B: “Share an insight”

Primary metrics:

- Contribution starts per 1,000 visitors
- Save-to-sign-up conversion
- First contribution completion
- Seven-day return rate

## 6.2 Article / Contribution Detail

### Current

Two columns at `lg`: flexible article plus 19rem sticky aside.

### Target layouts

At 1024–1439px:

```text
Main content: 70%
Research inspector: 30%
```

At 1440px+:

```text
TOC: 15%
Article: 60–65%
Research inspector: 20–25%
```

Inspector tabs:

- Sources
- Evidence
- Claims
- Citations
- Reviews
- Provenance
- History

Add inline claim actions:

```text
Inspect evidence
Add support
Add contradiction
Share perspective
Save claim
Reference claim
```

Contextual post-reading prompt:

> What did this review miss? Add your perspective.

## 6.3 Author Profile → Contributor Profile

Expand profile model:

```text
Header
├── Identity
├── ORCID
├── Affiliation
├── Research interests
├── Methods expertise
└── Follow action

Contribution summary
├── Perspectives
├── Reviews
├── Tool analyses
├── Evidence records
├── Questions
└── Projects

Recognition
├── Helpful reviews
├── Referenced contributions
├── Saved contributions
└── Corrections accepted
```

Desktop layout:

```text
Profile rail: 25%
Contribution timeline: 50%
Expertise/reputation: 25%
```

## 6.4 Assistant

Refactor from isolated page to contextual service.

Modes:

```text
Research
Writing
Review
Citation
Exploration
Fact-check
Tool analysis
```

Context sources:

```text
Current article
Current source
Current project
Current draft
Selected evidence
Selected claim
Current workspace
```

Desktop: docked pane.  
Tablet: one selectable side pane.  
Mobile: bottom sheet or full-screen task mode.

## 6.5 Citation Builder

Add:

- Project bibliographies
- Annotated source collections
- Citation relationship graph
- Citation resolution state
- Source integrity warnings
- DOI normalization
- BibTeX, RIS, CSL-JSON, APA, MLA, Chicago, Vancouver export

## 6.6 Reader Dashboard

Replace consumption-only metrics with ownership metrics.

```text
My library
My contributions
Active projects
Drafts
Reviews requested
Sources corrected/retracted
Research streak
Contribution impact
```

Do not optimize the dashboard around likes and raw page views.

## 6.7 Editorial Studio

Refactor the current single-column `PostEditor` into a responsive research workspace.

```text
Sources pane
Draft/MDX editor
Review/readiness pane
Assistant pane
```

---

## 7. Responsive Layout System

### Breakpoints

```ts
export const breakpoints = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
  xxl: 1920,
} as const;
```

### Grid

```text
XS/SM: 4 columns, 16px margins, 12px gutters
MD: 8 columns, 24px margins, 16px gutters
LG: 12 columns, 32px margins, 24px gutters
XL: 12 columns, 48px margins, 32px gutters
2XL: 12 columns, 64px margins, 32px gutters
```

### Behavior by task

```text
Mobile = single-task wizard
Tablet = split workspace
Desktop = three-pane research workspace
XL = four-pane knowledge workspace
2XL = research operating environment
```

### Reading content

```css
.reading-column {
  inline-size: min(100%, 48rem);
  margin-inline: auto;
}
```

Preferred line length: 60–72 characters.

### Forms

Maximum primary form width: 40rem.

### Tables

Below the readable table threshold, convert to record view rather than shrinking typography or forcing uncontrolled horizontal scrolling.

---

## 8. Pane Model and Collapse Behavior

```ts
export type PaneState =
  | 'expanded'
  | 'compact'
  | 'collapsed'
  | 'hidden'
  | 'floating'
  | 'fullscreen';
```

### Sources pane

- Expanded: 280–320px
- Compact: 64–72px rail
- Collapsed: trigger rail
- Hidden: mobile default
- Fullscreen: literature review mode

### Draft pane

- Primary pane
- Cannot auto-collapse during contribution flow
- Fullscreen allowed for writing focus
- Hidden only during explicit source-selection or graph-focused modes

### Assistant pane

- Expanded: 320–400px
- Maximum: 420px
- Compact: icon rail
- Floating: mobile bottom sheet
- Fullscreen: deep assistant conversation

### Review pane

- Expanded: around 280–320px
- Compact: readiness summary
- Collapsed: badge with issue count
- Hidden on mobile until opened

### Graph pane

- Desktop: full graph
- Tablet: graph/list toggle
- Mobile: list-first
- Fullscreen: dedicated exploration

### Collapse priority

```text
Assistant → Review → Graph → Sources → Draft
```

Persist pane state per user, workspace, and device class.

```ts
interface WorkspaceLayoutPreference {
  workspaceId: string;
  deviceClass: 'mobile' | 'tablet' | 'desktop' | 'wide';
  sources: PaneState;
  draft: PaneState;
  review: PaneState;
  assistant: PaneState;
  graph: PaneState;
}
```

---

## 9. Contribution Wizard

## 9.1 Flow

```text
Choose type
→ Select source
→ Guided interview
→ Generate structured draft
→ Attach evidence
→ Review trust/disclosure
→ Publish
```

### Contribution types

- Paper review
- Tool review
- Perspective
- Research note
- Dataset review
- Replication report
- Research question
- Literature summary

## 9.2 Desktop workspace

Step 2 onward uses multiple panes.

```text
Source context | Contribution workspace | Assistant
20%            | 60%                    | 20%
```

At XL:

```text
Sources | Draft | Review | Assistant
18%     | 42%   | 20%    | 20%
```

## 9.3 Mobile

One task at a time:

```text
Source → Interview → Draft → Evidence → Review → Publish
```

Secondary tools open as bottom sheets.

## 9.4 Error and empty states

Required states:

```ts
export type WizardState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'first-time-user'
  | 'empty'
  | 'offline'
  | 'syncing'
  | 'conflict'
  | 'permission-denied'
  | 'source-not-found'
  | 'assistant-failed'
  | 'draft-generation-failed'
  | 'validation-error'
  | 'publish-failed'
  | 'published';
```

Recovery copy must always state:

1. What happened
2. What remains safe
3. What the system is doing
4. What the user can do
5. Whether retry is automatic

## 9.5 Success screen

```text
Contribution published
People can now:
✓ Save it
✓ Reference it
✓ Discuss it
✓ Build on it

Actions:
View contribution | Share | Create another
```

---

## 10. MDX Scholarly Editor

## 10.1 Canonical document state

Use structured JSON as canonical state. Serialize to MDX for export, rendering, or versioned storage. Do not use MDX text as the only internal state if it requires lossy reparsing.

```ts
export interface ResearchDocument {
  schemaVersion: '1.0';
  id: string;
  title: string;
  authorId: string;
  workspaceId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  blocks: ResearchBlock[];
}
```

## 10.2 Base block

```ts
export interface BaseBlock {
  id: string;
  type: string;
  authorId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  reviewState: 'draft' | 'review-required' | 'reviewed' | 'published';
  visibility: 'draft' | 'workspace' | 'public';
}
```

## 10.3 Block registry

```ts
export type ResearchBlock =
  | ParagraphBlock
  | HeadingBlock
  | SourceBlock
  | EvidenceBlock
  | ClaimBlock
  | CitationBlock
  | LimitationBlock
  | ReviewBlock
  | QuestionBlock
  | ToolReviewBlock;
```

### Evidence block

```ts
export interface EvidenceBlock extends BaseBlock {
  type: 'evidence';
  statement: string;
  sourceId: string;
  sourceVersionId: string;
  locator: SourceLocator;
  extractionType: 'quoted' | 'extracted' | 'calculated' | 'inferred' | 'generated';
  certainty: 'very-low' | 'low' | 'moderate' | 'high';
  quotation?: string;
  limitation?: string;
}
```

### Claim block

```ts
export interface ClaimBlock extends BaseBlock {
  type: 'claim';
  statement: string;
  claimType: 'descriptive' | 'comparative' | 'causal' | 'predictive' | 'normative' | 'methodological';
  evidenceIds: string[];
  contradictionIds: string[];
  qualificationIds: string[];
}
```

### Tool review block

```ts
export interface ToolReviewBlock extends BaseBlock {
  type: 'tool-review';
  toolName: string;
  repositoryUrl: string;
  repositoryHost: 'github' | 'gitlab' | 'other';
  useCase: string;
  strengths: string[];
  weaknesses: string[];
  alternatives: string[];
  recommendation: 'recommend' | 'conditional' | 'not-recommended';
}
```

## 10.4 Slash commands

```text
/text
/heading
/source
/evidence
/claim
/citation
/limitation
/review
/question
/tool
/dataset
/figure
```

Slash-command menu requirements:

- Keyboard navigation
- Search by command, label, description, and keywords
- Enter to insert
- Escape to close
- Active descendant or focus managed accessibly
- Mobile “Add block” sheet equivalent

## 10.5 Drag and drop

Use `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.

Requirements:

- Pointer activation distance of about 6px
- Dedicated drag handle
- `touch-action: none` only on handle
- Keyboard sensor with sortable coordinates
- Drag overlay
- Announcements for reorder
- Stable block IDs
- No dragging from editable form content

Core reorder logic:

```ts
function handleDragEnd(event: DragEndEvent) {
  const {active, over} = event;
  if (!over || active.id === over.id) return;

  setDocument(current => {
    const oldIndex = current.blocks.findIndex(block => block.id === active.id);
    const newIndex = current.blocks.findIndex(block => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return current;

    return {
      ...current,
      updatedAt: new Date().toISOString(),
      blocks: arrayMove(current.blocks, oldIndex, newIndex),
    };
  });
}
```

## 10.6 MDX serialization

Use explicit components and JSON-safe JSX attributes.

```ts
function attribute(name: string, value: unknown): string {
  return `${name}={${JSON.stringify(value)}}`;
}
```

Example output:

```mdx
<EvidenceBlock
  blockId={"evidence-1"}
  sourceId={"source-1"}
  sourceVersionId={"source-version-2"}
  locator={{"kind":"page","page":12}}
  extractionType={"extracted"}
  certainty={"moderate"}
  limitation={"Single-site sample"}
>
The reported outcome improved during the study period.
</EvidenceBlock>
```

Compile only in a trusted environment with a strict component allowlist. Never evaluate arbitrary user-authored JavaScript expressions.

## 10.7 Editor responsiveness

Mobile:

- Single document canvas
- Bottom block toolbar
- Sources, Review, and AI as sheets
- Sticky sync status

Tablet:

- Draft 70%
- One selectable secondary pane 30%

Desktop:

- Sources 20%
- Draft 60%
- Assistant 20%

XL:

- Sources 18%
- Draft 42%
- Review 20%
- Assistant 20%

---

## 11. Persistence, Autosave, Offline Sync, and Conflict Handling

## 11.1 Three-layer persistence

```text
React state
→ IndexedDB local durability
→ Server authoritative version
```

Use Dexie for IndexedDB.

```ts
export type SaveState =
  | 'editing'
  | 'saving'
  | 'saved'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'failed';
```

## 11.2 Dexie schema

```ts
import Dexie, {type Table} from 'dexie';

export interface DraftRecord {
  id: string;
  workspaceId: string;
  title: string;
  document: ResearchDocument;
  localVersion: number;
  remoteVersion: number;
  saveState: SaveState;
  lastModifiedAt: string;
  lastSyncedAt?: string;
}

export interface PendingMutation {
  mutationId: string;
  draftId: string;
  baseVersion: number;
  createdAt: string;
  payload: ResearchDocument;
  attemptCount: number;
  nextAttemptAt?: string;
}

export interface DraftSnapshot {
  id: string;
  draftId: string;
  version: number;
  document: ResearchDocument;
  createdAt: string;
  reason: 'interval' | 'manual' | 'pre-publish' | 'conflict';
}

class EditorDatabase extends Dexie {
  drafts!: Table<DraftRecord, string>;
  mutations!: Table<PendingMutation, string>;
  snapshots!: Table<DraftSnapshot, string>;

  constructor() {
    super('researchwithme-editor');
    this.version(2).stores({
      drafts: 'id, workspaceId, saveState, lastModifiedAt',
      mutations: 'mutationId, draftId, createdAt, nextAttemptAt',
      snapshots: 'id, draftId, version, createdAt',
    });
  }
}

export const editorDb = new EditorDatabase();
```

## 11.3 Race-condition rules

- Debounce edits, not network completion.
- Write the newest document to IndexedDB immediately after debounce.
- Maintain only one queue-flush loop per draft.
- Use idempotency keys for every mutation.
- Send `baseVersion` and reject stale writes server-side.
- Never let an older response downgrade the client’s known remote version.
- If edits occur during an in-flight save, enqueue the newest state and continue flushing.
- Coalesce unsent mutations for the same draft where safe.
- Preserve a conflict snapshot before merge.

## 11.4 Sync coordinator

```ts
const flushPromiseRef = useRef<Promise<void> | null>(null);

async function flushQueue(): Promise<void> {
  if (flushPromiseRef.current) return flushPromiseRef.current;

  flushPromiseRef.current = (async () => {
    try {
      while (navigator.onLine) {
        const mutation = await getNextPendingMutation(draftId);
        if (!mutation) break;
        await submitMutation(mutation);
        await editorDb.mutations.delete(mutation.mutationId);
      }
    } finally {
      flushPromiseRef.current = null;
    }
  })();

  return flushPromiseRef.current;
}
```

## 11.5 Retry

Use exponential backoff with jitter for transient errors:

```ts
function retryDelay(attempt: number): number {
  const base = Math.min(30_000, 1_000 * 2 ** attempt);
  return Math.round(base * (0.75 + Math.random() * 0.5));
}
```

Do not retry automatically for:

- 400 validation errors
- 401/403 authorization errors
- 404 deleted drafts
- 409 conflicts
- 413 payload too large

## 11.6 Online event

```ts
useEffect(() => {
  const onOnline = () => void flushQueue();
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}, [draftId]);
```

## 11.7 Conflict model

Never use last-write-wins for evidence, claims, reviews, rebuttals, decisions, or publications.

Conflict UI:

```text
Your version | Server version | Compare and merge
```

Persist both versions and a conflict snapshot.

## 11.8 Autosave endpoint

```http
POST /api/drafts/:id/autosave
Idempotency-Key: <mutation-id>
Content-Type: application/json
```

Request:

```json
{
  "mutationId": "uuid",
  "baseVersion": 12,
  "document": {}
}
```

### Next.js route pattern

```ts
export async function POST(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const user = await requireUser(request);
  const input = AutosaveSchema.parse(await request.json());
  const idempotencyKey = request.headers.get('idempotency-key');

  if (!idempotencyKey || idempotencyKey !== input.mutationId) {
    return NextResponse.json({error: 'Invalid idempotency key'}, {status: 400});
  }

  const result = await db.transaction(async tx => {
    const previous = await tx.processedMutation.findUnique({
      where: {mutationId: input.mutationId},
    });
    if (previous) return previous.response;

    const draft = await tx.draft.findUnique({where: {id}});
    if (!draft) throw new NotFoundError();
    await assertCapability(user, 'edit', draft);

    if (draft.version !== input.baseVersion) {
      throw new ConflictError(draft.version, draft.document);
    }

    const updated = await tx.draft.update({
      where: {id_version: {id, version: input.baseVersion}},
      data: {
        document: input.document,
        version: {increment: 1},
        updatedBy: user.id,
      },
    });

    const response = {
      status: 'ok',
      version: updated.version,
      savedAt: updated.updatedAt.toISOString(),
    };

    await tx.processedMutation.create({
      data: {mutationId: input.mutationId, draftId: id, response},
    });

    return response;
  });

  return NextResponse.json(result);
}
```

Database updates must use atomic optimistic concurrency, ideally a unique `(id, version)` constraint or equivalent conditional update.

---

## 12. Header, Footer, and Navigation

## 12.1 Desktop header

```text
Brand | Explore | Sources | Tools | Projects | Assistant
Global Search | + Contribute | Library | Profile
```

The header is for discovery, contribution, and identity.

## 12.2 Mobile header

```text
Menu | ResearchWithME | Search | Contribute | Profile
```

Height: 56px plus safe-area inset.  
Touch targets: preferably 48×48px.

At narrow widths, abbreviate brand only if necessary; preserve an accessible full label.

## 12.3 Mobile navigation drawer

Flow:

```text
Trigger activated
→ drawer opens
→ background becomes inert
→ focus moves to drawer heading or close button
→ keyboard focus remains inside
→ Escape/close/overlay closes
→ focus returns to trigger
```

Sections:

```text
Explore
Sources
Tools
Projects
Assistant

Library
Bookmarks
Drafts
Contributions

Settings
Help
Sign out
```

Accessibility:

- `aria-expanded`
- `aria-controls`
- labelled dialog/navigation
- focus trap
- focus return
- reduced-motion alternative
- swipe is optional, never the only close mechanism

## 12.4 Reading header

```text
Back | Truncated title | Save | Cite | More
```

## 12.5 Editor header

```text
Back | Draft title | Sync state | Review issues | Publish
```

Sync state is always visible.

## 12.6 Footer

Public footer emphasizes trust:

```text
Mission
Research
Company
Legal
Community

Research Integrity Policy
Retraction Policy
AI Disclosure
Contributor Guidelines
Transparency Report
```

Workspace and editor routes use only a minimal utility footer or no visual footer.

---

## 13. Accessibility Requirements

Target: WCAG 2.2 AA.

### Mandatory

- Skip link
- Logical landmarks and headings
- Native controls
- Visible focus
- Correct focus order and recovery
- 320 CSS px reflow
- 200% zoom
- Minimum 4.5:1 normal text contrast
- Minimum 3:1 large text and essential graphics
- 44×44px preferred primary touch targets
- Reduced-motion support
- Forced-colors support
- Text-spacing compatibility
- Graph/list equivalence
- Chart/table equivalence
- No color-only states
- Accessible drag-and-drop alternatives
- Captions and transcripts

### Screen-reader target matrix

- NVDA + Firefox
- NVDA + Chrome
- VoiceOver + Safari
- TalkBack + Chrome

### Announcements

Use polite live regions for meaningful state changes:

```text
Draft saved locally
Draft synced
Navigation menu opened
Navigation menu closed
Block moved to position 3 of 8
A newer draft version is available
Publishing failed; draft remains saved locally
```

Avoid announcing every keystroke or autosave transition.

---

## 14. Localization

Initial support:

- English
- Bangla
- Mixed Bangla-English
- RTL architecture tested with Arabic

Font roles:

```text
Latin editorial: Newsreader
Latin UI: Inter
Latin metadata: JetBrains Mono
Bangla editorial: Noto Serif Bengali
Bangla UI: Noto Sans Bengali
Arabic editorial: Noto Naskh Arabic
Arabic UI: Noto Sans Arabic
```

Requirements:

- BCP 47 tags
- Original title preserved
- Translation and transliteration labelled
- `Intl` formatting
- CSS logical properties
- Directional isolation for DOI, ORCID, URL, and code
- Pseudo-localization at +35% expansion
- Bangla captions and export tests

---

## 15. Data Model and Backend Services

### Core objects

```text
User
Profile
Workspace
Project
Contribution
Source
SourceVersion
Evidence
Claim
Relationship
Citation
Review
ReviewItem
Rebuttal
Decision
Comment
Annotation
Draft
DraftSnapshot
PendingMutation
Notification
AuditEvent
IntegrityEvent
ToolRepository
```

### Suggested service boundaries

```text
Identity service
Workspace and permissions service
Contribution service
Source and citation service
Evidence and claim service
Review service
Search service
Assistant/AI service
Notification service
Media rendering service
Audit and integrity service
Billing service
```

### Suggested API additions

```text
POST /api/contributions
GET /api/contributions/[id]
PATCH /api/contributions/[id]
POST /api/contributions/[id]/publish

POST /api/drafts/[id]/autosave
GET /api/drafts/[id]
GET /api/drafts/[id]/history
POST /api/drafts/[id]/resolve-conflict

POST /api/sources/resolve
GET /api/sources/[id]
POST /api/sources/[id]/integrity-events

POST /api/evidence
PATCH /api/evidence/[id]
POST /api/claims
POST /api/relationships

POST /api/reviews
POST /api/reviews/[id]/rebuttals
POST /api/reviews/[id]/decisions

GET /api/feed
GET /api/search
POST /api/search/expand

POST /api/tools/import
GET /api/tools/[slug]
```

---

## 16. Research Integrity and AI Governance

### Trust dimensions

Keep review, replication, certainty, consensus, and source integrity independent.

### AI provenance

Record:

- Provider
- Model
- Model version
- Operation
- Prompt-template version
- Retrieval time
- Source set
- Tool calls
- Generation time
- Transformation type
- Citation validation
- Human review

### Publication blockers

- Unresolved required source
- Citation does not support claim
- Quotation mismatch
- Unreviewed retraction impact
- Missing human reviewer
- Restricted content sent to prohibited provider
- Synthetic material without disclosure

### Prompt injection

Treat retrieved content as data. It must never determine system instructions, tool permissions, network destinations, publication state, or access controls.

---

## 17. Experimentation and A/B Testing Plan

### Experiment principles

- Define hypothesis before implementation.
- Use primary and guardrail metrics.
- Do not manipulate users into low-quality contribution.
- Segment new vs returning users.
- Run experiments long enough to include weekday/weekend effects.
- Do not stop solely after observing an early positive result.

### Priority experiments

#### Feed architecture

```text
A: Article-only feed
B: Mixed contribution feed
```

Primary: contribution starts.  
Guardrails: read depth, bounce, low-quality submissions.

#### Contribution CTA

```text
A: Write article
B: Share an insight
C: Contribute
```

#### Assistant placement

```text
A: Standalone assistant route
B: Docked contextual assistant
C: Floating assistant trigger
```

#### Article engagement

```text
A: Comment prompt
B: Share perspective prompt
C: Add evidence prompt
```

#### Sign-up trigger

```text
A: Sign up before saving
B: Save first, then request account
```

### Event taxonomy

```text
feed_viewed
contribution_cta_clicked
contribution_type_selected
source_selected
assistant_interview_started
draft_generated
evidence_added
contribution_published
contribution_abandoned
item_saved
account_created
second_contribution_started
review_referenced
contribution_saved_by_other
```

Do not include sensitive research text in event properties.

---

## 18. Performance Budgets

```text
Application shell JS: ≤200 KB gzip target
Reading route JS: ≤120 KB gzip target
Editor route JS: ≤350 KB gzip target
Graph route JS: ≤300 KB gzip target
LCP p75: ≤2.5s
INP p75: ≤200ms
CLS p75: ≤0.1
```

Lazy load:

- Plate/Lexical advanced editor bundles
- Graph renderer
- Remotion Player
- Hyperframes tooling
- Citation style libraries not needed immediately

Scale tests:

- 10,000 citations
- 5,000 graph nodes
- 100 concurrent annotations
- 200+ table rows before accessible virtualization/pagination
- Long multilingual documents

---

## 19. Security and Privacy

- Server-side capability enforcement
- Classification: public, workspace, confidential, restricted, embargoed
- Anonymous-review identity protection
- CSRF protection where applicable
- Content Security Policy
- Input validation and output encoding
- MDX component allowlist
- No arbitrary user JavaScript in MDX
- Isolated Remotion/Hyperframes rendering
- Network deny-by-default for render jobs
- Path-traversal and archive-bomb protection
- Idempotency and optimistic concurrency
- Audit logging for sensitive operations
- Rate limits for AI, search, imports, publishing, and public interactions
- Signed URLs for private media
- Secret-free browser bundles

---

## 20. Testing Strategy

### Unit

- Token transforms
- Schema validation
- Block factories
- MDX serialization
- Autosave queue
- Retry policy
- Version conflict logic
- Trust calculation display

### Component

- Every component state
- Keyboard operation
- Focus behavior
- Screen-reader semantics
- Responsive pane transformations
- Forced-colors and reduced-motion modes

### Integration

- Source resolution → evidence creation
- Evidence → claim relationship
- Draft autosave → offline → reconnect → sync
- Conflict creation → compare → merge
- Retraction event → affected objects → review
- AI-generated draft → citation validation → approval

### End-to-end

```text
Visitor saves item → signs up → publishes first contribution
Developer imports GitHub tool → publishes tool review
Researcher writes offline → reconnects → syncs
Contributor receives review → submits rebuttal → decision recorded
Editor processes source retraction impact
```

### Visual regression widths

```text
320, 480, 768, 1024, 1440, 1920 CSS px
```

---

## 21. Delivery Roadmap

### Phase 0: Audit and instrumentation, 1–2 weeks

- Repository audit
- Component inventory
- Token inventory
- Accessibility baseline
- Performance baseline
- Event taxonomy
- Risk register

### Phase 1: Foundations, 2–4 weeks

- Token pipeline
- Theme architecture
- Core schemas
- Permissions middleware
- Accessible primitives
- Internationalization foundation
- Test harness

### Phase 2: Contribution MVP, 4–6 weeks

- Contribution model
- Contribution feed
- Contribution wizard
- Source import
- Guided interview
- Draft generation
- Evidence attachment
- Disclosure/review step
- Contributor profile

### Phase 3: Scholarly editor, 5–8 weeks

- Typed block model
- MDX serialization
- Slash commands
- dnd-kit sorting
- Block forms
- Responsive panes
- Autosave/Dexie
- Offline sync
- Conflict handling
- Version history

### Phase 4: Social and identity loops, 3–5 weeks

- Follow people/topics/tools
- Save/reference/build-on actions
- Notifications
- Recognition metrics
- Contribution timeline
- Dashboard ownership signals

### Phase 5: Projects and graph, 6–10 weeks

- Project workspace
- Evidence and claim objects
- Provenance graph and accessible list
- Review/rebuttal/decision workflow
- Citation collections

### Phase 6: Motion and generated media, 3–5 weeks

- Interface motion tokens
- Remotion templates
- Hyperframes templates
- Captions/transcripts
- Render provenance and security

### Phase 7: Optimization and migration, ongoing

- Legacy route migration
- Codemods
- Performance tuning
- A/B testing
- Accessibility audit
- Security review
- Stable release evidence

A small team of 4–6 full-time contributors should plan roughly 5–8 months for a robust implementation. A narrower contribution MVP can ship in 8–12 weeks if projects, graph, collaboration, and media rendering are deferred.

---

## 22. Team and Ownership

Recommended core team:

- Product lead
- Design systems / product designer
- Two frontend engineers
- One full-stack/backend engineer
- One QA automation engineer
- Accessibility specialist at 25–50%
- Research integrity advisor at 25%
- Localization reviewer for Bangla and RTL
- Security/privacy reviewer at milestones

Decision owners:

```text
Design: Design Systems Lead
Frontend APIs: Frontend Platform Lead
Accessibility: Accessibility Owner
Research integrity: Research Integrity Owner
Privacy/security: Security Owner
Localization: Localization Owner
Experiments: Product/R&D Lead
Breaking changes: Design System Council
```

---

## 23. Final Implementation Checklist

### Product

- [ ] Primary CTA is contribution-oriented.
- [ ] Contribution types are structured and low-friction.
- [ ] Profiles represent research identity.
- [ ] Feed includes mixed contribution objects.
- [ ] Meaningful social recognition replaces vanity-first metrics.
- [ ] Contribution loops are instrumented.

### Information architecture

- [ ] Sources, evidence, claims, reviews, tools, and projects have clear object models.
- [ ] Routes support deep links to object versions and locations.
- [ ] Navigation supports Explore, Sources, Tools, Projects, Assistant, Library, and Contribute.

### Editor

- [ ] Typed scholarly block schema exists.
- [ ] Slash commands work by keyboard and touch.
- [ ] dnd-kit sorting works by pointer and keyboard.
- [ ] Forms cover source, evidence, claim, citation, limitation, review, question, and tool review.
- [ ] MDX serialization is deterministic and safe.
- [ ] Mobile, tablet, desktop, and XL pane behavior works.

### Persistence

- [ ] Dexie schema is versioned.
- [ ] Local drafts survive reload and offline mode.
- [ ] One flush loop runs per draft.
- [ ] API writes are idempotent.
- [ ] Optimistic concurrency is atomic.
- [ ] Conflicts preserve both versions.
- [ ] Version history and recovery are available.

### Accessibility

- [ ] WCAG 2.2 AA audit passes.
- [ ] Header, drawer, bottom navigation, editor, dialogs, and sheets are keyboard accessible.
- [ ] Focus returns correctly.
- [ ] Forced colors, reduced motion, zoom, and reflow pass.
- [ ] TalkBack mobile flows pass.
- [ ] Drag-and-drop has a keyboard alternative.

### Research integrity

- [ ] Evidence resolves to source version and locator.
- [ ] Trust dimensions are independent.
- [ ] Retractions propagate.
- [ ] AI provenance is recorded.
- [ ] Publication blockers work.
- [ ] Generated media retains citations and limitations.

### Performance and security

- [ ] Route budgets pass or exceptions are approved.
- [ ] Sensitive analytics are excluded.
- [ ] MDX execution is constrained.
- [ ] Rendering is isolated.
- [ ] Permissions are server-enforced.
- [ ] Audit events are retained.

---

## 24. Immediate Next 15 Tasks

1. Freeze the current page tree and baseline screenshots.
2. Add product analytics for the current read/save/write funnel.
3. Define the `Contribution` schema and contribution types.
4. Define `Source`, `SourceVersion`, `Evidence`, `Claim`, and relationship schemas.
5. Implement the three-layer token pipeline.
6. Refactor global navigation around Explore, Sources, Tools, Projects, Assistant, and Contribute.
7. Build the mobile header, drawer, and bottom navigation.
8. Build the Contribution Wizard happy path plus all recovery states.
9. Build Evidence Card as the reference scholarly component.
10. Refactor `/write` into the responsive Sources/Draft/Review/Assistant workspace.
11. Implement the typed editor block registry and forms.
12. Add dnd-kit sorting and deterministic MDX serialization.
13. Add Dexie autosave, offline queue, idempotent API writes, and conflict UI.
14. Replace author profiles with contributor identity profiles.
15. Launch the mixed contribution feed behind an experiment flag.

---

## 25. Definition of Done

The refactor is complete only when a visitor can:

1. Discover a meaningful research object.
2. Save it into a personal research library.
3. Start a contribution without blank-page anxiety.
4. Attach sources, evidence, limitations, and citations.
5. Work safely across mobile and desktop.
6. Continue offline without losing work.
7. Recover from conflicts and failed publishing.
8. Publish with transparent AI and provenance disclosure.
9. Build a visible research identity.
10. Receive meaningful scholarly interaction.
11. Return to continue projects and contributions.

The platform is successful when it no longer feels like a site containing reviews, but like a research network whose knowledge is visibly shaped and owned by its contributors.
## 26. User Profile Dashboard and Personal Research OS

The authenticated dashboard is the ownership surface of ResearchWithME. It MUST not behave as a generic analytics page. It combines research continuity, identity, contribution management, project progress, review work, integrity alerts, network activity, and personalized recommendations.

### 26.1 Product objectives

The dashboard MUST help the user answer, within ten seconds:

1. What should I continue?
2. What requires my attention?
3. What changed in my research network?
4. What impact did my contributions have?
5. What is the easiest useful action I can take now?

Primary dashboard outcomes:

```text
Resume work → Complete contribution → Respond to review
→ Maintain library → Progress project → Build research identity
```

Primary product metric:

```text
Weekly users completing at least one meaningful research action
```

Meaningful actions include saving a source, publishing or revising a contribution, attaching evidence, completing a review, resolving a citation, responding to an integrity alert, or advancing a project stage.

### 26.2 Dashboard routes

```text
/dashboard                    Personal command center
/dashboard/library            Saved sources, tools, datasets, contributions
/dashboard/projects           Active, paused, completed, archived projects
/dashboard/contributions      Draft, review, published, archived contributions
/dashboard/reviews            Requested, assigned, completed reviews and rebuttals
/dashboard/sources            Recent, saved, cited, corrected, retracted sources
/dashboard/evidence           Evidence records and integrity impact
/dashboard/claims             Supported, contested, unresolved, review-required claims
/dashboard/workspace          Notes, tasks, sources, claims, evidence, drafts
/dashboard/assistant          Research tasks, history, suggestions, approvals
/dashboard/network            Following, collaborators, reviewers, topic communities
/dashboard/reputation         Helpful, referenced, validated, corrected contributions
/dashboard/insights           Private analytics and progress
/dashboard/archive            Archived objects, exports, versions, recoverable records
/dashboard/profile            Identity, expertise, affiliations, ORCID, public profile
/dashboard/settings           Preferences, privacy, notifications, integrations
```

Routes MAY be consolidated into tabs for MVP, but URLs and information boundaries SHOULD remain stable for deep linking and later expansion.

### 26.3 Dashboard shell

Desktop shell:

```text
┌──────────────┬──────────────────────────────────┬────────────────────┐
│ Navigation   │ Main dashboard                   │ Attention rail     │
│ 240–280px    │ minmax(0, 1fr)                  │ 280–340px         │
│              │                                  │                    │
│ Home         │ Continue working                 │ Reviews due        │
│ Library      │ Projects                         │ Integrity alerts   │
│ Projects     │ Contributions                    │ Assistant tasks    │
│ Reviews      │ Private activity                 │ Network updates    │
│ Contributions│                                  │                    │
└──────────────┴──────────────────────────────────┴────────────────────┘
```

The attention rail SHOULD disappear before the primary navigation rail. Navigation MAY compact to a 64–72px icon rail from 1024–1279px.

### 26.4 Dashboard home modules

#### Continue Working

Highest-priority module. Rank by recency, explicit pinning, deadline, unresolved review, and local unsynced changes.

Required fields:

```ts
interface ContinueWorkItem {
  id: string;
  objectType: 'draft'|'project'|'review'|'source'|'evidence'|'claim';
  title: string;
  lastActivityAt: string;
  progress?: number;
  saveState?: 'synced'|'offline-saved'|'sync-pending'|'conflict'|'failed';
  attentionReason?: string;
  nextAction: {label:string; href:string};
}
```

#### Attention Queue

Priority order:

1. Permission, privacy, or embargo issue
2. Retraction or correction impact
3. Autosave conflict or failed sync
4. Review deadline
5. Unresolved citation
6. Requested response or rebuttal
7. Assistant suggestion

Each item MUST explain why it appears and the consequence of ignoring it.

#### Active Projects

Show 3–6 projects with stage, progress, collaborators, last activity, next milestone, source/evidence/claim counts, and overdue tasks.

#### Contribution Pipeline

```text
Ideas → Drafts → Review required → Under review → Publish ready → Published
```

Do not reduce the pipeline to a vanity count. Every stage must be actionable.

#### Private Research Activity

User-owned activity stream:

- source saved
- evidence extracted
- claim revised
- review submitted
- contribution referenced
- source corrected
- project milestone completed

Allow filters by project, object type, and date. Never expose sensitive content through analytics instrumentation.

#### Research Identity Snapshot

Show:

- public profile completeness
- research interests
- ORCID connection
- affiliation verification state
- methods expertise
- contribution mix
- meaningful recognition

#### Assistant Tasks

Task-oriented prompts only, such as:

- Resolve two missing citations
- Compare these three sources
- Review a claim affected by a corrected source
- Convert saved notes into a perspective draft

### 26.5 Dashboard personalization

Personalize module order, not scholarly truth. Use explicit user roles and observed tasks, not inferred protected characteristics.

```ts
export type DashboardPersona =
  | 'reader'
  | 'contributor'
  | 'reviewer'
  | 'researcher'
  | 'developer'
  | 'editor';
```

Defaults:

| Persona | Priority modules |
|---|---|
| Reader | Continue reading, Library, Topics, Suggested contribution |
| Contributor | Continue draft, Contribution pipeline, Feedback, Impact |
| Reviewer | Review queue, Deadlines, Rebuttals, Integrity alerts |
| Researcher | Projects, Sources, Evidence, Claims, Assistant tasks |
| Developer | Tool reviews, Repositories, Implementation notes, Issues/releases |
| Editor | Publication queue, Integrity alerts, Applications, Moderation |

Users MUST be able to pin, hide, and reorder dashboard modules. System-critical alerts cannot be hidden, only dismissed after resolution or explicit acknowledgement.

### 26.6 User profile dashboard

The private profile dashboard manages the public scholarly identity.

Sections:

```text
Identity
├── display name
├── username
├── avatar
├── biography
├── location and languages
├── affiliations
├── ORCID
├── personal site
└── GitHub/GitLab identities

Expertise
├── research interests
├── methods expertise
├── tool expertise
├── topic taxonomy
└── self-declared vs verified labels

Public visibility
├── contribution categories
├── activity visibility
├── metrics visibility
├── follower/following visibility
└── review anonymity defaults

Profile quality
├── completeness
├── unresolved verification
├── missing disclosure
└── preview public profile
```

Do not create a single opaque reputation score. Present dimensioned recognition and explain every metric.

### 26.7 Dashboard empty, loading, error, and recovery states

Every module supports:

```text
loading · ready · empty · stale · partial · offline
permission-denied · error · conflict · archived
```

Examples:

- No projects: “Start a project to organize sources, evidence, claims, and drafts.”
- No contributions: “Share a perspective, review a paper, or evaluate a tool.”
- Offline: “Your local drafts and cached library are available. Network actions will retry.”
- Partial analytics: “Impact data is delayed; your contributions remain available.”
- Integrity alert failure: never replace with an empty state; display “Unable to check source integrity.”

### 26.8 Notifications

Notification classes:

```ts
export type NotificationType =
  | 'contribution-referenced'
  | 'contribution-saved'
  | 'review-requested'
  | 'review-response'
  | 'integrity-correction'
  | 'integrity-retraction'
  | 'citation-unresolved'
  | 'project-invitation'
  | 'project-update'
  | 'assistant-task'
  | 'sync-conflict';
```

Notifications MUST be actionable, deduplicated, preference-aware, and classification-safe. Email, push, and in-app channels require separate controls. Integrity and security alerts cannot be disabled completely, but delivery frequency may be configurable where policy permits.

---

## 27. Dashboard Database Schema

The schema below assumes PostgreSQL with Prisma-style naming. Adapt names to the current data layer while preserving constraints, ownership, versioning, classification, and indexes.

### 27.1 Core profile and preferences

```prisma
model UserProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  username              String   @unique
  displayName           String
  biography             String?
  avatarUrl             String?
  location              String?
  primaryLanguage       String   @default("en")
  languages             String[]
  orcid                  String?  @unique
  personalUrl           String?
  githubUsername        String?
  gitlabUsername        String?
  profileVisibility     Visibility @default(PUBLIC)
  metricsVisibility     Visibility @default(PUBLIC)
  activityVisibility    Visibility @default(WORKSPACE)
  profileCompleteness   Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  affiliations          ProfileAffiliation[]
  expertise             ProfileExpertise[]
  dashboardPreference   DashboardPreference?
  modulePreferences     DashboardModulePreference[]
}

model ProfileAffiliation {
  id              String   @id @default(cuid())
  profileId       String
  organization    String
  rorId           String?
  role             String?
  department       String?
  startsAt         DateTime?
  endsAt           DateTime?
  verification     VerificationState @default(UNVERIFIED)
  isPrimary        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  profile          UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, isPrimary])
  @@index([rorId])
}

model ProfileExpertise {
  id              String   @id @default(cuid())
  profileId       String
  taxonomyId      String
  kind             ExpertiseKind
  level            ExpertiseLevel?
  verification     VerificationState @default(SELF_DECLARED)
  evidenceUrl      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  profile          UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, taxonomyId, kind])
  @@index([taxonomyId, kind])
}

enum Visibility { PUBLIC WORKSPACE PRIVATE }
enum VerificationState { UNVERIFIED SELF_DECLARED PENDING VERIFIED REJECTED }
enum ExpertiseKind { RESEARCH_INTEREST METHOD TOOL DOMAIN }
enum ExpertiseLevel { LEARNING PRACTITIONER ADVANCED EXPERT }
```

### 27.2 Dashboard preferences and modules

```prisma
model DashboardPreference {
  id                  String   @id @default(cuid())
  profileId           String   @unique
  defaultPersona      DashboardPersona @default(RESEARCHER)
  compactNavigation   Boolean  @default(false)
  showAttentionRail   Boolean  @default(true)
  timezone            String   @default("Asia/Dhaka")
  weekStartsOn        Int      @default(6)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  profile             UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}

model DashboardModulePreference {
  id                  String   @id @default(cuid())
  profileId           String
  moduleKey           String
  position            Int
  visibility          ModuleVisibility @default(VISIBLE)
  size                ModuleSize @default(MEDIUM)
  configuration       Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  profile             UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, moduleKey])
  @@index([profileId, position])
}

enum DashboardPersona { READER CONTRIBUTOR REVIEWER RESEARCHER DEVELOPER EDITOR }
enum ModuleVisibility { VISIBLE COLLAPSED HIDDEN }
enum ModuleSize { SMALL MEDIUM LARGE FULL }
```

### 27.3 Library and collections

```prisma
model LibraryItem {
  id                  String   @id @default(cuid())
  userId              String
  objectId            String
  objectType          LibraryObjectType
  collectionId        String?
  savedAt             DateTime @default(now())
  lastOpenedAt        DateTime?
  readState           ReadState @default(UNREAD)
  progress            Int?
  personalNote        String?
  tags                String[]
  classification      DataClassification @default(WORKSPACE)

  collection          LibraryCollection? @relation(fields: [collectionId], references: [id], onDelete: SetNull)

  @@unique([userId, objectId, objectType])
  @@index([userId, savedAt])
  @@index([userId, readState])
  @@index([collectionId])
}

model LibraryCollection {
  id                  String   @id @default(cuid())
  userId              String
  name                String
  description         String?
  visibility          Visibility @default(PRIVATE)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  items               LibraryItem[]

  @@unique([userId, name])
  @@index([userId, updatedAt])
}

enum LibraryObjectType { SOURCE TOOL DATASET CONTRIBUTION NOTE CLAIM EVIDENCE }
enum ReadState { UNREAD IN_PROGRESS COMPLETED ARCHIVED }
enum DataClassification { PUBLIC WORKSPACE CONFIDENTIAL RESTRICTED EMBARGOED }
```

### 27.4 Project dashboard

```prisma
model ResearchProject {
  id                  String   @id @default(cuid())
  workspaceId         String
  ownerId             String
  title               String
  description         String?
  status              ProjectStatus @default(ACTIVE)
  stage               ProjectStage @default(DISCOVERY)
  progress            Int      @default(0)
  classification      DataClassification @default(WORKSPACE)
  startsAt            DateTime?
  targetAt            DateTime?
  completedAt         DateTime?
  version             Int      @default(1)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  members             ProjectMember[]
  milestones          ProjectMilestone[]
  tasks               ProjectTask[]
  objects             ProjectObject[]

  @@index([workspaceId, status])
  @@index([ownerId, updatedAt])
  @@index([targetAt])
}

model ProjectMember {
  id                  String   @id @default(cuid())
  projectId           String
  userId              String
  role                ProjectRole
  joinedAt            DateTime @default(now())

  project             ResearchProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId, projectId])
}

model ProjectMilestone {
  id                  String   @id @default(cuid())
  projectId           String
  title               String
  status              TaskStatus @default(TODO)
  dueAt               DateTime?
  completedAt         DateTime?
  position            Int

  project             ResearchProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, position])
  @@index([dueAt, status])
}

model ProjectTask {
  id                  String   @id @default(cuid())
  projectId           String
  assigneeId          String?
  title               String
  status              TaskStatus @default(TODO)
  priority            TaskPriority @default(MEDIUM)
  dueAt               DateTime?
  objectId            String?
  objectType          String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  project             ResearchProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, status, priority])
  @@index([assigneeId, status])
}

model ProjectObject {
  id                  String   @id @default(cuid())
  projectId           String
  objectId            String
  objectType          ProjectObjectType
  addedBy             String
  addedAt             DateTime @default(now())

  project             ResearchProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, objectId, objectType])
  @@index([projectId, objectType])
}

enum ProjectStatus { ACTIVE PAUSED COMPLETED ARCHIVED }
enum ProjectStage { DISCOVERY LITERATURE_REVIEW EVIDENCE_SYNTHESIS DRAFTING REVIEW PUBLICATION }
enum ProjectRole { OWNER EDITOR CONTRIBUTOR REVIEWER VIEWER }
enum TaskStatus { TODO IN_PROGRESS BLOCKED COMPLETED CANCELLED }
enum TaskPriority { LOW MEDIUM HIGH URGENT }
enum ProjectObjectType { SOURCE EVIDENCE CLAIM NOTE DRAFT CONTRIBUTION DATASET TOOL REVIEW }
```

### 27.5 Contributions, reviews, and impact

Reuse the canonical Contribution, Review, Evidence, Claim, and Relationship records. Add materialized/user-scoped aggregates only where needed for performance.

```prisma
model ContributionImpactDaily {
  id                  String   @id @default(cuid())
  contributionId      String
  ownerId             String
  date                DateTime
  views               Int      @default(0)
  saves               Int      @default(0)
  references          Int      @default(0)
  helpfulVotes        Int      @default(0)
  evidenceReuse       Int      @default(0)
  discussionReplies   Int      @default(0)

  @@unique([contributionId, date])
  @@index([ownerId, date])
}

model ReputationEvent {
  id                  String   @id @default(cuid())
  userId              String
  type                ReputationEventType
  objectId            String
  objectType          String
  actorId             String?
  weight              Decimal  @default(1.0)
  explanation         String
  occurredAt          DateTime @default(now())
  reversedAt          DateTime?

  @@index([userId, occurredAt])
  @@index([objectId, objectType])
}

enum ReputationEventType {
  CONTRIBUTION_REFERENCED
  REVIEW_MARKED_HELPFUL
  EVIDENCE_REUSED
  CORRECTION_ACCEPTED
  REPLICATION_REPORTED
  REVIEW_COMPLETED
}
```

Do not expose a single aggregate reputation score unless the calculation is documented and inspectable. Prefer dimensioned totals computed from `ReputationEvent`.

### 27.6 Activity, attention, and notifications

```prisma
model UserActivityEvent {
  id                  String   @id @default(cuid())
  userId              String
  workspaceId         String?
  eventType           String
  objectId            String?
  objectType          String?
  projectId           String?
  metadata            Json?
  occurredAt          DateTime @default(now())
  visibility          Visibility @default(PRIVATE)

  @@index([userId, occurredAt])
  @@index([projectId, occurredAt])
}

model AttentionItem {
  id                  String   @id @default(cuid())
  userId              String
  workspaceId         String?
  kind                AttentionKind
  severity            AttentionSeverity
  objectId            String
  objectType          String
  title               String
  explanation         String
  actionLabel         String
  actionHref          String
  status              AttentionStatus @default(OPEN)
  dueAt               DateTime?
  createdAt           DateTime @default(now())
  resolvedAt          DateTime?

  @@index([userId, status, severity])
  @@index([dueAt, status])
}

model UserNotification {
  id                  String   @id @default(cuid())
  userId              String
  type                NotificationType
  objectId            String?
  objectType          String?
  title               String
  body                String
  actionHref          String?
  deduplicationKey    String?
  readAt              DateTime?
  createdAt           DateTime @default(now())
  classification      DataClassification @default(WORKSPACE)

  @@index([userId, readAt, createdAt])
  @@unique([userId, deduplicationKey])
}

enum AttentionKind { INTEGRITY SYNC REVIEW CITATION PERMISSION DEADLINE ASSISTANT }
enum AttentionSeverity { INFO WARNING HIGH CRITICAL }
enum AttentionStatus { OPEN ACKNOWLEDGED RESOLVED DISMISSED }
enum NotificationType {
  CONTRIBUTION_REFERENCED
  CONTRIBUTION_SAVED
  REVIEW_REQUESTED
  REVIEW_RESPONSE
  INTEGRITY_CORRECTION
  INTEGRITY_RETRACTION
  CITATION_UNRESOLVED
  PROJECT_INVITATION
  PROJECT_UPDATE
  ASSISTANT_TASK
  SYNC_CONFLICT
}
```

### 27.7 Streaks and progress

Research streaks should reward meaningful actions, not login frequency.

```prisma
model ResearchActivityDay {
  id                  String   @id @default(cuid())
  userId              String
  date                DateTime
  meaningfulActions   Int      @default(0)
  contributionActions Int      @default(0)
  reviewActions       Int      @default(0)
  projectActions      Int      @default(0)

  @@unique([userId, date])
  @@index([userId, date])
}
```

A meaningful action MUST be server-validated. Repeated trivial events must not inflate streaks.

### 27.8 Dashboard query API

Avoid dozens of client waterfalls. Use one shell endpoint plus paginated module endpoints.

```http
GET /api/dashboard/home
GET /api/dashboard/attention?cursor=...
GET /api/dashboard/activity?cursor=...
GET /api/dashboard/projects?status=active&cursor=...
GET /api/dashboard/contributions?state=draft&cursor=...
GET /api/dashboard/impact?range=30d
PATCH /api/dashboard/preferences
PATCH /api/dashboard/modules/:moduleKey
```

Home response:

```ts
interface DashboardHomeResponse {
  generatedAt: string;
  profile: ProfileSummary;
  continueWorking: ContinueWorkItem[];
  attention: AttentionItemDTO[];
  activeProjects: ProjectSummary[];
  contributionPipeline: Record<string, number>;
  activity: ActivityItemDTO[];
  recognition: RecognitionSummary;
  assistantTasks: AssistantTaskDTO[];
  stale: boolean;
}
```

Apply row-level authorization and classification filtering before aggregation. Cache only user-safe derived data and invalidate on significant writes.

---

## 28. Mobile User Dashboard Layout

### 28.1 Mobile principles

- One primary decision per viewport.
- Continue work before analytics.
- Critical attention before recommendations.
- No desktop card grid squeezed into one column.
- Bottom navigation remains visible except in focused editor flows.
- Modules use compact summaries with “View all.”
- Respect safe-area insets and 44×44px minimum targets.

### 28.2 Mobile shell

```text
┌────────────────────────────┐
│ Menu  Dashboard   Search   │
│ Profile/Sync state         │
├────────────────────────────┤
│ Good morning, Ashif        │
│ Research streak · 12 days  │
├────────────────────────────┤
│ ATTENTION                   │
│ Source correction · Review │
├────────────────────────────┤
│ CONTINUE WORKING            │
│ Llama evaluation review    │
│ Offline saved · Continue   │
├────────────────────────────┤
│ QUICK ACTIONS               │
│ Contribute  Save source    │
│ New project  Ask assistant │
├────────────────────────────┤
│ ACTIVE PROJECTS             │
│ Project card carousel/list │
├────────────────────────────┤
│ CONTRIBUTIONS               │
│ Draft  Review  Published   │
├────────────────────────────┤
│ RECENT ACTIVITY             │
│ Timeline                   │
├────────────────────────────┤
│ Explore Library + AI Prof. │
└────────────────────────────┘
```

### 28.3 Mobile ordering

Default order:

1. Connection/sync conflict banner when present
2. Critical integrity/security alert
3. Greeting and identity summary
4. Continue Working
5. Quick Actions
6. Attention Queue
7. Active Projects
8. Contribution Pipeline
9. Library Summary
10. Private Activity
11. Recognition
12. Assistant Suggestions

Only critical alerts may appear above Continue Working. Do not place generic promotional content above unfinished work.

### 28.4 Mobile dashboard header

```text
Menu | Dashboard | Search | Avatar
```

Second line, only when relevant:

```text
Offline saved · 2 pending changes
```

Tap sync status to open the sync sheet with pending mutations, last successful sync, retry, and conflict actions.

### 28.5 Quick actions

Maximum four visible actions:

```text
+ Contribute
Save source
New project
Ask assistant
```

Personalize actions by persona, but keep `Contribute` available.

### 28.6 Mobile module behavior

| Module | Mobile behavior |
|---|---|
| Continue Working | One primary card plus horizontal secondary list |
| Attention | High/critical expanded; info/warning grouped |
| Projects | Vertical cards; at most three before View all |
| Contributions | Segmented counts and two recent items |
| Library | Category chips plus last three items |
| Activity | Compact timeline, paginated |
| Recognition | Dimensioned metrics, no opaque score |
| Assistant | Task cards opening bottom sheet/full screen |

### 28.7 Bottom navigation

```text
Explore | Library | Contribute | AI | Profile
```

The dashboard is the Profile tab’s default authenticated landing surface. `aria-current="page"` marks the active destination. Labels remain visible; do not use icon-only navigation.

### 28.8 Mobile drawer

```text
Dashboard Home
Projects
Contributions
Reviews
Sources
Evidence
Claims
Network
Insights
Archive
Settings
```

The drawer MUST trap focus, return focus to the opener, support Escape and close buttons, make the background inert, and avoid relying on swipe gestures.

### 28.9 Responsive transitions

```text
320–767px   Single-column dashboard; bottom nav and drawer
768–1023px  Two-column modules; compact side navigation
1024–1439px Persistent nav + two-column main; attention as drawer/rail
1440px+     Persistent nav + main grid + attention rail
```

At 768px+, modules may be reorderable. On mobile, module reordering should use an accessible edit screen with Move up/Move down controls instead of drag-only interaction.

### 28.10 Accessibility

- `main` begins with an H1: “Your research dashboard.”
- Each module is a labelled `section` with an H2.
- Dynamic counts update without unnecessary live announcements.
- Critical alert arrival may use `role="alert"`; ordinary updates use a polite region or no announcement.
- Carousels require previous/next controls and must not auto-advance.
- Swipe is an enhancement, never the only action.
- Charts include textual summaries and data-table access.
- Dashboard remains usable at 200% zoom and 320 CSS px.
- Skeletons match final hierarchy and stop within a defined timeout before switching to an error state.

### 28.11 Mobile empty and error states

```text
No projects
“Start a project to organize sources, evidence, claims, and drafts.”
[New project]

No contributions
“Your first contribution can be a perspective, paper review, or tool review.”
[Contribute]

Dashboard offline
“Local drafts and cached library items are available. Updates will sync automatically.”
[View pending changes]

Dashboard load failure
“We could not load all dashboard modules. Your local drafts remain safe.”
[Retry failed modules]
```

Failures should be isolated per module. One failed impact chart must not make Continue Working unavailable.

---

## 29. Dashboard Workstream Roadmap

The dashboard workstream runs in parallel with contribution and editor development because it provides the ownership and return surface for both.

### D0: Discovery and instrumentation, Weeks 1–2

- Inventory current `/dashboard`, `/dashboard/reading`, `/dashboard/account`, and `/dashboard/access` modules.
- Define meaningful research actions and event taxonomy.
- Baseline dashboard usage, return rate, resume-work rate, and module interaction.
- Create dashboard schema migrations and API contracts.
- Define classification-safe analytics.

**Exit criteria:** approved IA, schemas, metrics, wireframes, and privacy review.

### D1: Dashboard foundation, Weeks 3–5

- Build dashboard shell and responsive navigation.
- Add UserProfile, preferences, and module-preference persistence.
- Implement Continue Working aggregation.
- Implement Quick Actions.
- Add module-level loading, empty, error, stale, offline states.
- Add mobile single-column experience.

**Exit criteria:** authenticated users can resume recent work on mobile and desktop.

### D2: Library and contributions, Weeks 5–8

- Migrate bookmarks into Research Library.
- Add collections, read-state, notes, tags, and filtering.
- Build Contribution Pipeline and draft/published tabs.
- Add contributor identity summary and public-profile preview.
- Add impact events and dimensioned recognition.

**Exit criteria:** users can manage saved research and all contribution states.

### D3: Projects and reviews, Weeks 8–12

- Add ResearchProject, members, milestones, tasks, and object linking.
- Build active-project cards and project progress.
- Build review queue, deadlines, rebuttals, and decisions.
- Add attention items for review and project deadlines.

**Exit criteria:** researchers manage active projects and formal review work from the dashboard.

### D4: Sources, evidence, claims, and integrity, Weeks 12–16

- Add source dashboard with recent/cited/corrected/retracted filters.
- Add evidence dashboard with review and integrity-impact counts.
- Add claim dashboard with support, contradiction, and reassessment states.
- Integrate correction/retraction propagation into Attention Queue.

**Exit criteria:** integrity events produce actionable dashboard workflows.

### D5: Network, assistant, and insights, Weeks 16–20

- Add follows, collaborators, reviewers, and topic communities.
- Add assistant tasks and approval history.
- Add private impact and progress analytics.
- Add digest preferences and notification controls.
- Add archive and recovery surface.

**Exit criteria:** dashboard supports identity, network, assistant, insights, and preservation loops.

### D6: Experimentation and optimization, ongoing

Experiments:

```text
A: Continue Working first
B: Attention first

A: Generic quick actions
B: Persona-personalized quick actions

A: Contribution counts
B: Contribution pipeline

A: Views and followers prominent
B: Scholarly recognition prominent
```

Primary metrics:

- Resume-work rate
- Meaningful research actions per weekly active user
- Draft completion
- Review completion
- Project progression
- Second contribution rate
- 7-day and 30-day contributor retention

Guardrails:

- Alert dismissal without resolution
- Low-quality contribution rate
- Accessibility defects
- Notification opt-out
- Dashboard load latency

### 29.1 Roadmap integration

Update the master roadmap:

```text
Phase 0: Audit, instrumentation, dashboard discovery
Phase 1: Foundations + Dashboard D1
Phase 2: Contribution MVP + Dashboard D2
Phase 3: Scholarly editor + Dashboard D3
Phase 4: Social identity + Dashboard D4
Phase 5: Projects/graph + Dashboard D5
Phase 6: Motion/media + Dashboard optimization
Phase 7: Migration, experiments, audits, stable release
```

Dashboard dependencies:

```text
Schemas and permissions → Dashboard foundation
Contribution model → Contribution pipeline
Dexie/autosave → Continue Working and sync alerts
Project model → Project modules
Review model → Review queue
Integrity propagation → Source/evidence/claim alerts
Notification service → Attention and network updates
```

### 29.2 Dashboard definition of done

- [ ] Continue Working resumes the correct object, version, selection, and sync state.
- [ ] Critical attention items are actionable and cannot be silently hidden.
- [ ] Library replaces bookmarks without data loss.
- [ ] Contributions include draft, review, published, archived, and failed states.
- [ ] Projects expose progress, milestones, tasks, collaborators, and linked knowledge objects.
- [ ] Reviews support request, deadline, response, rebuttal, and decision.
- [ ] Integrity events reach affected users and objects.
- [ ] Profile settings control visibility and identity safely.
- [ ] Recognition remains multidimensional and explainable.
- [ ] Mobile, tablet, desktop, and wide layouts pass visual and interaction testing.
- [ ] Dashboard is usable offline for cached content and local drafts.
- [ ] Module failures are isolated.
- [ ] WCAG 2.2 AA, screen-reader, forced-colors, zoom, and reduced-motion tests pass.
- [ ] Server authorization and classification filtering occur before aggregation.
- [ ] Performance targets: dashboard LCP ≤2.5s p75 and initial actionable module ≤1.5s on a typical authenticated session.

---

# Part II: Mobile Responsive Architecture

This part is normative for mobile, foldable, tablet, safe-area, responsive-performance, offline-mobile, and mobile-accessibility implementation. It refines the broader responsive guidance in Part I.

## 1. Responsive breakpoints

Breakpoints are task transitions, not device-brand targets.

| Token | Range | Grid | Default mode |
|---|---:|---:|---|
| `xs` | 320–359px | 4 columns, 16px margins, 12px gutters | Small-phone single task |
| `sm` | 360–479px | 4 columns, 16px margins, 12px gutters | Standard-phone single task |
| `md-phone` | 480–767px | 4 columns, 20px margins, 16px gutters | Large phone/foldable sheets |
| `md` | 768–1023px | 8 columns, 24px margins, 16px gutters | Tablet split view |
| `lg` | 1024–1279px | 12 columns, 32px margins, 24px gutters | Compact desktop workspace |
| `xl` | 1280–1439px | 12 columns, 40px margins, 24px gutters | Three-pane workspace |
| `2xl` | 1440–1919px | 12 columns, 48px margins, 32px gutters | Four-pane knowledge workspace |
| `3xl` | 1920px+ | 12 columns, max 1800px canvas | Research operating environment |

```css
:root {
  --bp-xs: 20rem;
  --bp-sm: 22.5rem;
  --bp-md-phone: 30rem;
  --bp-md: 48rem;
  --bp-lg: 64rem;
  --bp-xl: 80rem;
  --bp-2xl: 90rem;
  --bp-3xl: 120rem;
}
```

CSS custom properties cannot be used directly in media-query conditions in standard CSS. Keep the values in the token source and generate media queries through PostCSS, Sass, Tailwind, TypeScript, or the design-token build.

## 2. Global behavior

### 320–767px

- One primary task at a time.
- No persistent sidebars.
- Header + content + bottom navigation.
- Secondary context opens as an accessible bottom sheet or full-screen view.
- Reading, editor, and dashboard use one-column flow.
- Tables transform to record view unless horizontal comparison is essential.
- Graphs default to semantic list view.

### 768–1023px

- Primary content plus one secondary pane.
- Secondary pane is switchable between Sources, Review, Assistant, Metadata, or Details.
- Navigation becomes a compact rail or side sheet.
- Dashboard uses two columns where module content remains readable.

### 1024–1279px

- Persistent compact navigation.
- Two-column dashboard main area.
- Editor supports Sources/Draft/Assistant, but Assistant should default compact.
- Attention may be a drawer instead of a permanent rail.

### 1280–1439px

- Standard three-pane research workspace.
- Sources 20%, Draft 60%, Assistant 20%.
- Dashboard uses navigation + two-column main + optional attention drawer.

### 1440px+

- Sources 18%, Draft 42%, Review 20%, Assistant 20%.
- Dashboard supports navigation + main grid + attention rail.
- Reading supports TOC + article + research inspector.

## 3. Container rules

```css
.pieme-page {
  inline-size: min(100%, 112.5rem);
  margin-inline: auto;
  padding-inline: 1rem;
}

.pieme-reading {
  inline-size: min(100%, 48rem);
  margin-inline: auto;
}

@media (min-width: 48rem) {
  .pieme-page { padding-inline: 1.5rem; }
}

@media (min-width: 64rem) {
  .pieme-page { padding-inline: 2rem; }
}

@media (min-width: 90rem) {
  .pieme-page { padding-inline: 3rem; }
}
```

Use container queries for reusable modules whose layout depends on module width rather than viewport width.

```css
.dashboard-module { container-type: inline-size; }

@container (min-width: 30rem) {
  .dashboard-module__body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

## 4. Page-specific column behavior

### Feed

- Phones: one card column.
- Tablet: one primary feed plus filter sheet; optional two-card discovery section.
- Desktop: 8-column feed + 4-column discovery rail.
- Wide: 7-column feed + 3-column discovery + 2-column contextual module only when valuable.

### Contribution detail

- Phones: article followed by tab/sheet triggers for Sources, Evidence, Claims, Discuss.
- Tablet: article + selectable inspector.
- Desktop: 70/30 article and research inspector.
- 1440px+: 15/60/25 TOC, article, inspector.

### Dashboard

- Phones: one-column priority stream.
- Tablet: two-column modules, compact navigation.
- Desktop: persistent navigation + two-column main.
- 1440px+: navigation + main grid + attention rail.

### MDX editor

- Phones: draft canvas; Sources, Review, AI use sheets.
- Tablet: 70/30 draft + one secondary pane.
- Desktop: 20/60/20 Sources/Draft/AI.
- 1440px+: 18/42/20/20 Sources/Draft/Review/AI.

### Provenance graph

- Phones: relationship list only by default.
- Tablet: list/graph toggle.
- Desktop: 25/75 list + graph.
- Wide: 20/60/20 filters + graph + details.

## 5. Pane collapse priority

```text
Assistant → Review → Graph → Sources → Draft
```

The Draft pane must remain primary during contribution. Sources, Review, Assistant, and Graph always retain accessible triggers when collapsed.

## 6. Mobile bottom sheets

- Use a labelled dialog with focus containment.
- Offer explicit Close.
- Escape closes when a physical keyboard is present.
- Background is inert.
- Restore focus to the trigger.
- Do not require swipe gestures.
- Default snap points: Review 60%, Sources 75%, Assistant 75%.
- Full-screen mode is available for long source reading, assistant conversations, and conflict resolution.

## 7. Safe areas and browser chrome

```css
.mobile-shell {
  min-block-size: 100dvh;
  padding-block-start: env(safe-area-inset-top);
  padding-block-end: calc(4rem + env(safe-area-inset-bottom));
}

.mobile-bottom-nav {
  padding-block-end: max(.375rem, env(safe-area-inset-bottom));
}
```

Prefer `dvh` over `vh` for full-height mobile overlays. Test Android Chrome address-bar expansion/collapse and iOS Safari safe areas.

## 8. Mobile performance budgets

- Feed route JS: ≤120 KB gzip target.
- Dashboard shell: first actionable module ≤1.5s typical authenticated session.
- Editor route: ≤350 KB gzip initial route target; lazy-load advanced blocks.
- Do not load graph, Remotion Player, Hyperframes, or citation exporters on initial mobile routes.
- Use responsive images with explicit dimensions.
- Font subsets: Latin and Bangla split when practical, while preventing missing-glyph flashes.

# Mobile UI Implementation Checklist

## Navigation and shell

- [ ] Header remains usable from 320px width.
- [ ] Header controls have visible labels for assistive technology.
- [ ] Touch targets are at least 44×44 CSS px; 48×48 preferred.
- [ ] Bottom navigation has no more than five primary destinations.
- [ ] Bottom-navigation labels remain visible.
- [ ] Active location uses `aria-current="page"`.
- [ ] Drawer traps focus, makes background inert, closes by button and Escape, and restores focus.
- [ ] Swipe is never the only drawer or sheet action.
- [ ] Skip-to-content link works with a hardware keyboard.
- [ ] Safe-area insets are respected.

## Responsive layout

- [ ] No primary content is clipped at 320px.
- [ ] Layout passes at 320, 360, 390, 412, 480, 768, 1024, 1280, 1440, and 1920 CSS px.
- [ ] 200% zoom does not hide actions or require two-dimensional scrolling, except essential data comparisons.
- [ ] CSS logical properties support RTL.
- [ ] Component behavior uses container queries where appropriate.
- [ ] Orientation changes preserve active object, scroll, selection, and unsaved state.
- [ ] Foldable layouts do not place critical controls beneath a hinge or fold.

## Dashboard

- [ ] Continue Working appears before generic analytics.
- [ ] Critical integrity, security, and sync alerts remain prominent.
- [ ] Module errors are isolated.
- [ ] Offline state exposes cached library and local drafts.
- [ ] Project, contribution, library, and activity modules have useful empty states.
- [ ] Mobile module reordering has Move up/Move down controls.
- [ ] Recognition is multidimensional; no unexplained score.
- [ ] Charts include textual summaries and table access.

## Feed and reading

- [ ] Feed cards use one column on phones.
- [ ] Card actions do not compete with primary reading.
- [ ] Article text remains 60–72 characters per line at wider widths.
- [ ] Sources, Evidence, Claims, and Discussion are reachable as tabs/sheets.
- [ ] Sticky controls do not cover footnotes or active selections.
- [ ] Citation copy feedback is announced without moving focus.

## Contribution wizard

- [ ] Each screen has one primary decision.
- [ ] User answers persist when moving backward.
- [ ] Source import failure offers retry, manual entry, and safe continuation where allowed.
- [ ] Assistant failure never blocks manual contribution.
- [ ] Evidence attachment supports page, section, figure, table, URL, repository, commit, and line references.
- [ ] Publish is blocked when mandatory sync, provenance, or review requirements fail.
- [ ] Publish failure confirms the local draft is safe.

## MDX editor

- [ ] Draft is the primary mobile surface.
- [ ] Block toolbar remains above browser and device safe areas.
- [ ] Slash commands have an accessible mobile sheet equivalent.
- [ ] Drag-and-drop has keyboard and Move up/Move down alternatives.
- [ ] Drag handles do not prevent document scrolling.
- [ ] Sources, Review, and AI open as accessible sheets.
- [ ] Save state is visible and announced sparingly.
- [ ] Conflict resolution supports full-screen compare/merge.
- [ ] Virtual keyboard does not obscure the active field or toolbar.
- [ ] Text selections survive opening evidence/citation tools when technically possible.

## Forms and input

- [ ] Inputs use correct `type`, `inputMode`, `autocomplete`, and enter-key hints.
- [ ] Labels remain visible; placeholders are not labels.
- [ ] Errors identify the field, problem, and recovery.
- [ ] Error summary links to invalid fields for long forms.
- [ ] Mobile input zoom is not triggered unintentionally; form text is at least 16px where needed.
- [ ] Date/time values respect locale and timezone.
- [ ] DOI, ORCID, URLs, code, and repository IDs remain directionally isolated.

## Accessibility

- [ ] TalkBack + Android Chrome critical flows pass.
- [ ] VoiceOver + iOS Safari critical flows pass when iOS is supported.
- [ ] Voice Access labels uniquely identify controls.
- [ ] Switch Access can reach and activate all functions.
- [ ] Focus order matches reading/task order.
- [ ] Focus returns after drawers, sheets, dialogs, and full-screen overlays.
- [ ] Forced-colors/high-contrast states remain understandable.
- [ ] Reduced-motion mode removes slide/parallax/continuous effects without removing information.
- [ ] Status is never color-only.
- [ ] Live regions do not announce every autosave keystroke.

## Offline, sync, and recovery

- [ ] Cached content is labelled with freshness status.
- [ ] Local drafts survive refresh, process termination, and temporary disconnection.
- [ ] Pending mutation count is visible.
- [ ] Reconnection resumes sync automatically.
- [ ] Idempotent retries do not duplicate content.
- [ ] Conflicts preserve local and server versions.
- [ ] Permission revocation stops writes while retaining recoverable local work.
- [ ] Publishing requires required data to be synchronized.

## Security and privacy

- [ ] Sensitive content is excluded from mobile analytics, crash reports, notifications, and lock-screen previews.
- [ ] Push notification previews honor classification and anonymity.
- [ ] Tokens and secrets are not stored in localStorage.
- [ ] IndexedDB data follows retention and logout-clearing policy.
- [ ] Restricted exports require confirmation and audit logging.
- [ ] Screenshots and screen sharing risks are disclosed for restricted workspaces where policy requires it.

## Performance and quality

- [ ] Core Web Vitals are measured on mid-range Android hardware and constrained networks.
- [ ] Long lists virtualize without breaking accessibility.
- [ ] Route bundles meet mobile budgets or have approved exceptions.
- [ ] Skeletons time out into module-level errors.
- [ ] Images declare dimensions and responsive sources.
- [ ] Tests cover browser back/forward, refresh, orientation change, and interrupted upload.

## Release evidence

- [ ] Responsive screenshots for required widths.
- [ ] TalkBack test log.
- [ ] Keyboard/switch-access test log.
- [ ] Mobile performance trace.
- [ ] Offline/reconnection recording.
- [ ] Conflict-resolution test.
- [ ] Push-notification privacy review.
- [ ] Device and browser support matrix.

---

# Part III: Responsive Component Contracts

This part is normative at component level. Every stable component must implement its documented anatomy, variants, states, responsive transformations, accessibility behavior, localization behavior, permission behavior, and test evidence.

**Product:** ResearchWithME  
**Design system:** πeme / ResearchWithME Design System  
**Version:** 1.0  
**Status:** Implementation specification  
**Target:** Next.js/React, TypeScript, PostgreSQL/Prisma, responsive web and PWA  

---

## 1. Normative Language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative. A stable component is conformant only when its anatomy, responsive behavior, accessibility contract, localization behavior, permission states, error states, and tests are implemented.

## 2. Responsive Foundations

### 2.1 Breakpoints

| Token | Range | Grid | Default product mode |
|---|---:|---:|---|
| `xs` | 320–359px | 4 columns; 16px margin; 12px gutter | Small-phone single task |
| `sm` | 360–479px | 4 columns; 16px margin; 12px gutter | Standard-phone single task |
| `md-phone` | 480–767px | 4 columns; 20px margin; 16px gutter | Large phone/foldable sheets |
| `md` | 768–1023px | 8 columns; 24px margin; 16px gutter | Tablet split view |
| `lg` | 1024–1279px | 12 columns; 32px margin; 24px gutter | Compact desktop workspace |
| `xl` | 1280–1439px | 12 columns; 40px margin; 24px gutter | Three-pane workspace |
| `2xl` | 1440–1919px | 12 columns; 48px margin; 32px gutter | Four-pane knowledge workspace |
| `3xl` | 1920px+ | 12 columns; max 1800px canvas | Research operating environment |

### 2.2 Component sizing tokens

```ts
export const responsiveTokens = {
  control: {
    minTouchTarget: 44,
    preferredTouchTarget: 48,
    compactHeight: 32,
    defaultHeight: 40,
    mobileHeight: 48,
  },
  content: {
    readingMax: '48rem',
    formMax: '40rem',
    workspaceMax: '112.5rem',
    optimalLineLength: '60ch',
    maximumLineLength: '72ch',
  },
  pane: {
    compactRail: 72,
    sourceMin: 256,
    sourceDefault: 304,
    assistantMin: 288,
    assistantDefault: 352,
    assistantMax: 420,
    reviewMin: 272,
    reviewDefault: 304,
  },
} as const;
```

### 2.3 Universal responsive rules

- Components MUST reflow rather than scale down text or controls.
- Critical actions MUST remain visible or reachable within one interaction.
- Component layout SHOULD use container queries when the component can appear in differently sized panes.
- Mobile MUST present one primary task at a time.
- Secondary context on phones MUST open as a bottom sheet, full-screen dialog, or dedicated route.
- Horizontal scrolling MUST be limited to essential comparisons, code, timelines, or intentionally scrollable chips.
- Every component MUST remain functional at 320 CSS px and 200% browser zoom.
- Touch actions MUST have at least a 44×44 CSS px effective target.
- Components MUST support light, dark, forced-colors, reduced-motion, English, Bangla, and RTL layouts.

---

## 3. Global Application Shell

### 3.1 Anatomy

1. Skip link
2. Global header
3. Navigation drawer or rail
4. Main content
5. Contextual rail, when applicable
6. Mobile bottom navigation
7. Public footer or workspace utility footer
8. Global announcement region

### 3.2 Responsive behavior

| Width | Behavior |
|---|---|
| 320–767px | Sticky mobile header; drawer navigation; single main column; bottom navigation |
| 768–1023px | Header; compact side rail or side sheet; main content; one optional secondary pane |
| 1024–1279px | Persistent compact navigation; main content; contextual drawer/rail |
| 1280–1439px | Persistent navigation; main content; optional assistant or attention rail |
| 1440px+ | Persistent navigation; content grid; dedicated contextual rail |

### 3.3 Accessibility

- Main content MUST have `id="main-content"` and a matching skip link.
- Only one `main` landmark is allowed.
- Navigation must be labelled by purpose.
- Global status changes use one polite live region.
- Sticky elements MUST not obscure focused content.

---

## 4. Global Header

### 4.1 Variants

- `public`
- `authenticated`
- `reading`
- `editor`
- `dashboard`

### 4.2 Public/authenticated desktop anatomy

```text
Brand | Explore | Sources | Tools | Projects | Assistant
Search | Contribute | Library/Notifications | Profile
```

### 4.3 Mobile anatomy

```text
Menu | Context title/Brand | Search | Contribute | Avatar
```

At widths below 360px, the visible brand MAY abbreviate, but the accessible name remains “ResearchWithME.”

### 4.4 Behavior

- Height: 56px on phone, 64px at `md` and above.
- Header MAY compact during downward scroll, but MUST expand when keyboard focus enters it.
- Search opens a full-screen search interface on phones.
- Contribute remains one tap away.
- Reading header replaces global navigation with Back, title, Save, Cite, and More.
- Editor header shows Back, title, save state, review issues, and Publish.

### 4.5 States

```text
default · scrolled · offline · syncing · conflict
anonymous · authenticated · restricted-context · loading
```

### 4.6 Accessibility

- Icon buttons require unique accessible labels.
- Focus order: Menu, Brand, Search, Contribute, Profile.
- Do not hide focused controls during scroll compaction.
- Save-state announcements MUST be throttled.

---

## 5. Mobile Navigation Drawer

### 5.1 Anatomy

1. Dialog title
2. Close button
3. Primary navigation
4. Personal navigation
5. Workspace navigation
6. Utility links
7. Account action
8. Optional offline/sync summary

### 5.2 Navigation groups

```text
Explore
Sources
Tools
Projects
Assistant

Dashboard
Library
Drafts
Contributions
Reviews

Settings
Help
Sign out
```

### 5.3 Behavior

- Phone: modal drawer, max width `min(88vw, 22rem)`.
- Tablet: side sheet, 20–24rem.
- Desktop: replaced by persistent rail/sidebar.
- Opening makes the background inert and moves focus to Close or the drawer heading.
- Escape, Close, or overlay click closes it.
- Swipe MAY supplement but never replace explicit closing.
- Focus returns to the opener.

### 5.4 Motion

- Default: 200ms enter and 160ms exit.
- Reduced motion: no translation; instant or opacity-only transition.

---

## 6. Bottom Navigation

### 6.1 Destinations

```text
Explore | Library | Contribute | AI | Profile
```

### 6.2 Responsive behavior

- Visible below 768px, except immersive reading, media, or editor focus modes.
- Editor substitutes the block/action toolbar when text editing is active.
- Respect `env(safe-area-inset-bottom)`.
- Labels remain visible at all supported phone widths.

### 6.3 Accessibility

- Use a `nav` with a unique label.
- Current route uses `aria-current="page"`.
- Contribute is visually emphasized without receiving a custom tab order.

---

## 7. Responsive Pane System

### 7.1 Pane states

```ts
export type PaneState =
  | 'expanded'
  | 'compact'
  | 'collapsed'
  | 'hidden'
  | 'floating'
  | 'fullscreen';
```

### 7.2 Pane contract

```ts
export interface ResponsivePaneProps {
  id: string;
  title: string;
  state: PaneState;
  minSize?: number;
  defaultSize?: number;
  maxSize?: number;
  priority: number;
  collapsible?: boolean;
  resizable?: boolean;
  onStateChange: (state: PaneState) => void;
  children: React.ReactNode;
}
```

### 7.3 Collapse priority

```text
Assistant → Review → Graph → Sources → Draft
```

Draft MUST remain primary during contribution workflows.

### 7.4 Responsive layouts

| Width | Layout |
|---|---|
| 320–767px | One active pane; other panes as sheets/routes |
| 768–1023px | Draft 70%; one secondary pane 30% |
| 1024–1279px | Sources 22%; Draft 56%; Assistant 22% compact/expanded |
| 1280–1439px | Sources 20%; Draft 60%; Assistant 20% |
| 1440px+ | Sources 18%; Draft 42%; Review 20%; Assistant 20% |

### 7.5 Persistence

Pane state is stored per workspace and device class. A user’s mobile choice MUST NOT overwrite desktop pane preferences.

---

## 8. Responsive Dashboard Shell

### 8.1 Anatomy

1. Dashboard header
2. Identity/greeting summary
3. Continue Working
4. Quick Actions
5. Attention Queue
6. Active Projects
7. Contribution Pipeline
8. Library Summary
9. Activity
10. Recognition
11. Assistant tasks

### 8.2 Mobile order

```text
Critical sync/integrity alert
Identity summary
Continue Working
Quick Actions
Attention Queue
Projects
Contributions
Library
Activity
Recognition
Assistant
```

### 8.3 Layout

| Width | Layout |
|---|---|
| 320–767px | Single priority stream |
| 768–1023px | Two-column modules; compact navigation |
| 1024–1279px | Persistent navigation + two-column main |
| 1280–1439px | Persistent navigation + responsive main grid |
| 1440px+ | Navigation + main grid + attention rail |

### 8.4 Module rules

- Each module is a labelled `section` with an H2.
- Module failures are isolated.
- Each module supports loading, ready, empty, stale, partial, offline, and error.
- Mobile shows a useful summary and “View all,” not a compressed desktop module.
- Reordering on mobile uses Move up/Move down controls rather than drag only.

---

## 9. Dashboard Module

### 9.1 Props

```ts
export interface DashboardModuleProps {
  id: string;
  title: string;
  description?: string;
  status: 'loading'|'ready'|'empty'|'stale'|'partial'|'offline'|'error';
  size: 'small'|'medium'|'large'|'full';
  actions?: React.ReactNode;
  children: React.ReactNode;
}
```

### 9.2 Container behavior

```css
.dashboard-module { container-type: inline-size; }
.dashboard-module__body { display: block; }

@container (min-width: 30rem) {
  .dashboard-module__body[data-layout="adaptive-grid"] {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
```

### 9.3 Empty/error behavior

Empty state describes the benefit and one primary action. Error state explains what failed and confirms whether local data is safe.

---

## 10. Continue Working Card

### 10.1 Anatomy

- Object type
- Title
- Project/context
- Last activity
- Progress or review state
- Sync state
- Attention reason
- Primary resume action
- Secondary actions

### 10.2 Layout

- Phone: full-width card; primary action spans width.
- Tablet: horizontal summary with action at end.
- Desktop: up to three cards in a responsive grid.

### 10.3 Priority

Conflict/recovery > review deadline > active draft > active project > recently read source.

### 10.4 Accessibility

Card container is not clickable as a whole when it contains multiple actions. Use an explicit title link and buttons.

---

## 11. Attention Item

### 11.1 Severity

```text
info · warning · high · critical
```

### 11.2 Anatomy

- Severity icon and text
- Title
- Explanation
- Object context
- Due time when relevant
- Primary resolution action
- Acknowledge/dismiss when policy permits

### 11.3 Mobile

- Critical and high remain expanded.
- Warning and info MAY group behind “View all.”
- Integrity and permission alerts cannot disappear due to a failed analytics request.

---

## 12. Research Feed Card

### 12.1 Variants

```text
paper-review · tool-review · perspective · research-note
question · replication-report · literature-summary
```

### 12.2 Anatomy

- Contribution type
- Author identity
- Title/statement
- Source/tool context
- Key takeaway
- Trust/disclosure summary
- Save, Reference, Discuss, Share perspective
- Time and language

### 12.3 Responsive behavior

- Phone: one-column card; actions in two rows or overflow menu.
- Tablet: media/context may appear beside text.
- Desktop: compact and feature variants.
- Never use masonry for the primary feed.

### 12.4 Content limits

- Title: 2–3 lines.
- Summary: 3–5 lines on phone, 4–6 on desktop.
- Trust indicators: at most three summarized; others disclosed on demand.

---

## 13. Source Card

### 13.1 Required content

- Original title
- Translation/transliteration labels
- Contributors
- Publication date
- Type
- Version
- Persistent identifiers
- Access state
- Integrity state
- Language

### 13.2 Responsive behavior

- Phone: stacked metadata; identifiers in a scroll-safe wrapping region.
- Tablet: title and status left; identifiers/actions right.
- Desktop: compact list and expanded inspector variants.

### 13.3 Integrity behavior

Correction, expression of concern, retraction, or withdrawal MUST precede ordinary metadata and include the effective date and notice link.

---

## 14. Evidence Card

### 14.1 Required content

- Evidence statement
- Source and version
- Structured locator
- Extraction type
- Review, replication, certainty, consensus, integrity
- Limitation
- AI disclosure
- Relationship counts
- Capability-aware actions

### 14.2 Variants

```text
default · compact · comparison · read-only · archived · impacted
```

### 14.3 Responsive behavior

- Phone: statement first; metadata disclosed in sections; bottom-sheet actions.
- Tablet: statement plus assessment summary.
- Desktop: full metadata and relationship actions.
- Comparison: record-by-record on phone; columns only when each remains at least 18rem.

### 14.4 Mobile action order

```text
Inspect source → Add support/contradiction → Save → More
```

---

## 15. Claim Card

### 15.1 Required content

- Claim statement and type
- Author/version
- Lifecycle
- Supporting, contradictory, qualifying evidence counts
- Assessment dimensions
- Integrity impact
- Responsible reviewer

### 15.2 Responsive behavior

- Phone: statement, status, summary counts, expandable details.
- Desktop: relationship summary and reviewer state visible.
- Causal claims use an explicit textual label and warning when support is weaker than the claim.

---

## 16. Citation Component

### 16.1 Modes

```text
inline · short · full · machine-readable · copied
```

### 16.2 Responsive behavior

- Inline citation never causes horizontal overflow.
- Full citation wraps URLs and identifiers safely.
- Style selector becomes a sheet on phone.
- Copy actions announce success without moving focus.

### 16.3 Formats

APA, MLA, Chicago, Vancouver, BibTeX, RIS, CSL-JSON, DOI, internal stable ID.

---

## 17. Contribution Wizard

### 17.1 Steps

```text
Type → Source → Interview → Draft → Evidence → Disclosure → Publish
```

### 17.2 Phone layout

- One step per screen.
- Sticky Back and Continue/Publish controls.
- Step progress is textual, e.g. “Step 3 of 7.”
- Sources, evidence, and AI tools open full-screen or as sheets.
- User input persists across backward navigation.

### 17.3 Desktop layout

- Source context 20%
- Contribution workspace 60%
- Assistant 20%

At 1440px+, add Review as a fourth pane.

### 17.4 States

```text
idle · loading · source-not-found · assistant-failed
draft-generation-failed · validation-error · offline
syncing · conflict · permission-denied · publish-failed · published
```

---

## 18. MDX Editor Shell

### 18.1 Anatomy

- Editor header
- Sources pane
- Draft canvas
- Review pane
- Assistant pane
- Block toolbar
- Slash-command menu
- Sync indicator
- Mobile panel triggers

### 18.2 Phone

- Draft canvas only.
- Bottom block toolbar: Text, Evidence, Claim, Source, More.
- Sources, Review, and AI open sheets.
- Virtual keyboard cannot cover the active block or toolbar.

### 18.3 Tablet

- Draft 70%; one selected secondary pane 30%.

### 18.4 Desktop

- 20/60/20 Sources/Draft/Assistant.

### 18.5 Wide

- 18/42/20/20 Sources/Draft/Review/Assistant.

### 18.6 Save state

```text
editing · saving · saved · synced · offline · conflict · failed
```

Only meaningful state changes are announced. Do not announce every save cycle.

---

## 19. Editor Block

### 19.1 Anatomy

- Drag/reorder handle
- Block type
- Review/integrity state
- Block editing form
- Duplicate/Delete/More
- Validation message

### 19.2 Mobile behavior

- Drag is optional enhancement.
- Provide Move up and Move down.
- Handle target 44×44px minimum.
- Form inputs are at least 16px to avoid unintended mobile zoom.

### 19.3 Desktop behavior

- Keyboard and pointer sorting via dnd-kit.
- Drag activation threshold prevents accidental drags during text selection.
- Editing region never acts as the drag handle.

---

## 20. Slash Command Menu

### 20.1 Commands

```text
/text /heading /source /evidence /claim /citation
/limitation /review /question /tool /dataset /figure
```

### 20.2 Phone

Typing `/` opens a searchable bottom sheet. The mobile toolbar’s More action opens the same registry.

### 20.3 Desktop

Anchored listbox near the active block. Arrow keys change active option; Enter inserts; Escape closes.

### 20.4 Accessibility

Use a combobox/listbox pattern or a dialog-backed command menu, not a visually styled unlabelled list.

---

## 21. Bottom Sheet

### 21.1 Variants

```text
source · evidence · review · assistant · actions · search · conflict
```

### 21.2 Sizes

- Compact: 40% viewport height.
- Medium: 60%.
- Large: 75%.
- Fullscreen: long tasks or conflicts.

### 21.3 Behavior

- Use `100dvh` for fullscreen.
- Focus containment and return required.
- Explicit close button required.
- Scroll area and drag handle must not conflict.
- Reduced motion removes sliding.

---

## 22. Search Interface

### 22.1 Phone

Full-screen dialog with auto-focused search field, type filters, recent searches, and results.

### 22.2 Desktop

Header search may expand into a command/search overlay.

### 22.3 Result anatomy

- Match reason
- Search mode
- Source type
- Date
- Access
- Integrity
- Workspace annotations
- AI expansion disclosure

### 22.4 States

```text
idle · typing · loading · results · no-results · partial · offline · error
```

---

## 23. Research Library

### 23.1 Phone

```text
Search
Recent
Collections
Sources
Papers
Tools
Contributions
```

Use list/card views, not a desktop table.

### 23.2 Tablet/Desktop

Filter rail + results. Filter rail becomes sheet below 768px.

### 23.3 Item states

Unread, in progress, completed, archived, stale source, corrected source, retracted source.

---

## 24. Project Card

### 24.1 Content

- Title
- Stage
- Progress
- Next milestone
- Source/Evidence/Claim/Draft counts
- Collaborators
- Last activity
- Attention state

### 24.2 Responsive behavior

- Phone: stacked, progress textual and visual, one primary action.
- Tablet: two-column project grid.
- Desktop: 2–4 columns depending container width.

---

## 25. Review Queue Item

### 25.1 Content

- Review type
- Object
- Requester/reviewer identity according to anonymity policy
- Due time
- Current status
- Outstanding review items
- Primary action

### 25.2 Mobile

Do not expose anonymous identity in URLs, visible text, notifications, or accessible labels.

---

## 26. Provenance Graph

### 26.1 Responsive representations

- Phone: hierarchical relationship list.
- Tablet: list/graph toggle.
- Desktop: list 25%, graph 75%.
- Wide: filters 20%, graph 60%, details 20%.

### 26.2 Accessibility

- Every graph has an equivalent navigable list/table.
- Nodes and relationships use explicit text.
- Keyboard users can move between nodes and inspect relationships.
- Color and line style are not the only signals.

---

## 27. Data Table and Record View

### 27.1 Desktop

Use semantic table markup, sticky headers, tabular numerals, units in headers, and column controls.

### 27.2 Mobile

Transform to record cards when horizontal comparison is not essential. For essential comparison, preserve a labelled horizontal scroll region with sticky first column.

### 27.3 Missing values

Render “Not reported,” never zero or an unexplained dash.

---

## 28. Notifications and Push Preferences

### 28.1 In-app item

- Type
- Title
- Concise body
- Object context
- Time
- Read state
- Primary action

### 28.2 Mobile privacy

Push and lock-screen previews MUST obey classification and anonymous-review policy. Restricted content uses safe generic copy, such as “A restricted workspace has an update.”

### 28.3 Responsive behavior

- Phone: dedicated route or full-screen sheet.
- Desktop: popover preview plus full page.

---

## 29. Profile Dashboard

### 29.1 Phone layout

```text
Identity header
Profile completeness
Research interests
Contribution summary
Projects
Recognition
Activity tabs
Edit profile
```

### 29.2 Tablet/Desktop

- Profile rail 25%.
- Contribution/activity area 50%.
- Expertise/recognition rail 25%.

### 29.3 Recognition

Display dimensions separately: references, helpful reviews, evidence reuse, accepted corrections, replications, completed reviews.

---

## 30. Responsive Component State Matrix

Every stable data component MUST define:

| State | Required treatment |
|---|---|
| Loading | Skeleton matching final hierarchy; finite timeout |
| Ready | Full interaction |
| Empty | Benefit statement + one primary action |
| Stale | Visible freshness label; refresh action |
| Partial | Identify unavailable subset |
| Offline | Explain cached/local availability |
| Permission denied | Explain access and request path |
| Restricted | Classification-safe summary |
| Embargoed | Release condition when authorized |
| Sync pending | Pending count and safe local state |
| Conflict | Preserve local/remote versions and compare action |
| Error | What failed, what is safe, recovery action |
| Archived | Read-only with restore when permitted |
| Corrected | Integrity notice before normal content |
| Retracted | Prominent notice; downstream review state |

---

## 31. Responsive Test Matrix

### Required widths

```text
320, 360, 390, 412, 480, 768, 1024, 1280, 1440, 1920 CSS px
```

### Required modes

```text
light · dark · forced colors · reduced motion
English · Bangla · mixed script · RTL pseudo fixture
online · offline · sync pending · conflict
anonymous · authenticated · restricted · embargoed
```

### Required interaction inputs

```text
mouse · touch · keyboard · TalkBack · VoiceOver
Voice Access · Switch Access
```

### Component acceptance template

```ts
interface ResponsiveAcceptanceEvidence {
  component: string;
  screenshots: string[];
  keyboardTest: string;
  screenReaderTest: string;
  forcedColorsTest: string;
  reducedMotionTest: string;
  localizationTest: string;
  performanceResult?: string;
  knownExceptions: string[];
}
```

---

## 32. Implementation Priorities

### P0

1. Application shell
2. Mobile header and drawer
3. Bottom navigation
4. Dashboard shell and modules
5. Contribution Wizard
6. MDX editor shell and blocks
7. Bottom sheet
8. Save/sync/conflict states
9. Source, Evidence, Claim, Citation cards
10. Accessible table/record transformation

### P1

1. Research Library
2. Project cards and dashboard
3. Review queue
4. Search interface
5. Profile dashboard
6. Assistant pane/sheet
7. Provenance list/graph

### P2

1. Advanced graph controls
2. Personal module rearrangement
3. Foldable dual-pane enhancements
4. Rich dashboard visualization
5. Remotion/Hyperframes previews

---

## 33. Definition of Done

A responsive component is complete only when:

- It works at every required width without clipped primary content.
- Mobile retains full capability through appropriate sheets/routes.
- Keyboard, touch, screen-reader, voice, and switch-access paths work.
- Loading, empty, stale, partial, offline, conflict, permission, error, corrected, and retracted states exist where applicable.
- English, Bangla, mixed-script, and RTL layouts pass.
- Light, dark, forced-colors, zoom, and reduced-motion modes pass.
- Permissions and classifications are enforced before rendering sensitive content.
- Visual-regression and interaction tests are in CI.
- Required evidence is attached to the component’s Storybook or documentation page.

---

# Part IV: Integrated Delivery Gates and Evidence Package

## 1. Source-of-truth artifacts

The repository must contain:

```text
docs/
├── ResearchWithME-master-refactor-plan-v3.md
├── current-state-audit.md
├── component-inventory.md
├── token-inventory.md
├── accessibility-baseline.md
├── migration-plan.md
├── risk-register.md
├── mobile-test-matrix.md
└── release-evidence/

prisma/
└── schema.prisma

packages/
├── schemas/
├── tokens/
├── react/
├── editor/
├── graph/
├── remotion/
├── hyperframes/
└── testing/
```

## 2. Cross-workstream release gates

### Product and ownership

- [ ] The primary creation action is contribution-oriented.
- [ ] The Feed, Dashboard, Library, Profile, Projects, and Contribution Wizard form a continuous ownership loop.
- [ ] Continue Working restores the correct object, version, selection, pane state, and sync state.
- [ ] Reputation is multidimensional and explainable.

### Full-stack architecture

- [ ] Canonical schemas exist for users, workspaces, projects, contributions, sources, versions, evidence, claims, reviews, drafts, integrity events, notifications, and audit events.
- [ ] Prisma relations validate in the target repository.
- [ ] Server authorization and classification filtering occur before aggregation or rendering.
- [ ] API writes that may retry are idempotent.
- [ ] Optimistic concurrency prevents stale overwrites.

### Responsive experience

- [ ] Required widths pass: 320, 360, 390, 412, 480, 768, 1024, 1280, 1440, and 1920 CSS px.
- [ ] Phone experiences preserve full capability through sheets, dialogs, or dedicated routes.
- [ ] Tablet supports one secondary pane.
- [ ] Desktop pane collapse follows Assistant, Review, Graph, Sources, Draft.
- [ ] Orientation changes preserve active object, selection, scroll, and unsaved state.
- [ ] Safe-area and dynamic viewport behavior pass on Android Chrome and iOS Safari where supported.

### Accessibility

- [ ] WCAG 2.2 AA audit passes.
- [ ] Critical flows pass keyboard, TalkBack, VoiceOver, Voice Access, and Switch Access testing.
- [ ] Drag-and-drop has keyboard and move-button alternatives.
- [ ] Focus containment and return work for drawers, sheets, dialogs, and full-screen overlays.
- [ ] Forced colors, reduced motion, 200% zoom, and 320 CSS px reflow pass.

### Scholarly integrity

- [ ] Evidence resolves to a source version and structured locator.
- [ ] Review, replication, certainty, consensus, and source integrity remain independent.
- [ ] Corrections and retractions propagate to affected evidence, claims, drafts, reviews, and publications.
- [ ] AI provenance and human review are recorded.
- [ ] Publication blockers prevent unsupported, unresolved, mismatched, restricted, or undisclosed output.

### Editor and persistence

- [ ] Structured JSON is the canonical editor state.
- [ ] MDX serialization is deterministic and restricted to an allowlist.
- [ ] Slash commands and block forms work by touch and keyboard.
- [ ] Dexie drafts survive reload, temporary disconnection, and process termination.
- [ ] Reconnection resumes synchronization.
- [ ] Conflicts preserve local and server versions and provide compare/merge.
- [ ] Publishing requires mandatory synchronized provenance and review data.

### Performance and security

- [ ] Application shell, feed, editor, graph, and dashboard budgets pass or have approved exceptions.
- [ ] The first actionable dashboard module is available within 1.5 seconds for a typical authenticated session.
- [ ] LCP is at most 2.5 seconds p75, INP at most 200ms p75, and CLS at most 0.1 p75.
- [ ] Sensitive content is excluded from analytics, crash reports, push previews, and logs.
- [ ] MDX and generated media render in constrained, isolated environments.

## 3. Required release evidence

```text
Architecture decisions
Schema validation report
Migration SQL review
API contract tests
Responsive screenshots
Visual-regression report
Keyboard test report
TalkBack test report
VoiceOver test report
Forced-colors screenshots
Reduced-motion recordings
Bangla and RTL screenshots
Offline and reconnection recording
Conflict-resolution recording
Retraction propagation test
AI citation-validation test
Prompt-injection test
Performance traces
Bundle reports
Security and privacy review
Rollback procedure
Approved exception register
```

## 4. Master roadmap integration

```text
Phase 0: Audit, instrumentation, dashboard discovery, baseline evidence
Phase 1: Schemas, permissions, tokens, themes, mobile shell, dashboard foundation
Phase 2: Contribution MVP, Library, contribution pipeline, responsive primitives
Phase 3: Scholarly editor, MDX blocks, autosave, offline sync, projects and reviews
Phase 4: Social identity, profile dashboard, integrity-aware sources/evidence/claims
Phase 5: Projects, graph, network, assistant tasks, insights, archive
Phase 6: Remotion, Hyperframes, generated-media provenance, mobile optimization
Phase 7: Legacy migration, experiments, audits, performance, stable release
```

## 5. Final acceptance statement

ResearchWithME v3 is ready only when visitors can discover, save, contribute, review, and build on research objects; contributors can work safely on phones and desktops; drafts survive disconnection and conflict; scholarly claims remain traceable; AI assistance remains disclosed and reviewable; profiles and dashboards create a durable sense of ownership; and the platform passes its accessibility, integrity, privacy, security, and performance gates.

---

# Part V: Implementation Architecture, API Contracts, Database Integration, and Execution Checklist

This part closes implementation gaps left by the strategic and responsive sections. It is normative for repository structure, design-system packaging, API conventions, authorization, persistence, background processing, observability, feature delivery, database migration, test automation, and release execution.

## 1. Reference Technology Architecture

The plan assumes the current application remains a Next.js and React application unless the repository audit proves otherwise. Recommended reference stack:

```yaml
runtime:
  node: '22 LTS or the repository-approved supported release'
frontend:
  framework: Next.js App Router
  language: TypeScript strict
  react: React
  styling: CSS variables plus CSS Modules or Tailwind consuming generated tokens
  server_state: TanStack Query where client caching is required
  forms: React Hook Form plus Zod
  editor: Plate or Lexical with typed ResearchWithME blocks
  drag_and_drop: dnd-kit
  offline: Dexie and IndexedDB
backend:
  api: Next.js Route Handlers and Server Actions where appropriate
  database: PostgreSQL
  orm: Prisma
  cache: Redis-compatible service when justified
  jobs: durable queue such as BullMQ, Trigger.dev, Inngest, or Azure Service Bus
search:
  initial: PostgreSQL full-text and trigram search
  scale_option: Azure AI Search, OpenSearch, Typesense, or Meilisearch
object_storage:
  preferred: Azure Blob Storage or S3-compatible storage
observability:
  errors: Sentry
  telemetry: OpenTelemetry
  product_analytics: PostHog with privacy-safe event properties
quality:
  unit: Vitest
  components: React Testing Library and Storybook
  e2e: Playwright
  accessibility: axe-core plus manual assistive-technology testing
```

The repository audit may retain equivalent established tools. New infrastructure must not be introduced merely to match this list.

## 2. Target Repository Structure

```text
apps/
├── web/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (authenticated)/
│   │   ├── dashboard/
│   │   ├── contribute/
│   │   ├── editor/
│   │   └── api/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── styles/
└── worker/
    ├── integrity/
    ├── notifications/
    ├── indexing/
    └── render/

packages/
├── schemas/
├── tokens/
├── ui/
├── research-components/
├── editor/
├── graph/
├── permissions/
├── api-contracts/
├── database/
├── search/
├── notifications/
├── observability/
├── remotion/
├── hyperframes/
└── testing/

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

docs/
├── architecture/
├── design-system/
├── api/
├── accessibility/
├── research-integrity/
├── migration/
└── release-evidence/
```

If the current repository is not a monorepo, preserve deployment stability and implement the same boundaries inside `src/` before extracting packages.

## 3. Design-System Implementation Contract

### 3.1 Token source hierarchy

```text
primitive → semantic → component → application composition
```

Application components must not consume primitive tokens directly.

```json
{
  "color": {
    "primitive": {
      "neutral.0": "#ffffff",
      "neutral.950": "#0b100f",
      "indigo.600": "#4f46e5",
      "emerald.600": "#059669"
    },
    "semantic": {
      "canvas": "{color.primitive.neutral.0}",
      "text.primary": "{color.primitive.neutral.950}",
      "action.primary": "{color.primitive.indigo.600}",
      "knowledge.evidence": "{color.primitive.emerald.600}"
    }
  }
}
```

### 3.2 Package exports

```json
{
  "name": "@researchwithme/tokens",
  "version": "3.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/tokens.js",
    "./css": "./dist/tokens.css",
    "./tailwind": "./dist/tailwind-preset.js",
    "./remotion": "./dist/remotion.js",
    "./hyperframes": "./dist/hyperframes.css"
  }
}
```

### 3.3 Theme bootstrap

```tsx
export function ThemeScript() {
  const code = `
    try {
      const saved = localStorage.getItem('rwm-theme');
      const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved === 'light' || saved === 'dark'
        ? saved
        : systemDark ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {}
  `;

  return <script dangerouslySetInnerHTML={{__html: code}} />;
}
```

A strict Content Security Policy should use a nonce or external bootstrap file rather than allowing arbitrary inline scripts.

### 3.4 Core component API convention

```ts
export interface StableComponentProps {
  id?: string;
  className?: string;
  density?: 'compact' | 'comfortable' | 'spacious';
  state?: 'ready' | 'loading' | 'empty' | 'stale' | 'offline' | 'error';
  'data-testid'?: string;
}
```

Stable components must:

- forward refs where a native interactive element exists;
- accept standard HTML attributes where safe;
- preserve native semantics;
- expose controlled state for consequential behavior;
- avoid hidden application authority;
- publish Storybook stories for every documented state.

### 3.5 Responsive primitive example

```tsx
interface ResponsivePaneProps {
  id: string;
  title: string;
  state: PaneState;
  priority: number;
  collapsible?: boolean;
  children: React.ReactNode;
  onStateChange(state: PaneState): void;
}

export function ResponsivePane({
  id,
  title,
  state,
  children,
  onStateChange,
}: ResponsivePaneProps) {
  return (
    <section
      id={id}
      data-pane-state={state}
      aria-label={title}
      hidden={state === 'hidden'}
      className="pieme-pane"
    >
      <header className="pieme-pane__header">
        <h2>{title}</h2>
        <button
          type="button"
          aria-controls={id}
          aria-expanded={state === 'expanded'}
          onClick={() => onStateChange(state === 'expanded' ? 'collapsed' : 'expanded')}
        >
          {state === 'expanded' ? 'Collapse' : 'Expand'}
        </button>
      </header>
      <div className="pieme-pane__body">{children}</div>
    </section>
  );
}
```

## 4. Authentication, Authorization, and Permissions

### 4.1 Capability vocabulary

```ts
export type Capability =
  | 'workspace:view'
  | 'workspace:manage'
  | 'source:create'
  | 'source:view'
  | 'source:edit'
  | 'evidence:create'
  | 'evidence:edit'
  | 'claim:create'
  | 'claim:edit'
  | 'contribution:create'
  | 'contribution:edit'
  | 'contribution:publish'
  | 'review:request'
  | 'review:submit'
  | 'review:decide'
  | 'data:export'
  | 'permissions:manage'
  | 'retention:manage';
```

### 4.2 Server-side authorization helper

```ts
export async function requireCapability(
  userId: string,
  capability: Capability,
  resource: {workspaceId: string; classification: DataClassification},
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {workspaceId_userId: {workspaceId: resource.workspaceId, userId}},
  });

  const decision = evaluateCapability({
    userId,
    role: membership?.role,
    capability,
    classification: resource.classification,
  });

  if (!decision.allowed) {
    throw new AuthorizationError(decision.reasonCode);
  }

  return decision;
}
```

Every API route must authorize the actual resource after loading its workspace and classification. Hiding UI controls is not authorization.

### 4.3 Classification rules

| Classification | Default audience | External AI | Public export |
|---|---|---|---|
| Public | Everyone | Allowed provider policy | Allowed |
| Workspace | Members | Approved providers only | Permission required |
| Confidential | Explicit members | Restricted | Confirmation and audit |
| Restricted | Named principals | Prohibited by default | Prohibited by default |
| Embargoed | Policy-defined roles | Policy-defined | Blocked until condition |

## 5. Canonical API Standards

### 5.1 Envelope

```ts
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    requestId: string;
    generatedAt: string;
    cursor?: string;
    stale?: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    retryable: boolean;
    requestId: string;
  };
}
```

### 5.2 Status codes

```text
200 Read/update success
201 Created
202 Accepted background job
204 Successful deletion without body
400 Invalid request
401 Authentication required
403 Authenticated but not authorized
404 Resource not found or intentionally concealed
409 Version/idempotency conflict
412 Integrity or publication precondition failed
422 Semantically invalid scholarly object
429 Rate limit
503 Temporary dependency or background-service failure
```

### 5.3 Cursor pagination

```ts
interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

Do not use offset pagination for fast-changing feeds, notifications, activities, or review queues.

### 5.4 Idempotency

The following routes require `Idempotency-Key`:

- draft autosave;
- publish;
- source import;
- contribution creation from a wizard;
- review submission;
- integrity-event ingestion;
- export creation;
- render submission.

Store processed keys with route scope, user, request hash, response, and expiration.

```prisma
model IdempotencyRecord {
  id          String   @id @default(cuid())
  key         String
  scope       String
  userId      String
  requestHash String
  statusCode  Int
  response    Json
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@unique([scope, key])
  @@index([expiresAt])
}
```

## 6. Complete API Route Catalogue

### 6.1 Identity and profile

```text
GET    /api/me
GET    /api/profiles/:username
PATCH  /api/me/profile
POST   /api/me/affiliations
PATCH  /api/me/affiliations/:id
DELETE /api/me/affiliations/:id
POST   /api/me/expertise
DELETE /api/me/expertise/:id
POST   /api/me/orcid/connect
POST   /api/me/github/connect
GET    /api/me/export
DELETE /api/me
```

### 6.2 Workspaces and permissions

```text
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/invitations
PATCH  /api/workspaces/:id/members/:userId
DELETE /api/workspaces/:id/members/:userId
POST   /api/workspaces/:id/access-requests
PATCH  /api/workspaces/:id/access-requests/:requestId
```

### 6.3 Dashboard

```text
GET    /api/dashboard/home
GET    /api/dashboard/continue-working
GET    /api/dashboard/attention?cursor=
GET    /api/dashboard/activity?cursor=
GET    /api/dashboard/impact?range=30d
GET    /api/dashboard/projects?status=active&cursor=
GET    /api/dashboard/contributions?status=draft&cursor=
PATCH  /api/dashboard/preferences
PATCH  /api/dashboard/modules/:moduleKey
POST   /api/dashboard/modules/reorder
```

### 6.4 Library

```text
GET    /api/library?type=&state=&collectionId=&cursor=
POST   /api/library/items
PATCH  /api/library/items/:id
DELETE /api/library/items/:id
GET    /api/library/collections
POST   /api/library/collections
PATCH  /api/library/collections/:id
DELETE /api/library/collections/:id
POST   /api/library/migrate-bookmarks
```

### 6.5 Projects

```text
GET    /api/projects?status=&cursor=
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
PATCH  /api/projects/:id/members/:userId
POST   /api/projects/:id/milestones
PATCH  /api/projects/:id/milestones/:milestoneId
POST   /api/projects/:id/tasks
PATCH  /api/projects/:id/tasks/:taskId
POST   /api/projects/:id/objects
DELETE /api/projects/:id/objects/:objectId
```

### 6.6 Sources and tools

```text
GET    /api/sources?query=&type=&integrity=&cursor=
POST   /api/sources/resolve
POST   /api/sources
GET    /api/sources/:id
PATCH  /api/sources/:id
GET    /api/sources/:id/versions
POST   /api/sources/:id/versions
POST   /api/sources/:id/integrity-events
GET    /api/tools?query=&cursor=
POST   /api/tools/import
GET    /api/tools/:slug
PATCH  /api/tools/:id
POST   /api/tools/:id/refresh
```

### 6.7 Evidence, claims, relationships

```text
GET    /api/evidence?projectId=&sourceId=&status=&cursor=
POST   /api/evidence
GET    /api/evidence/:id
PATCH  /api/evidence/:id
DELETE /api/evidence/:id
POST   /api/evidence/:id/assessments
GET    /api/claims?projectId=&status=&cursor=
POST   /api/claims
GET    /api/claims/:id
PATCH  /api/claims/:id
DELETE /api/claims/:id
POST   /api/claims/:id/assessments
POST   /api/relationships
PATCH  /api/relationships/:id
DELETE /api/relationships/:id
```

### 6.8 Contributions and drafts

```text
GET    /api/contributions?type=&status=&authorId=&cursor=
POST   /api/contributions
GET    /api/contributions/:id
PATCH  /api/contributions/:id
POST   /api/contributions/:id/submit-review
POST   /api/contributions/:id/publish
POST   /api/contributions/:id/archive
GET    /api/contributions/:id/versions
GET    /api/drafts/:id
POST   /api/drafts/:id/autosave
GET    /api/drafts/:id/history
POST   /api/drafts/:id/snapshots
POST   /api/drafts/:id/resolve-conflict
POST   /api/drafts/:id/restore/:snapshotId
```

### 6.9 Reviews

```text
GET    /api/reviews?status=&assignedTo=me&cursor=
POST   /api/reviews
GET    /api/reviews/:id
PATCH  /api/reviews/:id
POST   /api/reviews/:id/items
PATCH  /api/reviews/:id/items/:itemId
POST   /api/reviews/:id/submit
POST   /api/reviews/:id/rebuttals
POST   /api/reviews/:id/decisions
```

### 6.10 Search and feed

```text
GET    /api/feed?type=&topic=&cursor=
GET    /api/search?q=&mode=&type=&cursor=
POST   /api/search/expand
GET    /api/search/suggestions?q=
POST   /api/search/saved
GET    /api/search/saved
```

### 6.11 Assistant and AI validation

```text
POST   /api/assistant/sessions
POST   /api/assistant/sessions/:id/messages
GET    /api/assistant/tasks
PATCH  /api/assistant/tasks/:id
POST   /api/ai/validate-citations
POST   /api/ai/check-entailment
POST   /api/ai/check-quotation
POST   /api/ai/approve
POST   /api/ai/reject
```

### 6.12 Notifications, devices, and mobile sync

```text
GET    /api/notifications?cursor=
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
POST   /api/devices
PATCH  /api/devices/:id
DELETE /api/devices/:id
POST   /api/push/subscriptions
DELETE /api/push/subscriptions/:id
GET    /api/sync/:resourceType?cursor=
POST   /api/sync/acknowledge
```

### 6.13 Exports and media

```text
POST   /api/exports
GET    /api/exports/:id
GET    /api/exports/:id/download
POST   /api/renders/remotion
POST   /api/renders/hyperframes
GET    /api/renders/:id
DELETE /api/renders/:id
```

## 7. API Reference Implementations

### 7.1 Dashboard home route

```ts
const DashboardQuerySchema = z.object({
  timezone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  const query = DashboardQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  const result = await dashboardService.getHome({
    userId: session.user.id,
    timezone: query.timezone ?? session.user.timezone,
  });

  return NextResponse.json<ApiSuccess<DashboardHomeResponse>>({
    data: result,
    meta: {
      requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      stale: result.stale,
    },
  });
}
```

### 7.2 Create evidence route

```ts
const CreateEvidenceSchema = z.object({
  workspaceId: z.string().cuid(),
  sourceId: z.string().cuid(),
  sourceVersionId: z.string().cuid(),
  statement: z.string().min(1).max(20_000),
  locators: z.array(SourceLocatorSchema).min(1),
  extractionType: z.enum(['QUOTED', 'EXTRACTED', 'CALCULATED', 'INFERRED', 'GENERATED']),
  quotation: z.string().max(20_000).optional(),
  limitation: z.string().max(10_000).optional(),
  classification: DataClassificationSchema,
});

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  const input = CreateEvidenceSchema.parse(await request.json());
  await requireCapability(session.user.id, 'evidence:create', input);

  const evidence = await prisma.$transaction(async tx => {
    const sourceVersion = await tx.sourceVersion.findFirst({
      where: {id: input.sourceVersionId, sourceId: input.sourceId},
    });
    if (!sourceVersion) throw new ApiNotFoundError('SOURCE_VERSION_NOT_FOUND');

    return tx.evidence.create({
      data: {
        workspaceId: input.workspaceId,
        createdBy: session.user.id,
        sourceId: input.sourceId,
        sourceVersionId: input.sourceVersionId,
        statement: input.statement,
        locators: input.locators,
        extractionType: input.extractionType,
        quotation: input.quotation,
        limitation: input.limitation,
        classification: input.classification,
      },
    });
  });

  return NextResponse.json({data: evidence}, {status: 201});
}
```

### 7.3 Atomic autosave

```ts
const AutosaveSchema = z.object({
  mutationId: z.string().uuid(),
  baseVersion: z.number().int().positive(),
  document: ResearchDocumentSchema,
  mdx: z.string().max(2_000_000).optional(),
});

export async function POST(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params;
  const session = await requireSession(request);
  const input = AutosaveSchema.parse(await request.json());
  const key = request.headers.get('idempotency-key');
  if (key !== input.mutationId) throw new ApiValidationError('INVALID_IDEMPOTENCY_KEY');

  const result = await prisma.$transaction(async tx => {
    const prior = await tx.idempotencyRecord.findUnique({
      where: {scope_key: {scope: `draft:${id}:autosave`, key}},
    });
    if (prior) return prior.response;

    const draft = await tx.draft.findUnique({where: {id}});
    if (!draft) throw new ApiNotFoundError('DRAFT_NOT_FOUND');
    await requireCapability(session.user.id, 'contribution:edit', draft);

    const update = await tx.draft.updateMany({
      where: {id, version: input.baseVersion},
      data: {
        document: input.document,
        mdx: input.mdx,
        version: {increment: 1},
        saveState: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });

    if (update.count !== 1) {
      const serverDraft = await tx.draft.findUniqueOrThrow({where: {id}});
      throw new ApiConflictError({
        code: 'DRAFT_VERSION_CONFLICT',
        serverVersion: serverDraft.version,
        serverDocument: serverDraft.document,
      });
    }

    const saved = await tx.draft.findUniqueOrThrow({where: {id}});
    const response = {
      status: 'ok',
      version: saved.version,
      savedAt: saved.lastSyncedAt?.toISOString(),
    };

    await tx.idempotencyRecord.create({
      data: {
        key,
        scope: `draft:${id}:autosave`,
        userId: session.user.id,
        requestHash: await sha256(JSON.stringify(input)),
        statusCode: 200,
        response,
        expiresAt: addDays(new Date(), 7),
      },
    });

    return response;
  });

  return NextResponse.json({data: result});
}
```

## 8. Database Completion and Migration Plan

### 8.1 Canonical schema inclusion

The repository must include the separately generated complete Prisma schema as the executable source of truth. The abbreviated model excerpts in earlier parts are explanatory only.

The complete schema must include:

- identity and profiles;
- workspaces and membership;
- dashboard preferences;
- library and collections;
- projects, milestones, tasks, and objects;
- sources, versions, identifiers, and contributors;
- integrity events and impact records;
- evidence, claims, assessments, and relationships;
- contributions, versions, citations, reviews, rebuttals, and decisions;
- drafts, snapshots, pending mutations, and annotations;
- AI provenance;
- assistant tasks;
- notifications and delivery;
- reputation and impact events;
- audit events;
- mobile devices, preferences, push subscriptions, and sync cursors;
- idempotency records and background jobs.

### 8.2 Missing operational models

Add these operational models to the executable schema if not already present:

```prisma
model BackgroundJob {
  id          String   @id @default(cuid())
  type        String
  status      String
  payload     Json
  result      Json?
  error       String?
  attempts    Int      @default(0)
  runAfter    DateTime @default(now())
  lockedAt    DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status, runAfter])
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  provider    String
  eventId     String
  eventType   String
  payloadHash String
  status      String
  receivedAt  DateTime @default(now())
  processedAt DateTime?
  error       String?

  @@unique([provider, eventId])
  @@index([status, receivedAt])
}
```

### 8.3 Migration sequence

```text
M001 Identity/profile extensions
M002 Workspaces and capability membership
M003 Sources and source versions
M004 Evidence, claims, assessments, relationships
M005 Contributions, drafts, versions, citations
M006 Reviews, rebuttals, decisions
M007 Projects, tasks, linked objects
M008 Dashboard, library, attention, activity
M009 Integrity events and impact propagation
M010 AI provenance and assistant tasks
M011 Notifications, devices, push, sync cursors
M012 Audit, idempotency, jobs, webhooks
M013 Backfill legacy posts/bookmarks/authors
M014 Add constraints after backfill verification
M015 Remove deprecated columns after rollback window
```

### 8.4 Legacy mapping

```text
Legacy author → UserProfile
Legacy post/article → Contribution + ContributionVersion
Legacy bookmark → LibraryItem
Legacy comment → Discussion/Review item depending semantics
Legacy citation → Citation + Source resolution
Legacy dashboard reading item → LibraryItem read state
Legacy writer application → Workspace or publication-role workflow
```

### 8.5 Backfill pattern

```ts
for await (const batch of legacyPostBatches(250)) {
  await prisma.$transaction(
    batch.map(post => prisma.contribution.upsert({
      where: {legacyId: post.id},
      create: mapLegacyPost(post),
      update: {},
    })),
  );
}
```

Backfills must be resumable, idempotent, measured, and validated before constraints become mandatory.

## 9. Background Jobs and Event Processing

### 9.1 Required jobs

```text
source.resolve
source.refresh
source.integrity.ingest
integrity.propagate
search.index
notification.dispatch
notification.digest
contribution.publish
citation.validate
ai.validate
export.generate
render.remotion
render.hyperframes
analytics.aggregate
retention.cleanup
```

### 9.2 Domain events

```ts
export type DomainEvent =
  | {type: 'ContributionPublished'; contributionId: string; actorId: string}
  | {type: 'SourceIntegrityChanged'; sourceId: string; eventId: string}
  | {type: 'ReviewRequested'; reviewId: string; reviewerId: string}
  | {type: 'DraftConflictDetected'; draftId: string; userId: string}
  | {type: 'EvidenceReused'; evidenceId: string; contributionId: string};
```

Use an outbox table when reliable delivery is required across a database transaction and a queue.

```prisma
model OutboxEvent {
  id          String   @id @default(cuid())
  type        String
  aggregateId String
  payload     Json
  createdAt   DateTime @default(now())
  publishedAt DateTime?
  attempts    Int      @default(0)

  @@index([publishedAt, createdAt])
}
```

## 10. Search and Indexing

### 10.1 MVP PostgreSQL search

Use:

- `tsvector` for lexical search;
- `pg_trgm` for fuzzy matching;
- normalized identifier lookup for DOI, ORCID, arXiv, PMID, repository URL;
- cursor pagination;
- integrity and classification filters.

### 10.2 Search document

```ts
interface SearchDocument {
  id: string;
  type: 'source'|'contribution'|'tool'|'profile'|'project'|'claim';
  title: string;
  body: string;
  workspaceId?: string;
  classification: DataClassification;
  language: string;
  integrity?: SourceIntegrity;
  publishedAt?: string;
  identifiers: string[];
  topics: string[];
}
```

Search results must disclose match reason and mode. AI expansion terms must be visible, editable, and removable.

## 11. Source and Repository Integrations

### 11.1 Academic resolvers

Recommended resolver order:

1. Crossref for DOI metadata;
2. OpenAlex for works, authors, institutions, and concepts;
3. PubMed/NCBI for biomedical identifiers;
4. arXiv for preprints;
5. DataCite for datasets and research objects;
6. Unpaywall for open-access location where allowed.

Every imported response must record provider, retrieval time, raw external ID, normalized ID, and resolution state.

### 11.2 GitHub and GitLab

Imported tool metadata should include:

- canonical repository URL;
- owner/name;
- license SPDX ID;
- default branch;
- last push;
- latest release;
- primary language;
- stars, forks, open issues as time-stamped observations;
- archived status;
- security policy presence;
- README and documentation links.

Do not treat stars as research quality.

## 12. Notification Architecture

### 12.1 Notification preferences

Preferences require separate controls for in-app, email, and push. Integrity and security alerts remain deliverable according to policy.

### 12.2 Safe notification rendering

```ts
function notificationPreview(
  classification: DataClassification,
  content: {publicTitle: string; restrictedTitle: string},
) {
  return classification === 'PUBLIC'
    ? content.publicTitle
    : content.restrictedTitle;
}
```

Restricted lock-screen copy should say only that a workspace has an update.

### 12.3 Dedupe key examples

```text
integrity:<eventId>:<userId>
review-request:<reviewId>:<reviewerId>
draft-conflict:<draftId>:<userId>:<serverVersion>
```

## 13. Observability and Analytics

### 13.1 Request context

Every request should carry:

```text
requestId
userId or anonymous session ID
workspaceId when authorized
route
release version
trace ID
```

Never attach research text, quotations, unpublished titles, reviewer identities, or restricted identifiers to telemetry.

### 13.2 Structured error example

```ts
logger.error('draft_autosave_failed', {
  requestId,
  draftId,
  userId,
  workspaceId,
  baseVersion,
  errorCode: normalizeErrorCode(error),
  // Never include document content.
});
```

### 13.3 Service-level objectives

```text
Dashboard home API p95 ≤500ms excluding cold start
Autosave API p95 ≤400ms
Search lexical p95 ≤700ms
Source resolution accepted or completed ≤10s
Notification dispatch p95 ≤60s
Integrity propagation for critical events ≤5min
```

## 14. Feature Flags and Experiments

### 14.1 Flag catalogue

```text
contribution-feed-v1
contribution-wizard-v1
research-dashboard-v1
scholarly-editor-v1
offline-sync-v1
projects-v1
claims-evidence-v1
provenance-graph-v1
assistant-docked-v1
mobile-bottom-nav-v1
```

Flags should support user, workspace, role, and percentage targeting. Do not use client-only flags to protect sensitive data.

### 14.2 Experiment record

```ts
interface ExperimentDefinition {
  id: string;
  hypothesis: string;
  variants: string[];
  primaryMetric: string;
  guardrails: string[];
  eligibility: string;
  minimumRuntimeDays: number;
  owner: string;
  decisionDate?: string;
}
```

## 15. PWA and Offline Architecture

### 15.1 Cache policy

```text
App shell: cache-first with versioned assets
Public contribution pages: stale-while-revalidate
Authenticated API: network-first; cache only explicitly safe summaries
Drafts: IndexedDB canonical local working copy
Restricted source content: no service-worker caching unless policy permits
Exports and signed media: never cache beyond authorization lifetime
```

### 15.2 Background sync

Do not rely solely on Background Sync API because browser support varies. Trigger queue flush on:

- online event;
- app foreground;
- editor mount;
- explicit retry;
- periodic activity while open.

### 15.3 Logout and device removal

Logout must:

- revoke tokens;
- clear or encrypt local restricted drafts according to retention policy;
- unregister push subscription if requested;
- retain only explicit offline content that policy permits;
- record device revocation server-side.

## 16. Security Controls

### 16.1 Web controls

- strict CSP with nonces;
- `frame-ancestors` policy;
- secure, HTTP-only, same-site cookies;
- CSRF defense for cookie-authenticated mutations;
- rate limits by user, IP, route, and workspace where appropriate;
- request-body size limits;
- safe redirects;
- file-type verification by content, not extension;
- malware scanning for uploads;
- signed object-storage URLs;
- dependency and secret scanning.

### 16.2 MDX controls

- allowlisted components only;
- no arbitrary imports;
- no arbitrary JavaScript expressions;
- compile in isolated worker/build context;
- sanitize rendered URLs;
- disallow event handlers from document content;
- cap document and block sizes.

### 16.3 Render controls

- isolated containers;
- network deny by default;
- domain allowlist;
- CPU, RAM, duration, file, and output limits;
- no client credentials in bundles;
- human approval before public production render;
- checksums of input, assets, and output.

## 17. Data Retention, Backup, and Recovery

Define retention per classification and object type.

```text
Audit events: policy-defined, usually multi-year
Published contribution versions: retained indefinitely unless legally removed
Draft snapshots: rolling window plus explicit milestones
Pending mutations: delete after confirmed sync and recovery window
Notification delivery records: short operational retention
Analytics events: minimized and aggregated
Deleted account data: legal/privacy workflow with tombstones where references must survive
```

Backup requirements:

- encrypted PostgreSQL backups;
- point-in-time recovery;
- object-storage versioning;
- quarterly restore test;
- documented RPO and RTO;
- integrity verification after restore.

Recommended initial targets:

```text
RPO: ≤15 minutes
RTO: ≤4 hours
Critical draft local recovery: immediate from IndexedDB when device is available
```

## 18. Expanded v3.1 Implementation Checklist

### 18.1 Audit and governance

- [ ] Current route and page tree frozen for migration reference.
- [ ] Frontend, backend, database, accessibility, mobile, security, and performance audits completed.
- [ ] Component and token inventories completed.
- [ ] ADR owners and approval process established.
- [ ] Risk and exception registers established.
- [ ] Every checklist item mapped to an issue and accountable owner.

### 18.2 Design system

- [ ] Primitive, semantic, component, motion, video, and responsive tokens implemented.
- [ ] Token schema and resolver validation pass.
- [ ] CSS, TypeScript, JSON, Tailwind, Remotion, and Hyperframes outputs generated.
- [ ] Light, dark, forced-colors, print, and reduced-motion themes pass.
- [ ] Stable components contain no undocumented raw values.
- [ ] Storybook contains every component state and breakpoint.

### 18.3 Identity and profiles

- [ ] Profiles support ORCID, affiliations, languages, GitHub, and GitLab.
- [ ] Verification state is explicit.
- [ ] Public/private/workspace visibility works per field or section where required.
- [ ] Contributor profile shows projects, contributions, expertise, and dimensioned recognition.
- [ ] Account export and deletion workflows pass.

### 18.4 Workspaces and permissions

- [ ] Workspace roles and capability matrix approved.
- [ ] Every mutation performs server-side authorization.
- [ ] Classification and embargo policies pass integration tests.
- [ ] Access revocation applies to active sessions.
- [ ] Anonymous review identity remains protected in UI, APIs, logs, URLs, exports, notifications, and analytics.

### 18.5 Dashboard and ownership

- [ ] Dashboard shell and all critical modules implemented.
- [ ] Continue Working restores correct context.
- [ ] Attention queue prioritizes integrity, permissions, conflicts, and deadlines.
- [ ] Library migration from bookmarks is lossless.
- [ ] Module personalization remains user-controlled.
- [ ] Mobile dashboard uses a priority stream rather than compressed desktop cards.

### 18.6 Contribution system

- [ ] All MVP contribution types implemented.
- [ ] Source selection and manual fallback work.
- [ ] Guided interview can be skipped or completed manually.
- [ ] Evidence and limitation attachment works.
- [ ] AI and human review disclosures are accurate.
- [ ] Publication preconditions are enforced server-side.
- [ ] Post-publish identity and return loops are implemented.

### 18.7 Scholarly editor

- [ ] Structured JSON document schema implemented.
- [ ] Block registry and field validation implemented.
- [ ] Slash commands work by touch and keyboard.
- [ ] dnd-kit pointer and keyboard sorting pass.
- [ ] Move up/down alternatives work on mobile.
- [ ] MDX serialization and allowlisted rendering pass.
- [ ] Responsive Sources, Draft, Review, and Assistant panes pass.

### 18.8 Persistence and offline

- [ ] Dexie schema versioning and migrations implemented.
- [ ] Autosave uses one flush loop per draft.
- [ ] Queue coalescing does not lose meaningful versions.
- [ ] Idempotency and atomic concurrency pass load tests.
- [ ] Offline editing, reconnection, retry, and recovery pass.
- [ ] Conflict compare/merge preserves both versions.
- [ ] Logout/local-retention behavior follows policy.

### 18.9 Sources, citations, evidence, and claims

- [ ] DOI, ORCID, PMID, PMCID, ISBN, ISSN, arXiv, ROR, RRID, accession, and URLs normalize correctly.
- [ ] Source versions are immutable and traceable.
- [ ] Evidence requires version and structured locator.
- [ ] Claims expose supporting, contradicting, and qualifying relationships.
- [ ] Citation resolution, entailment, and quotation checks work.
- [ ] Source integrity state is prominent and propagated.

### 18.10 Review and integrity

- [ ] Review request, assignment, items, rebuttal, and decision work.
- [ ] Retraction, correction, concern, withdrawal, and replacement ingestion works.
- [ ] Impact propagation is idempotent.
- [ ] Affected evidence, claims, drafts, reviews, and publications receive review states.
- [ ] Authorized reviewers can resolve or waive with rationale.
- [ ] Audit history is immutable and accessible to authorized users.

### 18.11 Search and discovery

- [ ] Lexical and exact identifier search work.
- [ ] Semantic/AI expansion discloses transformations.
- [ ] Filters include type, language, access, date, integrity, contributor, and workspace state.
- [ ] Search classification filtering occurs before results are returned.
- [ ] Saved searches and alerts work.
- [ ] No-result recovery and query editing work.

### 18.12 Mobile and responsive

- [ ] Required width matrix passes.
- [ ] Mobile header, drawer, bottom nav, sheets, dashboard, wizard, editor, library, and profile pass.
- [ ] Tablet split views pass.
- [ ] Desktop/wide pane persistence passes.
- [ ] Safe-area, dynamic viewport, browser chrome, orientation, and foldable tests pass.
- [ ] Touch target and virtual-keyboard tests pass.

### 18.13 Accessibility and localization

- [ ] WCAG 2.2 AA audit has no unresolved critical/serious findings.
- [ ] NVDA, VoiceOver, TalkBack, Voice Access, and Switch Access critical flows pass.
- [ ] English, Bangla, mixed-script, pseudo-localized, and RTL fixtures pass.
- [ ] Original, translated, and transliterated content remain labelled.
- [ ] Print/PDF/export preserve multilingual text.

### 18.14 Notifications and mobile devices

- [ ] Device registration and revocation work.
- [ ] Push subscriptions and quiet hours work.
- [ ] Classification-safe previews pass privacy review.
- [ ] Notification dedupe and preference rules pass.
- [ ] Integrity and security alerts cannot be fully suppressed.
- [ ] Sync cursors recover after interruptions.

### 18.15 Observability, analytics, and experiments

- [ ] Request and trace IDs propagate.
- [ ] Logs exclude sensitive content.
- [ ] SLO dashboards and alerts exist.
- [ ] Funnel and retention events are privacy-safe.
- [ ] Feature flags enforce server-side security boundaries.
- [ ] Experiment decisions include primary, guardrail, runtime, and owner.

### 18.16 Performance and scale

- [ ] Application shell, feed, dashboard, editor, and graph budgets pass.
- [ ] Dashboard first actionable module target passes.
- [ ] Autosave and search API latency targets pass.
- [ ] 10,000 citations, 5,000 graph nodes, and 100 concurrent annotations pass.
- [ ] Long-list virtualization preserves accessibility.
- [ ] Background jobs meet freshness targets.

### 18.17 Security, privacy, backup, and recovery

- [ ] Threat model completed.
- [ ] CSP, CSRF, rate limits, upload validation, signed URLs, and secret scanning pass.
- [ ] MDX and render isolation pass penetration tests.
- [ ] Retention policy approved.
- [ ] Backup, point-in-time recovery, and quarterly restore test pass.
- [ ] Incident response and rollback procedures are documented.

### 18.18 Release evidence

- [ ] Schema validation and migration SQL review attached.
- [ ] API contract and authorization test report attached.
- [ ] Responsive and visual regression reports attached.
- [ ] Accessibility and localization reports attached.
- [ ] Offline/conflict recordings attached.
- [ ] Integrity and AI-validation tests attached.
- [ ] Performance traces and bundle reports attached.
- [ ] Security/privacy review attached.
- [ ] Rollback rehearsal completed.
- [ ] Stable release approval recorded.

## 19. Implementation Sequence and Dependencies

```text
Foundation schemas and permissions
        ↓
Tokens, application shell, responsive primitives
        ↓
Dashboard foundation and Library migration
        ↓
Contribution model, Feed, Wizard, Profile identity
        ↓
Scholarly editor, autosave, offline sync
        ↓
Projects, reviews, sources, evidence, claims
        ↓
Integrity propagation, search, notifications
        ↓
Assistant tasks, network, graph, insights
        ↓
Generated media, optimization, legacy removal
        ↓
Audits, evidence, stable release
```

Do not build contribution publishing before permissions, source versioning, draft concurrency, and publication preconditions are defined.

## 20. Updated Definition of Done

ResearchWithME v3.1 is implementation-complete only when:

1. The executable schema and API contracts pass validation.
2. Every consequential mutation is authorized, validated, idempotent where retried, and audited where required.
3. A visitor can become a contributor without a blank-page workflow.
4. A contributor can attach sources, versions, evidence, claims, citations, limitations, and disclosures.
5. The editor survives disconnection, refresh, retry, and concurrent-version conflict.
6. Dashboard, Library, Profile, Projects, Feed, and Contribution Wizard form a continuous ownership loop.
7. The product works across required mobile, tablet, desktop, and wide layouts.
8. WCAG 2.2 AA, Bangla, mixed-script, and RTL requirements pass.
9. Retractions and corrections propagate to dependent scholarly objects.
10. AI assistance is source-grounded, disclosed, validated, and human-reviewable.
11. Performance, security, privacy, backup, and recovery targets pass.
12. Legacy data is migrated without loss and rollback remains possible.
13. Release evidence is attached and approved by the accountable owners.

---

# Part VI: v3.2 Canonical Product and Architecture Decisions

This part resolves the ambiguity identified during the v3.1 contradiction audit. These decisions are normative and supersede conflicting language elsewhere in this document. Implementations, route names, database changes, APIs, dashboards, experiments, and migration work must follow these boundaries.

## 1. Decision Register

| ID | Ambiguity | v3.2 decision |
|---|---|---|
| ADR-032-01 | Publication platform vs knowledge network | Sources, Evidence, and Claims move into the MVP foundation and receive first-class routes, APIs, permissions, and dashboards. Contribution remains the social publishing unit, not the canonical knowledge unit. |
| ADR-032-02 | Wizard vs workspace | The Wizard is guided onboarding and rapid creation. The Workspace is the canonical editor for continued and advanced authoring. Both produce the same Draft and ResearchDocument. |
| ADR-032-03 | Feed vs dashboard | Anonymous and signed-out users land on `/feed`. Authenticated users land on `/dashboard` unless they follow a valid deep link or choose another default preference. |
| ADR-032-04 | Review vs discussion | Formal scholarly Review is separate from lightweight Discussion. Review has request, assignment, items, rebuttal, and decision. Discussion has threads and comments without formal decision authority. |
| ADR-032-05 | Reputation metrics | Store immutable, reversible reputation events. Do not store or display one opaque reputation score. Display explainable dimensions derived from events. |
| ADR-032-06 | Workspace vs project | Workspace defines people, authorization, billing, retention, and policy. Project defines a bounded research objective and links scholarly objects. |
| ADR-032-07 | Library vs sources | Sources are the global/workspace scholarly repository. Library is a user-curated saved view over sources, tools, contributions, evidence, claims, and notes. |
| ADR-032-08 | Notifications vs attention vs assistant tasks | Notifications are event history; Attention items require user action; Assistant tasks are AI-suggested or AI-assisted tasks and never silently become required actions. |
| ADR-032-09 | ResearchNote vs Contribution | Remove standalone ResearchNote as a canonical content model. Use `Contribution.type = RESEARCH_NOTE`. Private scratch notes use `Annotation` or a lightweight ProjectNote, not a public ResearchNote duplicate. |
| ADR-032-10 | ToolRepository vs Source SOFTWARE | ToolRepository is the canonical mutable repository/tool entity. Source may reference a specific software release, archive, documentation object, or repository snapshot but must not duplicate live repository metadata. |
| ADR-032-11 | Bottom navigation vs drawer | Bottom navigation contains Explore, Library, Contribute, AI, Profile. Drawer contains Projects, Reviews, Sources, Evidence, Claims, Dashboard sections, Settings, and Help. |
| ADR-032-12 | Assistant route vs pane | Contextual pane/sheet is the primary assistant. `/assistant` is the full-screen workspace for long-running, multi-source, or history-intensive tasks. |
| ADR-032-13 | Missing research goals | Add user-owned Research Goals and Goal Progress to Dashboard, Projects, and retention loops. Goals reward meaningful research progress, not login frequency. |

## 2. Canonical Product Object Hierarchy

```text
Workspace
├── Members, roles, policy, classification, billing, retention
├── Projects
│   ├── Sources and source versions
│   ├── Tool repositories and snapshots
│   ├── Evidence
│   ├── Claims
│   ├── Contributions and drafts
│   ├── Formal reviews
│   ├── Discussions
│   ├── Goals, milestones, and tasks
│   └── Publications/exports
└── Workspace-wide objects not yet assigned to a project
```

### 2.1 Knowledge units vs publishing units

```text
Knowledge units
Source → Evidence → Claim → Relationship

Publishing/social units
Contribution → Version → Citation → Discussion/Review
```

A Contribution may present or discuss Sources, Evidence, and Claims, but it does not own their canonical identity. Deleting or archiving a Contribution must not delete canonical evidence or claims referenced elsewhere.

## 3. Revised MVP Scope

The MVP now includes first-class knowledge objects.

### 3.1 MVP routes

```text
/feed
/dashboard
/contribute
/contribution/[id]
/profile/[username]
/library
/projects
/project/[id]
/sources
/source/[id]
/evidence
/evidence/[id]
/claims
/claim/[id]
/tools
/tool/[slug]
/assistant
/settings
```

### 3.2 Post-MVP routes

```text
/reviews
/review/[id]
/graph
/workspace/[id]
/topics/[slug]
/labs
```

Formal Review records may be created in MVP through contribution and project contexts even if a dedicated public review directory ships later.

### 3.3 MVP object readiness

Before public contribution publishing is enabled:

- Source and SourceVersion must exist.
- Evidence can be created from a source version and structured locator.
- Claims can link to supporting, contradicting, and qualifying evidence.
- Contributions can reference canonical knowledge objects.
- Permissions and classification are enforced.
- Draft autosave and version conflict behavior work.
- Publication preconditions are enforced server-side.

## 4. Canonical Landing and Navigation Behavior

### 4.1 Landing resolution

```ts
export function resolvePostAuthDestination(input: {
  returnTo?: string;
  configuredLanding?: 'dashboard'|'feed'|'library'|'projects';
}) {
  if (input.returnTo && isSafeInternalPath(input.returnTo)) return input.returnTo;

  switch (input.configuredLanding) {
    case 'feed': return '/feed';
    case 'library': return '/library';
    case 'projects': return '/projects';
    default: return '/dashboard';
  }
}
```

- `/` may remain a marketing or feed-compatible route.
- Anonymous users entering the product are directed to `/feed`.
- Authenticated users default to `/dashboard`.
- Deep links are preserved through authentication.

### 4.2 Mobile destination ownership

```text
Bottom navigation
Explore → /feed
Library → /library
Contribute → /contribute
AI → Assistant sheet; expand to /assistant
Profile → /dashboard or /profile/[username] based on selected subtab

Drawer
Dashboard sections
Projects
Reviews
Sources
Evidence
Claims
Settings
Help
```

Do not duplicate Projects, Sources, Evidence, or Claims in the primary bottom navigation.

## 5. Wizard and Workspace Contract

### 5.1 Wizard purpose

The Wizard is optimized for:

- first-time contributors;
- quick perspectives, questions, reviews, and notes;
- assistant-guided structured intake;
- phone workflows;
- creation in under three minutes when evidence requirements permit.

### 5.2 Workspace purpose

The Workspace is optimized for:

- continued editing;
- multi-source synthesis;
- evidence and claim management;
- formal review response;
- long-form or technically complex contributions;
- conflict resolution and version history;
- desktop and tablet research work.

### 5.3 Shared output

Both flows write to the same records:

```text
Draft
└── ResearchDocument JSON
    ├── typed blocks
    ├── source references
    ├── evidence references
    ├── claim references
    ├── citations
    ├── limitations
    └── AI provenance
```

Transition:

```text
Wizard completion
→ Draft created or updated
→ “Continue in Workspace” available
→ Workspace resumes exact block, selection, and evidence context
```

There is no separate wizard-only document format.

## 6. Formal Review and Discussion Separation

### 6.1 Formal Review

Use when a reviewer is assigned or a decision is expected.

```text
Review
├── Requester
├── Assigned reviewer
├── Scope
├── Due date
├── Review items
├── Recommendation
├── Rebuttals
└── Decision
```

Formal reviews are auditable, version-aware, permission-controlled, and may be anonymous.

### 6.2 Discussion

Use for lightweight community conversation.

```text
DiscussionThread
└── DiscussionComment
    ├── Parent/child reply
    ├── Mention
    ├── Resolution state where contextual
    └── Moderation state
```

Discussion comments must not be presented as peer review, validation, or editorial approval.

### 6.3 Canonical models

```prisma
model DiscussionThread {
  id             String   @id @default(cuid())
  workspaceId    String?
  contributionId String?
  sourceId       String?
  claimId        String?
  evidenceId     String?
  createdBy      String
  lockedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  comments       DiscussionComment[]

  @@index([contributionId, updatedAt])
  @@index([sourceId, updatedAt])
  @@index([claimId, updatedAt])
  @@index([evidenceId, updatedAt])
}

model DiscussionComment {
  id         String   @id @default(cuid())
  threadId   String
  authorId   String
  parentId   String?
  body       String
  status     DiscussionCommentStatus @default(ACTIVE)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  editedAt   DateTime?

  thread     DiscussionThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  parent     DiscussionComment? @relation("DiscussionReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies    DiscussionComment[] @relation("DiscussionReplies")

  @@index([threadId, createdAt])
  @@index([parentId])
}

enum DiscussionCommentStatus {
  ACTIVE
  EDITED
  HIDDEN
  REMOVED
  ARCHIVED
}
```

The executable schema must add relations to the relevant User, Workspace, Contribution, Source, Evidence, and Claim models.

## 7. Workspace and Project Boundary

### Workspace owns

- membership and invitations;
- roles and capabilities;
- classification and embargo defaults;
- billing/subscription;
- organization settings;
- retention and legal hold;
- integrations;
- audit access;
- workspace-level sources and objects.

### Project owns

- research objective;
- project stage;
- members assigned from workspace membership;
- milestones and tasks;
- linked Sources, Evidence, Claims, Contributions, Reviews, Tools, Notes, and Datasets;
- project-specific deadlines and progress.

A ProjectMember must resolve to an active WorkspaceMember. Project membership cannot grant access beyond workspace policy.

```ts
async function addProjectMember(projectId: string, userId: string, role: ProjectRole) {
  const project = await prisma.researchProject.findUniqueOrThrow({where: {id: projectId}});
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {workspaceId_userId: {workspaceId: project.workspaceId, userId}},
  });

  if (!workspaceMember) throw new AuthorizationError('WORKSPACE_MEMBERSHIP_REQUIRED');

  return prisma.projectMember.create({data: {projectId, userId, role}});
}
```

## 8. Sources, Library, and Tool Repository Boundary

### Sources

Canonical scholarly and technical records available to the user’s authorized scope.

### Library

A user-curated saved relationship to an existing object. Saving never duplicates the canonical object.

```text
LibraryItem
→ objectId + objectType
→ personal note, tags, collection, progress, read state
```

### ToolRepository

Canonical representation of a live GitHub, GitLab, or other open-source repository.

### Software Source

A Source of type SOFTWARE represents a citable release, archived snapshot, documentation version, package release, paper, or repository state. It may link to ToolRepository.

```prisma
model ToolSourceLink {
  id               String   @id @default(cuid())
  toolRepositoryId String
  sourceId         String
  releaseTag       String?
  commitSha        String?
  packageVersion   String?
  archivedUrl      String?
  observedAt       DateTime @default(now())

  @@unique([toolRepositoryId, sourceId])
  @@index([sourceId])
}
```

Live stars, forks, issues, and release metadata remain on time-stamped ToolRepository observations and must not be copied into Source as timeless facts.

## 9. Contribution and Note Model Cleanup

### 9.1 Public/workspace research note

Use:

```text
Contribution.type = RESEARCH_NOTE
```

It receives ContributionVersion, citations, discussion, review where applicable, publication state, and visibility.

### 9.2 Private scratch note

Use one of:

- Annotation for source-anchored notes;
- ProjectNote for private, project-scoped working notes.

```prisma
model ProjectNote {
  id             String   @id @default(cuid())
  workspaceId    String
  projectId      String?
  authorId       String
  title          String?
  document       Json
  classification DataClassification @default(WORKSPACE)
  version        Int @default(1)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([projectId, updatedAt])
  @@index([authorId, updatedAt])
}
```

The former ResearchNote model is deprecated. Migration:

```text
Published or shared ResearchNote → Contribution(RESEARCH_NOTE)
Private unshared ResearchNote → ProjectNote
Source-anchored note → Annotation
```

## 10. Notifications, Attention, and Assistant Tasks

### Notifications

Event history. Examples:

- contribution referenced;
- source corrected;
- project invitation;
- review response.

A notification can be read without being resolved.

### Attention items

Action-required state. Examples:

- draft conflict;
- retraction impact review;
- review deadline;
- permission problem;
- unresolved mandatory citation.

An attention item has OPEN, ACKNOWLEDGED, RESOLVED, or DISMISSED according to policy.

### Assistant tasks

AI-suggested or user-requested tasks. Examples:

- compare three sources;
- suggest citations;
- summarize a method;
- draft a perspective.

Assistant tasks cannot create mandatory attention merely because the model suggested them. A user, policy engine, or validated integrity workflow must explicitly promote an assistant result into an AttentionItem.

```ts
async function promoteAssistantTask(taskId: string, actorId: string) {
  const task = await prisma.assistantTask.findUniqueOrThrow({where: {id: taskId}});
  await requireCapability(actorId, 'workspace:manage', {workspaceId: task.workspaceId});

  return prisma.attentionItem.create({
    data: {
      userId: task.userId,
      workspaceId: task.workspaceId,
      kind: 'ASSISTANT',
      severity: 'INFO',
      objectId: task.id,
      objectType: 'AssistantTask',
      title: task.title,
      explanation: task.explanation ?? 'A workspace owner requested this follow-up.',
      actionLabel: 'Review task',
      actionHref: `/assistant/tasks/${task.id}`,
    },
  });
}
```

## 11. Reputation Event Policy

Do not store `reputationScore`, `trustScore`, or `qualityScore` on UserProfile.

Store event facts:

```text
Contribution referenced
Review marked helpful
Evidence reused
Correction accepted
Replication reported
Review completed
```

Derived display:

```ts
interface RecognitionSummary {
  referencedContributions: number;
  helpfulReviews: number;
  evidenceReuse: number;
  acceptedCorrections: number;
  replicationReports: number;
  completedReviews: number;
  calculatedAt: string;
}
```

Rules:

- reverse events when fraud, deletion, or moderation invalidates them;
- make calculation windows explicit;
- prevent self-actions from generating recognition;
- rate-limit and detect coordinated manipulation;
- show definitions near metrics;
- do not rank users by one composite score in MVP.

## 12. Research Goals

Research Goals supply the missing planning and retention layer.

### 12.1 Goal types

```text
Review sources
Publish contributions
Complete reviews
Attach evidence
Resolve citations
Complete project milestone
Document replication
Custom measurable goal
```

### 12.2 Models

```prisma
model ResearchGoal {
  id             String   @id @default(cuid())
  userId         String
  workspaceId    String?
  projectId      String?
  title          String
  description    String?
  metric         ResearchGoalMetric
  targetValue    Int
  currentValue   Int @default(0)
  period         ResearchGoalPeriod
  startsAt       DateTime
  endsAt         DateTime?
  status         ResearchGoalStatus @default(ACTIVE)
  visibility     Visibility @default(PRIVATE)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  progress       ResearchGoalProgress[]

  @@index([userId, status, endsAt])
  @@index([projectId, status])
}

model ResearchGoalProgress {
  id          String   @id @default(cuid())
  goalId      String
  date        DateTime
  value       Int
  sourceEvent String?
  createdAt   DateTime @default(now())

  goal        ResearchGoal @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@unique([goalId, date, sourceEvent])
  @@index([goalId, date])
}

enum ResearchGoalMetric {
  SOURCES_REVIEWED
  CONTRIBUTIONS_PUBLISHED
  REVIEWS_COMPLETED
  EVIDENCE_ATTACHED
  CITATIONS_RESOLVED
  MILESTONES_COMPLETED
  REPLICATIONS_DOCUMENTED
  CUSTOM
}

enum ResearchGoalPeriod {
  ONE_TIME
  WEEKLY
  MONTHLY
  QUARTERLY
  CUSTOM
}

enum ResearchGoalStatus {
  ACTIVE
  PAUSED
  COMPLETED
  EXPIRED
  ARCHIVED
}
```

### 12.3 Goal integrity

- Goal progress is based on validated domain events, not arbitrary client increments.
- Login does not count as research progress.
- Users can pause or archive without losing history.
- Goals are private by default.
- Goal suggestions from AI require user acceptance.

### 12.4 Dashboard module

```text
Research goals
Review 20 sources       12 / 20
Publish 3 perspectives   1 / 3
Resolve project citations 8 / 10
```

## 13. Revised API Routes

### Knowledge objects now in MVP

```text
GET    /api/sources
POST   /api/sources
GET    /api/sources/:id
GET    /api/sources/:id/versions
POST   /api/sources/:id/versions

GET    /api/evidence
POST   /api/evidence
GET    /api/evidence/:id
PATCH  /api/evidence/:id

GET    /api/claims
POST   /api/claims
GET    /api/claims/:id
PATCH  /api/claims/:id

POST   /api/relationships
PATCH  /api/relationships/:id
DELETE /api/relationships/:id
```

### Discussion routes

```text
GET    /api/discussions?objectType=&objectId=&cursor=
POST   /api/discussions
GET    /api/discussions/:id
POST   /api/discussions/:id/comments
PATCH  /api/discussions/:id/comments/:commentId
DELETE /api/discussions/:id/comments/:commentId
POST   /api/discussions/:id/lock
```

### Goals routes

```text
GET    /api/goals?status=&projectId=&cursor=
POST   /api/goals
GET    /api/goals/:id
PATCH  /api/goals/:id
POST   /api/goals/:id/pause
POST   /api/goals/:id/resume
POST   /api/goals/:id/archive
GET    /api/goals/:id/progress
```

### Landing preference

```text
PATCH /api/dashboard/preferences
{
  "defaultLanding": "DASHBOARD" | "FEED" | "LIBRARY" | "PROJECTS"
}
```

## 14. Revised Dashboard Information Architecture

```text
/dashboard
├── Continue Working
├── Attention Queue
├── Research Goals
├── Active Projects
├── Contribution Pipeline
├── Review Queue
├── Library Summary
├── Knowledge Summary (Sources, Evidence, Claims)
├── Activity
├── Recognition
└── Assistant Suggestions
```

Dashboard distinctions:

```text
Library = what I saved
Sources = canonical source records I may access
Goals = what I intend to complete
Projects = bounded research objectives
Attention = actions required from me
Notifications = events that happened
Assistant Tasks = optional AI-assisted work
```

## 15. Revised Delivery Roadmap

### Phase 0: Audit and decision enforcement, Weeks 1–2

- Add ADR-032-01 through ADR-032-13 to the repository.
- Update glossary and object ownership.
- Remove conflicting route and model language.
- Baseline the current feed, dashboard, writer, and profile behavior.

### Phase 1: Foundation and first-class knowledge, Weeks 2–6

- Sources and SourceVersion.
- Evidence and assessment.
- Claims and relationships.
- Workspace permissions and classification.
- Token/design-system foundation.
- Responsive application shell.

### Phase 2: Ownership MVP, Weeks 5–10

- Feed and authenticated dashboard split.
- Library migration from bookmarks.
- Profile identity.
- Research Goals.
- Contribution model and Wizard.
- Knowledge-object linking from contributions.

### Phase 3: Workspace and persistence, Weeks 9–16

- Canonical editor Workspace.
- Wizard-to-Workspace transition.
- Typed blocks and MDX serialization.
- Autosave, Dexie, sync, conflict, snapshots.
- Projects and ProjectNotes.

### Phase 4: Interaction and review, Weeks 14–20

- Discussion threads and comments.
- Formal review workflow.
- Rebuttals and decisions.
- Notifications, Attention, and Assistant Task separation.
- Reputation-event-derived recognition.

### Phase 5: Integrity, search, and network, Weeks 18–26

- Correction/retraction propagation.
- Search and indexing.
- ToolRepository and ToolSourceLink.
- Network and follows.
- Provenance graph/list.

### Phase 6: Media, optimization, and stable release, Weeks 24–32

- Remotion and Hyperframes.
- Performance and scale.
- Accessibility and localization audit.
- Legacy model removal.
- Migration, rollback, and release evidence.

## 16. Schema Migration Decisions

```text
ResearchNote
├── shared/published → Contribution(RESEARCH_NOTE)
├── private project note → ProjectNote
└── source-anchored note → Annotation

Source(type=SOFTWARE)
├── citable release/snapshot/doc → remains Source
└── live repository metadata → ToolRepository

Legacy comments
├── formal review semantics → ReviewItem
└── ordinary conversation → DiscussionComment
```

Migration must run before dropping ResearchNote or legacy comment tables. Maintain legacy IDs for traceability.

## 17. v3.2 Contradiction-Resolution Checklist

- [ ] Sources, Evidence, and Claims are included in MVP routes, APIs, permissions, and dashboards.
- [ ] Contribution is described consistently as the publishing/social unit.
- [ ] Wizard and Workspace share one Draft and ResearchDocument.
- [ ] Anonymous landing is Feed; authenticated default is Dashboard; deep links survive login.
- [ ] Formal Review and Discussion models, routes, labels, and permissions are distinct.
- [ ] No opaque reputation score exists in schema or UI.
- [ ] Workspace owns policy; Project owns research objectives and linked objects.
- [ ] Library is user-curated; Sources are canonical.
- [ ] Notifications, Attention, and Assistant Tasks have distinct semantics.
- [ ] ResearchNote migration is complete and standalone model is deprecated.
- [ ] ToolRepository and software Source roles are distinct and linked.
- [ ] Bottom navigation and drawer destination ownership is non-duplicative.
- [ ] Assistant pane/sheet is primary; `/assistant` is long-form/full-screen.
- [ ] Research Goals exist in schema, dashboard, APIs, and validated event processing.

## 18. v3.2 Definition of Done

The v3.2 decisions are applied only when documentation, schema, APIs, routes, UI labels, dashboards, tests, migrations, analytics, and release evidence all use the same object boundaries. A clarification appendix alone is insufficient: implementation tickets and ADRs must point to these canonical decisions, and conflicting legacy language must be removed during the audit and migration phase.

---

# Part VII: v3.4 Canonical Schema, Migration, and Rollout


## Executive decision

v3.4 replaces the incomplete v3.3 patch with one canonical implementation package: an 83-model Prisma schema, a staged PostgreSQL migration, and measurable release acceptance criteria. The refactor preserves the v3.2 product decisions while normalizing polymorphic relationships, separating discussions from formal review, globalizing repository identity, adding topics and research goals, and treating the graph as a rebuildable projection rather than primary truth.

## 1. Scope

### Included

- Removal of standalone `ResearchNote` as canonical public content.
- `ProjectNote` for private or workspace-scoped working notes.
- Global `ToolRepository` with `WorkspaceTool` and `ToolSourceLink` bridges.
- Normalized `ClaimEvidence`, `ContributionEvidence`, and `ContributionClaim` relations.
- First-class Topic taxonomy and explicit follow tables.
- Discussion threads/comments separate from formal Review.
- Research Goals and event-derived progress.
- Saved searches, alerts, citation collections, and profile metrics cache.
- GraphNode/GraphEdge read projection.
- Idempotency, outbox, jobs, and webhook operational tables.
- Safe, staged migration and rollback.

### Excluded from canonical truth

- Graph projection rows.
- Dashboard aggregates and profile metrics caches.
- Raw tool popularity metrics as measures of research quality.
- AI-generated relationships that have not been accepted.

## 2. Canonical boundaries

```text
Workspace = people, permissions, policy, classification, retention
Project = bounded research objective and linked objects
Source/Version = citable external record
Evidence = source-version-locator-grounded observation
Claim = proposition evaluated through evidence relationships
Contribution = social/publishing expression
Review = formal assigned evaluation
Discussion = lightweight conversation
Library = user-curated saved relationships
Graph = rebuildable projection
```

## 3. Database design decisions

### Normalized relationships

`ClaimEvidence` is canonical for SUPPORTS, CONTRADICTS, and QUALIFIES. `ContributionEvidence` and `ContributionClaim` are canonical links for authored outputs. The former polymorphic `KnowledgeRelationship` remains readable during migration only, then is removed after every row is migrated, explicitly mapped to another canonical table, or archived with a reason.

### Deletion semantics

- Deleting a Contribution cascades its presentation links but not canonical Evidence or Claims.
- Evidence and Claims referenced by published content use `RESTRICT` from normalized links.
- Source and source-version deletion remains restricted where evidence/citations exist; archival is preferred.
- Discussion cascades with its target object only when retention policy permits; regulated workspaces may override with legal-hold logic.
- Graph rows always cascade because they can be rebuilt.

### Integrity constraints beyond Prisma

The SQL adds database checks that Prisma cannot fully express:

- one discussion target exactly;
- one citation-collection item target exactly;
- confidence between 0 and 1;
- no self-follow or self graph edge;
- positive goal targets and valid dates;
- partial unique indexes for nullable graph source records.

## 4. Application changes

### Read path

1. Introduce repositories/services for normalized relations.
2. During dual-read, prefer normalized rows and fall back to legacy relationships only when absent.
3. Emit structured telemetry for every fallback, without research content.
4. Remove fallback only when the legacy fallback counter reaches zero for 14 consecutive days.

### Write path

1. Add feature flags: `v34-normalized-relations`, `v34-discussions`, `v34-goals`, `v34-global-tools`.
2. Start dual writes to legacy and v3.4 tables.
3. Verify equality through reconciliation jobs.
4. Switch reads.
5. Stop legacy writes.
6. Contract legacy tables after rollback window.

### API changes

```text
POST/GET/PATCH /api/discussions
POST/PATCH/DELETE /api/discussions/:id/comments
GET/POST/PATCH /api/goals
POST /api/goals/:id/pause|resume|archive
GET/POST /api/topics
POST /api/claims/:id/evidence
DELETE /api/claims/:id/evidence/:evidenceId
POST /api/contributions/:id/evidence
POST /api/contributions/:id/claims
POST /api/tools/:id/sources
GET/POST /api/search/saved
GET/POST /api/citation-collections
```

Every retryable mutation requires an idempotency key. All routes authorize workspace/classification before reading or writing.

## 5. Migration workstreams

### W0: Preflight and freeze, Week 1

- Capture schema dump, row counts, sizes, orphan checks, and query baselines.
- Add feature flags and dual-write code behind disabled flags.
- Create production-sized staging clone with masked sensitive data.
- Establish rollback owner and go/no-go checklist.

**Exit:** no unexplained orphans; backups and point-in-time recovery tested.

### W1: Additive schema, Weeks 2–3

- Apply enum/table/index expansion.
- Add foreign keys `NOT VALID`.
- Deploy code that understands both old and new schemas.
- Enable dual writes for internal users.

**Exit:** migration lock times under 5 seconds per statement; API error rate unchanged.

### W2: Backfill and reconciliation, Weeks 3–5

- Migrate ResearchNote in batches of 250–1,000 rows.
- Backfill WorkspaceTool and explicit follows.
- Normalize valid relationship rows.
- Seed ProfileMetrics.
- Produce orphan/triage report for non-normalizable relationships.

**Exit:** row/checksum parity; all skipped rows have a documented reason.

### W3: Read cutover, Weeks 5–6

- 5% internal workspaces, then 25%, 50%, 100%.
- Compare read results asynchronously.
- Rebuild graph projections.
- Enable discussions and goals for pilot users.

**Exit:** zero severity-1 integrity issues; p95 query regression under 15%.

### W4: Validate and contract, Weeks 7–8

- Validate every `NOT VALID` FK.
- Stop legacy writes.
- Hold a minimum 14-day rollback window.
- Drop legacy tables/columns only after governance approval.

**Exit:** no legacy read fallback for 14 days; restore rehearsal succeeds.

### W5: Product rollout, Weeks 8–12

- Dashboard Goals and Knowledge modules.
- Topic discovery and follow flows.
- Discussion experiences.
- Citation collections and saved-search alerts.
- Provenance graph beta.

## 6. Backfill rules

### ResearchNote

```text
Published/shared → Contribution(type=RESEARCH_NOTE) + ContributionVersion
Private unshared → ProjectNote
Source anchored → Annotation where anchor is available
Ambiguous → ProjectNote plus migration-review flag
```

Never drop the source row until content checksum, author, workspace, project, timestamps, and visibility are matched.

### ToolRepository

Existing workspace-owned repositories become one global repository plus one WorkspaceTool per former row. Deduplicate by normalized `(host, owner, name)` and canonical URL. Conflicting metadata keeps the newest observation while preserving raw import metadata.

### KnowledgeRelationship

- Claim → Evidence SUPPORTS/CONTRADICTS/QUALIFIES migrates to ClaimEvidence.
- Contribution → Evidence migrates to ContributionEvidence.
- Contribution → Claim migrates to ContributionClaim.
- Topic and tool relations migrate to their explicit tables.
- Unknown pairs remain in quarantine until mapped or archived.

## 7. Security and privacy

- Backfill workers use least-privileged service identities.
- Mask confidential content in staging.
- Do not include titles, bodies, quotations, or reviewer identities in migration logs.
- Audit contract operations and data exports.
- Restricted workspaces remain excluded from external AI and unsafe caches.
- Discussion notifications honor anonymous-review and classification policies.

## 8. Observability

Required dashboards:

```text
migration throughput and failures
legacy/new dual-write mismatch
legacy read fallback count
FK validation progress
orphan counts
API p50/p95/p99
DB lock wait and dead tuples
outbox lag
graph projection freshness
search alert lag
goal aggregation lag
```

Alert thresholds:

- any data-loss checksum mismatch: page immediately;
- migration failure rate >0.1% in a 15-minute window: pause batch;
- p95 latency regression >20%: stop cohort expansion;
- graph projection lag >15 minutes: degrade graph UI to list mode;
- integrity event propagation >5 minutes: severity-1 alert.

## 9. Rollback

### Before contract

- Disable v3.4 feature flags.
- Restore legacy reads and writes.
- Stop v3.4 jobs.
- Preserve additive tables for forensic comparison.

### After contract

Rollback requires restore from snapshot or reverse migration. Therefore contract happens only after:

- 14-day zero-fallback period;
- migration parity certification;
- backup restore rehearsal;
- sign-off from Database, Product, Security, and Research Integrity owners.

## 10. Delivery ownership

| Workstream | Accountable owner |
|---|---|
| Schema and SQL | Database/Backend Lead |
| Backfill and reconciliation | Data Migration Lead |
| API and permissions | Backend Platform Lead |
| UI and responsive product | Frontend Lead |
| Accessibility | Accessibility Owner |
| Integrity propagation | Research Integrity Owner |
| Privacy/security | Security Owner |
| Release and rollback | SRE/Release Owner |

## 11. Required artifacts

- Canonical `ResearchWithME-v3.4-schema.prisma`
- Reviewed migration SQL
- Generated Prisma migration diff from a real shadow database
- Backfill commands and dry-run report
- Reconciliation report
- Query-plan report
- Security/privacy review
- Accessibility report
- Rollback runbook
- Release decision record

---

# Part VIII: v3.4 Acceptance Criteria

## A. Schema and migration

- [ ] Prisma `format`, `validate`, and `generate` pass in CI using the repository-approved Prisma version.
- [ ] Schema contains no `ResearchNote`, generic `Follow`, or canonical `KnowledgeRelationship` model.
- [ ] All 83 models and 87 enums have no undefined types or duplicate names.
- [ ] Every relation has an intentional `onDelete` policy.
- [ ] SQL dry-run succeeds on a production-sized masked clone.
- [ ] No migration statement exceeds the approved lock budget of 5 seconds.
- [ ] All `NOT VALID` foreign keys validate after backfill.
- [ ] Every backfill is idempotent and resumable.
- [ ] Row counts and checksums match the approved mapping.
- [ ] Every non-migrated legacy relationship has a documented quarantine reason.

## B. Canonical object behavior

- [ ] Claims link to evidence through explicit SUPPORTS, CONTRADICTS, or QUALIFIES rows.
- [ ] Contributions link to evidence and claims without owning/deleting canonical objects.
- [ ] ResearchNote migration preserves content, author, workspace, project, timestamps, visibility, and version history.
- [ ] ToolRepository is global and deduplicated; workspace access is represented by WorkspaceTool.
- [ ] Software Source records represent citable releases/snapshots and link through ToolSourceLink.
- [ ] Discussion is visibly and semantically separate from formal Review.
- [ ] Topic assignments and follows use FK-backed tables.
- [ ] GraphNode/GraphEdge can be dropped and rebuilt from canonical tables.

## C. API and authorization

- [ ] All new routes have Zod/OpenAPI contracts and integration tests.
- [ ] Every resource operation authorizes workspace membership and classification server-side.
- [ ] Retryable writes require idempotency keys and return the stored result for duplicate requests.
- [ ] 409 conflicts preserve both client and server versions.
- [ ] Anonymous reviewer identity is absent from URLs, logs, analytics, notifications, and non-authorized responses.
- [ ] Rate limits exist for discussion, follows, search alerts, imports, and graph queries.

## D. Product and responsive UX

- [ ] Goals, discussions, topics, saved searches, citation collections, and graph beta have loading, empty, stale, offline, permission, and error states.
- [ ] Phone, tablet, desktop, and wide layouts pass at 320, 360, 390, 412, 480, 768, 1024, 1280, 1440, and 1920 CSS px.
- [ ] Discussion and goal flows work fully with keyboard, TalkBack, and VoiceOver.
- [ ] Mobile sheets trap and restore focus and do not rely on swipe.
- [ ] Graph has an equivalent accessible list/table.
- [ ] Bangla, mixed-script, pseudo-localized, and RTL fixtures pass.

## E. Integrity and AI governance

- [ ] Retraction/correction propagation updates affected graph projections within five minutes.
- [ ] Evidence always resolves to SourceVersion plus structured locator.
- [ ] AI-suggested relationships remain PROPOSED until accepted by an authorized user/workflow.
- [ ] AI provenance records provider, model, transform, sources, validation, and human review.
- [ ] Publication blockers reject unsupported citations, quotation mismatches, unresolved integrity impacts, and prohibited external processing.

## F. Performance and reliability

- [ ] Dashboard first actionable module is available within 1.5 seconds for a typical authenticated session.
- [ ] Autosave API p95 is ≤400ms under expected load.
- [ ] Dashboard API p95 is ≤500ms excluding cold start.
- [ ] Lexical search p95 is ≤700ms.
- [ ] Normalized relation queries regress less than 15% from approved baseline.
- [ ] Graph projection lag is ≤15 minutes and integrity-critical propagation ≤5 minutes.
- [ ] Backup RPO is ≤15 minutes and RTO ≤4 hours.
- [ ] Point-in-time restore and rollback rehearsal succeed.

## G. Cutover and contract

- [ ] Dual writes show zero unexplained mismatch for seven consecutive days.
- [ ] Legacy read fallback is zero for 14 consecutive days.
- [ ] No severity-1 or severity-2 migration defect remains open.
- [ ] Contract migration receives written sign-off from Database, Product, Security, Accessibility, and Research Integrity owners.
- [ ] Release evidence is archived with checksums and build identifiers.

## Final acceptance

v3.4 is accepted only when every mandatory criterion above is evidenced. A passing schema validator alone is insufficient; migration parity, authorization, accessible UX, integrity propagation, performance, and rollback must all pass.
