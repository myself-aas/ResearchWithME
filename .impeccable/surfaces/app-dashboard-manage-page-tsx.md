---
version: 1
slug: "app-dashboard-manage-page-tsx"
primary_target: "app/dashboard/manage/page.tsx"
related_targets: ["lib/cms/use-cms.ts","components/cms/StatusBadge.tsx"]
---

# Studio: Articles

Mode: Operate

## Purpose
See every draft and published article, filter it, change publication state, and delete with a confirmation.

## First useful result
An editor finds an article by title, slug, author, or tag, then publishes, reverts, edits, views, or deletes it.

## Direction
A typographic archive, not a table of cards: one bordered list, status as a dot plus word, actions aligned right on desktop and wrapped below on mobile.

## Constraints
- Status is never colour alone; each row states Draft or Published.
- Publish and revert are explicit; delete needs a second click and moves focus to the confirm action.
- Loading skeletons are static and reserve space; empty and filtered-empty states offer a recovery path.
- Realtime is progressive: the page works when subscription is unavailable.
- 44px targets on coarse pointers; no horizontal page scroll at 320px.

## Checks
No articles, no matches, publish with incomplete draft, revert, delete, realtime reconnect, API failure, and session expiry.
