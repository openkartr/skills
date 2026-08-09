import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const expectedSlugs = ["logo-designer", "rca-analysis"];

for (const relativePath of [
  "package.json",
  "bin/openkartr.mjs",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
]) {
  await access(path.join(root, relativePath));
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.name !== "openkartr") throw new Error("Package name must be openkartr.");
if (packageJson.bin?.openkartr !== "bin/openkartr.mjs") {
  throw new Error("Package bin must expose the openkartr command.");
}
for (const requiredFile of ["bin", "skills", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  if (!packageJson.files?.includes(requiredFile)) {
    throw new Error(`Package files must include ${requiredFile}.`);
  }
}

const skillEntries = await readdir(path.join(root, "skills"), { withFileTypes: true });
const skillSlugs = skillEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (skillSlugs.join(",") !== expectedSlugs.join(",")) {
  throw new Error(`Bundled skills must be ${expectedSlugs.join(", ")}; found ${skillSlugs.join(", ")}.`);
}

for (const slug of skillSlugs) {
  const skillRoot = path.join(root, "skills", slug);
  await access(path.join(skillRoot, "SKILL.md"));
  await access(path.join(skillRoot, "agents", "openai.yaml"));

  const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error(`${slug}/SKILL.md is missing YAML frontmatter.`);

  const keys = frontmatter[1]
    .split("\n")
    .filter((line) => /^[a-z][a-z0-9_-]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));

  if (keys.join(",") !== "name,description") {
    throw new Error(`${slug}/SKILL.md frontmatter must contain only name and description.`);
  }
  if (!frontmatter[1].includes(`name: ${slug}`)) {
    throw new Error(`${slug}/SKILL.md must declare name: ${slug}.`);
  }

  const openaiYaml = await readFile(path.join(skillRoot, "agents", "openai.yaml"), "utf8");
  if (!openaiYaml.includes(`$${slug}`)) {
    throw new Error(`${slug}/agents/openai.yaml must reference $${slug}.`);
  }
}

await access(path.join(root, "skills", "logo-designer", "scripts", "export.sh"));
const notices = await readFile(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
for (const marker of ["Jeremy Watt", "A5C AI", "8f9a4b04009c15b05eeb47b4608d5502abafa609"]) {
  if (!notices.includes(marker)) throw new Error(`THIRD_PARTY_NOTICES.md is missing ${marker}.`);
}

const cliResult = spawnSync(process.execPath, [path.join(root, "bin", "openkartr.mjs"), "list"], {
  cwd: root,
  encoding: "utf8",
});
if (cliResult.status !== 0) throw new Error(cliResult.stderr || "openkartr list failed.");
const catalogSlugs = cliResult.stdout
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t")[0])
  .sort();
if (catalogSlugs.join(",") !== expectedSlugs.join(",")) {
  throw new Error(`CLI catalog does not match bundled skills: ${catalogSlugs.join(", ")}.`);
}

const harnessResult = spawnSync(
  process.execPath,
  [path.join(root, "bin", "openkartr.mjs"), "harnesses"],
  { cwd: root, encoding: "utf8" },
);
if (harnessResult.status !== 0) {
  throw new Error(harnessResult.stderr || "openkartr harnesses failed.");
}
for (const harness of ["codex", "claude-code", "cursor", "gemini-cli", "universal"]) {
  if (!harnessResult.stdout.includes(`${harness}\t`)) {
    throw new Error(`CLI harness catalog is missing ${harness}.`);
  }
}

console.log(`Validated OpenKartr ${packageJson.version} with ${skillSlugs.length} bundled skills.`);
