import { scanNormalizedBundle, maximumFileBytes, maximumFiles, maximumSkillBytes } from "../lib/security-policy.mjs";

const commitPattern = /^[0-9a-f]{40}$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function assert(condition, message) {
  if (!condition) throw new Error(`GitHub adapter: ${message}`);
}

function encodedPath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function requestHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "openkartr-skill-adapter",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJson(url, { fetchImpl, token }) {
  const response = await fetchImpl(url, { headers: requestHeaders(token), redirect: "error" });
  assert(response.ok, `${response.status} response from ${url}`);
  if (response.url) {
    assert(new URL(response.url).hostname === new URL(url).hostname, `unexpected redirect for ${url}`);
  }
  return response.json();
}

export function parseGitHubRepository(value) {
  if (repositoryPattern.test(value)) return value;
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "github.com", "repository must use https://github.com.");
  const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
  assert(parts.length === 2 && parts.every(Boolean), "repository URL must point to its root.");
  const repository = `${parts[0]}/${parts[1]}`;
  assert(repositoryPattern.test(repository), "repository owner or name is invalid.");
  return repository;
}

export async function resolveLatestCommit(
  { repository, path },
  { fetchImpl = fetch, token = process.env.GITHUB_TOKEN, apiBase = "https://api.github.com" } = {},
) {
  repository = parseGitHubRepository(repository);
  const url = new URL(`${apiBase}/repos/${repository}/commits`);
  url.searchParams.set("path", path);
  url.searchParams.set("per_page", "1");
  const commits = await fetchJson(url, { fetchImpl, token });
  assert(Array.isArray(commits) && commitPattern.test(commits[0]?.sha), `no commit found for ${repository}/${path}.`);
  return commits[0].sha;
}

export async function fetchRepositoryLicense(
  repository,
  { fetchImpl = fetch, token = process.env.GITHUB_TOKEN, apiBase = "https://api.github.com" } = {},
) {
  repository = parseGitHubRepository(repository);
  try {
    const license = await fetchJson(`${apiBase}/repos/${repository}/license`, { fetchImpl, token });
    return license.license?.spdx_id && license.license.spdx_id !== "NOASSERTION"
      ? license.license.spdx_id
      : "NOASSERTION";
  } catch {
    return "NOASSERTION";
  }
}

async function fetchRawFile(url, expectedSize, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "openkartr-skill-adapter" },
    redirect: "error",
  });
  assert(response.ok, `${response.status} response while downloading ${url}`);
  if (response.url) {
    assert(new URL(response.url).hostname === "raw.githubusercontent.com", `unexpected file host for ${url}`);
  }
  const contents = Buffer.from(await response.arrayBuffer());
  assert(contents.length === expectedSize, `size changed while downloading ${url}`);
  return contents;
}

export async function fetchGitHubSkillBundle(
  source,
  {
    fetchImpl = fetch,
    token = process.env.GITHUB_TOKEN,
    apiBase = "https://api.github.com",
    rawBase = "https://raw.githubusercontent.com",
    trustTier = "community",
  } = {},
) {
  const repository = parseGitHubRepository(source.repository);
  assert(commitPattern.test(source.commit), "source must pin a full commit SHA.");
  assert(typeof source.path === "string" && source.path.length > 0, "source path is required.");
  const rootPath = source.path.replace(/^\/+|\/+$/g, "");
  assert(rootPath === source.path && !rootPath.includes("..") && !rootPath.includes("\\"), "source path must be normalized.");

  const tree = await fetchJson(
    `${apiBase}/repos/${repository}/git/trees/${source.commit}?recursive=1`,
    { fetchImpl, token },
  );
  assert(tree.truncated !== true, "repository tree was truncated; use a smaller source repository.");
  assert(Array.isArray(tree.tree), "repository tree is missing.");
  const prefix = `${rootPath}/`;
  const blobs = tree.tree
    .filter((entry) => entry.path?.startsWith(prefix))
    .map((entry) => ({ ...entry, relative: entry.path.slice(prefix.length) }))
    .filter((entry) => entry.type !== "tree")
    .filter((entry) => entry.relative.length > 0);

  assert(blobs.length > 0, `no files found at ${repository}/${rootPath}.`);
  assert(blobs.length <= maximumFiles, `source subtree exceeds ${maximumFiles} entries.`);
  for (const entry of blobs) {
    assert(entry.type === "blob" && ["100644", "100755"].includes(entry.mode), `${entry.relative}: symlinks and submodules are not accepted.`);
    if (trustTier === "community") {
      assert(entry.mode === "100644", `${entry.relative}: community V1 blocks executable Git modes.`);
    }
    assert(Number.isInteger(entry.size) && entry.size <= maximumFileBytes, `${entry.relative}: invalid or oversized file.`);
  }
  const declaredBytes = blobs.reduce((total, entry) => total + entry.size, 0);
  assert(declaredBytes <= maximumSkillBytes, `source subtree exceeds ${maximumSkillBytes} bytes.`);

  const [owner, repo] = repository.split("/");
  const files = [];
  for (let index = 0; index < blobs.length; index += 8) {
    const batch = blobs.slice(index, index + 8);
    const contents = await Promise.all(
      batch.map((entry) =>
        fetchRawFile(
          `${rawBase}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${source.commit}/${encodedPath(entry.path)}`,
          entry.size,
          fetchImpl,
        ),
      ),
    );
    batch.forEach((entry, batchIndex) => files.push({ relative: entry.relative, contents: contents[batchIndex] }));
  }
  files.sort((left, right) => left.relative.localeCompare(right.relative));
  const scan = scanNormalizedBundle(files, { trustTier });
  return { files, sourceCommit: source.commit, contentHash: scan.contentHash, scan };
}
