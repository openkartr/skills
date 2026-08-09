import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = path.join(root, "skills");
const notices = await readFile(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
const writeHashes = process.argv.includes("--write-hashes");
const releaseMode = process.argv.includes("--release");
const maximumFileBytes = 512 * 1024;
const maximumSkillBytes = 2 * 1024 * 1024;
const executableExtensions = new Set([".sh", ".js", ".mjs", ".cjs", ".ts", ".py", ".ps1"]);
const textExtensions = new Set([".md", ".yaml", ".yml", ".json", ".txt", ...executableExtensions]);
const allowedExtensions = new Set([...textExtensions, ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const forbiddenContent = [
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

function safeRelative(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be non-empty.`);
  assert(!path.isAbsolute(value), `${label} must be relative.`);
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  assert(normalized !== ".." && !normalized.startsWith("../"), `${label} escapes its skill directory.`);
  return normalized;
}

async function walk(directory, prefix = "") {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    const stats = await lstat(absolute);
    assert(!stats.isSymbolicLink(), `${relative}: symbolic links are not allowed.`);
    assert(!entry.name.startsWith("."), `${relative}: hidden files are not allowed.`);
    if (entry.isDirectory()) output.push(...(await walk(absolute, relative)));
    else {
      assert(entry.isFile(), `${relative}: unsupported filesystem entry.`);
      output.push({ relative, absolute, stats });
    }
  }
  return output;
}

function contentHash(files) {
  const hash = createHash("sha256");
  for (const file of files.filter((item) => item.relative !== "OPENKARTR.json")) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(file.contents);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

const skillDirectories = (await readdir(skillsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const slug of skillDirectories) {
  const skillRoot = path.join(skillsRoot, slug);
  const manifestPath = path.join(skillRoot, "OPENKARTR.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert(manifest.schemaVersion === 1, `${slug}: unsupported manifest schema.`);
  assert(manifest.slug === slug, `${slug}: manifest slug mismatch.`);
  assert(["openkartr-native", "verified-vendored"].includes(manifest.distribution), `${slug}: invalid distribution.`);
  assert(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(manifest.origin.upstreamRepository), `${slug}: upstream must be a direct GitHub repository.`);
  safeRelative(manifest.origin.upstreamPath, `${slug}.origin.upstreamPath`);
  assert(/^[0-9a-f]{40}$/.test(manifest.origin.reviewedCommit), `${slug}: reviewed commit must be a full SHA.`);
  assert(["review-pr", "openkartr-maintained"].includes(manifest.origin.syncPolicy), `${slug}: invalid sync policy.`);
  assert(manifest.license.redistributionReviewed === true, `${slug}: redistribution must be reviewed.`);
  assert(notices.includes(manifest.license.attributionMarker), `${slug}: attribution marker is absent from THIRD_PARTY_NOTICES.md.`);
  assert(["verified", "review-required", "rejected", "revoked"].includes(manifest.review.status), `${slug}: invalid review status.`);
  if (releaseMode) assert(manifest.review.status === "verified", `${slug}: release blocked while status is ${manifest.review.status}.`);
  assert(["low", "medium", "high"].includes(manifest.review.riskTier), `${slug}: invalid risk tier.`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(manifest.review.reviewedAt), `${slug}: invalid review date.`);
  assert(Array.isArray(manifest.review.reviewers) && manifest.review.reviewers.length > 0, `${slug}: at least one reviewer is required.`);

  const files = await walk(skillRoot);
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.stats.size;
    assert(file.stats.size <= maximumFileBytes, `${slug}/${file.relative}: file exceeds ${maximumFileBytes} bytes.`);
    const extension = path.extname(file.relative).toLowerCase();
    assert(allowedExtensions.has(extension), `${slug}/${file.relative}: file type ${extension || "<none>"} is not allowed.`);
    file.contents = await readFile(file.absolute);

    if (executableExtensions.has(extension)) {
      assert(manifest.permissions.executables.includes(file.relative), `${slug}/${file.relative}: executable is not declared.`);
    }
    if (textExtensions.has(extension)) {
      const source = file.contents.toString("utf8");
      for (const rule of forbiddenContent) {
        assert(!rule.pattern.test(source), `${slug}/${file.relative}: blocked ${rule.label}.`);
      }
      if (/\b(?:curl|wget)\b|Invoke-WebRequest|https?:\/\//i.test(source) && executableExtensions.has(extension)) {
        assert(manifest.permissions.network.length > 0, `${slug}/${file.relative}: network-capable script requires declared domains.`);
      }
    }
  }
  assert(totalBytes <= maximumSkillBytes, `${slug}: skill exceeds ${maximumSkillBytes} bytes.`);

  for (const executable of manifest.permissions.executables) {
    const normalized = safeRelative(executable, `${slug}.permissions.executables`);
    assert(files.some((file) => file.relative === normalized), `${slug}: declared executable ${normalized} is missing.`);
  }

  const actualHash = contentHash(files);
  if (writeHashes) {
    manifest.review.contentHash = actualHash;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    assert(manifest.review.contentHash === actualHash, `${slug}: reviewed content hash changed; run review before updating it.`);
  }
  console.log(`${slug}\t${manifest.review.status}\t${manifest.review.riskTier}\t${actualHash}`);
}

console.log(`Security-reviewed ${skillDirectories.length} packaged skills${releaseMode ? " for release" : ""}.`);
