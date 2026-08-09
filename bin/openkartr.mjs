#!/usr/bin/env node

import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);

const catalog = [
  {
    slug: "logo-designer",
    name: "Logo Designer",
    description:
      "Create, compare, refine, and export original scalable SVG logo concepts.",
  },
  {
    slug: "rca-analysis",
    name: "Root Cause Analysis",
    description:
      "Investigate incidents with evidence-based causal analysis and corrective actions.",
  },
];

const userHome = process.env.OPENKARTR_HOME || homedir();
const configHome = process.env.XDG_CONFIG_HOME || path.join(userHome, ".config");
const codexHome = process.env.CODEX_HOME || path.join(userHome, ".codex");
const claudeHome = process.env.CLAUDE_CONFIG_DIR || path.join(userHome, ".claude");

function openClawSkillsDirectory() {
  for (const folder of [".openclaw", ".clawdbot", ".moltbot"]) {
    const base = path.join(userHome, folder);
    if (pathExistsSyncHint(base)) return path.join(base, "skills");
  }
  return path.join(userHome, ".openclaw", "skills");
}

function pathExistsSyncHint(targetPath) {
  return existsSync(targetPath);
}

const harnesses = [
  {
    id: "codex",
    displayName: "Codex",
    aliases: [],
    skillsDirectory: codexHome && path.join(codexHome, "skills"),
    markers: [codexHome, "/etc/codex"],
  },
  {
    id: "claude-code",
    displayName: "Claude Code",
    aliases: ["claude"],
    skillsDirectory: path.join(claudeHome, "skills"),
    markers: [claudeHome],
  },
  {
    id: "cursor",
    displayName: "Cursor",
    aliases: [],
    skillsDirectory: path.join(userHome, ".cursor", "skills"),
    markers: [path.join(userHome, ".cursor")],
  },
  {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    aliases: ["gemini"],
    skillsDirectory: path.join(userHome, ".gemini", "skills"),
    markers: [path.join(userHome, ".gemini")],
  },
  {
    id: "github-copilot",
    displayName: "GitHub Copilot",
    aliases: ["copilot"],
    skillsDirectory: path.join(userHome, ".copilot", "skills"),
    markers: [path.join(userHome, ".copilot")],
  },
  {
    id: "opencode",
    displayName: "OpenCode",
    aliases: [],
    skillsDirectory: path.join(configHome, "opencode", "skills"),
    markers: [path.join(configHome, "opencode")],
  },
  {
    id: "cline",
    displayName: "Cline",
    aliases: [],
    skillsDirectory: path.join(userHome, ".agents", "skills"),
    markers: [path.join(userHome, ".cline")],
  },
  {
    id: "continue",
    displayName: "Continue",
    aliases: [],
    skillsDirectory: path.join(userHome, ".continue", "skills"),
    markers: [path.join(userHome, ".continue")],
  },
  {
    id: "roo",
    displayName: "Roo Code",
    aliases: ["roo-code"],
    skillsDirectory: path.join(userHome, ".roo", "skills"),
    markers: [path.join(userHome, ".roo")],
  },
  {
    id: "windsurf",
    displayName: "Windsurf",
    aliases: [],
    skillsDirectory: path.join(userHome, ".codeium", "windsurf", "skills"),
    markers: [path.join(userHome, ".codeium", "windsurf")],
  },
  {
    id: "kimi-code-cli",
    displayName: "Kimi Code CLI",
    aliases: ["kimi"],
    skillsDirectory: path.join(userHome, ".agents", "skills"),
    markers: [path.join(userHome, ".kimi-code"), path.join(userHome, ".kimi")],
  },
  {
    id: "openclaw",
    displayName: "OpenClaw",
    aliases: [],
    skillsDirectory: openClawSkillsDirectory(),
    markers: [
      path.join(userHome, ".openclaw"),
      path.join(userHome, ".clawdbot"),
      path.join(userHome, ".moltbot"),
    ],
  },
  {
    id: "aider-desk",
    displayName: "AiderDesk",
    aliases: [],
    skillsDirectory: path.join(userHome, ".aider-desk", "skills"),
    markers: [path.join(userHome, ".aider-desk")],
  },
  {
    id: "amp",
    displayName: "Amp",
    aliases: [],
    skillsDirectory: path.join(configHome, "agents", "skills"),
    markers: [path.join(configHome, "amp")],
  },
  {
    id: "augment",
    displayName: "Augment",
    aliases: [],
    skillsDirectory: path.join(userHome, ".augment", "skills"),
    markers: [path.join(userHome, ".augment")],
  },
  {
    id: "droid",
    displayName: "Droid",
    aliases: ["factory"],
    skillsDirectory: path.join(userHome, ".factory", "skills"),
    markers: [path.join(userHome, ".factory")],
  },
  {
    id: "goose",
    displayName: "Goose",
    aliases: [],
    skillsDirectory: path.join(configHome, "goose", "skills"),
    markers: [path.join(configHome, "goose")],
  },
  {
    id: "kiro-cli",
    displayName: "Kiro CLI",
    aliases: ["kiro"],
    skillsDirectory: path.join(userHome, ".kiro", "skills"),
    markers: [path.join(userHome, ".kiro")],
  },
  {
    id: "openhands",
    displayName: "OpenHands",
    aliases: [],
    skillsDirectory: path.join(userHome, ".openhands", "skills"),
    markers: [path.join(userHome, ".openhands")],
  },
  {
    id: "qwen-code",
    displayName: "Qwen Code",
    aliases: ["qwen"],
    skillsDirectory: path.join(userHome, ".qwen", "skills"),
    markers: [path.join(userHome, ".qwen")],
  },
  {
    id: "warp",
    displayName: "Warp",
    aliases: [],
    skillsDirectory: path.join(userHome, ".agents", "skills"),
    markers: [path.join(userHome, ".warp")],
  },
  {
    id: "zed",
    displayName: "Zed",
    aliases: [],
    skillsDirectory: path.join(userHome, ".agents", "skills"),
    markers: [path.join(configHome, "zed"), "/Applications/Zed.app"],
  },
  {
    id: "universal",
    displayName: "Universal agents",
    aliases: ["agents"],
    skillsDirectory: path.join(userHome, ".agents", "skills"),
    markers: [path.join(userHome, ".agents")],
  },
];

