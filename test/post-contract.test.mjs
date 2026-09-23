import assert from "node:assert/strict";
import {test} from "node:test";

import {
  LIMITS,
  parsePostSource,
  serializePostSource,
  validatePostInput,
  validateSlug
} from "../lib/post-contract.mjs";

function valid(overrides = {}) {
  return {
    slug: "safe-post",
    title: "A safe post",
    description: "A bounded description",
    date: "2026-09-23",
    category: "Systems",
    tags: ["Security", "GitHub"],
    image: "assets/blog/cover.png",
    readingTime: "4 min read",
    featured: false,
    draft: false,
    aiGenerated: true,
    body: "## Heading\n\nBody",
    ...overrides
  };
}

test("accepts only a raw lowercase hyphenated slug", () => {
  assert.equal(validateSlug("safe-post-2"), "safe-post-2");
  for (const slug of [
    "../escape",
    "%2e%2e",
    "%252e%252e",
    "Bad-Slug",
    "a/b",
    "a\\b",
    "a_b"
  ]) {
    assert.throws(() => validateSlug(slug), /invalid slug/i, slug);
  }
});

test("normalizes valid post input without changing booleans", () => {
  const post = validatePostInput(valid({draft: true, featured: true}));
  assert.equal(post.draft, true);
  assert.equal(post.featured, true);
  assert.equal(post.aiGenerated, true);
  assert.deepEqual(post.tags, ["Security", "GitHub"]);
});

test("published posts require complete metadata and real booleans", () => {
  assert.throws(() => validatePostInput(valid({title: ""})), /title is required/i);
  assert.throws(() => validatePostInput(valid({date: "2026-02-30"})), /calendar day/i);
  assert.throws(() => validatePostInput(valid({draft: "false"})), /draft must be boolean/i);
  assert.doesNotThrow(() => validatePostInput(valid({draft: true, title: "", date: ""})));
});

test("enforces field and body limits", () => {
  assert.throws(
    () => validatePostInput(valid({title: "x".repeat(LIMITS.title + 1)})),
    /title.*200/i
  );
  assert.throws(
    () => validatePostInput(valid({body: "x".repeat(LIMITS.body + 1)})),
    /body.*245760/i
  );
  assert.throws(
    () => validatePostInput(valid({tags: ["x".repeat(LIMITS.tag + 1)]})),
    /tag.*60/i
  );
});

test("rejects unsafe image paths and accepts a safe relative asset", () => {
  assert.equal(validatePostInput(valid()).image, "assets/blog/cover.png");
  for (const image of ["/cover.png", "../cover.png", "assets/../secret.png", "javascript:alert(1)"]) {
    assert.throws(() => validatePostInput(valid({image})), /invalid image path/i);
  }
});

test("serializes and parses a deterministic Markdown source round trip", () => {
  const source = serializePostSource(valid());
  assert.equal(source.endsWith("\n"), true);
  assert.equal(source, serializePostSource(valid()));

  const parsed = parsePostSource({filePath: "safe-post.md", source});
  assert.deepEqual(parsed, valid());
});

test("derives and validates the slug from a plain Markdown filename", () => {
  const source = serializePostSource(valid());
  assert.equal(parsePostSource({filePath: "safe-post.md", source}).slug, "safe-post");
  assert.throws(
    () => parsePostSource({filePath: "../safe-post.md", source}),
    /invalid slug/i
  );
});
