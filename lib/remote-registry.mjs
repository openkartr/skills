import { createPublicKey, verify } from "node:crypto";

const defaultApiBase = "https://openkartr-backend-production.up.railway.app";
const maximumDescriptorBytes = 64 * 1024;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const commitPattern = /^[0-9a-f]{40}$/;
const hashPattern = /^[0-9a-f]{64}$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const spkiEd25519Prefix = Buffer.from("302a300506032b6570032100", "hex");

export class RemoteRegistryError extends Error {
  constructor(message, { kind = "invalid", status = undefined } = {}) {
    super(message);
    this.name = "RemoteRegistryError";
    this.kind = kind;
    this.status = status;
  }
}

function assert(condition, message) {
  if (!condition) throw new RemoteRegistryError(message);
}

function decodeBase64Url(value, label) {
  assert(typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value), `${label} is not base64url.`);
  return Buffer.from(value, "base64url");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalPayload(payload) {
  return Buffer.from(JSON.stringify(canonicalize(payload)), "utf8");
}

function configuredTrustedKeys() {
  const configured = process.env.OPENKARTR_TRUSTED_KEYS;
  if (!configured) return {};
  try {
    const parsed = JSON.parse(configured);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new RemoteRegistryError("OPENKARTR_TRUSTED_KEYS must be a JSON object.");
  }
}

export const trustedRegistryKeys = Object.freeze({
  "openkartr-v1": "Pk_jBxyxtxASwohsRXm4oxL1mFZyuEatmI5VtInb3pg",
  // Add a replacement key before rotating Railway, then retain the old public
  // key until every descriptor it signed has expired.
  ...configuredTrustedKeys(),
});

function validatePayload(payload, requestedSlug, now) {
  assert(payload && typeof payload === "object" && !Array.isArray(payload), "descriptor payload is missing.");
  assert(payload.schema_version === 1, "unsupported descriptor schema version.");
  assert(slugPattern.test(payload.slug) && payload.slug === requestedSlug, "descriptor slug does not match the request.");
  assert(uuidPattern.test(payload.version_id), "descriptor version ID is invalid.");

  const generatedAt = Date.parse(payload.generated_at);
  const expiresAt = Date.parse(payload.expires_at);
  assert(Number.isFinite(generatedAt) && Number.isFinite(expiresAt), "descriptor timestamps are invalid.");
  assert(expiresAt > now.getTime(), "install descriptor has expired.");
  assert(generatedAt <= now.getTime() + 60_000, "install descriptor was generated in the future.");
  assert(expiresAt - generatedAt <= 10 * 60_000, "install descriptor validity window is too long.");

  const source = payload.source;
  assert(source?.provider === "github", "only GitHub install sources are supported.");
  assert(repositoryPattern.test(source.repository), "descriptor repository is invalid.");
  assert(typeof source.path === "string" && source.path.length > 0, "descriptor source path is missing.");
  assert(!source.path.startsWith("/") && !source.path.includes("\\") && !source.path.split("/").includes(".."), "descriptor source path is unsafe.");
  assert(commitPattern.test(source.commit), "descriptor source is not pinned to a full commit.");
  const archive = new URL(source.archive_url);
  assert(archive.protocol === "https:" && archive.hostname === "api.github.com", "descriptor archive host is not trusted.");

  const artifact = payload.artifact;
  assert(hashPattern.test(artifact?.content_hash), "descriptor content hash is invalid.");
  assert(["community", "verified", "native"].includes(artifact.trust_tier), "descriptor trust tier is invalid.");
  assert(typeof artifact.scanner_version === "string" && artifact.scanner_version.length > 0, "descriptor scanner version is missing.");
  assert(typeof artifact.policy_version === "string" && artifact.policy_version.length > 0, "descriptor policy version is missing.");
  assert(typeof artifact.license_spdx === "string" && artifact.license_spdx.length > 0, "descriptor license is missing.");
}

export function verifyInstallDescriptor(
  descriptor,
  requestedSlug,
  { trustedKeys = trustedRegistryKeys, now = new Date() } = {},
) {
  assert(descriptor && typeof descriptor === "object", "install descriptor is missing.");
  validatePayload(descriptor.payload, requestedSlug, now);
  const signature = descriptor.signature;
  assert(signature?.algorithm === "Ed25519", "unsupported descriptor signature algorithm.");
  assert(typeof signature.key_id === "string" && signature.key_id.length > 0, "descriptor key ID is missing.");
  const encodedPublicKey = trustedKeys[signature.key_id];
  assert(encodedPublicKey, `descriptor key ${signature.key_id} is not trusted by this OpenKartr release.`);
  const rawPublicKey = decodeBase64Url(encodedPublicKey, "registry public key");
  assert(rawPublicKey.length === 32, "registry public key must contain 32 bytes.");
  const rawSignature = decodeBase64Url(signature.value, "descriptor signature");
  assert(rawSignature.length === 64, "descriptor signature must contain 64 bytes.");
  const publicKey = createPublicKey({
    key: Buffer.concat([spkiEd25519Prefix, rawPublicKey]),
    format: "der",
    type: "spki",
  });
  assert(
    verify(null, canonicalPayload(descriptor.payload), publicKey, rawSignature),
    "install descriptor signature is invalid.",
  );
  return descriptor.payload;
}

export async function resolveRemoteSkill(
  slug,
  {
    fetchImpl = fetch,
    apiBase = process.env.OPENKARTR_API_URL || defaultApiBase,
    trustedKeys = trustedRegistryKeys,
    now = new Date(),
  } = {},
) {
  assert(slugPattern.test(slug), "skill slug is invalid.");
  let response;
  try {
    response = await fetchImpl(`${apiBase.replace(/\/$/, "")}/v1/skills/${encodeURIComponent(slug)}/install`, {
      headers: { Accept: "application/json", "User-Agent": "openkartr-cli" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof RemoteRegistryError) throw error;
    throw new RemoteRegistryError(`registry request failed: ${error.message}`, { kind: "unavailable" });
  }
  if (!response.ok) {
    const kind = [404, 409, 503].includes(response.status) ? "unavailable" : "invalid";
    throw new RemoteRegistryError(`registry returned HTTP ${response.status}.`, { kind, status: response.status });
  }
  const declaredLength = Number(response.headers.get("content-length") || 0);
  assert(!declaredLength || declaredLength <= maximumDescriptorBytes, "install descriptor is too large.");
  const source = await response.text();
  assert(Buffer.byteLength(source) <= maximumDescriptorBytes, "install descriptor is too large.");
  let descriptor;
  try {
    descriptor = JSON.parse(source);
  } catch {
    throw new RemoteRegistryError("registry returned invalid JSON.");
  }
  const payload = verifyInstallDescriptor(descriptor, slug, { trustedKeys, now });
  return {
    slug: payload.slug,
    name: payload.slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    description: "Signed OpenKartr registry skill.",
    trustTier: payload.artifact.trust_tier,
    license: payload.artifact.license_spdx,
    source: {
      provider: "github",
      repository: payload.source.repository,
      path: payload.source.path,
      commit: payload.source.commit,
    },
    descriptor: payload,
  };
}
