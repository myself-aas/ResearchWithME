---
version: 1
slug: "app-dashboard-edit-id-page-tsx"
primary_target: "app/dashboard/edit/[id]/page.tsx"
related_targets: ["components/cms/PostEditor.tsx","components/cms/ConfirmDelete.tsx"]
---

# Studio: Edit Article

Mode: Operate

## Purpose
Reopen a draft or published article, revise it, change its publication state, and keep the public reader in sync.

## First useful result
An editor loads the article by id, makes a change, saves or publishes it, and sees the journal and article URL revalidate.

## Direction
The same editing surface as New Article, with a visible status, the public URL, and a view link once published. Deletion lives beside the record, not in a toolbar graveyard.

## Constraints
- Loading, missing, deleted, and unauthorised states each explain the next step.
- Changing a published URL warns that existing links will break.
- Reverting to draft removes the article from the journal immediately.
- Failed saves preserve the edit and do not silently mark the article saved.

## Checks
Deleted id, invalid id, session expiry, title/slug change, unpublish, delete with comments, and mobile editing.
