import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(root, "bin", "openkartr.mjs");

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    input: options.input,
    env: { ...process.env, ...options.env },
  });
}

function harnessEnvironment(home) {
  return {
    OPENKARTR_HOME: home,
    CODEX_HOME: path.join(home, ".codex"),
    CLAUDE_CONFIG_DIR: path.join(home, ".claude"),
    XDG_CONFIG_HOME: path.join(home, ".config"),
  };
}

test("lists every bundled skill", () => {
  const result = run(["list"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /logo-designer/);
  assert.match(result.stdout, /rca-analysis/);
});

test("shows installation information for the logo designer", () => {
  const result = run(["info", "logo-designer"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Logo Designer/);
  assert.match(result.stdout, /npx openkartr install logo-designer/);
});

test("supports a dry-run logo install", () => {
  const result = run(["install", "logo-designer", "--dry-run", "--dir", "./example"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would install Logo Designer/);
});

test("lists supported harnesses and marks detected harnesses", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    await mkdir(path.join(temporaryHome, ".codex"));
    await mkdir(path.join(temporaryHome, ".cursor"));

    const result = run(["harnesses"], { env: harnessEnvironment(temporaryHome) });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /codex\tCodex\tdetected\t~\/.codex\/skills/);
    assert.match(result.stdout, /cursor\tCursor\tdetected\t~\/.cursor\/skills/);
    assert.match(result.stdout, /claude-code\tClaude Code\tavailable/);
    assert.match(result.stdout, /universal\tUniversal agents\tavailable/);
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("installs into every detected harness with --all", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    await mkdir(path.join(temporaryHome, ".codex"));
    await mkdir(path.join(temporaryHome, ".claude"));

    const result = run(["install", "rca-analysis", "--all"], {
      env: harnessEnvironment(temporaryHome),
    });
    assert.equal(result.status, 0, result.stderr);
    await access(path.join(temporaryHome, ".codex", "skills", "rca-analysis", "SKILL.md"));
    await access(path.join(temporaryHome, ".claude", "skills", "rca-analysis", "SKILL.md"));
    assert.match(result.stdout, /Codex:/);
    assert.match(result.stdout, /Claude Code:/);
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("interactive install offers all detected harnesses", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    await mkdir(path.join(temporaryHome, ".codex"));
    await mkdir(path.join(temporaryHome, ".claude"));

    const result = run(["install", "logo-designer", "--dry-run"], {
      env: {
        ...harnessEnvironment(temporaryHome),
        OPENKARTR_FORCE_INTERACTIVE: "1",
      },
      input: "1\n",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Detected harnesses:/);
    assert.match(result.stdout, /All detected harnesses \(global\)/);
    assert.match(result.stdout, /One harness \(global\)/);
    assert.match(result.stdout, /Codex:.*\.codex\/skills\/logo-designer/);
    assert.match(result.stdout, /Claude Code:.*\.claude\/skills\/logo-designer/);
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("supports a single harness by id or alias", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    const result = run(["install", "logo-designer", "--target", "claude"], {
      env: harnessEnvironment(temporaryHome),
    });
    assert.equal(result.status, 0, result.stderr);
    await access(path.join(temporaryHome, ".claude", "skills", "logo-designer", "SKILL.md"));
    await assert.rejects(
      access(path.join(temporaryHome, ".codex", "skills", "logo-designer", "SKILL.md")),
    );
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("non-interactive installs remain backward compatible with Codex", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    const result = run(["install", "logo-designer", "--dry-run"], {
      env: harnessEnvironment(temporaryHome),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Codex:.*\.codex\/skills\/logo-designer/);
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("multi-harness preflight prevents partial installation", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    const existing = path.join(temporaryHome, ".codex", "skills", "rca-analysis");
    await mkdir(existing, { recursive: true });
    await writeFile(path.join(existing, "keep.txt"), "existing installation\n");
    await mkdir(path.join(temporaryHome, ".claude"));

    const result = run(["install", "rca-analysis", "--all"], {
      env: harnessEnvironment(temporaryHome),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /installation stopped because/);
    await access(path.join(existing, "keep.txt"));
    await assert.rejects(
      access(path.join(temporaryHome, ".claude", "skills", "rca-analysis", "SKILL.md")),
    );
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("--force replaces every selected harness installation", async () => {
  const temporaryHome = await mkdtemp(path.join(tmpdir(), "openkartr-home-"));
  try {
    const existing = path.join(temporaryHome, ".codex", "skills", "rca-analysis");
    await mkdir(existing, { recursive: true });
    await writeFile(path.join(existing, "old.txt"), "old installation\n");
    await mkdir(path.join(temporaryHome, ".claude"));

    const result = run(["install", "rca-analysis", "--all", "--force"], {
      env: harnessEnvironment(temporaryHome),
    });
    assert.equal(result.status, 0, result.stderr);
    await access(path.join(existing, "SKILL.md"));
    await assert.rejects(access(path.join(existing, "old.txt")));
    await access(path.join(temporaryHome, ".claude", "skills", "rca-analysis", "SKILL.md"));
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

test("installs the bundled skill into a custom directory", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "openkartr-test-"));
  try {
    const result = run(["install", "rca-analysis", "--dir", temporaryRoot]);
    assert.equal(result.status, 0, result.stderr);

    const installed = path.join(temporaryRoot, "rca-analysis", "SKILL.md");
    await access(installed);
    const contents = await readFile(installed, "utf8");
    assert.match(contents, /name: rca-analysis/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("installs logo-designer with metadata and export script", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "openkartr-logo-test-"));
  try {
    const result = run(["install", "logo-designer", "--dir", temporaryRoot]);
    assert.equal(result.status, 0, result.stderr);

    const skillRoot = path.join(temporaryRoot, "logo-designer");
    const contents = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
    assert.match(contents, /name: logo-designer/);
    await access(path.join(skillRoot, "agents", "openai.yaml"));
    await access(path.join(skillRoot, "scripts", "export.sh"));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("does not overwrite an installed skill without --force", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "openkartr-test-"));
  try {
    const first = run(["install", "rca-analysis", "--dir", temporaryRoot]);
    assert.equal(first.status, 0, first.stderr);

    const second = run(["install", "rca-analysis", "--dir", temporaryRoot]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /already exists/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
