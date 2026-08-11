import assert from "node:assert/strict";
import test from "node:test";

import { fetchGitHubSkillBundle } from "../adapters/github.mjs";
import { scanNormalizedBundle } from "../lib/security-policy.mjs";
import { validateRegistry } from "../lib/registry.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";

function fakeGitHubFetch(files) {
  return async (input) => {
    const url = new URL(input);
    if (url.hostname === "api.github.test") {
      return new Response(
        JSON.stringify({
          truncated: false,
          tree: Object.entries(files).map(([relative, contents]) => ({
            path: `skills/example/${relative}`,
            mode: "100644",
            type: "blob",
            size: Buffer.byteLength(contents),
          })),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.hostname === "raw.githubusercontent.com") {
      const marker = `/${commit}/skills/example/`;
      const relative = decodeURIComponent(url.pathname.slice(url.pathname.indexOf(marker) + marker.length));
      return new Response(files[relative], { status: files[relative] === undefined ? 404 : 200 });
    }
    return new Response("not found", { status: 404 });
  };
}

test("GitHub adapter returns a scanned immutable bundle", async () => {
  const files = {
    "SKILL.md": "---\nname: example\ndescription: Safe example skill\n---\n\nFollow the user's request.\n",
    "references/guide.md": "# Guide\n\nUse supplied project files only.\n",
  };
  const bundle = await fetchGitHubSkillBundle(
    {
      repository: "example/skills",
      path: "skills/example",
      commit,
    },
    {
      fetchImpl: fakeGitHubFetch(files),
      apiBase: "https://api.github.test",
      trustTier: "community",
    },
  );
  assert.equal(bundle.sourceCommit, commit);
  assert.equal(bundle.files.length, 2);
  assert.match(bundle.contentHash, /^sha256:[0-9a-f]{64}$/);
});

test("community scanner blocks executable files", () => {
  assert.throws(
    () => scanNormalizedBundle([
      {
        relative: "SKILL.md",
        contents: Buffer.from("---\nname: example\ndescription: Example\n---\n"),
      },
      { relative: "scripts/run.sh", contents: Buffer.from("#!/bin/sh\necho safe\n") },
    ]),
    /blocks executable files/,
  );
});

test("community scanner accepts a safe human-readable manifest name", () => {
  const scan = scanNormalizedBundle([
    {
      relative: "SKILL.md",
      contents: Buffer.from("---\nname: Architecture Design\ndescription: Example\n---\n"),
    },
  ]);
  assert.match(scan.contentHash, /^sha256:[0-9a-f]{64}$/);
});

test("community scanner accepts metadata frontmatter with a safe heading name", () => {
  const scan = scanNormalizedBundle([
    {
      relative: "SKILL.md",
      contents: Buffer.from("---\ngraph:\n  topics: [architecture]\n---\n\n# Architecture Design\n"),
    },
  ]);
  assert.match(scan.contentHash, /^sha256:[0-9a-f]{64}$/);
});

test("registry rejects mutable GitHub references", () => {
  assert.throws(
    () => validateRegistry({
      schemaVersion: 1,
      generatedAt: "2026-08-09",
      skills: [{
        slug: "example",
        name: "Example",
        description: "A long enough example description for registry validation.",
        trustTier: "community",
        license: "MIT",
        source: {
          provider: "github",
          repository: "example/skills",
          path: "skills/example",
          commit: "main",
        },
      }],
    }),
    /full commit/,
  );
});
