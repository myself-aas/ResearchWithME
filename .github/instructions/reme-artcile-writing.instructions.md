---
description: "Strict enforcement of ResearchWithMe Template v2 for SEO/AEO/GEO-optimized blog articles. Applies when writing, editing, or reviewing research articles."
applyTo: "**/*.md"
---

# ResearchWithMe Article Writing Instructions (Template v2)

These instructions enforce the **ResearchWithMe Template v2** for all blog articles. Every article must pass all CITABLE gates, follow dashboard design principles, include Mermaid architecture diagrams, and produce valid JSON-LD `@graph` output.

---

## 1. MANDATORY: CMS Studio Fields (All 7 Required)

Before writing ANY content, populate these fields in the article frontmatter:

```yaml
---
schemaType: "ScholarlyArticle"  # REQUIRED: Article | ScholarlyArticle | TechArticle | Review | BlogPosting | NewsArticle | SoftwareSourceCode
authorCredentials:
  jobTitle: "Senior Research Scientist"
  knowsAbout: ["Machine Learning", "NLP", "Information Retrieval"]
  alumniOf: "Stanford University"
  sameAs: ["https://github.com/username", "https://linkedin.com/in/username"]
keyEntities:
  - name: "BERT"
    type: "SoftwareApplication"
    url: "https://github.com/google-research/bert"
    sameAs: "https://en.wikipedia.org/wiki/BERT_(language_model)"
    description: "Bidirectional Encoder Representations from Transformers"
relatedWorks:
  - doi: "10.18653/v1/N19-1423"
    arxivId: "1810.04805"
    url: "https://arxiv.org/abs/1810.04805"
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
    relationType: "cites"
fundingSources:
  - funder: "National Science Foundation"
    identifier: "NSF-1234567"
    name: "CAREER Award"
    url: "https://nsf.gov/awardsearch/showAward?AWD_ID=1234567"
updateDate: "2026-11-08"  # ISO8601, REQUIRED
faqBlock:
  - question: "What is the main contribution?"
    answer: "We introduce a novel framework for..."
  - question: "How does this differ from prior work?"
    answer: "Unlike previous approaches..."
---
```

**Validation Rules:**
- `schemaType` MUST match content intent (use selection flowchart in template)
- `authorCredentials.sameAs` MUST be verifiable URLs
- `keyEntities` MUST have `sameAs` linking to external knowledge graphs
- `relatedWorks` MUST have ≥90% DOI/arXiv/URL coverage
- `updateDate` MUST be today or recent (≤30 days)
- `faqBlock` MUST have ≥3 Q&A pairs for AEO/GEO

---

## 2. MANDATORY: Answer-First Heading Structure

**Every H2 MUST be a question. First paragraph under each H2 answers it directly (≤40 words).**

```markdown
# Article Title = Core Research Question

## What is [Core Concept]?
[Direct answer in ≤40 words. No throat-clearing.]

### Nuance 1: [Specific Aspect]
[Supporting detail]

### Nuance 2: [Specific Aspect]
[Supporting detail]

## How does [Core Concept] work?
[Direct answer in ≤40 words.]

### Mechanism 1: [Component]
[Detail]

### Mechanism 2: [Component]
[Detail]

## Why does [Core Concept] matter?
[Direct answer in ≤40 words.]

## When to use [Core Concept]?
[Direct answer in ≤40 words.]

## [Core Concept] vs [Alternative] Comparison
[Comparison TABLE - not prose]
```

**Forbidden:**
- H2 statements (e.g., "## Introduction", "## Background")
- H2 without answer-first paragraph
- Prose-only comparisons (must use tables)

---

## 3. MANDATORY: Extraction-Ready Data Patterns

| Content Type | Required Format | Example |
|--------------|-----------------|---------|
| Comparisons | Markdown table with aligned columns | See template §2.2 |
| Sequences | Ordered list (`1.`, `2.`, `3.`) | `1. Step one\n2. Step two` |
| Definitions | Description list (`<dl>`/`<dt>`/`<dd>`) | `<dt>Term</dt><dd>Definition</dd>` |
| Metrics/KPIs | KPI tile format (see §5) | Value + Delta + Sparkline |
| Code snippets | Fenced block + language tag | ```python\ncode\n``` |
| FAQs | Q&A pairs in `faqBlock` frontmatter | See §1 |

**Every comparative data point MUST be in a table. Every sequential process MUST be an ordered list.**

---

## 4. MANDATORY: Locator Anchors for Every Claim

Every claim-carrying paragraph MUST have a stable ID:

```markdown
<!-- CLAIM: BERT outperforms ELMo on GLUE benchmark -->
<p id="claim-results-1" data-claim="bert-glue-sota" data-evidence="table-glue-results" data-locator="results:1">
BERT achieves 80.5% average GLUE score, outperforming ELMo by 7.2 points.
</p>
```

**Automation:** The CITABLE validator will inject these. Do not remove them.

