import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  fetchGitHubSkillBundle,
  fetchRepositoryLicense,
  parseGitHubRepository,
  resolveLatestCommit,
} from "../adapters/github.mjs";
import { loadRegistry } from "../lib/registry.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m"));
  return match?.[1]?.trim();
}

const repository = parseGitHubRepository(option("repo") ?? "");
const sourcePath = option("path");
const requestedSlug = option("slug");
const stdout = process.argv.includes("--stdout");
assert(sourcePath, "Usage: npm run candidate:github -- --repo owner/repo --path path/to/skill [--slug slug] [--stdout]");

const commit = await resolveLatestCommit({ repository, path: sourcePath });
const bundle = await fetchGitHubSkillBundle(
  { repository, path: sourcePath, commit },
  { trustTier: "candidate" },
);
const skillMd = bundle.files.find((file) => file.relative === "SKILL.md").contents.toString("utf8");
const slug = requestedSlug ?? frontmatterValue(skillMd, "name");
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? ""), "Candidate needs a valid slug.");
const candidate = {
  schemaVersion: 1,
  status: "review-required",
  importedAt: new Date().toISOString(),
  slug,
  name: frontmatterValue(skillMd, "name") ?? slug,
  description: frontmatterValue(skillMd, "description") ?? `Community skill imported from ${repository}.`,
  license: await fetchRepositoryLicense(repository),
  source: {
    provider: "github",
    repository,
    path: sourcePath,
    commit,
  },
  scan: {
    fileCount: bundle.scan.fileCount,
    totalBytes: bundle.scan.totalBytes,
    executables: bundle.scan.executables,
    contentHash: bundle.contentHash,
    communityEligible: bundle.scan.executables.length === 0,
  },
};

if (stdout) {
  console.log(JSON.stringify(candidate, null, 2));
} else {
  const registry = await loadRegistry(path.join(root, "registry", "skills.json"));
  assert(!registry.skills.some((skill) => skill.slug === slug), `${slug} is already live in the registry.`);
  const candidateRoot = path.join(root, "registry", "candidates");
  await mkdir(candidateRoot, { recursive: true });
  const target = path.join(candidateRoot, `${slug}.json`);
  await writeFile(target, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "wx" });
  console.log(`Created quarantined candidate ${path.relative(root, target)}.`);
  console.log("This record is not live. Review license, source diff, instructions, and scan results before adding it to registry/skills.json.");
}
