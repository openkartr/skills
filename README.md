# OpenKartr Skills

OpenKartr distributes verified, installable skills for AI coding agents. The catalog currently includes `logo-designer` and `rca-analysis`.

## Install

```bash
npx openkartr install logo-designer
npx openkartr install rca-analysis
```

In an interactive terminal, OpenKartr detects installed AI harnesses and asks whether to install globally for all detected harnesses or for one selected harness. Shared destinations are de-duplicated automatically.

List every supported harness and its detection status:

```bash
npx openkartr harnesses
```

Skip the prompt for scripts and CI:

```bash
npx openkartr install rca-analysis --all
npx openkartr install rca-analysis --target claude-code
npx openkartr install rca-analysis --target cursor
npx openkartr install rca-analysis --dir ./skills
```

`--all` means every harness detected on the current computer. In a non-interactive terminal, the backward-compatible default remains Codex unless `--all`, `--target`, or `--dir` is supplied.

List the catalog or inspect a skill:

```bash
npx openkartr list
npx openkartr info rca-analysis
```

Use `--force` only when you intentionally want to replace an existing installation.

## Development

```bash
npm test
npm run validate
npm pack --dry-run
```

The npm artifact bundles the skill files. Users do not need access to the private GitHub repository.