---

## 5. MANDATORY: Dashboard Design Visual Components

### 5.1 KPI Tiles (Replace Metric Cards)

For every key metric, render a KPI tile:

```markdown
:::kpi-tile
value: "80.5%"
label: "GLUE Average"
delta: "+7.2 pts WoW"
trend: [78.1, 78.9, 79.3, 79.8, 80.5]
state: "positive"
:::
```

**Design Rules (from 127 shipped dashboards):**
- ✅ Soft tinted fill for selected state (NO underline)
- ✅ 3px share bar on ranked list rows (NO tinted background)
- ✅ Round ticks: 0, 1k, 2k (NO 2,103)
- ✅ Delta with one-word baseline: "WoW +12%" (NO sentences)
- ✅ Explanation in tooltip, NOT under the number
- ✅ Sparklines share chart's time window

### 5.2 Charts with Recharts Legend Opacity

For multi-series charts, use interactive legend:

```markdown
:::recharts-line
data: "glue_scores.csv"
xKey: "model"
series:
  - key: "bert"
    color: "#2563eb"
    label: "BERT"
  - key: "elmo"
    color: "#16a34a"
    label: "ELMo"
legendInteraction: "opacity-hover"
tooltip: "custom"
:::
```

**Behavior:** Hover legend item → other series dim to 30% opacity.

### 5.3 Bullet Graphs (Replace Radial Gauges)

For target vs actual metrics:

```markdown
:::bullet-graph
actual: 92
target: 100
ranges:
  - {max: 60, label: "Poor", color: "#fee2e2"}
  - {max: 80, label: "Fair", color: "#fef3c7"}
  - {max: 100, label: "Good", color: "#dcfce7"}
  - {max: 120, label: "Excellent", color: "#bbf7d0"}
:::
```

### 5.4 Responsive Layout

Articles MUST render correctly at 4 breakpoints:
- Phone (<640px): KPI stack 1-col, chart full-width, ranked list as menu grid
- Tablet (640-1024px): KPI 2-col, chart 2/3, breakdown 1/3
- Desktop (1024-1440px): KPI 4-col, chart 1/2, breakdowns 2×2 grid
- Wide (>1440px): KPI 5-6 col, chart 3/5, breakdowns 3-in-row, side panel

---

## 6. MANDATORY: Mermaid Architecture Diagrams

Every article MUST include at least 2 Mermaid diagrams:

### Required Diagrams:
1. **C4 Context Diagram** — System context for the research
2. **Flowchart** — Research pipeline or methodology

### Optional (choose ≥1):
- **Sequence Diagram** — API calls, user journeys, model inference
- **Class Diagram** — Type hierarchies, model architectures
- **State Diagram** — Training states, evaluation workflows
- **ER Diagram** — Data schemas, entity relationships
- **GitGraph** — Version control, experiment tracking

### Mermaid Standards:
```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#1e293b',
  'primaryTextColor': '#f8fafc',
  'primaryBorderColor': '#334155',
  'lineColor': '#64748b',
  'secondaryColor': '#0f172a',
  'tertiaryColor': '#1e293b',
  'fontFamily': 'JetBrains Mono, ui-monospace, monospace',
  'fontSize': '13px'
}}}%%
flowchart TD
    %% Your diagram here
    classDef primary fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc
    classDef output fill:#065f46,stroke:#10b981,stroke-width:2px,color:#f8fafc
```

**Theme MUST be dark with specified variables. Use classDef for semantic coloring.**

---

## 7. MANDATORY: CITABLE Review Gates (All 7 Must Pass)

Before publishing, verify each gate:

| Gate | Check | Pass Threshold |
|------|-------|----------------|
| **C** Claim-Evidence | Every major claim → evidence anchor (section/table/figure) | 100% of Abstract/Intro/Conclusion claims |
| **I** Integrity of Citations | All DOIs resolve, arXiv IDs valid, URLs HTTP 200, locator anchors present | 0 broken citations |
| **T** Terminology Consistency | All terms defined on first use, glossary matches, no conflicting abbreviations | 0 undefined terms |
| **A** Answer-First Structure | All H2s are questions, first paragraph answers, no H2 without answer | 100% compliance |
| **B** Bibliographic Completeness | Related Works ≥90% with identifiers, consistent citation format | ≥90% populated |
| **L** Locator Anchors | Every claim has paragraph/section locator, injected in HTML/JSON-LD | 100% of claims |
| **E** Extraction Readiness | Comparative data in tables/lists, sequential in ordered lists, no prose-only structured data | 100% of qualifying sections |

### Integrity Gates (ARS-Inspired) — HIGH-WARN Blocks Publication:

