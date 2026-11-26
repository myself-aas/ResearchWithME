# Mocks in this repository

The suite is mostly **logic against real fixtures**: the content tests run the
actual loader over `content/posts/`, the SEO tests run the actual JSON-LD
builders, and the retrieval tests run the actual Fuse-backed ranking. That is
deliberate — the fixtures are the contract — so reach for a test double only
when the real thing cannot run where the test runs.

When a double is necessary:

- **Use `vi.hoisted`** for anything the module under test reads at import time,
  and spread `...await importOriginal()` so an upgrade that adds a function
  does not silently break the mock:
  ```ts
  const { readFileSync } = vi.hoisted(() => ({ readFileSync: vi.fn() }));
  vi.mock('node:fs', async (importOriginal) => ({
    ...(await importOriginal()),
    readFileSync,
  }));
  ```
- **Never use `toMatchSnapshot`** for site behavior. Assert the specific
  property that matters (a canonical value, a token, an `@id`); snapshots hide
  exactly the drift this contract exists to prevent.
- **Do not add `vi.clearAllMocks()` to hooks** — the vitest config's
  `clearMocks` already clears call history between tests, and clearing again
  inside a hook destroys evidence when a setup step made the call.
- **Prefer the stubs in `test/stubs/`** (`next/link`, `next/image`,
  `next/navigation`, `next/dynamic`, `server-only`) over new ones; extend the
  family only when a component genuinely needs it.
- A mock that reimplements the behavior under test is not a mock, it is a
  second implementation — delete it and test the real thing.
