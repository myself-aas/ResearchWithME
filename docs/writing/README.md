# November 2026 deep-dive editorial revision

## Scope

The author selected adaptation of the supplied Prithvi review, a reusable technical deep-dive
scaffold, and genre-appropriate improvements to all 17 existing drafts. The initial editorial pass
preserved publication states. The author subsequently explicitly requested distinct images,
publication of all 17 drafts, and commit/push of the complete work on the active branch. Those
17 posts now have `draft: false`; existing URLs, original dates and registered figure bindings
remain unchanged. No merge or separate production-deploy command is part of this task.

- `sources/prithvi-deep-dive.supplied.md`: verbatim supplied Prithvi manuscript.
- `sources/technical-deep-dive-template.supplied.md`: verbatim supplied template manuscript.
- `revision-manifest.json`: unchanged baseline `939903c` publication/figure inventory and source SHA-256 hashes.
- `publication-manifest.json`: explicit publication authorization and the 17 cover paths, descriptions, dimensions and creation methods.
- `covers/*.svg`: editable source for seven custom vector covers. The other ten covers are AI-generated conceptual illustrations, not product screenshots or evidence. All 17 deployed covers are 1200×675 WebP files under 150 KB each. The image-generation tool reached its ten-image turn limit; the remaining seven were drawn as custom vector illustrations rather than omitted.
- `../../templates/TECHNICAL_DEEP_DIVE_POST.mdx.tmpl`: runtime-compatible authoring scaffold.
- `../../content/README.md`: scaffold invocation and publication workflow.

The supplied files are provenance, not automatically executable site content or verified findings.
The runtime adaptation uses supported frontmatter, existing figure bindings and readable text math;
it does not add a math/diagram runtime, dependencies or fabricated figure data. Publishing exposes
the existing draft slugs without renaming any article.

## Evidence boundaries

This was an editorial and source-inspection task, not an upstream reproduction, training run,
security certification or statistical validation. The supplied paper tables, bibliographic metadata
and quotations still need human primary-source review before they are relied on as verified facts.
Reported results must remain distinguishable from independent measurements.

Prithvi implementation checks inspected these pinned source snapshots:

- [NASA-IMPACT/Prithvi-EO-2.0, 758311280f935d4775c05b26d792768bf1fda841](https://github.com/NASA-IMPACT/Prithvi-EO-2.0/tree/758311280f935d4775c05b26d792768bf1fda841): README, Sen1Floods11 configuration and requirements.
- [IBM/terratorch, 297b9dea723a147aef6b778041af111b71494e59](https://github.com/IBM/terratorch/blob/297b9dea723a147aef6b778041af111b71494e59/terratorch/models/backbones/prithvi_vit.py): backbone configuration and metadata encoding.

These establish source-level contracts at those revisions, not compatibility of every checkpoint
or a working local fine-tuning environment. The partial YAML remains explicitly unexecuted and
incomplete. Masking/token-attention arithmetic is not an end-to-end speedup measurement.

The benchmark reproduction draft has no traceable harness or raw run archive in the supplied
material. Its numerical fixtures, figures and quiz are therefore explicitly illustrative/unverified,
not evidence of a failed published result or correspondence with upstream authors. Other drafts
separate personal observations, proposed evaluations and static repository inspection from
measurements that have not been performed. The Perspective article concerns the analytics engine,
not Google's moderation API; its legacy slug is intentionally unchanged.

## Regression checks

`test/editorial-revision.test.tsx` checks source hashes, baseline dates/URLs, the explicit publication
allowlist, figure bindings, the unchanged welcome post, structural editorial requirements, key evidence
labels, and unique optimized covers with alt text. The original baseline is retained rather than
rewritten to hide the deliberate publication-state change.
`test/new-post.test.ts` exercises both scaffold modes, explicit publication, title escaping and
exclusive writes. These checks do not verify scientific claims or approve publication.

To repeat the main validation:

```sh
npm run content:gen
npm run quality
npm run build
npm run check:site
# With a supported Chromium available:
npm run test:production
```

Review rendered text, tables, code, FAQ and figures as well as automated results. Never regenerate
the provenance manifest from revised posts merely to silence a preservation-test failure; review
and explain any intended change to the baseline contract.

## Publication validation (2026-11-26)

- `npm run quality`: 294 tests across 22 files; lint, types, design and token gates pass.
- Production build and `npm run check:site`: pass with 19 published posts.
- Node production smoke/browser suite: 15/15 pass, including all 17 newly published
  posts and cover loading/reflow at 390px and 1280px, plus discovery artifacts.
- OpenNext Worker build and local artifact-size checks: pass; 15/15 browser tests
  also pass through the adapter's local preview. This is not a production deployment.
- Browser failures caught three figures sharing Markdown paragraphs with adjacent
  prose/citations (invalid block nesting) and min-content overflow in related-post
  cards. Separate figure paragraphs and constrained grid tracks fix those failures;
  the expanded regression suite checks both.
- The Worker smoke script now starts the OpenNext adapter preview, which populates
  local KV with prerendered article responses before starting Wrangler. Bare
  `wrangler dev` did not seed that cache; the old search-only probe missed article
  failures. No remote bindings or production resources are modified by this check.

Original content dates remain intact, with `updated: 2026-11-26` recording this revision.
The benchmark is public specifically as a hypothetical worked example; the tooling
article is a published working note with its unfinished scope visible. Publication
approval does not change the evidence boundaries above. Existing dependency/security
and full-v4.1 compliance limitations are not resolved by this content release.
