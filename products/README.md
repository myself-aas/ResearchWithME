# Product downloads

The files a buyer receives for each product in the catalogue. The plan they belong to is
`docs/superpowers/specs/2026-11-14-product-catalogue-prd.md`.

| Folder under `src/` | Zip in `downloads/` | Sold today? |
| --- | --- | --- |
| `teardown-system` | `teardown-system-1.0.0.zip` | Listed on the site; needs a store product |
| `statistical-table-generator` | `statistical-table-generator-1.0.0.zip` | No |
| `manuscript-formatter` | `manuscript-formatter-1.0.0.zip` | No |
| `journal-matchmaker` | `journal-matchmaker-1.0.0.zip` | No |
| `reference-check` | `reference-check-1.0.0.zip` | No |
| `manuscript-check` | `manuscript-check-1.0.0.zip` | No; waits for the payment provider's written reply |
| `response-to-reviewers-check` | `response-to-reviewers-check-1.0.0.zip` | No; waits for the payment provider's written reply |

## Layout

- `src/<product>/guide.md` is the user guide; the build renders it to PDF.
- `src/<product>/*.py` are the programs. They use the Python standard library only.
- `src/shared/statdist.py` is the probability module. Two products ship a copy; the build fails if a copy drifts.
- `build.py` renders the PDFs, generates the Word templates and spreadsheets, and writes the zips.
- `tests/` holds the tests for the programs.

## Build and test

```
pip install reportlab python-docx openpyxl
python products/build.py
for t in products/tests/test_*.py; do python "$t"; done
```

The build libraries are needed only to build. Buyers need Python 3.8 or later and nothing else.

## Rules for anything added here

1. Every file must be the owner's own work. No text, code, data, or checklist copied from a third party, whatever
   its licence. Link to third-party material; do not reproduce it.
2. A program checks, counts, computes, or lays out. It never writes or rewrites the buyer's text, and it never
   calls itself a review.
3. A guide says what the product does not do, and claims no test that was not run.
4. Do not upload a zip to the store or show a product on the site until the PRD's release checklist for it is done.

## Known gaps

- `reference_check.py` is tested against recorded index answers only. Run it once against the live indexes
  (`python reference_check.py sample-references.bib --email you@example.org`) before selling it.
- The Word templates and spreadsheets were generated and checked by program. Open each one in Word and Excel once
  before selling.
