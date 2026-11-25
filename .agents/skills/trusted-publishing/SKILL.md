---
name: trusted-publishing
description: Lock npm publishing for this repository to GitHub Actions OIDC with 2FA-required publishing. Currently scoped OUT — this repo publishes nothing to npm; read this only if that changes.
---

# trusted publishing (scope note)

**This repository publishes no npm packages.** Nothing here ships to the
registry, so there is nothing to trust and nothing to lock. Do not run these
steps on ResearchWithMe's behalf; the skill exists so that if the repository
ever begins publishing (for example a design-token export package), the
operator has the safe-by-default path in front of them.

## If publishing starts, do this first

Requires npm ≥ 11.10.0 (`npm trust`), an interactive 2FA OTP, and a signed-in
registry account — these commands cannot run unattended, so the author runs
them and pastes the output back into the session:

```bash
# 1. Trust the GitHub Actions workflow that publishes (OIDC, no long-lived token)
npm trust github <PKG> \
  --repository myself-aas/ResearchWithME \
  --file <the-publishing-workflow.yml> \
  --environment <the-publishing-environment> \
  --allow-publish

# 2. Require 2FA and disallow token-based publishes (npm's recommended setting)
npm access set mfa=publish <PKG>
```

Verify with `npm trust list <PKG>`. Until both commands have run, the
publishing workflow stays disabled — a first publish for a brand-new package
name happens by hand, then the trust commands apply.
