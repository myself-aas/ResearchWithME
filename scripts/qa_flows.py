"""Interactive flows against the local app on :3000. Each step prints PASS/FAIL."""

import os
import re
import sys

from qa_common import BASE, launch, sync_playwright  # noqa: E402

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def console_watch(page, sink):
    page.on("console", lambda m: sink.append(m.text[:200]) if m.type == "error" else None)
    page.on("pageerror", lambda e: sink.append("PAGEERROR " + str(e)[:200]))


def run(p):
    browser = launch(p.chromium)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, permissions=["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    errors = []
    console_watch(page, errors)

    # 1. Search from the header
    page.goto(BASE + "/", wait_until="networkidle")
    hero_search = page.locator("input[type=search]:visible").first
    hero_search.fill("vllm")
    page.wait_for_timeout(700)
    cards = page.locator("a[href^='/post/']:visible")
    check("header search narrows the feed", cards.count() >= 1 and cards.count() <= 3, f"{cards.count()} cards")

    # 2. Clear via the feed button
    clear = page.get_by_role("button", name=re.compile("clear all filters", re.I))
    check("clear-filters control appears", clear.count() > 0)
    if clear.count():
        clear.first.click()
        page.wait_for_timeout(600)
        check("clear filters restores the catalogue", page.get_by_role("heading", name="Browse by field").count() == 1)

    # 3. Category selection
    page.get_by_role("button", name=re.compile("Research Reviews", re.I)).first.click()
    page.wait_for_timeout(500)
    check("category filter updates heading", page.get_by_role("heading", name=re.compile("Research Reviews reviews", re.I)).count() == 1)

    # 4. Article actions: like, save
    page.goto(BASE + "/post/inside-vllm-and-paged-attention", wait_until="networkidle")
    like = page.get_by_role("button", name=re.compile("like", re.I)).first
    before = like.inner_text()
    like.click()
    page.wait_for_timeout(800)
    after = page.get_by_role("button", name=re.compile("like", re.I)).first.inner_text()
    check("like registers", before != after, f"{before!r} -> {after!r}")
    like_again = page.get_by_role("button", name=re.compile("like", re.I)).first
    like_again.click()
    page.wait_for_timeout(500)
    check("second like is ignored", page.get_by_role("button", name=re.compile("like", re.I)).first.inner_text() == after)

    save = page.get_by_role("button", name=re.compile("^save$", re.I)).first
    if save.count() == 0:
        save = page.get_by_role("button", name=re.compile("save", re.I)).first
    save.click()
    page.wait_for_timeout(400)
    check("save writes local storage", "rwm_saved_posts" in page.evaluate("Object.keys(localStorage).join(',')"))

    # 5. Comment validation and posting
    name_box = page.get_by_label(re.compile("name", re.I)).first
    comment_box = page.locator("textarea").first
    page.get_by_role("button", name=re.compile("post comment", re.I)).first.click()
    page.wait_for_timeout(400)
    check("empty comment is rejected", page.locator("[role=alert], [role=status]").first.inner_text().strip() != "")
    name_box.fill("QA Bot")
    comment_box.fill("Testing the discussion flow from the audit script.")
    page.get_by_role("button", name=re.compile("post comment", re.I)).first.click()
    page.wait_for_timeout(1500)
    check("comment appears after posting", page.get_by_text("Testing the discussion flow").count() > 0)

    # 6. Reading list
    page.goto(BASE + "/bookmarks", wait_until="networkidle")
    check("reading list shows the saved review", page.get_by_text("Inside vLLM", exact=False).count() > 0)

    # 7. Citation builder
    page.goto(BASE + "/cite", wait_until="networkidle")
    page.get_by_role("button", name=re.compile("IEEE", re.I)).first.click()
    page.wait_for_timeout(300)
    out = page.locator("textarea#citation-output").input_value()
    check("citation format switch works", "[1]" in out or "IEEE" in out.upper(), out[:80])
    page.get_by_role("button", name=re.compile("copy citation", re.I)).first.click()
    page.wait_for_timeout(400)
    clip = page.evaluate("navigator.clipboard.readText()")
    check("copy button writes the citation", clip.strip() == out.strip(), clip[:60])

    # 8. Submit form validation
    page.goto(BASE + "/submit", wait_until="networkidle")
    page.get_by_role("button", name=re.compile("submit for", re.I)).first.click()
    page.wait_for_timeout(500)
    alerts = page.locator("[role=alert]")
    check("empty submission is blocked", alerts.count() > 0)
    focused = page.evaluate("document.activeElement && document.activeElement.id")
    check("focus moves to the first invalid field", bool(focused), str(focused))

    # 9. ORCID verification (checksum path)
    page.goto(BASE + "/auth/orcid", wait_until="networkidle")
    orcid_input = page.locator("input").filter(has_not=page.locator("[type=hidden]")).first
    orcid_input.fill("0000-0002-1825-0098")
    page.get_by_role("button", name=re.compile("record", re.I)).first.click()
    page.wait_for_timeout(500)
    body = page.inner_text("body")
    check("invalid ORCID checksum is rejected", "checksum" in body.lower() or "not valid" in body.lower(), body[:120])

    # 10. Assistant
    page.goto(BASE + "/assistant", wait_until="networkidle")
    sample = page.get_by_role("button", name=re.compile("vLLM|DeepSeek|GLP-1|Kubernetes", re.I)).last
    sample.click()
    page.wait_for_timeout(1500)
    answer = page.inner_text("body")
    check("assistant returns an answer", len(answer) > 400)

    # 11. Mobile navigation
    mob = ctx.new_page()
    mob.set_viewport_size({"width": 390, "height": 844})
    mob.goto(BASE + "/", wait_until="networkidle")
    toggle = mob.locator("button[aria-controls]").first
    check("mobile menu toggle exists", toggle.count() == 1)
    if toggle.count():
        toggle.click()
        mob.wait_for_timeout(300)
        check("menu expands", toggle.get_attribute("aria-expanded") == "true")
        mob.keyboard.press("Escape")
        mob.wait_for_timeout(300)
        check("Escape closes the menu", toggle.get_attribute("aria-expanded") == "false")
        check("focus returns to the toggle", mob.evaluate("document.activeElement && document.activeElement.hasAttribute('aria-controls')") is True)
    mob.close()

    check("no console errors during the run", not [e for e in errors if "404" not in e], "; ".join(errors[:3]))
    browser.close()


with sync_playwright() as p:
    run(p)

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