const args = process.argv.slice(2);
const command = args[0] ?? "help";

function printHelp() {
  console.log(`OpenKartr ${packageJson.version}

Install verified skills for AI coding agents.

Usage:
  openkartr list
  openkartr harnesses
  openkartr info <skill>
  openkartr install <skill> [options]

Install options:
  --target <harness>  Install into one harness; use "all" for all detected
  --all               Install into every detected harness
  --dir <path>        Install into a custom skills directory
  --force             Replace existing copies at every selected destination
  --dry-run           Show destinations without writing files

Examples:
  npx openkartr install logo-designer
  npx openkartr harnesses
  npx openkartr install rca-analysis --all
  npx openkartr install rca-analysis --target claude-code
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
  if (value === "~") return userHome;
  if (value.startsWith(`~${path.sep}`)) {
    return path.join(userHome, value.slice(2));
  }
  return path.resolve(value);
}

function findHarness(value) {
  const normalized = String(value || "").toLowerCase();
  return harnesses.find(
    (harness) => harness.id === normalized || harness.aliases.includes(normalized),
  );
}

function parseInstallOptions(values) {
  const options = {
    slug: values[0],
    target: undefined,
    all: false,
    directory: undefined,
    force: false,
    dryRun: false,
  };

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--target") {
      options.target = values[++index];
    } else if (value === "--all") {
      options.all = true;
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
  if (values.includes("--target") && !options.target) {
    throw new Error("--target requires a harness name");
  }
  if (values.includes("--dir") && !options.directory) {
    throw new Error("--dir requires a path");
  }
  if ([Boolean(options.target), options.all, Boolean(options.directory)].filter(Boolean).length > 1) {
    throw new Error("use only one of --target, --all, or --dir");
  }
  if (options.target === "all") {
    options.target = undefined;
    options.all = true;
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

async function detectHarnesses() {
  const detected = [];
  for (const harness of harnesses) {
    if (harness.id === "universal") continue;
    if ((await Promise.all(harness.markers.map(exists))).some(Boolean)) {
      detected.push(harness);
    }
  }
  return detected;
}

function shortenHome(targetPath) {
  return targetPath === userHome
    ? "~"
    : targetPath.startsWith(`${userHome}${path.sep}`)
      ? `~${path.sep}${path.relative(userHome, targetPath)}`
      : targetPath;
}

async function printHarnesses() {
  const detectedIds = new Set((await detectHarnesses()).map((harness) => harness.id));
  console.log("Supported harnesses:");
  for (const harness of harnesses) {
    const marker = detectedIds.has(harness.id) ? "detected" : "available";
    console.log(
      `${harness.id}\t${harness.displayName}\t${marker}\t${shortenHome(harness.skillsDirectory)}`,
    );
  }
}

async function askNumber(rl, question, choices) {
  console.log(question);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice}`);
  });

  while (true) {
    const answer = (await rl.question("Enter choice [1]: ")).trim();
    const selected = answer === "" ? 1 : Number(answer);
    if (Number.isInteger(selected) && selected >= 1 && selected <= choices.length) {
      return selected - 1;
    }
    console.log(`Choose a number from 1 to ${choices.length}.`);
  }
}

