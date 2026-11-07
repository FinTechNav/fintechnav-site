# Contributing to FinTechNav

This public repository hosts FinTechNav Netlify sites and apps: the biography site, the private stock dashboard, and its registered Schwab callback relay. Heavy Pour Wine application development belongs in its own repositories. Biography references and career history may still mention HPW; old HPW demo sources here are not deployed.

## Development

Use the latest Node 22 patch (`nvm use`, minimum 22.13) and install with `npm ci --ignore-scripts`. Run `npm run build`, `npm run validate`, and `npm run test:security`. `npm run dev:stock` serves the built public files locally; stock authentication requires the deployed Netlify runtime. Never add a production authentication bypass for local previews.

Legacy biography scripts in `js/` execute directly in the browser, including JSX: preserve their loading order and global data dependencies. Server and build `.mjs` files use ES modules. Stock Identity code is bundled by esbuild. ESLint and Prettier agree on quote escaping; `npm run validate` must pass.

## Changes and deployment

Create a `codex/` or descriptive feature branch and a pull request into `main`. Use a concise title describing the resulting behavior. Required checks must pass on an up-to-date branch and review conversations must be resolved; solo-owner PRs need no extra reviewer. Squash merging main deploys production through Netlify. Merged branches are removed automatically.

The build publishes an explicit list of site pages and asset directories into `dist/`. Add a new site deliberately in `scripts/build-site.mjs`; never publish the repository root or research/log directories. The callback relay has a separate, minimal build selected by Netlify `SITE_ID`. Retired HPW demos, root checkout assets, and payment proxies are archived locally and are not part of this deployment.

## Security and dependencies

Keep all secrets in Netlify or the designated secret manager. `.env*` files are ignored except `.env.example`. Do not put credentials, auth codes, cookies, account data, or token responses in commits, logs, screenshots, or PRs. Report vulnerabilities through the private channel in `SECURITY.md`.

PR checks include build/security tests, lint/format plus maintained-script syntax, an introduced-commit Gitleaks scan, online workflow auditing, dependency auditing, CodeQL, and a CycloneDX SBOM. Actions are pinned to commit SHAs; scanner downloads have pinned versions and verified SHA-256 hashes. Jobs use read-only tokens except the isolated CodeQL upload and no-checkout Dependabot automation. Fork PRs receive no added secrets.

The PR dependency gate compares head and base lockfiles and blocks new high/critical advisories or severity escalations. Main and the Monday scheduled audit check all high/critical advisories. Scheduled failures appear in GitHub Actions and normal GitHub notifications; no paid runner or external alert service is required. Gitleaks blocks newly introduced secrets; GitHub's existing secret scanning checks repository history. Historical alerts remain open until the credential owner verifies revocation or restrictions.

Dependabot groups npm minor/patch updates weekly on Monday at 08:00 America/New_York after a seven-day release cooldown. Security updates are separate and do not wait for that version cooldown. GitHub Actions updates are quarterly. npm majors require manual review. Verified Dependabot minor/patch PRs may enable squash auto-merge only after the expected branch protections are active; the automation never checks out PR code.

Keep the scoped patched minimatch override until ESLint's dependency ranges include a fixed release. Do not remove it solely because an upstream version was published; confirm the resolved tree and audit result.

Session notes are maintained in `SESSION_LOG.md` and `artifacts/SESSION_LOG.md`; reviewed engineering reports belong in `artifacts/`. Keep notes factual and free of credentials or account balances. Save personal research, raw screenshots, support correspondence, supplied input files, generated SBOMs, preview fixtures, PR drafts and recovery bundles under ignored `artifacts/local/`. Review individual files before staging; do not force-add this archive. CI publishes the current SBOM as a short-lived workflow artifact.
