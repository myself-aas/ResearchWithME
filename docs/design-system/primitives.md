# Primitives and semantic tokens

**Purpose:** how to build UI from `@/components/primitives` and semantic colour tokens, and how
existing markup was migrated to them without changing a pixel.

**Prerequisites:** Tailwind CSS v4 utilities, the token layer in `app/globals.css`, and
`DESIGN.md`.

---

## The two rules

1. **Colour comes from semantic tokens only.** Use `text-ink`, `bg-surface`, `border-line`,
   `text-destructive`, and so on. Never use the raw palette (`stone-*`, `red-*`, `white`, …): it
   does not switch with the theme. Never invent a token name. A class like `text-danger` with no
   `--color-danger` compiles to nothing, and the element silently inherits its parent's colour.
2. **Repeated patterns come from primitives.** If a class string appears more than a few times,
   it belongs in a primitive variant, so it is defined once.

Both rules are enforced by `lib/__tests__/design-token-usage.test.ts`, which runs in
`npm run quality`. The test reads every `--color-*` token in `globals.css` and fails on any colour
utility that names an undefined token or a raw palette family. Add a deliberate exception to its
`ALLOW` map, with the reason.

## Semantic colour tokens

| Role | Utilities | Light | Dark |
|---|---|---|---|
| Page background | `bg-canvas` | `#FAF9F6` | `#0C0D10` |
| Panel / card | `bg-surface` | `#F3F1EC` | `#14161B` |
| Field, raised control | `bg-surface-raised` | `#FAF9F6` | `#181B22` |
| Hover / pressed fill | `bg-surface-subtle` | `#EAE7DF` | `#1B1E25` |
| Inverse fill (dark button in light mode) | `bg-surface-inverse` + `text-text-inverse` | `#121214` | `#F2F2F5` |
| Primary text | `text-ink` | `#121214` | `#F2F2F5` |
| Secondary text | `text-ink-secondary` | `#5C5C63` | `#9496A1` |
| Hairline / strong border | `border-line` / `border-border-strong` | 10% / 22% ink | 10% / 22% white |
| Action (links, primary buttons) | `text-brand`, `bg-brand` + `text-on-primary` | `#1D4ED8` | `#60A5FA` |
| Error | `text-destructive`, `border-destructive`, `bg-destructive/5` | `#B91C1C` | `#F87171` |
| Success | `text-success`, `border-success`, `bg-success/5` | `#047857` | `#10B981` |
| Caution | `border-trust-uncertain`, `text-trust-uncertain` | `#D97706` | |
| Info callout | `bg-brand/5`, `border-brand/25` | tint of action | |

Text on a filled `bg-brand` or `bg-success` button is `text-on-primary`, not `text-white`: in
dark mode the fill turns light and the text must turn dark.

## Primitive catalogue

All are server-safe except `Button`, `Input`, `Select` and `Textarea`.

### `Text`

```tsx
import { Text } from '@/components/primitives';

<Text as="p" variant="eyebrow" color="secondary">Specialist review</Text>
<Text as="h2" variant="card-title">Methods</Text>
<Text as="h1" variant="page-title">Writer studio</Text>
```

| Variant | Classes | Use |
|---|---|---|
| `eyebrow` | `font-mono text-xs uppercase tracking-wider` | labels above sections, metadata headings |
| `card-title` | `font-serif text-xl font-semibold` | card and panel headings |
| `section-title` | `font-serif text-2xl font-semibold` | section headings |
| `page-title` | `font-serif text-2xl font-bold sm:text-3xl` | page headings in the studio and tools |
| `display` … `metadata` | reme v3.1 §2 scale | new surfaces |

`color`: `primary` (default, `text-ink`), `secondary`, `tertiary`, `inverse`, `brand`, `verified`,
`success`, `destructive`, `inherit`. `weight`: `normal`, `medium`, `semibold`, `bold`.

### `Link`

```tsx
import { Link as TextLink } from '@/components/primitives';

<TextLink href="/papers">paper archive</TextLink>                 // inline (default)
<TextLink href="/privacy" variant="quiet">Privacy</TextLink>      // chrome, underline on hover
<TextLink href="https://doi.org/…" target="_blank" rel="noreferrer">DOI</TextLink>
```

Internal paths render `next/link`. External, `mailto:`, `tel:` and `#` hrefs render a plain
anchor. Variants: `inline`, `quiet`, `muted`, `plain`. Import it as `TextLink` in files that also
use `next/link` directly.

### `Card`

```tsx
<Card>…</Card>                                  // rounded-sm border border-line bg-surface p-4
<Card as="article" padding="lg" radius="md">…</Card>
```

Padding steps: `none`, `sm` (p-3), `md` (p-4), `lg` (p-5), `xl` (p-6). Also exports
`CardHeader`, `CardTitle`, `CardDescription` and `CardFooter`.

### `Stack`, `Box`, `Divider`, `Badge`, `Icon`, `VisuallyHidden`

```tsx
<Stack direction="horizontal" gap="sm" align="center" wrap>…</Stack>
<Icon icon={PenSquare} />                       // h-4 w-4, aria-hidden
<Icon icon={Search} size="lg" label="Search" /> // role="img", named
<VisuallyHidden>Opens in a new tab</VisuallyHidden>
```

`Stack` maps every prop to a class written out in full: Tailwind cannot generate classes built at
runtime, such as `` `items-${align}` ``.

### Form controls: `Button`, `Input`, `Select`, `Textarea`

Client components with built-in label, error, and `aria-describedby` wiring. The label style is
the product's field label (`mb-1.5 block text-sm font-medium`).

## How the 2026-11-12 migration was done

The work was done in two codemod passes, each checked against full-page screenshots of 9 routes
at 320, 390, 768, 1280 and 1440px (`npm run parity`).

1. **Raw palette → semantic tokens (624 class strings, 35 files).** Mappings were chosen so the
   light theme stays the same: `stone-50`→`canvas` and `stone-100`→`surface` are exact; the others
   are within a few RGB units. `text-white` was resolved by context: on `bg-brand` it became
   `text-on-primary`, and on an inverse fill it became `text-text-inverse`. Result: **no layout
   change, light-mode differences limited to `bg-white` controls becoming `surface-raised`, and
   axe colour-contrast violations dropped from 63 (dark mode, 9 routes) to 0** across 19 routes in
   both themes.
2. **House patterns → primitives (197 elements, 37 files).** A TypeScript-AST codemod rewrote an
   element only when its `className` was a plain string containing a complete house pattern, and
   every remaining class could not conflict with the primitive's own classes. The rendered class
   set is therefore identical. Result: **45 of 45 screenshots pixel-identical.**

Two phantom-class bugs surfaced along the way and are fixed: `text-ink-secondary` (261 uses, no
token, so it rendered as primary ink) now has its token; `text-danger`,
`*-action-destructive` and `*-workflow-warning/error` now use real tokens.

## Writing new UI

- Reach for a primitive first; add a variant to it before you copy a class string a third time.
- Pick colours from the token table above. If no role fits, add an alias next to the existing
  aliases in `globals.css` (`--color-success` is the model) instead of using a raw value.
- Run `npm run quality`. For a refactor that should not change pixels, run
  `npm run parity -- capture .parity/before`, make the change, capture `.parity/after`, then run
  `npm run parity -- compare .parity/before .parity/after`.

## Related

- `DESIGN.md` and `docs/reme-design-system-v3.1.md`: the design system
- `docs/motion-system.md`: motion and the Lottie micro-interactions
- `docs/research-workflows.md`: the lifecycle diagrams (generated)
- `docs/design-system/component-inventory.md`: the component inventory
