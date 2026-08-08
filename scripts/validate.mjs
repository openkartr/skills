import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillRoot = path.join(root, "skills", "rca-analysis");
const required = [
  "package.json",
  "bin/openkartr.mjs",
  "skills/rca-analysis/SKILL.md",
  "skills/rca-analysis/agents/openai.yaml",
];

for (const relativePath of required) {
  await access(path.join(root, relativePath));
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.name !== "openkartr") throw new Error("Package name must be openkartr.");
if (packageJson.bin?.openkartr !== "bin/openkartr.mjs") {
  throw new Error("Package bin must expose the openkartr command.");
}

const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
if (!frontmatter) throw new Error("SKILL.md is missing YAML frontmatter.");

const keys = frontmatter[1]
  .split("\n")
  .filter((line) => /^[a-z][a-z0-9_-]*:/.test(line))
  .map((line) => line.slice(0, line.indexOf(":")));

if (keys.join(",") !== "name,description") {
  throw new Error("SKILL.md frontmatter must contain only name and description.");
}
if (!frontmatter[1].includes("name: rca-analysis")) {
  throw new Error("Skill name must be rca-analysis.");
}

const openaiYaml = await readFile(
  path.join(skillRoot, "agents", "openai.yaml"),
  "utf8",
);
if (!openaiYaml.includes("$rca-analysis")) {
  throw new Error("agents/openai.yaml must reference $rca-analysis.");
}

console.log("Validated OpenKartr package and rca-analysis skill.");
