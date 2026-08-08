import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(root, "bin", "openkartr.mjs");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("lists the RCA skill", () => {
  const result = run(["list"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /rca-analysis/);
});

test("supports a dry-run install", () => {
  const result = run(["install", "rca-analysis", "--dry-run", "--dir", "./example"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would install Root Cause Analysis/);
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
