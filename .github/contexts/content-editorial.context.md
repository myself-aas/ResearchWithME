# ResearchWithMe Content & Editorial Context

## Content Types

### Articles (Blog Posts)
- **Location**: `app/post/[slug]/` or `app/paper/[id]/`
- **Source**: Supabase `articles` table
- **Status**: draft → review → published → archived
- **Fields**: title, slug, excerpt, content (MDX), coverImage, author, category, tags, readingTime

### Papers (Research Papers)
- **Location**: `app/paper/[id]/`
- **Source**: Supabase `papers` table
- **Fields**: title, abstract, authors[], doi, arxivId, publishedAt, journal, citations, references, pdfUrl, codeUrl

### Authors
- **Location**: `app/author/[id]/`
- **Source**: Supabase `profiles` table (role: author/editor/admin)
- **Fields**: name, email, avatar, bio, orcidId, social links, affiliation, hIndex, citationCount

### Categories
- **Location**: `app/category/[slug]/`
- **Source**: Supabase `categories` table
- **Hierarchy**: Parent-child relationships supported

## Editorial Workflow

### Submission Process
1. **Author submits** via `/submit` → `/api/submissions`
2. **Editor assigns** reviewer → `submissions.reviewer_id`
3. **Reviewer reviews** → `submissions.status`: under_review → revision_requested → accepted/rejected
4. **Editor publishes** → Creates article/paper, sets `published_at`

### Review Criteria
- **Originality**: Novel contribution to field
- **Methodology**: Sound, reproducible methods
- **Clarity**: Clear writing, logical structure
- **Impact**: Significance to research community
- **Reproducibility**: Code/data availability

### Publication Checklist
- [ ] Title optimized for SEO/AEO
- [ ] Abstract structured (Background, Methods, Results, Conclusion)
- [ ] Keywords/tags assigned (5-10)
- [ ] Cover image with alt text
- [ ] Author profiles complete
- [ ] Citations formatted (APA/IEEE)
- [ ] DOI registered (papers)
- [ ] Social preview cards generated
- [ ] ISR revalidation triggered

## Content Templates

### Article Template (ResearchWithMe Template v2)
```markdown
---
title: "SEO-Optimized Title | ResearchWithMe"
description: "AEO-optimized description under 160 chars"
slug: "kebab-case-slug"
category: "category-slug"
tags: ["tag1", "tag2", "tag3"]
author: "author-id"
coverImage: "https://..."
publishedAt: "2024-01-15T10:00:00Z"
readingTime: 8
---

# H1: Compelling Title

## Abstract
Brief summary (2-3 sentences) for AEO/featured snippets.

## Introduction
Hook → Context → Thesis → Roadmap

## Section 1: Background
### Subsection
Content with citations [^1]

## Section 2: Methodology
### Subsection
Reproducible details

## Section 3: Results
### Subsection
Data, charts, findings

## Section 4: Discussion
### Subsection
Interpretation, limitations

## Conclusion
Summary → Implications → Future work

## References
[^1]: Citation in ResearchWithMe format

## Author Bio
Brief author credentials
```

### Paper Template
```markdown
---
title: "Paper Title"
doi: "10.1234/example.2024"
arxivId: "2401.12345"
authors:
  - name: "Author One"
    orcidId: "0000-0000-0000-0001"
    affiliation: "Institution"
  - name: "Author Two"
    orcidId: "0000-0000-0000-0002"
    affiliation: "Institution"
publishedAt: "2024-01-15"
journal: "Journal Name"
tags: ["machine-learning", "nlp"]
---

# Abstract
Structured abstract...

# Introduction
...

# Methods
...

# Results
...

# Discussion
...

# Conclusion
...

# References
...
```

## SEO/AEO/GEO Optimization

### Title Optimization
- **Length**: 50-60 characters
- **Keywords**: Primary keyword near start
- **Format**: "Topic: Specific Angle | ResearchWithMe"
- **Examples**:
  - "Transformer Architecture Explained: Attention Mechanisms | ResearchWithMe"
  - "How to Write Reproducible ML Papers: A Complete Guide | ResearchWithMe"

