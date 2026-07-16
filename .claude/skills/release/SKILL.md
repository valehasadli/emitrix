---
name: release
description: Cut an emitrix release — version bump, CHANGELOG section, tag + GitHub Release, automated npm publish via OIDC. Use when asked to release, publish, or ship a new version.
---

# Releasing emitrix

Releases are release-event-driven: merging to master does nothing; publishing a GitHub Release triggers the npm publish.

1. Preconditions: on `master`, clean tree, latest CI green.
2. Bump the version: `npm version patch|minor|major --no-git-tag-version`.
3. Add a `## [X.Y.Z] - YYYY-MM-DD` section at the top of CHANGELOG.md (below `## [Unreleased]`) describing the changes — `release.sh` extracts exactly this section as the release notes.
4. Commit as `X.Y.Z` (version + lockfile + changelog) and push master.
5. Run `./scripts/release.sh` — it tags `vX.Y.Z`, pushes the tag, and publishes a GitHub Release, which fires the `Publish to npm` workflow (test job → OIDC publish).
6. Verify:
   - `gh run watch $(gh run list --workflow=npm-publish.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status`
   - `curl -s https://registry.npmjs.org/emitrix` and confirm the new version is in `versions`. Do NOT trust local `npm view` for fresh releases — the safe-chain guard hides packages/versions younger than its minimum age.

Rules:
- The release tag must exactly match package.json (`v1.2.3` ↔ `1.2.3`) — the workflow enforces this and fails otherwise.
- Never publish from a local machine and never introduce npm token secrets; auth is OIDC trusted publishing bound to this repo + `npm-publish.yml`.
- If the publish job fails with ENEEDAUTH or 404, the trusted publisher config on npmjs.com (emitrix → Settings) no longer matches the repo or workflow filename — fix it there, not in CI.
