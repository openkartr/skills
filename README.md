# OpenKartr Skills

OpenKartr distributes verified, installable skills for AI coding agents. Release 1 contains one skill: `rca-analysis`.

## Install

```bash
npx openkartr install rca-analysis
```

The default target is Codex at `~/.codex/skills/rca-analysis`. Other supported targets:

```bash
npx openkartr install rca-analysis --target claude
npx openkartr install rca-analysis --target agents
npx openkartr install rca-analysis --dir ./skills
```

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
