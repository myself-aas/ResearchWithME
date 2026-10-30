"""Route sweep for the local app: status, meta, headings, a11y (axe), overflow,
console errors, and failed requests. Run against a server on :3000."""

import json
import os
import pathlib
import sys

from qa_common import BASE, launch, sync_playwright  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
AXE = (ROOT / "node_modules" / "axe-core" / "axe.min.js").read_text()

ROUTES = [
    "/",
    "/?search=vllm",
    "/?category=STEM%20%26%20Tech",
    "/papers",
    "/paper/the-long-view-on-open-infrastructure",
    "/post/inside-vllm-and-paged-attention",
    "/post/algorithmic-commons-and-at-protocol",
    "/authors",
    "/author/marcus-vance",
    "/edinburgh-bad-slug-should-404",
    "/editions",
    "/editorial-board",
    "/assistant",
    "/cite",
    "/submit",
    "/verify",
    "/bookmarks",
    "/login",
    "/write",
    "/dashboard",
    "/dashboard/manage",
    "/dashboard/comments",
    "/auth/providers",
    "/auth/github",
    "/auth/orcid",
    "/auth/google",
    "/auth/academic",
]

AXE_RUN = """
async () => {
  const results = await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  return results.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n')[0]),
    count: v.nodes.length,
  }));
}
"""


def sweep(page, route, viewport, width):
    issues = []
    console_errors = []
    page_errors = []
    failed = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text[:300])

    def on_page_error(err):
        page_errors.append(str(err)[:300])

    def on_response(resp):
        if resp.status >= 400 and BASE in resp.url:
            failed.append(f"{resp.status} {resp.url}")

    page.on("console", on_console)
    page.on("pageerror", on_page_error)
    page.on("response", on_response)

    resp = page.goto(BASE + route, wait_until="networkidle", timeout=45000)
    status = resp.status if resp else 0

    page.add_script_tag(content=AXE)
    violations = page.evaluate(AXE_RUN)

    data = page.evaluate(
        """() => {
      const ids = {};
      document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
      const dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([id, n]) => id + ' x' + n);
      const imgs = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt'));
      const links = [...document.querySelectorAll('a')].filter(a => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])'));
      return {
        title: document.title,
        description: (document.querySelector('meta[name=description]') || {}).content || '',
        h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
        th: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        dupIds,
        imgNoAlt: imgs.map(i => i.getAttribute('src')).slice(0, 5),
        namelessLinks: links.length,
        lang: document.documentElement.lang,
      };
    }"""
    )

    page.remove_listener("console", on_console)
    page.remove_listener("pageerror", on_page_error)
    page.remove_listener("response", on_response)

    if status >= 400 and "should-404" not in route:
        issues.append(f"HTTP {status}")
    if "should-404" in route and status != 404:
        issues.append(f"expected 404, got {status}")
    if data["th"] > data["cw"] + 1:
        issues.append(f"horizontal overflow {data['th']}>{data['cw']}")
    if len(data["h1"]) > 1:
        issues.append(f"{len(data['h1'])} h1 elements")
    if not data["h1"] and status == 200:
        issues.append("no h1")

    print(f"\n=== {route} [{viewport}] status={status} title={data['title']!r}")
    if data["h1"]:
        print(f"    h1: {data['h1'][0][:90]!r}")
    if data["dupIds"]:
        print(f"    DUPLICATE IDS: {data['dupIds']}")
    if data["imgNoAlt"]:
        print(f"    IMG WITHOUT ALT: {data['imgNoAlt']}")
    if data["namelessLinks"]:
        print(f"    links without accessible name: {data['namelessLinks']}")
    if console_errors:
        print("    CONSOLE ERRORS:", json.dumps(console_errors[:4], indent=None))
    if page_errors:
        print("    PAGE ERRORS:", json.dumps(page_errors[:4]))
    if failed:
        print("    FAILED REQUESTS:", json.dumps(sorted(set(failed))[:6]))
    for v in violations:
        print(f"    AXE {v['impact']} {v['id']} ({v['count']}): {v['help']}")
        for n in v["nodes"]:
            print(f"        {n}")
    for i in issues:
        print(f"    ISSUE: {i}")
    return violations


def main():
    only = sys.argv[1:] or None
    routes = [r for r in ROUTES if not only or r in only]
    with sync_playwright() as p:
        browser = launch(p.chromium)
        for viewport, width, height in (("desktop", 1280, 800), ("mobile", 390, 844)):
            ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
            page = ctx.new_page()
            for route in routes:
                try:
                    sweep(page, route, viewport, width)
                except Exception as exc:  # noqa: BLE001
                    print(f"\n=== {route} [{viewport}] EXCEPTION {type(exc).__name__}: {str(exc)[:200]}")
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
