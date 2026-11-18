# Unified rich-text editor — 17 November 2026

One editor implementation (`components/editor/MdxEditor.tsx` →
`components/editor/PlateBodyEditor.tsx`) is shared by the writer studio
(`/write`), the CMS post editor, and the scholarly editor workspace. There is no
per-surface toolbar or second block menu.

## Material 3 mapping

| M3 component | Use in the editor |
| --- | --- |
| Docked toolbar | Horizontal toolbar above the writing surface below `lg`; the same component becomes a vertical docked rail beside the surface at `lg`. The editor route has no bottom navigation bar, so the toolbar never competes with one. |
| Icon buttons (toggle) | Bold, italic, strikethrough, inline code, and link. Active marks use a filled brand container plus `aria-pressed`; the icon is never the only state signal. |
| Split button | Text style. The leading face applies or removes Heading 2; the trailing menu exposes Paragraph and Heading 1–6 with `menuitemradio` state. The chevron rotates when the menu opens. |
| Connected button group | Text-style split button, body-mode Visual/Markdown switch, and the block-category switch in the palette. |
| Text fields | Outlined link URL and link text fields, and the outlined block search field. Dialogs use one field variant only. |
| Extended FAB | Desktop insertion entry point (“Insert block”) opening the searchable palette. |
| FAB | Mobile insertion entry point, 56 dp and clear of the safe-area inset. |
| FAB menu | Mobile menu with five quick blocks plus “All blocks & MDX”. It is never paired with the extended FAB. |
| Buttons | Dialog actions and palette block choices, including a filled primary action and text-style secondary action. |

## Insertion hierarchy

1. **Toolbar** — small, task-based set: history, inline text, paragraph/heading
   style, lists, quote, code block, divider, link.
2. **Split-button menu** — the complete heading scale (H1–H6).
3. **FAB menu** — six mobile actions at most, per M3 FAB-menu guidance.
4. **Block palette** — every heading, structural block, and allowlisted MDX
   component, searchable and grouped. `/` on an empty block opens it directly.
5. **Markdown source mode** — standard Markdown stays editable in place.
   Tables, equations, Mermaid, images with authored URLs, and MDX components
   open in source so their syntax is preserved exactly.

## Coverage

Structural blocks: paragraph, H1–H6, bulleted list, numbered list, blockquote,
fenced code block, divider, image, GFM table, TeX equation, Mermaid diagram.

MDX components (mirrors `ALLOWED_MDX_COMPONENTS` one-for-one):
`EvidenceCallout`, `ClaimSummary`, `CitationRef`, `LimitationBox`,
`ToolReviewCard`, `DataTable`, `EquationBlock`, `DiagramBlock`, `FigureBlock`,
`Callout`. Every template is validated by `validateAndSanitizeMdx` in
`lib/__tests__/editor-block-catalog.test.ts`.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ B`, `I` | Bold, italic |
| `Ctrl/⌘ E` | Inline code |
| `Ctrl/⌘ K` | Insert or edit a link |
| `Ctrl/⌘ Z`, `Ctrl/⌘ Shift Z` | Undo, redo |
| `⌥ 1`–`⌥ 6` | Heading 1–6 |
| `/` | Open the block palette on an empty block |
| Arrow keys, Home, End | Move within the toolbar groups |
| Escape | Close a menu or dialog and restore focus |

## Accessibility and behaviour

- Every interactive target is at least 44 × 44 px.
- The writing surface is a labelled multiline text box; errors use
  `aria-invalid` and `role="alert"`, and mode changes/insert results use
  `role="status"`.
- Dialogs portal to `document.body`, lock background scroll, trap Tab, restore
  focus to their trigger, and close on Escape.
- Menus support arrow keys, Home/End, Escape, outside-pointer dismissal, and
  focus return.
- Status is never conveyed by colour alone: `aria-pressed`, `aria-checked`,
  text labels, and icon shape all change together.
- Rotation/transition decoration respects `prefers-reduced-motion`.
- Links render as real anchors. Destinations pass `sanitizeMdxUrl`; script and
  HTML data URLs are rejected in the dialog and omitted from rendered anchors.
- Paste keeps supported structure and drops unsupported visual styling. Raw
  MDX is only inserted from the catalogue or written in source mode, then
  passes the existing MDX validation/sanitisation boundary on publish.

## Deliberate boundary

The allowlisted MDX components are validated and insertable, but they do not
yet have bespoke visual renderers or property inspectors inside the editor;
they open in Markdown source. Adding renderers is a separate change because it
also needs an editing model for each component’s attributes.

## Tests

- `lib/__tests__/editor-block-catalog.test.ts` — allowlist parity, templates,
  heading scale, filtering.
- `lib/__tests__/editor-toolbar-palette.test.tsx` — toolbar groups, split
  button, palette search/insert, mobile FAB menu, link validation.
- `lib/__tests__/plate-body-editor.test.tsx` — existing mode, label, and
  source-preservation contracts.
