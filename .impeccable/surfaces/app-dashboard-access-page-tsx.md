---
version: 1
slug: "app-dashboard-access-page-tsx"
primary_target: "app/dashboard/access/page.tsx"
related_targets: ["components/dashboard/AuthorApplication.tsx","lib/applications.ts","lib/cms/auth.ts","components/dashboard/ProfilePhotoCard.tsx","lib/profile-photo.ts"]
---

# Apply to Write

Mode: Operate

## Purpose
Let a signed-in reader connect a GitHub or ORCID identity and apply to publish.

## First useful result
A signed-in reader sees their application status and a clear way to apply or reconnect.

## Direction
Reachable by any signed-in account; unauthenticated visitors are redirected to login with a return path. Not indexed.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Signed-out redirect, demo mode without Supabase, application read failure, pending/approved/rejected states, and keyboard focus.
Profile photo: card shows only for a signed-in user with a profile row, a message when there is no profile, nothing in local mode; JPEG-only crop dialog is keyboard operable, upload failure shows an inline error, and success announces the update via `role="status"`.