async function promptForHarnesses(detectedHarnesses) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Detected harnesses:");
    if (detectedHarnesses.length === 0) {
      console.log("  None detected. You can still choose a supported harness.");
    } else {
      for (const harness of detectedHarnesses) {
        console.log(`  • ${harness.displayName} (${shortenHome(harness.skillsDirectory)})`);
      }
    }

    const scopeChoices = detectedHarnesses.length > 0
      ? ["All detected harnesses (global)", "One harness (global)"]
      : ["One harness (global)"];
    const scope = await askNumber(rl, "\nWhere should this skill be installed?", scopeChoices);

    if (detectedHarnesses.length > 0 && scope === 0) return detectedHarnesses;

    const detectedIds = new Set(detectedHarnesses.map((harness) => harness.id));
    const ordered = [
      ...detectedHarnesses,
      ...harnesses.filter((harness) => !detectedIds.has(harness.id)),
    ];
    const selected = await askNumber(
      rl,
      "\nChoose a harness:",
      ordered.map((harness) =>
        `${harness.displayName}${detectedIds.has(harness.id) ? " [detected]" : ""} — ${shortenHome(harness.skillsDirectory)}`,
      ),
    );
    return [ordered[selected]];
  } finally {
    rl.close();
  }
}

async function resolveInstallTargets(options) {
  if (options.directory) {
    return [{ id: "custom", displayName: "Custom directory", skillsDirectory: expandPath(options.directory) }];
  }

  if (options.target) {
    const harness = findHarness(options.target);
    if (!harness) {
      throw new Error(`unknown harness "${options.target}". Run "openkartr harnesses".`);
    }
    return [harness];
  }

  const detected = await detectHarnesses();
  if (options.all) {
    if (detected.length === 0) {
      throw new Error("no harnesses detected. Run \"openkartr harnesses\" or use --target.");
    }
    return detected;
  }

  const interactive =
    process.env.OPENKARTR_FORCE_INTERACTIVE === "1" ||
    (process.stdin.isTTY && process.stdout.isTTY);
  if (interactive) return promptForHarnesses(detected);

  return [findHarness("codex")];
}

function uniqueDestinations(harnessTargets, slug) {
  const byDestination = new Map();
  for (const harness of harnessTargets) {
    const destination = path.join(harness.skillsDirectory, slug);
    const existing = byDestination.get(destination);
    if (existing) existing.harnesses.push(harness.displayName);
    else {
      byDestination.set(destination, {
        destination,
        skillsDirectory: harness.skillsDirectory,
        harnesses: [harness.displayName],
      });
    }
  }
  return [...byDestination.values()];
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

  let targets;
  try {
    targets = uniqueDestinations(await resolveInstallTargets(options), skill.slug);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.dryRun) {
    console.log(`Would install ${skill.name} to:`);
    for (const target of targets) {
      console.log(`  ${target.harnesses.join(", ")}: ${target.destination}`);
    }
    return;
  }

  const existingTargets = [];
  for (const target of targets) {
    if (await exists(target.destination)) existingTargets.push(target.destination);
  }
  if (existingTargets.length > 0 && !options.force) {
    fail(
      `installation stopped because ${existingTargets.join(", ")} already exists. Re-run with --force to replace every selected copy.`,
    );
    return;
  }

  const source = path.join(packageRoot, "skills", skill.slug);
  for (const target of targets) {
    if (await exists(target.destination)) {
      await rm(target.destination, { recursive: true, force: true });
    }
    await mkdir(target.skillsDirectory, { recursive: true });
    await cp(source, target.destination, { recursive: true });
  }

  console.log(`Installed ${skill.name}`);
  for (const target of targets) {
    console.log(`  ${target.harnesses.join(", ")}: ${target.destination}`);
  }
  console.log("Restart any running harnesses to load the skill.");
}

if (command === "list") {
  for (const skill of catalog) {
    console.log(`${skill.slug}\t${skill.description}`);
  }
} else if (command === "harnesses") {
  await printHarnesses();
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
