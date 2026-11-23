# Charts in articles

Write a fenced block tagged `chart`, and it becomes an interactive figure. No
new editor, no JSON, no HTML — the same triple-backtick block you already use
for code.

````markdown
```chart
type: line
title: Citations per year
caption: Peer-reviewed articles are cited more often than preprints.
x: Year
y: Citations
series: Peer-reviewed, Preprints
2019: 120, 40
2020: 310, nil
2021: 480, 210
```
````

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown above the plot. |
| `caption` | yes | The text alternative. Without it the chart does not render. |
| `type` | no | `line` (default), `bar`, `area`, `scatter`. |
| `layout` | no | For `bar`, `horizontal` (default columns) or `vertical` (horizontal bars with categories on the y axis). |
| `x`, `y` | no | Category and numeric labels. For `layout: vertical`, `y` labels the horizontal numeric axis. |
| `y-scale` | no | `linear` (default) or `log`. A log axis is stated in text under the figure. |
| `series` | when a row has more than one value | Comma-separated names, in value order. |
| `notes` | no | Sample size, units, method — shown under the figure. |
| `uncertainty` | no | One ± per series, drawn as error bars. |
| `2019: 120, 40` | yes (at least one) | The label before the colon is the x category. |

Wrap a name containing a comma in double quotes: `series: "A, Inc", B`.

## Source maps and long category labels

For categorical counts, prefer horizontal bars rather than rotated or hidden
labels. Add `type: bar` and `layout: vertical`. The renderer reserves category
label space, grows the plot height with the number of rows, labels the values,
uses a zero-based linear numeric axis, and disables animation. Existing charts
without `layout` keep their original orientation. All charts still carry a data
table; the lazy-loading boundary now server-renders the real caption and table
rather than a generic loading message.

The ten repository reviews use this form to map **matching tracked files in
selected source roots**. Their `chart-inventory.json` files retain the pinned
commit, exact selectors, complete tree identifiers, every counted path and blob
ID, and interpretation limits. These figures are not benchmarks, coverage,
integration counts, product ratings, or whole-repository language shares.

Run `npm run article:prepare:repositories -- --check` to verify the generated
chart sections, CMS bodies, public summaries and read times. With project
dependencies installed, `npm run article:test:charts` checks grammar, static
fallbacks and actual SVG rendering. `npm run article:preview:repositories`
starts a local-only editorial preview on port 4173; it does not publish drafts
or replace production reader verification.

## Missing data

Write `nil`, `null`, `N/A`, `-`, or nothing at all. The point is skipped and the
table says **Not reported**. It is never plotted as zero — a zero is a
measurement, and a gap is not.

## What every chart carries automatically

- a caption and a data table (the accessible equivalent, per DESIGN §32)
- a scale disclosure when the axis is logarithmic
- the data table in place of the plot when printing or in Windows High Contrast
- the table as the first paint, so a reader without JavaScript still sees the data

## Why a chart may refuse to render

A malformed block never breaks the article. It shows the error, the line number,
and your source verbatim, so you can fix it in review. The common ones:

- no `caption`
- `type` that is not one of the four
- `y-scale: log` with a zero or negative value
- more values in a row than there are names in `series`

## Colour

Series colours come from the design tokens, not from you. The seven-colour
palette is checked on every test run for contrast against both themes and for
distinguishability under protanopia, deuteranopia, and tritanopia. If you have
more than seven series, colours repeat — at that point consider a table instead.
