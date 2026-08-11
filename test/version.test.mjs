import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = path.join(root, "scripts", "next-version.mjs");
const packageVersion = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const [major, minor, patch] = packageVersion.split(".").map(Number);

function nextVersion(registryVersion) {
  const result = spawnSync(process.execPath, [script, registryVersion], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("reuses a locally recorded version after a failed publish", () => {
  const priorRegistryVersion = patch > 0
    ? `${major}.${minor}.${patch - 1}`
    : `${major}.${Math.max(0, minor - 1)}.0`;
  assert.equal(nextVersion(priorRegistryVersion), packageVersion);
});

test("allocates a patch after the recorded version reaches npm", () => {
  assert.equal(nextVersion(packageVersion), `${major}.${minor}.${patch + 1}`);
});
