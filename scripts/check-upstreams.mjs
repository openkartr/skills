import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadRegistry } from "../lib/registry.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = path.join(root, "skills");
const jsonMode = process.argv.includes("--json");
const markdownMode = process.argv.includes("--markdown");
const githubOutput = process.argv.includes("--github-output");

function parseGitHubRepository(value) {
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    const [owner, repository] = value.split("/");
    return { owner, repository };
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error(`Unsupported upstream repository: ${value}`);
  }
  const [owner, repository, ...extra] = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
  if (!owner || !repository || extra.length > 0) {
    throw new Error(`Expected a GitHub repository root URL: ${value}`);
  }
  return { owner, repository };
}

async function latestCommitForPath({ slug, repository: repositoryValue, path: sourcePath }) {
  const { owner, repository } = parseGitHubRepository(repositoryValue);
  const endpoint = new URL(`https://api.github.com/repos/${owner}/${repository}/commits`);
  endpoint.searchParams.set("path", sourcePath);
  endpoint.searchParams.set("per_page", "1");
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "openkartr-upstream-watch",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    throw new Error(`${slug}: GitHub returned ${response.status} for ${endpoint}`);
  }
  const commits = await response.json();
  if (!Array.isArray(commits) || commits.length === 0) {
    throw new Error(`${slug}: no upstream commit found for ${sourcePath}`);
  }
  return commits[0].sha;
}

const entries = await readdir(skillsRoot, { withFileTypes: true });
const updates = [];
for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const manifest = JSON.parse(
    await readFile(path.join(skillsRoot, entry.name, "OPENKARTR.json"), "utf8"),
  );
  if (manifest.origin.syncPolicy !== "review-pr") continue;
  const latestCommit = await latestCommitForPath({
    slug: manifest.slug,
    repository: manifest.origin.upstreamRepository,
    path: manifest.origin.upstreamPath,
  });
  if (latestCommit !== manifest.origin.reviewedCommit) {
    updates.push({
      slug: manifest.slug,
      trustTier: "verified",
      upstreamRepository: manifest.origin.upstreamRepository,
      upstreamPath: manifest.origin.upstreamPath,
      currentCommit: manifest.origin.reviewedCommit,
      latestCommit,
    });
  }
}

const registry = await loadRegistry(path.join(root, "registry", "skills.json"));
for (const skill of registry.skills.filter((entry) => entry.source.provider === "github")) {
  const latestCommit = await latestCommitForPath({
    slug: skill.slug,
    repository: skill.source.repository,
    path: skill.source.path,
  });
  if (latestCommit !== skill.source.commit) {
    updates.push({
      slug: skill.slug,
      trustTier: "community",
      upstreamRepository: `https://github.com/${skill.source.repository}`,
      upstreamPath: skill.source.path,
      currentCommit: skill.source.commit,
      latestCommit,
    });
  }
}

if (githubOutput) {
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is not available.");
  await writeFile(process.env.GITHUB_OUTPUT, `count=${updates.length}\n`, { flag: "a" });
}

if (jsonMode) {
  console.log(JSON.stringify(updates, null, 2));
} else if (markdownMode) {
  console.log("## Upstream skill updates require review\n");
  console.log("This is detection only. No upstream files were copied, approved, or published.\n");
  for (const update of updates) {
    console.log(`- **${update.slug}** (${update.trustTier}): \`${update.currentCommit.slice(0, 12)}\` → \`${update.latestCommit.slice(0, 12)}\``);
    console.log(`  - Repository: ${update.upstreamRepository}`);
    console.log(`  - Tracked path: \`${update.upstreamPath}\``);
  }
  console.log("\nA maintainer must open a snapshot PR, review the diff and license, run the security gates, and explicitly approve the new commit.");
} else if (updates.length === 0) {
  console.log("All reviewed upstream skill snapshots are current.");
} else {
  for (const update of updates) {
    console.log(`${update.slug}\t${update.trustTier}\t${update.currentCommit}\t${update.latestCommit}`);
  }
  console.log(`${updates.length} upstream update(s) require review.`);
}
