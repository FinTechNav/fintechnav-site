# Repository security quick wins — November 6, 2026

## Review scope and baseline

Reviewed the connected GitHub security APIs for FinTechNav/fintechnav-site, current dependency manifests/lockfile, CI, public contact function and current source.

- GitHub Dependabot: **33 open alerts** (12 high, 19 medium, 2 low), spanning runtime Nodemailer and development dependencies.
- npm audit before changes: **9 affected packages** (6 high, 2 moderate, 1 low). This counts packages, whereas GitHub counts advisories separately.
- Secret scanning and push protection already enabled; one open **Google API Key** alert.
- No CodeQL analysis existed; default setup was not configured.
- Dependabot security-update PRs and private vulnerability reporting were disabled.

## Implemented in codex/security-quick-wins

1. Applied compatible dependency fixes through npm without force or install scripts. Patched transitive packages include Babel, ajv, brace-expansion, browserslist, flatted, js-yaml, minimatch and yaml. Updated Nodemailer from 7.0.3 to 10.3.1 because fixes for all its advisories require the newer major. Node 22 is already used; Nodemailer supports the existing CommonJS createTransport/sendMail API. Declared the project's existing minimum Node requirement (22.12).
2. Hardened contact-email handling: bounded request and field sizes; safe JSON/type checks; one plain reply address; reject header/control injection; escape HTML; fix delivery to the owner; reject foreign origins; remove wildcard CORS; private/no-store responses; require SMTP STARTTLS with TLS 1.2 minimum; finite timeouts; disable file/URL content access; generic delivery failures without SMTP details. Local and Netlify-preview origin handling remain supported. This is not a spam-prevention or authentication system.
3. Added adversarial contact tests and exercised real Nodemailer MIME composition with an offline stream transport. No actual email sent.
4. Added weekly grouped Dependabot version updates for npm/GitHub Actions, with review before merge. Security updates are grouped separately.
5. Added full npm advisory checking to CI, failing on high/critical vulnerabilities. Pinned checkout/setup-node/CodeQL actions to commits verified against official GitHub repositories; checkout does not persist its Git credentials.
6. Added a CodeQL workflow for JavaScript/TypeScript and Python on PRs, main pushes and a weekly schedule. It will run when the PR is created; its results have not yet been observed.
7. Added SECURITY.md with private reporting instructions.

## Repository settings already applied

Verified by read-back through GitHub:
- Dependabot automated security-update PRs: **enabled**, not paused.
- Private vulnerability reporting: **enabled**.
- Existing secret scanning and push protection remain enabled.
- No auto-merge or paid feature enabled.

## Validation

- Clean npm ci --ignore-scripts succeeded.
- npm audit after changes: **0 vulnerabilities**, including development dependencies.
- npm run build succeeded.
- npm run test:security: **17/17 passed**.
- Email function bundled for Node 22 with esbuild; upgraded CommonJS package and MIME construction verified offline.
- YAML configuration parsed successfully; changed JavaScript syntax and git diff --check passed.
- npm run validate still fails on the same **9 pre-existing quote errors** in untouched biography files. No claim that the repository's full lint/format check passes.
- Live email delivery, payment flows and brokerage orders were not exercised.

## Remaining items and deployment boundary

**Google API key alert #1 remains open.** Its recorded location is historical POS.html in commit a868dcf1527a4cc44d458008894730dc17b182e2, line 323. A scan of current first-party text source found no matching Google key. Removing it from current code does not revoke historical copies. Verify revocation, or API/referrer restrictions and actual usage in Google Cloud. Its value was not printed, tested against Google, rotated or dismissed during this review.

ESLint/Babel major migrations, full CSP enforcement and browser-CDN bundling are deferred to changes with broader compatibility/UI testing. Updating npm Babel tooling does not patch the independently loaded browser CDN Babel script.

The source changes are prepared and tested on a branch, **not yet merged or deployed**. GitHub Dependabot alerts will remain open until a fixed lockfile reaches main and GitHub rescans it. A local clean audit is not proof that GitHub has closed the alerts. CodeQL findings and a Netlify deploy preview must be checked after PR creation, followed by production verification after merge.

