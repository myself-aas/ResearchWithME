---
version: 1
slug: "app-dashboard-profile-page-tsx"
primary_target: "app/dashboard/profile/page.tsx"
related_targets: ["components/dashboard/ProfileEditor.tsx","components/dashboard/ProfilePhotoCard.tsx","components/dashboard/DashboardProfileHeader.tsx","components/dashboard/DashboardTabs.tsx","lib/dashboard/profile.ts","lib/profile/validation.ts"]
---

# Profile

Mode: Operate

## Purpose
Let the owner of an account write the byline that readers will see: name, role, affiliation, bio, ORCID, GitHub, website, Scholar, and whether the profile is listed publicly — without asking an editor to do it in SQL.

## First useful result
A signed-in author can open the form, see the values currently stored in `public.profiles`, correct a typo in their bio, and save it in place. Someone without a profile can create one and decide on the same screen whether it is public.

## Direction
One form, grouped as identity (name, profile URL, role), affiliation (institution, field), links (ORCID, GitHub, website, Scholar), and about (bio with a live character count), followed by the publish switch and one primary action. The profile photo sits above the form, because it is a separate object store operation with its own confirmation. The slug is a first-class field with a `/author/` prefix, so the public address is visible while editing rather than discovered later. Validation messages name the fix ("Use lowercase letters, numbers, and single dashes — try …"), and the database remains the authority for uniqueness and ownership.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, labelled inputs, and errors tied to their fields with `aria-describedby`.
- Reflow to 320px without horizontal scrolling; the two-column grid collapses to one.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next. A taken slug is reported in the slug field, not as a generic failure.
- Honest demo labels: an environment without Supabase says profile editing needs the connection instead of accepting edits that cannot be saved.
- No counters, badges, or identities are shown unless a query returned them.

## Checks
No profile yet (create flow, suggested slug from the session name), an existing profile (all fields pre-filled), a taken slug, an invalid ORCID and a bare-domain website, an over-long bio, an unpublished profile (no public link offered), a published profile (public link works), the photo-only account on `/dashboard/access`, a signed-out visit (the dashboard layout redirects before the form renders), and 320px reflow.
