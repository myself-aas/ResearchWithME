"""Studio flow: create a draft, publish it, verify it on the public site, then delete it."""

import os
import re

from qa_common import BASE, launch, sync_playwright  # noqa: E402

TITLE = "QA draft: does the publish path still hold"
SLUG = "qa-draft-does-the-publish-path-still-hold"
SUMMARY = (
    "A temporary review created by the browser audit to confirm that the studio still writes, "
    "publishes, renders, and deletes a record without leaving anything behind."
)
BODY = (
    "This paragraph exists so the editor has enough body text to pass its own publish check. "
    "It repeats a plain statement: the audit writes a record, reads it back on the public site, "
    "and then removes it. There is nothing else to see here, and the record is deleted at the end "
    "of the run so the archive stays unchanged.\n\n"
    "A second paragraph gives the Markdown renderer something to format, and keeps the character "
    "count above the publish threshold that the schema enforces on every record."
)

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


with sync_playwright() as p:
    browser = launch(p.chromium)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = ctx.new_page()
    console = []
    page.on("console", lambda m: console.append(m.text[:200]) if m.type == "error" else None)

    page.goto(BASE + "/dashboard", wait_until="networkidle")
    page.locator("#post-title").fill(TITLE)
    page.wait_for_timeout(300)
    slug_value = page.locator("#post-slug").input_value()
    check("slug derives from the title", slug_value == SLUG, slug_value)

    page.locator("#post-subtitle").fill("A temporary record from the browser audit.")
    page.locator("#post-summary").fill(SUMMARY)
    page.locator(".mdxeditor [contenteditable=true]").first.click()
    page.keyboard.type(BODY)
    page.wait_for_timeout(400)

    page.locator("#post-takeaway-0").fill("A published review appears on the journal without a rebuild.")

    page.screenshot(path="/tmp/shot-studio.png", full_page=False)

    publish = page.get_by_role("button", name=re.compile("^Publish review", re.I)).first
    check("publish control present", publish.count() > 0)
    publish.click()
    page.wait_for_timeout(2500)
    body_text = page.inner_text("body")
    check("publish reports success", re.search(r"published|live|saved", body_text, re.I) is not None, body_text[:200])

    page.goto(BASE + "/", wait_until="networkidle")
    check("new review appears in the feed", TITLE in page.inner_text("body"))

    resp = page.goto(f"{BASE}/post/{SLUG}", wait_until="networkidle")
    check("published review renders at its slug", resp is not None and resp.status == 200)
    check("review body renders", "audit writes a record" in page.inner_text("body"))
    page.screenshot(path="/tmp/shot-published.png", full_page=False)

    page.goto(BASE + "/dashboard/manage", wait_until="networkidle")
    page.wait_for_timeout(1200)
    check("new review is listed in manage", TITLE in page.inner_text("body"))
    row = page.locator("li, tr, article").filter(has_text=TITLE).first
    delete = row.get_by_role("button", name=re.compile("delete", re.I))
    if delete.count():
        delete.first.click()
        page.wait_for_timeout(300)
        confirm = page.get_by_role("button", name=re.compile("delete|confirm", re.I)).last
        confirm.click()
        page.wait_for_timeout(2000)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(800)
        check("record is deleted", TITLE not in page.inner_text("body"))
    else:
        check("delete control found", False, "no delete button in the row")

    check("no console errors in the studio", not console, "; ".join(console[:3]))
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
