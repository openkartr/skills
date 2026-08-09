import { readFile } from "node:fs/promises";
import path from "node:path";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const commitPattern = /^[0-9a-f]{40}$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function assert(condition, message) {
  if (!condition) throw new Error(`Registry: ${message}`);
}

function validateRelativePath(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} is required.`);
  assert(!path.posix.isAbsolute(value), `${label} must be relative.`);
  assert(!value.includes("\\"), `${label} must use forward slashes.`);
  const normalized = path.posix.normalize(value);
  assert(normalized !== ".." && !normalized.startsWith("../"), `${label} escapes its source root.`);
  assert(normalized === value.replace(/\/$/, ""), `${label} must be normalized.`);
  return normalized;
}

export function validateRegistry(registry) {
  assert(registry?.schemaVersion === 1, "unsupported schema version.");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(registry.generatedAt), "generatedAt must be an ISO date.");
  assert(Array.isArray(registry.skills), "skills must be an array.");
  const slugs = new Set();
  for (const skill of registry.skills) {
    assert(slugPattern.test(skill.slug), `invalid slug ${skill.slug}.`);
    assert(!slugs.has(skill.slug), `duplicate slug ${skill.slug}.`);
    slugs.add(skill.slug);
    assert(typeof skill.name === "string" && skill.name.length >= 2, `${skill.slug} needs a name.`);
    assert(typeof skill.description === "string" && skill.description.length >= 20, `${skill.slug} needs a description.`);
    assert(["verified", "community"].includes(skill.trustTier), `${skill.slug} has an invalid trust tier.`);
    assert(typeof skill.license === "string" && skill.license.length >= 2, `${skill.slug} needs a license signal.`);
    assert(["bundled", "github"].includes(skill.source?.provider), `${skill.slug} has an unsupported provider.`);

    if (skill.source.provider === "bundled") {
      assert(skill.trustTier === "verified", `${skill.slug}: bundled sources must be verified.`);
      assert(skill.source.path === `skills/${skill.slug}`, `${skill.slug}: bundled path mismatch.`);
    } else {
      assert(skill.trustTier === "community", `${skill.slug}: GitHub sources must use the community tier in V1.`);
      assert(repositoryPattern.test(skill.source.repository), `${skill.slug}: invalid GitHub repository.`);
      validateRelativePath(skill.source.path, `${skill.slug}.source.path`);
      assert(commitPattern.test(skill.source.commit), `${skill.slug}: GitHub source must pin a full commit.`);
    }
  }
  return registry;
}

export async function loadRegistry(registryPath) {
  return validateRegistry(JSON.parse(await readFile(registryPath, "utf8")));
}