| Class | Detection | Resolution |
|-------|-----------|------------|
| `claim-not-supported` | Claim extractor finds no evidence anchor | Add citation or remove claim |
| `negative-constraint-violation` | Template rule violated (H2 not question) | Restructure heading |
| `fabricated-reference` | DOI/arXiv/URL fails resolution | Verify or remove |
| `anchorless` | Claim lacks paragraph/section locator | Inject locator ID |
| `constraint-violation-uncited` | Structural rule broken without citation | Add citation or fix |
| `hallucinated-entity` | Key Entity lacks external `sameAs` verification | Verify entity or remove |
| `schema-mismatch` | Schema type inconsistent with content | Change schema type |

**ANY HIGH-WARN = BLOCK PUBLICATION. Fix before proceeding.**

### Style Calibration (Anti-Slop) — Composite ≥35/50 Required:

| Dimension | Target | Stop-Slop Rules |
|-----------|--------|-----------------|
| Directness | ≥8 | Ban throat-clearing openers, hedging, meta-commentary |
| Rhythm | ≥8 | Ban staccato fragments, manufactured punchlines, em dashes |
| Trust | ≥8 | Ban vague declaratives, business jargon, emphasis crutches |
| Authenticity | ≥8 | Ban false agency, passive voice, rhetorical setups |
| Density | ≥8 | Ban lazy extremes ("every", "never"), negative listings |

**Run humanizer voice matching against ResearchWithMe house style before final review.**

---

## 8. MANDATORY: JSON-LD @graph Output

Every article MUST generate valid JSON-LD `@graph` with:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "WebPage", "@id": "#webpage", "mainEntity": {"@id": "#article"}},
    {"@type": "Article", "@id": "#article", "headline": "...", "author": {"@id": "#author"}, "datePublished": "...", "dateModified": "...", "citation": [...], "funding": [...], "about": [...], "mentions": [...]},
    {"@type": "Person", "@id": "#author", "name": "...", "jobTitle": "...", "knowsAbout": [...], "sameAs": [...]},
    {"@type": "FAQPage", "@id": "#faq", "mainEntity": [...]},
    {"@type": "DefinedTermSet", "@id": "#glossary", "hasDefinedTerm": [...]}
  ]
}
```

**Validation:** Test with Google Rich Results Test and Schema.org validator.

---

## 9. DUAL-WORKFLOW COMPLIANCE

### Primary: Web Discovery (GEO-Optimized)
- Full JSON-LD injection
- IndexNow ping on publish
- Analytics instrumentation (AI Citation Rate, SOV, Zero-Click, Engine Coverage, Citation Depth, Freshness)

### Secondary: arXiv Submission
- Pandoc: Markdown → LaTeX
- BibTeX from `relatedWorks`
- Figure extraction
- arXiv package build → LaTeX compile test → format check → metadata completeness → license verification → API submit

**Articles targeting arXiv MUST pass both workflows.**

---

## 10. ENFORCEMENT CHECKLIST (Run Before Every Commit)

```bash
# 1. Validate frontmatter has all 7 studio fields
# 2. Check all H2s are questions with answer-first paragraphs
# 3. Verify all comparisons in tables, sequences in ordered lists
# 4. Confirm locator anchors on all claim paragraphs
# 5. Validate KPI tiles, charts, bullet graphs render
# 6. Confirm ≥2 Mermaid diagrams (C4 + Flowchart minimum)
# 7. Run CITABLE gate automation (all 7 PASS)
# 8. Check HIGH-WARN count = 0
# 9. Verify style composite score ≥35/50
# 10. Validate JSON-LD @graph with Schema.org validator
# 11. Test responsive layout at 4 breakpoints
# 12. Screenshot QA pass (salience test, color-blindness check)
```

---

## 11. FORBIDDEN PATTERNS

| Pattern | Replacement |
|---------|-------------|
| "In this article, we..." | Direct answer |
| "It is important to note that..." | Delete |
| "Furthermore/Moreover/Additionally" | Delete or use implicit flow |
| "Deep dive into..." | Specific H2 question |
| "Comprehensive guide to..." | Specific H2 question |
| Prose comparisons | Markdown tables |
| Radial gauges | Bullet graphs |
| Tinted row backgrounds | 3px share bars |
| Underline selected state | Soft tinted fill |
| Precise ticks (2,103) | Round ticks (0, 1k, 2k) |
| Sentence deltas | One-word baseline deltas |
| Explanations under numbers | Tooltips |
| Light theme diagrams | Dark theme with specified variables |

---

## 12. REFERENCES

- Template v2: `ResearchWithMe_Template_Optimized_v2.md`
- Dashboard Design: abdiraimov-otabek/dashboard-design-skill (127 shipped dashboards)
- Recharts Legend Opacity: recharts.org/en-US/api/Legend
- Mermaid Best Practices: spillwavesolutions/design-doc-mermaid
- CITABLE Framework: Discovered Labs "How AI Systems Decide What to Cite"
- ARS Integrity Gates: Imbad0202/academic-research-skills
- Anti-Slop: hardikpandya/stop-slop, blader/humanizer