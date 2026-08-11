import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  canonicalPayload,
  RemoteRegistryError,
  resolveRemoteSkill,
  verifyInstallDescriptor,
} from "../lib/remote-registry.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const keyId = "test-v1";
const encodedPublicKey = publicKey.export({ format: "jwk" }).x;
const trustedKeys = { [keyId]: encodedPublicKey };
const now = new Date("2026-08-11T12:00:00.000Z");

function signedDescriptor(overrides = {}) {
  const payload = {
    schema_version: 1,
    slug: "example-skill",
    version_id: "d9428888-122b-4e23-8e6c-2e4388c09a18",
    generated_at: "2026-08-11T12:00:00Z",
    expires_at: "2026-08-11T12:05:00Z",
    source: {
      provider: "github",
      repository: "example/skills",
      path: "skills/example-skill",
      commit: "0123456789abcdef0123456789abcdef01234567",
      archive_url: "https://api.github.com/repos/example/skills/tarball/0123456789abcdef0123456789abcdef01234567",
    },
    artifact: {
      content_hash: "a".repeat(64),
      scanner_version: "0.2.0",
      policy_version: "2026-08-11",
      trust_tier: "community",
      license_spdx: "MIT",
    },
    ...overrides,
  };
  return {
    payload,
    signature: {
      algorithm: "Ed25519",
      key_id: keyId,
      value: sign(null, canonicalPayload(payload), privateKey).toString("base64url"),
    },
  };
}

test("verifies a valid signed install descriptor", () => {
  const descriptor = signedDescriptor();
  const payload = verifyInstallDescriptor(descriptor, "example-skill", { trustedKeys, now });
  assert.equal(payload.source.commit, "0123456789abcdef0123456789abcdef01234567");
});

test("verifies the canonical descriptor emitted by the Python backend", () => {
  const descriptor = signedDescriptor();
  descriptor.signature.value = "GPd9gQxZ9piYb4PrAzAUbM0WcHPkK5cu1eqxPAc-xugbv2xP2Iel39T-fqWKMuC0_gEyuZRebnelJu4Q4aFhBQ";
  descriptor.signature.key_id = "python-fixture-v1";
  const payload = verifyInstallDescriptor(descriptor, "example-skill", {
    trustedKeys: {
      "python-fixture-v1": "A6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg",
    },
    now,
  });
  assert.equal(payload.version_id, "d9428888-122b-4e23-8e6c-2e4388c09a18");
});

test("rejects a descriptor modified after signing", () => {
  const descriptor = signedDescriptor();
  descriptor.payload.source.path = "skills/attacker";
  assert.throws(
    () => verifyInstallDescriptor(descriptor, "example-skill", { trustedKeys, now }),
    /signature is invalid/,
  );
});

test("rejects an expired descriptor", () => {
  const descriptor = signedDescriptor({
    generated_at: "2026-08-11T11:50:00Z",
    expires_at: "2026-08-11T11:55:00Z",
  });
  assert.throws(
    () => verifyInstallDescriptor(descriptor, "example-skill", { trustedKeys, now }),
    /expired/,
  );
});

test("resolves an installable remote skill only after signature verification", async () => {
  const descriptor = signedDescriptor();
  const skill = await resolveRemoteSkill("example-skill", {
    apiBase: "https://registry.example",
    trustedKeys,
    now,
    fetchImpl: async () => new Response(JSON.stringify(descriptor), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  });
  assert.equal(skill.slug, "example-skill");
  assert.equal(skill.source.commit, descriptor.payload.source.commit);
  assert.equal(skill.descriptor.artifact.content_hash, "a".repeat(64));
});

test("classifies a missing remote skill as unavailable", async () => {
  await assert.rejects(
    resolveRemoteSkill("missing-skill", {
      apiBase: "https://registry.example",
      trustedKeys,
      now,
      fetchImpl: async () => new Response("not found", { status: 404 }),
    }),
    (error) => error instanceof RemoteRegistryError && error.kind === "unavailable",
  );
});
