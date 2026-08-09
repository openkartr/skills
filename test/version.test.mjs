import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = path.join(root, "scripts", "next-version.mjs");

function nextVersion(registryVersion) {
  const result = spawnSync(process.execPath, [script, registryVersion], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("reuses a locally recorded version after a failed publish", () => {
  assert.equal(nextVersion("0.3.0"), "0.3.1");
});

test("allocates a patch after the recorded version reaches npm", () => {
  assert.equal(nextVersion("0.3.1"), "0.3.2");
});
