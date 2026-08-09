#!/usr/bin/env node

import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { fetchGitHubSkillBundle } from "../adapters/github.mjs";
import { loadRegistry } from "../lib/registry.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);
const registryPath = process.env.OPENKARTR_REGISTRY_PATH || path.join(packageRoot, "registry", "skills.json");
const installMarker = ".openkartr.json";

function quotedYamlValue(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*["'](.+)["']\\s*$`, "m"));
  return match?.[1];
}

async function loadCatalog() {
  const registry = await loadRegistry(registryPath);
  const loaded = await Promise.all(
    registry.skills.map(async (entry) => {
      if (entry.source.provider !== "bundled") return { ...entry, verification: null };
      const agentMetadata = await readFile(
        path.join(packageRoot, entry.source.path, "agents", "openai.yaml"),
        "utf8",
      );
      const verification = JSON.parse(
        await readFile(path.join(packageRoot, entry.source.path, "OPENKARTR.json"), "utf8"),
      );
      return {
        ...entry,
        name: quotedYamlValue(agentMetadata, "display_name") ?? entry.name,
        description:
          quotedYamlValue(agentMetadata, "short_description") ??
          entry.description,
        verification,
      };
    }),
  );
  return loaded.sort((left, right) => left.name.localeCompare(right.name));
}

const catalog = await loadCatalog();

function canonicalCommand(commandAndArgs) {
  return `npx --prefer-online openkartr@latest ${commandAndArgs}`;
}

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
  --allow-community   Allow a pinned, automated-scan-only community source
  --dry-run           Show destinations without writing files

Examples:
  ${canonicalCommand("install logo-designer")}
  ${canonicalCommand("harnesses")}
  ${canonicalCommand("install rca-analysis --all")}
  ${canonicalCommand("install rca-analysis --target claude-code")}
  ${canonicalCommand("install rca-analysis --dir ./skills")}
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
    allowCommunity: false,
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
    } else if (value === "--allow-community") {
      options.allowCommunity = true;
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

async function isOpenKartrManaged(destination, slug) {
  try {
    const marker = JSON.parse(
      await readFile(path.join(destination, installMarker), "utf8"),
    );
    return marker.package === packageJson.name && marker.skill === slug;
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

async function approveCommunityInstall(skill, options) {
  if (skill.trustTier !== "community" || options.allowCommunity) return true;
  const interactive =
    process.env.OPENKARTR_FORCE_INTERACTIVE === "1" ||
    (process.stdin.isTTY && process.stdout.isTTY);
  if (!interactive) {
    throw new Error(
      `skill "${skill.slug}" is community-sourced and has no human OpenKartr verification. Review it with "openkartr info ${skill.slug}", then re-run with --allow-community if you accept that risk.`,
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\nCommunity source — automated checks only, not human verified.");
    console.log(`Source: https://github.com/${skill.source.repository}/tree/${skill.source.commit}/${skill.source.path}`);
    console.log(`Pinned commit: ${skill.source.commit}`);
    const answer = (await rl.question("Continue with quarantined download and installation? [y/N] ")).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function prepareSkill(skill) {
  if (skill.source.provider === "bundled") {
    return {
      kind: "directory",
      directory: path.join(packageRoot, skill.source.path),
      receipt: {
        trustTier: "verified",
        status: skill.verification.review.status,
        riskTier: skill.verification.review.riskTier,
        reviewedAt: skill.verification.review.reviewedAt,
        sourceCommit: skill.verification.origin.reviewedCommit,
        contentHash: skill.verification.review.contentHash,
      },
    };
  }
  if (skill.source.provider === "github") {
    console.log(`Downloading ${skill.name} from pinned commit ${skill.source.commit.slice(0, 12)}…`);
    const bundle = await fetchGitHubSkillBundle(skill.source, { trustTier: "community" });
    return {
      kind: "bundle",
      files: bundle.files,
      receipt: {
        trustTier: "community",
        status: "automated-scan-only",
        riskTier: "unverified",
        reviewedAt: null,
        sourceCommit: bundle.sourceCommit,
        contentHash: bundle.contentHash,
      },
    };
  }
  throw new Error(`unsupported source provider ${skill.source.provider}`);
}

async function transactionallyInstall(skill, prepared, targets) {
  const marker = {
    package: packageJson.name,
    packageVersion: packageJson.version,
    skill: skill.slug,
    repository: "https://github.com/openkartr/skills",
    source: skill.source,
    verification: prepared.receipt,
  };
  const staged = [];

  try {
    for (const target of targets) {
      await mkdir(target.skillsDirectory, { recursive: true });
      const stagingParent = await mkdtemp(path.join(target.skillsDirectory, ".openkartr-stage-"));
      const stagedTarget = {
        ...target,
        stagingParent,
        stagingDirectory: path.join(stagingParent, skill.slug),
        backup: null,
        swapped: false,
      };
      staged.push(stagedTarget);

      if (prepared.kind === "directory") {
        await cp(prepared.directory, stagedTarget.stagingDirectory, { recursive: true });
      } else {
        await mkdir(stagedTarget.stagingDirectory, { recursive: true });
        for (const file of prepared.files) {
          const destination = path.join(stagedTarget.stagingDirectory, ...file.relative.split("/"));
          await mkdir(path.dirname(destination), { recursive: true });
          await writeFile(destination, file.contents, { flag: "wx" });
        }
      }
      await writeFile(
        path.join(stagedTarget.stagingDirectory, installMarker),
        `${JSON.stringify(marker, null, 2)}\n`,
        { flag: "wx" },
      );
    }

    for (let index = 0; index < staged.length; index += 1) {
      const target = staged[index];
      if (await exists(target.destination)) {
        target.backup = path.join(
          target.skillsDirectory,
          `.${skill.slug}.openkartr-backup-${process.pid}-${index}`,
        );
        await rename(target.destination, target.backup);
      }
      try {
        await rename(target.stagingDirectory, target.destination);
        target.swapped = true;
      } catch (error) {
        if (target.backup && (await exists(target.backup))) {
          await rename(target.backup, target.destination);
          target.backup = null;
        }
        throw error;
      }
    }
  } catch (error) {
    for (const target of [...staged].reverse()) {
      if (target.swapped && (await exists(target.destination))) {
        await rm(target.destination, { recursive: true, force: true });
      }
      if (target.backup && (await exists(target.backup))) {
        await rename(target.backup, target.destination);
      }
      if (await exists(target.stagingParent)) {
        await rm(target.stagingParent, { recursive: true, force: true });
      }
    }
    throw error;
  }

  for (const target of staged) {
    try {
      if (target.backup && (await exists(target.backup))) {
        await rm(target.backup, { recursive: true, force: true });
      }
      if (await exists(target.stagingParent)) {
        await rm(target.stagingParent, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`OpenKartr: installed successfully but cleanup needs attention: ${error.message}`);
    }
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

  let targets;
  try {
    targets = uniqueDestinations(await resolveInstallTargets(options), skill.slug);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.dryRun) {
    console.log(`Would install ${skill.name} (${skill.trustTier}) to:`);
    for (const target of targets) {
      console.log(`  ${target.harnesses.join(", ")}: ${target.destination}`);
    }
    return;
  }

  try {
    if (!(await approveCommunityInstall(skill, options))) {
      console.log("Installation cancelled.");
      return;
    }
  } catch (error) {
    fail(error.message);
    return;
  }

  const unmanagedTargets = [];
  for (const target of targets) {
    if (!(await exists(target.destination))) continue;
    target.managed = await isOpenKartrManaged(target.destination, skill.slug);
    if (!target.managed && !options.force) unmanagedTargets.push(target.destination);
  }
  if (unmanagedTargets.length > 0) {
    fail(
      `installation stopped because ${unmanagedTargets.join(", ")} already exists and is not managed by OpenKartr. Re-run with --force only if you intend to replace it.`,
    );
    return;
  }

  try {
    const prepared = await prepareSkill(skill);
    await transactionallyInstall(skill, prepared, targets);
  } catch (error) {
    fail(`installation failed before any unsafe partial update: ${error.message}`);
    return;
  }

  const updated = targets.some((target) => target.managed);
  console.log(`${updated ? "Updated" : "Installed"} ${skill.name} from ${packageJson.name}@${packageJson.version}`);
  for (const target of targets) {
    console.log(`  ${target.harnesses.join(", ")}: ${target.destination}`);
  }
  console.log("Restart any running harnesses to load the skill.");
}

if (command === "list") {
  for (const skill of catalog) {
    console.log(`${skill.slug}\t${skill.trustTier}\t${skill.description}`);
  }
} else if (command === "harnesses") {
  await printHarnesses();
} else if (command === "info") {
  const skill = findSkill(args[1]);
  if (!skill) fail(`skill "${args[1] ?? ""}" was not found.`);
  else {
    console.log(`${skill.name} (${skill.slug})`);
    console.log(skill.description);
    console.log(`Trust tier: ${skill.trustTier}`);
    if (skill.trustTier === "verified") {
      console.log(
        `Verification: ${skill.verification.review.status} snapshot · ${skill.verification.review.riskTier} risk · reviewed ${skill.verification.review.reviewedAt}`,
      );
      console.log(`Content: ${skill.verification.review.contentHash}`);
    } else {
      console.log("Verification: automated install-time scan only; no human OpenKartr review");
      console.log(`Source: https://github.com/${skill.source.repository}/tree/${skill.source.commit}/${skill.source.path}`);
      console.log(`Pinned commit: ${skill.source.commit}`);
    }
    console.log(`Install: ${canonicalCommand(`install ${skill.slug}`)}`);
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
