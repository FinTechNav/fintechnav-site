# Repository cleanup — November 6, 2026

## Branches and recovery

GitHub started this cleanup with protected main as its only branch and no open PRs. Five stale local branches were ancestors of main: codex/check-pr-14, codex/fix-pr-12, codex/fix-pr-13, codex/fix-schwab-connection and codex/security-quick-wins. The remaining codex/fix-pr-15 branch contained a single patch already cherry-picked into main, confirmed by git cherry. Removed all six, the clean /private/tmp/fintechnav-pr-repairs worktree and an obsolete GitHub Desktop stash containing generated dist files only.

Before removal, created and verified a complete private Git bundle under ignored artifacts/local/git-backups, including all branch refs, the stash and existing archive tags. Two remote recovery tags remain intact because they preserve earlier unmerged legacy history. No force-push, history rewrite, remote tag deletion or Git garbage collection was performed.

## Files reviewed and disposition

- Keep and commit the non-sensitive final verification snapshot for PRs 17/18, including exact deployed commit and protected auto-merge result.
- Archive locally, without publishing, the supplied setup report, PR-body drafts, generated SBOM, static layout fixture and Schwab support/research notes. The owner reports sending the support message; no additional message was sent by this cleanup.
- Move personal research and raw dashboard/screenshots out of the current Git tree. Preserve complete historical raw session logs locally; public logs retain recent engineering entries and rationale with original numbering. Historical Git copies remain accessible; current-tree cleanup does not erase them.
- Archive 51 paths in total under ignored artifacts/local, with original paths/content hashes in a private manifest. Recovered files are not dependencies or deployment inputs.
- Remove retired HPW demo pages, checkout CSS, unused icons/old logo, Apache .htaccess and obsolete duplicate assistant documentation from the current source tree, keeping local archive copies. Root duplicate research files are archived too.
- Stop tracking seven .DS_Store files and .netlify/state.json. Local copies remain; the existing Netlify project binding was preserved.
- Update the biography favicon reference to the supported favicon asset and remove the unused icons publish directory. Preserve live biography images/company logos, stock app, callback relay, installed skills, Netlify functions, security workflows and repository protections.
- Refresh README/artifact indexes and document that personal/generated files belong in ignored artifacts/local. Future stock research remains available in the workspace without publishing personal material to GitHub.

## Validation

Normal production build, lint/format validation and all 26 existing security tests passed. Every local HTML image/script/stylesheet/manifest reference in built output resolves. The built site excludes private archives, logs, root inputs, retired icons/HPW pages and backend sources. The separately registered callback relay still builds only its minimal redirect page and preserves query/hash.

Before publishing the PR, inspect staged paths, run git diff --check and scan the new commit with redacted Gitleaks. CI will repeat the required build, lint, secret/dependency/workflow/SBOM and CodeQL checks. Live brokerage transactions, mail and payment endpoints are not exercised.

## Publication boundary

The cleanup should go through a protected PR. The ignored archive and backup bundle must never be staged, uploaded as PR artifacts or published. Historical copies in prior Git commits/tags are deliberately unchanged. Once the cleanup merges, sync local main and remove its completed branch so the working tree is clean.
