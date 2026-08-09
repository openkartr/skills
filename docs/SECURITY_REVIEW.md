# OpenKartr skill security review

## Distribution tiers

OpenKartr does not mirror every skill it discovers.

1. **Reference only** — catalog metadata points to the owner's project. OpenKartr
   does not redistribute or expose an install command.
2. **Community adapter** — an owner-hosted skill is pinned to one full commit,
   downloaded into quarantine, constrained and scanned at install time, and
   labeled as not human verified. V1 blocks executable community content.
3. **Verified vendored snapshot** — a selected, license-compatible skill is
   copied into `skills/<slug>` at one exact upstream commit, reviewed, hashed,
   and released through the OpenKartr npm package.
4. **OpenKartr native** — OpenKartr owns and maintains the implementation. It
   passes the same release gates but does not need upstream synchronization.

## Trust boundary

An upstream commit is an update notification, not an approval. The scheduled
watcher compares each tracked path with `origin.reviewedCommit` and opens or
refreshes a GitHub issue. It never copies files, changes a manifest, merges a
pull request, or publishes npm.

The only route from upstream to users is:

```text
detected commit -> maintainer snapshot PR -> automated gates -> human approval
-> merge -> immutable npm release -> explicit user install/update
```

## Required review for a vendored snapshot

- Confirm repository owner, tracked path, and full upstream commit SHA.
- Confirm a redistribution-compatible license and preserve attribution.
- Review the complete diff from the previously approved upstream commit.
- Reject symlinks, hidden files, unsupported binaries, oversized files, and
  unexpected executable content.
- Scan for secrets, credential access, remote shell execution, broad deletion,
  encoded execution, and undeclared network behavior.
- Review the natural-language instructions for data exfiltration, prompt
  injection, hidden persistence, unsafe destructive actions, impersonation,
  or attempts to bypass user approval.
- Verify declared reads, writes, environment variables, network domains, and
  executable files against the actual implementation.
- Run the skill in an isolated temporary workspace when scripts or external
  tools are involved. Do not provide production credentials.
- Record the reviewer, date, risk tier, approved commit, and content hash in
  `OPENKARTR.json`.
- Run `npm run validate`, `npm run release:verify`, and `npm test` before merge.

## Review states

- `review-required`: a candidate exists or reviewed content changed; release is blocked.
- `verified`: the exact content hash and upstream commit were approved.
- `rejected`: the candidate failed review and must not ship.
- `revoked`: a previously released snapshot is no longer trusted. Remove or
  replace it and publish a new package release promptly.

Changing a skill's files without updating the reviewed hash fails validation.
Publishing any skill not marked `verified` fails the release gate.

For enforceable separation of duties, protect `main`, require pull requests and
at least one approval, dismiss stale approvals when new commits arrive, require
the validation checks, and prevent bypass. At least two trusted maintainers need
write access so the pull-request author is not also the approver.

## Adding a new skill

Start as reference-only unless license and identity checks are complete. For a
vendored candidate, copy only the skill subtree—not the owner's entire
repository—create `OPENKARTR.json`, record attribution, and set the review state
to `review-required`. A reviewer may change it to `verified` and refresh the
hash only after every check above passes.

For a community candidate, run `npm run candidate:github` or the candidate
intake workflow. Only add its immutable descriptor to `registry/skills.json`
when the owner path, full commit, license signal, shape, and scan report are
acceptable. This does not convert it into a verified skill.
