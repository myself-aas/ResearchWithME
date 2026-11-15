# Mobile publishing experience: initial competitive review

Source-based review; this is not a hands-on audit or a claim about current screenshots on every platform. Reviewed 2026-11-15. Revisit on actual phones before making final navigation decisions.

| Product | Evidence | Relevant design lesson | Not implied |
| --- | --- | --- | --- |
| Medium | [Library and reading lists](https://help.medium.com/hc/en-us/articles/214993247-Your-reading-list), [highlights](https://help.medium.com/hc/en-us/articles/214406358-About-highlights), [home feed](https://help.medium.com/hc/en-us/articles/115012586467-Your-homepage), [drafts](https://help.medium.com/hc/en-us/articles/214874698-Create-edit-or-delete-a-story) | Make saving and returning to reading easy; keep the article readable; connect writers with their drafts. | Adding highlights, follows, or personalization in this design refactor. |
| Substack | [App discovery and reading queue](https://techcrunch.com/2023/09/20/substack-redesigns-its-mobile-app-to-boost-discovery-and-engagement/) (2023), [app description](https://play.google.com/store/apps/details?id=com.substack.app) | Balance visually engaging discovery with a direct route back to saved reading and authors. | Reproducing its social feed or assuming the 2023 UI is unchanged. |
| ResearchGate | [App description](https://play.google.com/store/apps/details?id=net.researchgate.shellapp&hl=en_US) | Keep researcher identity, source material and discovery visible; avoid unnecessary steps between a review and its evidence. | Treating this review platform as an academic journal or copying its interface. |

## Proposed ResearchWithMe direction

A compact top shell and mobile shortcuts for Home, Search, Saved and Menu, using Material 3's adaptive navigation and touch-target principles as inspiration, not an Android-only design. Preserve an unobstructed reading and writing surface; ensure search, author pages, saved content, settings and existing publishing flows remain reachable. Treat expressive images and motion as enhancement, and do not turn speculative recommendations into existing product features.

## Verification still required

Compare the flows on real Android and iOS devices with a keyboard, browser chrome and safe areas. Check reduced motion, keyboard navigation, storage denial, offline/error states, and before/after performance on representative devices. The phase-one budget report is a build-size check, not a Core Web Vitals measurement.

## Phase-one visual provenance

The abstract hero artwork (`public/images/discovery-research.webp`) is AI-generated using the available workspace image tool, not a research photograph. It was refined to suggest AI-assisted discovery through connected points and flowing forms without robots or machines. The requested Higgsfield `all` skill was not present and the Higgsfield CLI was not available. The optimized image is approximately 28 KB. No Tripo asset or Three.js renderer was added in this phase.
