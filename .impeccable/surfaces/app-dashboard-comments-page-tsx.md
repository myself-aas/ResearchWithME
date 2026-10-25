---
version: 1
slug: "app-dashboard-comments-page-tsx"
primary_target: "app/dashboard/comments/page.tsx"
related_targets: ["lib/cms/use-cms.ts","components/cms/ConfirmDelete.tsx"]
---

# Studio: Comments

Mode: Operate

## Purpose
Read and moderate public discussion on published CMS articles.

## First useful result
An editor scans recent comments, finds one by author, article, or text, and deletes it after an explicit confirmation.

## Direction
A quiet correspondence queue: author and role, article title, date, and the comment as quoted prose. No nested cards, no emoji, no engagement metrics.

## Constraints
- Deleting is two-step and irreversible; the control states what disappears.
- Realtime is optional; manual retry is always present.
- Empty and filtered-empty states explain why the queue is empty.
- Never expose draft article titles to readers from this page.

## Checks
No comments, comment on a deleted article, delete failure, session expiry, realtime disconnect, and long comment text at 320px.
