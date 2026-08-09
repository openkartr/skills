import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(await readFile(`${root}/package.json`, "utf8"));
const registryVersion = process.argv[2] ?? "0.0.0";

function parse(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid stable version: ${version}`);
  return match.slice(1).map(Number);
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

const local = parse(packageJson.version);
const registry = parse(registryVersion);
if (compare(local, registry) > 0) {
  // A previous publish attempt may have recorded a version before npm rejected
  // it. Reuse that unpublished version so retries are idempotent.
  console.log(local.join("."));
} else {
  console.log(`${registry[0]}.${registry[1]}.${registry[2] + 1}`);
}