### Meta Description
- **Length**: 150-160 characters
- **Structure**: Question → Answer preview → Authority signal
- **Example**: "What makes transformer attention mechanisms work? We break down the math behind self-attention, multi-head attention, and positional encoding with visual explanations."

### Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  "headline": "Article Title",
  "description": "Meta description",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://researchwithme.com/author/id"
  },
  "datePublished": "2024-01-15T10:00:00Z",
  "dateModified": "2024-01-15T10:00:00Z",
  "publisher": {
    "@type": "Organization",
    "name": "ResearchWithMe",
    "logo": "https://researchwithme.com/icon.png"
  },
  "mainEntityOfPage": "https://researchwithme.com/post/slug"
}
```

### AEO (Answer Engine Optimization)
- **FAQ sections** with `Question`/`Answer` schema
- **How-to steps** with `HowTo` schema
- **Definitions** with `DefinedTerm` schema
- **Comparison tables** for "vs" queries

### GEO (Generative Engine Optimization)
- **Clear entity definitions** (What is X?)
- **Causal explanations** (Why does X happen?)
- **Procedural content** (How to do X?)
- **Comparative analysis** (X vs Y)
- **Citations** to authoritative sources

## Citation Format

### ResearchWithMe Citation Style
```
Author(s). "Title." Journal/Conference, Year. DOI: xx.xxxx/xxxxxx
```

### In-Text Citations
- **Numeric**: [1], [2-4]
- **Author-Year**: (Smith et al., 2024)
- **DOI links**: Always link to DOI resolver

### Reference List
- Sorted alphabetically by first author
- Include DOI when available
- Link to paper page on ResearchWithMe

## Content Management (CMS)

### Admin Interface
- `/admin` - Editorial dashboard (future)
- `/api/cms/*` - CMS API endpoints

### Bulk Operations
- Import from BibTeX/JSON
- Export to various formats
- Batch revalidation

### Version Control
- Article versions in `article_versions` table (future)
- Diff view for edits
- Rollback capability

## Multimedia

### Images
- **Cover images**: 1200x630 (social), 800x450 (article)
- **Inline images**: Max 800px width
- **Format**: WebP with JPEG fallback
- **Alt text**: Required, descriptive

### Videos (HyperFrames)
- **Explainer videos**: 60-90s, 1920x1080, 30fps
- **Embed**: `<VideoEmbed src="/videos/explainer/video.mp4" />`
- **Captions**: Required (VTT format)
- **Thumbnails**: 1280x720

### Interactive Elements
- **Code blocks**: Syntax highlighted, copyable
- **Math**: KaTeX rendering
- **Charts**: Recharts/Chart.js
- **3D**: Three.js (limited)

## Accessibility

### Content Requirements
- **Headings**: Proper hierarchy (H1→H2→H3)
- **Alt text**: All images, descriptive
- **Links**: Descriptive text, no "click here"
- **Color contrast**: WCAG AA (4.5:1)
- **Language**: `lang` attribute on page

### Reading Experience
- **Line length**: ~65 characters (prose container)
- **Font size**: 18px base (Aptos Serif)
- **Line height**: 1.7
- **Paragraph spacing**: 1.5em

## Analytics & Performance

### Content Metrics
- **Views**: Unique page views
- **Read time**: Scroll depth + time on page
- **Engagement**: Likes, bookmarks, shares, comments
- **Citations**: Outbound citation clicks
- **Conversion**: Newsletter signups, follows

### A/B Testing (Future)
- Headline variants
- Cover image variants
- CTA placement
- Content length

## Legal & Ethics

### Copyright
- **Author retains copyright**
- **ResearchWithMe**: Non-exclusive license to publish
- **CC BY 4.0**: Default for open access
- **Fair use**: For citations, criticism, education

### Ethics
- **Plagiarism**: Zero tolerance, automated checks
- **AI disclosure**: Required for AI-assisted content
- **Conflicts of interest**: Author declaration
- **Data availability**: Statement required

### Retraction Policy
- **Correction**: Minor errors, appended notice
- **Retraction**: Major flaws, watermarked PDF
- **Expression of concern**: Under investigation