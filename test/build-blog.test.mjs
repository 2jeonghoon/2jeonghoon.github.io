import assert from "node:assert/strict";
import {afterEach, beforeEach, test} from "node:test";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {buildSite} from "../scripts/build-blog.mjs";

let fixtureRoot;
let outDir;

const published = `---
title: Published
description: Visible article
date: 2026-01-01
category: Systems
tags: [Linux]
image: assets/cover.png
featured: true
draft: false
aiGenerated: true
---

## Published body
`;

const draft = `---
draft: true
aiGenerated: false
---

unfinished private notes
`;

async function put(relativePath, content = "fixture") {
  const target = path.join(fixtureRoot, relativePath);
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, content);
}

async function read(relativePath) {
  return readFile(path.join(fixtureRoot, relativePath), "utf8");
}

beforeEach(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "jh-blog-build-"));
  outDir = path.join(fixtureRoot, "_site");
  await Promise.all([
    put("index.html", '<link rel="stylesheet" href="styles.css">'),
    put("styles.css", "body {}"),
    put("blog.js", "window.app = true;"),
    put("blog.config.js", "window.BLOG_CONFIG = {};"),
    put("robots.txt", "User-agent: *"),
    put("assets/cover.png", "png"),
    put("assets/nested/diagram.png", "nested"),
    put("public/favicon.ico", "ico"),
    put("src/private.js", "do not deploy"),
    put("tmp/private.txt", "do not deploy"),
    put("posts/published.md", published),
    put("posts/unfinished.md", draft)
  ]);
});

afterEach(async () => {
  await rm(fixtureRoot, {recursive: true, force: true});
});

test("builds only published posts into every artifact", async () => {
  const result = await buildSite({projectRoot: fixtureRoot, outDir});
  assert.deepEqual(
    result.posts.map(post => post.slug),
    ["published"]
  );
  assert.match(await read("_site/posts.js"), /published/);
  assert.doesNotMatch(await read("_site/posts.js"), /unfinished/);
  assert.doesNotMatch(await read("_site/feed.xml"), /unfinished/);
  assert.doesNotMatch(await read("_site/sitemap.xml"), /unfinished/);
});

test("copies only declared static inputs including nested assets", async () => {
  const {files} = await buildSite({projectRoot: fixtureRoot, outDir});
  assert(files.includes("index.html"));
  assert(files.includes("assets/cover.png"));
  assert(files.includes("assets/nested/diagram.png"));
  assert(files.includes("public/favicon.ico"));
  assert(!files.some(file => file.startsWith("src/")));
  assert(!files.some(file => file.startsWith("tmp/")));
});

test("names the post when a referenced local image is missing", async () => {
  await put(
    "posts/missing-image.md",
    published.replace("assets/cover.png", "assets/missing.png")
  );
  await assert.rejects(
    buildSite({projectRoot: fixtureRoot, outDir}),
    /missing-image\.md: image not found/i
  );
});

test("rebuilding removes stale output", async () => {
  await buildSite({projectRoot: fixtureRoot, outDir});
  await put("_site/stale.txt", "stale");
  const {files} = await buildSite({projectRoot: fixtureRoot, outDir});
  assert(!files.includes("stale.txt"));
  await assert.rejects(read("_site/stale.txt"), /ENOENT/);
});

test("sync preview writes only generated root artifacts", async () => {
  await put("keep.txt", "unchanged");
  await buildSite({projectRoot: fixtureRoot, outDir, syncPreview: true});
  assert.match(await read("posts.js"), /published/);
  assert.match(await read("feed.xml"), /Published/);
  assert.match(await read("sitemap.xml"), /published/);
  assert.equal(await read("keep.txt"), "unchanged");
});
