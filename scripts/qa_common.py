"""Shared Playwright launch for the QA scripts.

Set QA_CHROMIUM_PATH to a Chromium executable that Playwright should drive
(useful in sandboxes that ship their own build). Without it, Playwright's
bundled browser is used: `python -m playwright install chromium`.
"""

import os

from playwright.sync_api import sync_playwright  # noqa: F401  (re-exported for scripts)

BASE = os.environ.get("QA_BASE_URL", "http://localhost:3000")

_EXTRA_ARGS = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-features=Vulkan",
]


def launch(browser_type, **kwargs):
    executable = os.environ.get("QA_CHROMIUM_PATH")
    if executable:
        return browser_type.launch(
            executable_path=executable,
            args=_EXTRA_ARGS,
            ignore_default_args=["--headless"],
            **kwargs,
        )
    return browser_type.launch(args=["--no-sandbox", "--disable-dev-shm-usage"], **kwargs)
