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
| `x`, `y` | no | Axis labels. |
| `y-scale` | no | `linear` (default) or `log`. A log axis is stated in text under the figure. |
| `series` | when a row has more than one value | Comma-separated names, in value order. |
| `notes` | no | Sample size, units, method — shown under the figure. |
| `uncertainty` | no | One ± per series, drawn as error bars. |
| `2019: 120, 40` | yes (at least one) | The label before the colon is the x category. |

Wrap a name containing a comma in double quotes: `series: "A, Inc", B`.

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
