# Dependency cleanup — November 6, 2026

## Review and changes

PR #12 removed the unused direct @eslint/js package. PR #14 retains lint-staged 17.6.0; Dependabot rebased it while the conflicts were being investigated. Both reached main before the subsequent repairs.

PR #13 removes unused @babel/preset-react and direct globals. PR #15 removes unused @babel/eslint-parser and includes #13 so the lockfiles can be merged in sequence. Each removal was checked against imports, build scripts, lint configuration, Git hooks and the browser script tags. The public biography still uses browser Babel standalone; that active script is separate from the removed npm packages.

A follow-up commit now carried in codex/fix-schwab-connection upgrades unsupported ESLint 8 to 10.14.0, keeps the exact existing lint rules, renames its config to eslint.config.mjs, and raises the Node minimum from 22.12 to 22.13. Netlify/CI already select current Node 22. The original automatic major upgrades of the unused packages failed npm peer resolution; removing the unused packages avoids forcing incompatible peers.

ESLint 10 requests vulnerable minimatch 10. A scoped override for ESLint and its config-array dependency selects ^11.0.1 (lockfile 11.0.3), which fixes [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). The workspace package-age protection was retained; no force/legacy-peer-deps bypass was used. Remove the override when upstream supports a patched range. [ESLint migration requirements](https://eslint.org/docs/latest/use/migrate-to-10.0.0) were reviewed.

## Retained dependencies

- @netlify/blobs: private brokerage credentials and approvals.
- @netlify/identity: owner authentication and session renewal.
- nodemailer: contact email function and offline MIME test.
- esbuild: site build and Identity browser bundle.
- eslint: configured biography lint command and pre-commit checks.
- prettier: formatting commands and pre-commit checks.
- husky and lint-staged: tracked project Git-hook tooling. The current machine also uses a global secret-scanning hook; that machine configuration was preserved.

Runtime packages remain in dependencies. Build/lint/hook packages remain in devDependencies. No remaining direct package was found unused. OpenTelemetry deprecation notices are transitive under Netlify SDK dependencies; those were not independently removed or overridden.

## Validation

The final follow-up dependency tree installs cleanly, npm ls is valid, build succeeds, all 17 existing security tests pass (24 with the Schwab repair tests), and full npm audit is zero. It audits 136 packages versus 258 in the first repaired branch. ESLint 10 file coverage and structured lint messages match ESLint 8 exactly: the same nine pre-existing quote errors, with no new lint findings.

#13 and #15 were verified conflict-free with all checks passing and merged by the owner at 14:48:30 and 14:48:47 Eastern. Their merged source includes the unused-package removals, not the later ESLint retirement. The latter is preserved as a separate commit in the upcoming fix PR. PR #15 metadata was corrected to reflect that boundary. The temporary re-created Dependabot source branch can be removed after the follow-up branch is pushed.
