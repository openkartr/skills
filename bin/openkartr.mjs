#!/usr/bin/env node

import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);

const catalog = [
  {
    slug: "rca-analysis",
    name: "Root Cause Analysis",
    description:
      "Investigate incidents with evidence-based causal analysis and corrective actions.",
  },
];

const args = process.argv.slice(2);
const command = args[0] ?? "help";

function printHelp() {
  console.log(`OpenKartr ${packageJson.version}

Install verified skills for AI coding agents.

Usage:
  openkartr list
  openkartr info <skill>
  openkartr install <skill> [options]

Install options:
  --target <codex|claude|agents>  Installation target (default: codex)
  --dir <path>                   Install into a custom skills directory
  --force                        Replace an existing copy of the skill
  --dry-run                      Show the destination without writing files

Examples:
  npx openkartr install rca-analysis
  npx openkartr install rca-analysis --target claude
  npx openkartr install rca-analysis --dir ./skills
`);
}

function findSkill(slug) {
  return catalog.find((skill) => skill.slug === slug);
}

function fail(message) {
  console.error(`OpenKartr: ${message}`);
  process.exitCode = 1;
}

function expandPath(value) {
  if (value === "~") return homedir();
  if (value.startsWith(`~${path.sep}`)) {
    return path.join(homedir(), value.slice(2));
  }
  return path.resolve(value);
}

function defaultSkillsDirectory(target) {
  if (target === "codex") {
    return path.join(process.env.CODEX_HOME || path.join(homedir(), ".codex"), "skills");
  }
  if (target === "claude") return path.join(homedir(), ".claude", "skills");
  if (target === "agents") return path.join(homedir(), ".agents", "skills");
  throw new Error(`unknown target "${target}"`);
}

function parseInstallOptions(values) {
  const options = {
    slug: values[0],
    target: "codex",
    directory: undefined,
    force: false,
    dryRun: false,
  };

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--target") {
      options.target = values[++index];
    } else if (value === "--dir") {
      options.directory = values[++index];
    } else if (value === "--force") {
      options.force = true;
    } else if (value === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`unknown option "${value}"`);
    }
  }

  if (!options.slug) throw new Error("provide a skill name to install");
  if (!options.target) throw new Error("--target requires a value");
  if (values.includes("--dir") && !options.directory) {
    throw new Error("--dir requires a path");
  }

  return options;
}

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function installSkill(values) {
  let options;
  try {
    options = parseInstallOptions(values);
  } catch (error) {
    fail(error.message);
    return;
  }

  const skill = findSkill(options.slug);
  if (!skill) {
    fail(`skill "${options.slug}" was not found. Run "openkartr list".`);
    return;
  }

  let skillsDirectory;
  try {
    skillsDirectory = options.directory
      ? expandPath(options.directory)
      : defaultSkillsDirectory(options.target);
  } catch (error) {
    fail(error.message);
    return;
  }

  const source = path.join(packageRoot, "skills", skill.slug);
  const destination = path.join(skillsDirectory, skill.slug);

  if (options.dryRun) {
    console.log(`Would install ${skill.name} to ${destination}`);
    return;
  }

  if (await exists(destination)) {
    if (!options.force) {
      fail(`${destination} already exists. Re-run with --force to replace it.`);
      return;
    }
    await rm(destination, { recursive: true, force: true });
  }

  await mkdir(skillsDirectory, { recursive: true });
  await cp(source, destination, { recursive: true });

  console.log(`Installed ${skill.name}`);
  console.log(`Location: ${destination}`);
  console.log("Restart your agent if it is already running.");
}

if (command === "list") {
  for (const skill of catalog) {
    console.log(`${skill.slug}\t${skill.description}`);
  }
} else if (command === "info") {
  const skill = findSkill(args[1]);
  if (!skill) fail(`skill "${args[1] ?? ""}" was not found.`);
  else {
    console.log(`${skill.name} (${skill.slug})`);
    console.log(skill.description);
    console.log(`Install: npx openkartr install ${skill.slug}`);
  }
} else if (command === "install") {
  await installSkill(args.slice(1));
} else if (command === "--version" || command === "-v" || command === "version") {
  console.log(packageJson.version);
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else {
  fail(`unknown command "${command}".`);
  printHelp();
}
