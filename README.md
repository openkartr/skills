# OpenKartr Skills

OpenKartr distributes installable skills for AI coding agents. Its human-verified catalog currently includes `logo-designer` and `rca-analysis`.

## Install

```bash
npx --prefer-online openkartr@latest install logo-designer
npx --prefer-online openkartr@latest install rca-analysis
```

OpenKartr also supports immutable community sources through provider adapters:

```bash
npx --prefer-online openkartr@latest install gap-analysis-framework
```

Community sources are pinned to a full owner-repository commit, downloaded into
quarantine, structurally constrained, and scanned before installation. They are
not human verified. Interactive installs require confirmation; automation must
explicitly pass `--allow-community`.

In an interactive terminal, OpenKartr detects installed AI harnesses and asks whether to install globally for all detected harnesses or for one selected harness. Shared destinations are de-duplicated automatically.

List every supported harness and its detection status:

```bash
npx --prefer-online openkartr@latest harnesses
```

Skip the prompt for scripts and CI:

```bash
npx --prefer-online openkartr@latest install rca-analysis --all
npx --prefer-online openkartr@latest install rca-analysis --target claude-code
npx --prefer-online openkartr@latest install rca-analysis --target cursor
npx --prefer-online openkartr@latest install rca-analysis --dir ./skills
```

`--all` means every harness detected on the current computer. In a non-interactive terminal, the backward-compatible default remains Codex unless `--all`, `--target`, or `--dir` is supplied.

List the catalog or inspect a skill:

```bash
npx --prefer-online openkartr@latest list
npx --prefer-online openkartr@latest info rca-analysis
```

Every installation includes an `.openkartr.json` ownership marker. Re-running
the latest install command automatically refreshes an OpenKartr-managed copy.
An existing unmarked skill is never overwritten unless you explicitly use
`--force`. The marker also records the reviewed upstream commit, risk tier,
review date, and SHA-256 content hash for the installed snapshot.

The npm package bundles reviewed files under `skills/` plus the immutable source
registry and adapters. A merged registry or reviewed-skill change becomes
available through `@latest` after the automated npm release succeeds.

## Verification and upstream updates

OpenKartr does not clone every project in the discovery catalog. Entries with an
unresolved source, license, mutable reference, unsafe structure, or executable
community content remain reference-only. Eligible owner-hosted skills can use
the explicitly unverified community adapter lane. Selected human-reviewed
skills are distributed as verified snapshots with license, attribution,
permissions, reviewer, risk tier, and content hash recorded in
`OPENKARTR.json`.

The daily upstream watcher only opens a review issue when an owner changes a
tracked skill. It never imports or publishes that change automatically. See
[`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md) for the approval gates.

## Development

```bash
npm test
npm run validate
npm run upstream:check
npm run candidate:github -- --repo owner/repository --path path/to/skill
npm pack --dry-run
```

The npm artifact bundles verified skill files and the adapter registry. Community
skills are retrieved from their public owner repository at the immutable commit
recorded in that registry.
