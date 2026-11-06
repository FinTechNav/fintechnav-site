# Netlify repository standard rollout — 2026-11-06

## Scope

Reviewed the owner-provided `github_repo_setup_standard_for_fintechnav_site.json` against current GitHub settings and source. Adapted it to a public, solo-owner Netlify repository. No HPW backend/tenant/database checks, AWS/RunsOn, Docker, paid runners or Pushover integrations were added. The input report remains untouched and untracked.

## Source changes

- Desktop stock dashboard occupies the dynamic viewport; only the shared center/right workspace scrolls. Sidebar navigation can scroll within itself on short screens; its footer and header stay anchored. Mobile retains document scrolling. The workspace can receive keyboard focus.
- Keep the existing `security` check; add `lint`, `secret-scan`, `npm-audit`, `sbom` and online `zizmor`. Add dispatch/draft/concurrency conventions, read-only default tokens, pinned actions and verified scanner downloads. CodeQL retains job-scoped upload permission. Required checks have no path filters.
- PR dependency audit compares base/head lockfiles without installing base code and blocks new high/critical advisory IDs or severity escalations. Main and weekly scheduled audit check the full current set. Invalid/network audit responses fail closed. Two regression tests cover those decisions.
- Add Node 22 version file. ESLint's quote-escaping option now agrees with Prettier, resolving the existing nine formatting conflicts without changing application behavior. Modernize the local Husky hook without changing this computer's global hooks configuration.
- Dependabot npm updates are grouped weekly with seven-day version cooldown, separate security grouping and manual major review; Actions updates are grouped quarterly. Auto-merge uses the verified numeric Dependabot identity and same-repo head, pinned metadata verification, no checkout/PR code, only minor/patch, exact-head matching and a fail-closed check for the expected main ruleset. Its limited write token is isolated to that job.
- Restrict published root HTML to the biography and privacy pages. Legacy HPW demo sources are retained but not published. Retire their payment proxies and HPW CSP origins, dead scheduled-refresh config and root checkout stylesheet publishing. Root manifest opens the biography instead of the retired POS path. Preserve the separate minimal OAuth relay build and legitimate biography/career references.
- Refresh contributing/agent guidance, the PR template and duplicate ignore entries. Keep research/logs and credential files outside deployment.

## Verification

Local build, lint/format, maintained JavaScript syntax, all 26 security tests, native CycloneDX SBOM generation, actionlint and online dependency audit passed. Head/base advisory comparison is clean (zero high/critical). Online zizmor found no known vulnerable action; its informational findings concern the intentionally isolated pull_request_target auto-merge trigger and bot guard. No untrusted checkout runs with the write token; immutable numeric identities and metadata commit verification guard it. Scanner releases and action SHAs were independently checked against official GitHub release metadata.

Browser verification used a loopback-only static copy with app/auth scripts removed and no brokerage data; no production authentication bypass was added. At 1440×600, keyboard scrolling moved both content columns from y=58 to y=-95 while sidebar y stayed 58, footer y stayed 559, document height stayed 600 and body scroll stayed zero. At 390×844, sidebar is hidden, workspace overflow is visible, document height is 2159 and there is no horizontal overflow. At 1440×900, the full sidebar/footer remains visible. Temporary viewport override was reset. The fixture is a local artifact, not staged or published.

Verified normal output excludes retired pages, checkout stylesheet, logs, server/artifact directories and the user input report. Relay output contains only its redirect page and preserves query/hash. No real brokerage order, payment or email was sent.

## Rollout status

PR #17 was merged by the owner at 20:23:23 UTC, main 308b5ea98ee5e733dd77b67d80fdabb554393968. All eight GitHub Actions checks succeeded, verified app ID 15368. Netlify production deploy 6aee373d0db43cb5575d03e0 is ready for that exact commit, published 20:23:38 UTC. Production HTTP checks confirm the anchored layout/manifest and 404 on retired demo/proxy paths; anonymous stock auth remains 401.

Repository settings now allow only squash merges, use PR title/blank squash message, delete merged branches and allow guarded auto-merge. External-contributor workflow approval is all_external_contributors. Active main-protection ruleset 26724392 has no bypass actors; it blocks deletion/force-push, requires an up-to-date PR with resolved threads and zero additional approvers, and requires security, lint, secret-scan, npm-audit, zizmor, sbom and both CodeQL Analyze checks from Actions app 15368. Effective branch rules were re-read and match the targets. Direct main writes are prohibited by those effective rules; no deliberate rejected push was attempted.

Target payloads are stored alongside this report. A documentation-only follow-up PR exercises the new required checks and squash/auto-merge path. There is no active Dependabot update PR, so end-to-end bot-triggered merging has not been observed. Existing wiki/projects and global action policy were preserved; no usage evidence justified disabling them. The historical Google API key security alert remains unresolved until its owner verifies revocation/restrictions.

## Schwab diagnostic update

Owner's fresh callback surfaced invalid_client at the token endpoint, explaining why no new tokens are saved. Narrow UI checks verified production SCHWAB_CLIENT_ID/SECRET exist in all scopes with no whitespace, wrapping quotes or obvious placeholders; raw values were not printed or saved. The client ID matches the app's previously observed authorization ID. The currently signed-in developer account shows no apps or pending apps, despite an approved Trader API subscription. Asked the owner to locate the actual app/account; configuration repair and real read-only sync remain pending. The earlier rejected broad environment retrieval was not retried.

## Primary references

- [Dependabot metadata and safe auto-merge](https://github.com/dependabot/fetch-metadata)
- [Dependency update scheduling](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates)
- [zizmor audits](https://docs.zizmor.sh/audits/#known-vulnerable-actions)
- [Gitleaks 8.30.1 release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
- [zizmor 1.32.0 release](https://github.com/zizmorcore/zizmor/releases/tag/v1.32.0)

## Schwab research follow-up

The owner confirms this is their only developer account and reports the app still linked in the brokerage account. Historical first-hand reports describe missing developer apps and broken management; these do not establish a current outage or the exact cause. Schwab's official Trader API product page lists TraderAPI@Schwab.com for support. A local research report/support draft was prepared separately, not sent. No app was replaced, edited or deactivated.
