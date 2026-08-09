import { createHash } from "node:crypto";
import path from "node:path";

export const maximumFileBytes = 512 * 1024;
export const maximumSkillBytes = 2 * 1024 * 1024;
export const maximumFiles = 100;
export const executableExtensions = new Set([".sh", ".js", ".mjs", ".cjs", ".ts", ".py", ".ps1"]);
export const textExtensions = new Set([".md", ".yaml", ".yml", ".json", ".txt", ...executableExtensions]);
export const allowedExtensions = new Set([...textExtensions, ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export const forbiddenContent = [
  { label: "private key material", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "GitHub access token", pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: "npm access token", pattern: /\bnpm_[A-Za-z0-9]{20,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "piped remote shell execution", pattern: /(?:curl|wget)[^\n|]*\|\s*(?:ba)?sh\b/i },
  { label: "destructive broad deletion", pattern: /\brm\s+-rf\s+(?:\/|~|\$HOME)(?:\s|$)/i },
  { label: "credential-directory access", pattern: /(?:^|[\s"'`])(?:~\/|\$HOME\/)?\.(?:ssh|aws|gnupg)(?:\/|[\s"'`]|$)/i },
  { label: "encoded shell execution", pattern: /base64\s+(?:-d|--decode)[^\n|]*\|\s*(?:ba)?sh\b/i },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function normalizedBundleHash(files) {
  const hash = createHash("sha256");
  for (const file of [...files].sort((left, right) => left.relative.localeCompare(right.relative))) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(file.contents);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function scanNormalizedBundle(files, { trustTier = "community" } = {}) {
  assert(Array.isArray(files) && files.length > 0, "Skill bundle is empty.");
  assert(files.length <= maximumFiles, `Skill bundle exceeds ${maximumFiles} files.`);
  let totalBytes = 0;
  const seen = new Set();
  const executables = [];

  for (const file of files) {
    assert(typeof file.relative === "string" && file.relative.length > 0, "Skill bundle contains an invalid path.");
    assert(!file.relative.includes("\\") && !path.posix.isAbsolute(file.relative), `${file.relative}: unsafe path.`);
    const normalized = path.posix.normalize(file.relative);
    assert(normalized === file.relative && normalized !== ".." && !normalized.startsWith("../"), `${file.relative}: path escapes the skill.`);
    assert(!normalized.split("/").some((part) => part.startsWith(".")), `${file.relative}: hidden paths are not allowed.`);
    assert(!seen.has(normalized), `${file.relative}: duplicate path.`);
    seen.add(normalized);
    assert(Buffer.isBuffer(file.contents), `${file.relative}: contents must be bytes.`);
    assert(file.contents.length <= maximumFileBytes, `${file.relative}: file exceeds ${maximumFileBytes} bytes.`);
    totalBytes += file.contents.length;
    const extension = path.posix.extname(normalized).toLowerCase();
    assert(allowedExtensions.has(extension), `${file.relative}: unsupported file type ${extension || "<none>"}.`);
    if (executableExtensions.has(extension)) executables.push(normalized);
    if (textExtensions.has(extension)) {
      const source = file.contents.toString("utf8");
      for (const rule of forbiddenContent) {
        assert(!rule.pattern.test(source), `${file.relative}: blocked ${rule.label}.`);
      }
    }
  }
  assert(totalBytes <= maximumSkillBytes, `Skill bundle exceeds ${maximumSkillBytes} bytes.`);
  const skillFile = files.find((file) => file.relative === "SKILL.md");
  assert(skillFile, "Skill bundle must contain SKILL.md at its root.");
  const frontmatter = skillFile.contents.toString("utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(frontmatter && /^name:\s*[a-z0-9]+(?:-[a-z0-9]+)*\s*$/m.test(frontmatter[1]), "SKILL.md needs a lowercase kebab-case name in YAML frontmatter.");
  if (trustTier === "community") {
    assert(executables.length === 0, `Community V1 blocks executable files: ${executables.join(", ")}.`);
  }
  return {
    fileCount: files.length,
    totalBytes,
    executables,
    contentHash: normalizedBundleHash(files),
  };
}
