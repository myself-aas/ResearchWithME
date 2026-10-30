"""Layout regression check: gutters, page padding, column alignment, overflow.

The design system lives in `app/globals.css` as `page-container`, `page-main`,
`page-section*`, `article-grid`, and `editorial-grid`. This script asserts that
the rendered pages still honour it, so a hand-written `px-4` or a stray grid
cannot quietly drift back in.

Run against a server on :3000, the same way as `qa_sweep.py`.
"""

import sys

from qa_common import BASE, launch, sync_playwright  # noqa: E402

# A journal page, tool pages, and two surfaces built from the editorial grid.
SHELL_ROUTES = ["/papers", "/assistant", "/cite", "/bookmarks", "/login", "/authors"]
WIDTHS = (375, 768, 1024, 1440)

# Theme tokens are authored in rem, so convert them before comparing with
# computed pixel paddings.
LENGTH_HELPER = """
const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const toPx = (value) => {
  if (typeof value !== 'string') return NaN;
  return value.trim().endsWith('rem') ? parseFloat(value) * remPx : parseFloat(value);
};
"""

failures = []
checks = 0


def check(ok, message):
    global checks
    checks += 1
    print(("PASS " if ok else "FAIL ") + message)
    if not ok:
        failures.append(message)


def gutters_match(page, width):
    """Every container pads by the shared gutter token."""
    result = page.evaluate(
        LENGTH_HELPER
        + """() => {
          const root = getComputedStyle(document.documentElement);
          const gutter = toPx(root.getPropertyValue('--page-gutter'));
          const nodes = [...document.querySelectorAll('.page-container')];
          const bad = nodes
            .map((node) => {
              const cs = getComputedStyle(node);
              return {
                left: parseFloat(cs.paddingLeft),
                right: parseFloat(cs.paddingRight),
                text: node.className.slice(0, 60),
              };
            })
            .filter((node) => Math.abs(node.left - gutter) > 1 || Math.abs(node.right - gutter) > 1);
          return { gutter, count: nodes.length, bad: bad.slice(0, 3) };
        }"""
    )
    suffix = f" — offenders: {result['bad']}" if result["bad"] else ""
    check(
        not result["bad"],
        f"{width}px: {result['count']} containers pad by the {result['gutter']:g}px gutter{suffix}",
    )


def no_overflow(page, width, route):
    scroll_width, client_width = page.evaluate(
        "[document.documentElement.scrollWidth, document.documentElement.clientWidth]"
    )
    check(
        scroll_width <= client_width,
        f"{route} at {width}px has no horizontal scroll ({scroll_width} <= {client_width})",
    )


def page_padding_matches(page, route):
    result = page.evaluate(
        LENGTH_HELPER
        + """() => {
          const main = document.querySelector('main');
          if (!main || !main.classList.contains('page-main')) return null;
          const cs = getComputedStyle(main);
          const root = getComputedStyle(document.documentElement);
          return {
            top: parseFloat(cs.paddingTop),
            bottom: parseFloat(cs.paddingBottom),
            pageTop: toPx(root.getPropertyValue('--page-top')),
            pageBottom: toPx(root.getPropertyValue('--page-bottom')),
          };
        }"""
    )
    if not result:
        return
    check(
        abs(result["top"] - result["pageTop"]) <= 1 and abs(result["bottom"] - result["pageBottom"]) <= 1,
        f"{route} main pads by page-main ({result['top']:g}px / {result['bottom']:g}px)",
    )


def editorial_columns(page, width):
    """The hero rail sits on the third card column; the card row stays even."""
    result = page.evaluate(
        LENGTH_HELPER
        + """() => {
          const hero = document.querySelector('.editorial-grid');
          const cards = [...document.querySelectorAll('#articles-feed li.col-span-12')].slice(0, 3);
          if (!hero || cards.length < 3) return null;
          const rail = hero.children[1].getBoundingClientRect();
          const boxes = cards.map((card) => card.getBoundingClientRect());
          return {
            rail: [Math.round(rail.left), Math.round(rail.right)],
            third: [Math.round(boxes[2].left), Math.round(boxes[2].right)],
            widths: boxes.map((box) => Math.round(box.width)),
            sameRow: Math.abs(boxes[1].top - boxes[0].top) < 2,
            gap: Math.round(boxes[1].left - boxes[0].right),
            gutter: toPx(getComputedStyle(document.documentElement).getPropertyValue('--grid-gap')),
          };
        }"""
    )
    if not result:
        return
    if result["sameRow"]:
        check(
            abs(result["rail"][0] - result["third"][0]) <= 1,
            f"home at {width}px: summary rail sits on the third card column "
            f"({result['rail'][0]} vs {result['third'][0]})",
        )
    check(
        len(set(result["widths"])) == 1,
        f"home at {width}px: card row is even ({result['widths']})",
    )
    if result["sameRow"]:
        check(
            abs(result["gap"] - result["gutter"]) <= 1,
            f"home at {width}px: card gap is the {result['gutter']:g}px grid gutter ({result['gap']}px)",
        )


def main():
    only = sys.argv[1:] or None
    routes = [route for route in SHELL_ROUTES if not only or route in only]
    with sync_playwright() as playwright:
        browser = launch(playwright.chromium)
        for width in WIDTHS:
            context = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=1)
            page = context.new_page()
            for route in routes:
                page.goto(f"{BASE}{route}", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(150)
                no_overflow(page, width, route)
                page_padding_matches(page, route)
            page.goto(BASE + "/", wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(250)
            gutters_match(page, width)
            no_overflow(page, width, "/")
            editorial_columns(page, width)
            context.close()
        browser.close()

    print(f"\n{checks - len(failures)}/{checks} layout checks passed")
    if failures:
        print("Failures:")
        for failure in failures:
            print(f"  - {failure}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
