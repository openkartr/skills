# OpenKartr Skills

OpenKartr distributes installable skills for AI coding agents through one public
npm installer. The registry can add or update signed, immutable community skills
without publishing a separate npm package for every skill.

## Install

```bash
npx --yes --prefer-online openkartr@latest install logo-designer
npx --yes --prefer-online openkartr@latest install rca-analysis
```

OpenKartr also supports immutable community sources through provider adapters:

```bash
npx --yes --prefer-online openkartr@latest install gap-analysis-framework
```

Community sources are pinned to a full owner-repository commit, downloaded into
quarantine, structurally constrained, and scanned before installation. They are
not human verified. Interactive installs require confirmation; automation must
explicitly pass `--allow-community`.

In an interactive terminal, OpenKartr detects installed AI harnesses and asks whether to install globally for all detected harnesses or for one selected harness. Shared destinations are de-duplicated automatically.

List every supported harness and its detection status:

```bash
npx --yes --prefer-online openkartr@latest harnesses
```

Skip the prompt for scripts and CI:

```bash
npx --yes --prefer-online openkartr@latest install rca-analysis --all
npx --yes --prefer-online openkartr@latest install rca-analysis --target claude-code
npx --yes --prefer-online openkartr@latest install rca-analysis --target cursor
npx --yes --prefer-online openkartr@latest install rca-analysis --dir ./skills
```

`--all` means every harness detected on the current computer. In a non-interactive terminal, the backward-compatible default remains Codex unless `--all`, `--target`, or `--dir` is supplied.

List the catalog or inspect a skill:

```bash
npx --yes --prefer-online openkartr@latest list
npx --yes --prefer-online openkartr@latest info rca-analysis
```

Every installation includes an `.openkartr.json` ownership marker. Re-running
the latest install command automatically refreshes an OpenKartr-managed copy.
An existing unmarked skill is never overwritten unless you explicitly use
`--force`. The marker also records the reviewed upstream commit, risk tier,
review date, and SHA-256 content hash for the installed snapshot.

The npm package bundles OpenKartr-reviewed files and the installer. For a
registry skill, the CLI requests a short-lived signed descriptor, verifies its
embedded OpenKartr public key, downloads only the exact pinned GitHub subtree,
re-runs local safety checks, and confirms the SHA-256 content hash before the
transactional install. Registry publication and npm publication are therefore
separate: skill additions do not need a new npm release, while installer changes
continue to use npm trusted publishing from GitHub Actions.

## Verification and upstream updates

OpenKartr does not clone every project in the discovery catalog. Entries with an
unresolved source, license, mutable reference, unsafe structure, or executable
community content remain reference-only. Eligible owner-hosted skills can use
the explicitly unverified community adapter lane. Selected human-reviewed
skills are distributed as verified snapshots with license, attribution,
permissions, reviewer, risk tier, and content hash recorded in
`OPENKARTR.json`.

The PostgreSQL-backed worker checks tracked repositories on an adaptive schedule.
It can automatically publish a new immutable version only when deterministic
license, structure, content, provenance, and safety gates all pass. A failed
update never replaces the last known-good version. See
[`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md) for the approval gates.

## Development

```bash
npm test
npm run validate
npm run upstream:check
npm run candidate:github -- --repo owner/repository --path path/to/skill
npm pack --dry-run
```

The npm artifact bundles verified OpenKartr files plus the signed-registry
client. Community skills remain in their owner repository and are retrieved
only at the immutable commit authorized by the registry descriptor.
