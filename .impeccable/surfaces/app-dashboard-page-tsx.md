---
version: 1
slug: "app-dashboard-page-tsx"
primary_target: "app/dashboard/(studio)/page.tsx"
related_targets: ["components/cms/PostEditor.tsx","components/cms/MarkdownEditor.tsx","components/cms/DashboardShell.tsx","components/media/ImageCropDialog.tsx"]
---

# Studio: New Article

Mode: Operate

## Purpose
Create a publishable article with a byline, cover, takeaways, and Markdown body, or park it safely as a draft.

## First useful result
An editor writes a title, summary, and body, fixes any validation errors in place, and either saves a private draft or publishes to the platform.

## Direction
One white editing surface divided by rules: record, byline, cover, takeaways, body, publishing. Serif hierarchy, monospaced Markdown, amber primary action. No nested cards; the only modal is the banner crop dialog (choose a JPG/JPEG, crop 16:9, save).

## Constraints
- Uses the shared platform masthead and footer (BlogHeader/BlogFooter), identical to the public pages; no bespoke studio chrome. The studio sidebar is page content, not site chrome.
- Every control has a visible label; the error summary links to the first invalid field.
- Draft may be incomplete; publishing enforces title, body, summary, and takeaway rules on the server too.
- Unsaved changes warn before leaving; save failure preserves every field.
- Reflow to 320px; the sticky action row never hides content.
- No kickers, gradient text, decorative animation, or fake autosave claims.

## Checks
Empty draft, publish with missing summary, duplicate slug, cover upload failure, PNG or over-512 KB banner rejected, crop smaller than 1200 × 675 px, upload in demo mode, 401 session expiry, and long content.
