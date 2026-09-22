import assert from "node:assert/strict";
import {test} from "node:test";

import {
  calculateReadingTime,
  compilePosts,
  createFeedXml,
  createSitemapXml,
  parsePost,
  renderMarkdown,
  selectFeatured,
  serializePosts
} from "../lib/posts.mjs";

const projectRoot = "/project";

function record(filePath, source) {
  return {filePath, source, projectRoot};
}

function source(overrides = {}, body = "## Heading\n\nBody") {
  const data = {
    title: "Valid title",
    description: "Valid description",
    date: "2026-01-01",
    category: "Systems",
    tags: ["Linux", "I/O"],
    image: "assets/cover.png",
    featured: false,
    draft: false,
    aiGenerated: true,
    ...overrides
  };
  const lines = [
    "---",
    `title: ${data.title}`,
    `description: ${data.description}`,
    `date: ${data.date}`,
    `category: ${data.category}`,
    `tags: [${data.tags.join(", ")}]`,
    `image: ${data.image}`,
    `featured: ${String(data.featured)}`,
    `draft: ${String(data.draft)}`,
    `aiGenerated: ${String(data.aiGenerated)}`
  ];
  if (data.readingTime) lines.push(`readingTime: ${data.readingTime}`);
  return `${lines.join("\n")}\n---\n${body}\n`;
}

function published(filePath, date, overrides = {}) {
  return record(filePath, source({date, ...overrides}));
}

const validSource = source();

test("compiles a published Markdown post", () => {
  const post = parsePost(record("valid-post.md", validSource));
  assert.equal(post.slug, "valid-post");
  assert.equal(post.aiGenerated, true);
  assert.match(post.content, /<h2>Heading<\/h2>/);
});

test("allows incomplete draft metadata", () => {
  const post = parsePost(
    record(
      "unfinished.md",
      "---\ndraft: true\naiGenerated: false\n---\nNotes"
    )
  );
  assert.equal(post.draft, true);
  assert.equal(post.title, "");
});

for (const filename of ["Bad Slug.md", "UPPER.md", "../escape.md", "a_b.md"]) {
  test(`rejects invalid slug ${filename}`, () => {
    assert.throws(
      () => parsePost(record(filename, validSource)),
      /invalid slug/i
    );
  });
}

test("rejects duplicate slugs before filtering drafts", () => {
  const draft = "---\ndraft: true\naiGenerated: false\n---\nNotes";
  assert.throws(
    () => compilePosts([record("same.md", validSource), record("same.md", draft)]),
    /duplicate slug/i
  );
});

test("escapes raw HTML and blocks javascript links", () => {
  const html = renderMarkdown(
    "<script>alert(1)</script>\n\n[x](javascript:alert(1))"
  );
  assert.doesNotMatch(html, /<script>|href=["']javascript:/i);
  assert.match(html, /&lt;script&gt;/);
});

test("uses slug as a deterministic tie-breaker", () => {
  const posts = compilePosts([
    published("z-post.md", "2026-01-01"),
    published("a-post.md", "2026-01-01")
  ]);
  assert.deepEqual(
    posts.map(post => post.slug),
    ["a-post", "z-post"]
  );
});

test("selects the newest marked feature and falls back to newest", () => {
  const featuredFixtures = compilePosts([
    published("old-featured.md", "2024-01-01", {featured: true}),
    published("new-featured.md", "2026-01-01", {featured: true}),
    published("newest.md", "2027-01-01")
  ]);
  const unmarkedFixtures = compilePosts([
    published("old.md", "2024-01-01"),
    published("newest.md", "2027-01-01")
  ]);
  assert.equal(selectFeatured(featuredFixtures).slug, "new-featured");
  assert.equal(selectFeatured(unmarkedFixtures).slug, "newest");
  assert.equal(selectFeatured([]), null);
});

test("reports the filename and missing published field", () => {
  const missingTitle = validSource.replace("title: Valid title\n", "");
  assert.throws(
    () => parsePost(record("missing-title.md", missingTitle)),
    error =>
      error.message.includes("missing-title.md") &&
      error.message.includes("title")
  );
});

test("rejects impossible calendar dates and wrong date formats", () => {
  for (const date of ["2026-02-30", "09/22/2026", "not-a-date"]) {
    assert.throws(
      () => parsePost(published("bad-date.md", date)),
      /bad-date\.md: invalid date/i
    );
  }
});

test("normalizes an unquoted YAML date to its UTC calendar date", () => {
  const post = parsePost(published("dated.md", "2026-09-22"));
  assert.equal(post.date, "2026-09-22");
});

test("requires non-empty string tags", () => {
  const emptyTags = validSource.replace("tags: [Linux, I/O]", "tags: []");
  const numericTags = validSource.replace("tags: [Linux, I/O]", "tags: [1]");
  assert.throws(() => parsePost(record("empty.md", emptyTags)), /tags/i);
  assert.throws(() => parsePost(record("numeric.md", numericTags)), /tags/i);
});

test("requires actual boolean flags", () => {
  const badDraft = validSource.replace("draft: false", "draft: no");
  const badAi = validSource.replace("aiGenerated: true", "aiGenerated: yes");
  const badFeatured = validSource.replace("featured: false", "featured: no");
  assert.throws(() => parsePost(record("draft.md", badDraft)), /draft.*boolean/i);
  assert.throws(() => parsePost(record("ai.md", badAi)), /aiGenerated.*boolean/i);
  assert.throws(
    () => parsePost(record("feature.md", badFeatured)),
    /featured.*boolean/i
  );
});

test("rejects unsafe image paths", () => {
  for (const image of ["/absolute.png", "../outside.png", "assets/../secret.png"]) {
    assert.throws(
      () => parsePost(record("unsafe-image.md", source({image}))),
      /unsafe-image\.md: invalid image/i
    );
  }
});

test("preserves explicit reading time and calculates a default", () => {
  const explicit = parsePost(
    record("explicit.md", source({readingTime: "12 min read"}))
  );
  const calculated = parsePost(record("calculated.md", validSource));
  assert.equal(explicit.readingTime, "12 min read");
  assert.match(calculated.readingTime, /^\d+ min read$/);
  assert.equal(calculateReadingTime("one two three"), "1 min read");
});

test("filters drafts and sorts published posts newest first", () => {
  const posts = compilePosts([
    published("older.md", "2024-01-01"),
    record("draft.md", "---\ndraft: true\naiGenerated: false\n---\nNotes"),
    published("newer.md", "2026-01-01")
  ]);
  assert.deepEqual(
    posts.map(post => post.slug),
    ["newer", "older"]
  );
});

test("serializes browser data with a trailing newline", () => {
  const output = serializePosts(compilePosts([published("one.md", "2026-01-01")]));
  assert.match(output, /^window\.BLOG_POSTS = \[/);
  assert.match(output, /"slug": "one"/);
  assert.equal(output.endsWith(";\n"), true);
});

test("generates escaped RSS and sitemap article URLs", () => {
  const posts = compilePosts([
    published("one-post.md", "2026-01-01", {
      title: "Systems & Games",
      description: "Fast < safe"
    })
  ]);
  const feed = createFeedXml(posts, "https://example.com/");
  const sitemap = createSitemapXml(posts, "https://example.com/");
  assert.match(feed, /Systems &amp; Games/);
  assert.match(feed, /Fast &lt; safe/);
  assert.match(feed, /\?post=one-post/);
  assert.match(sitemap, /https:\/\/example\.com\/\?post=one-post/);
});
