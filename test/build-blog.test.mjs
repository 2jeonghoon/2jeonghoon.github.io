import assert from "node:assert/strict";
import {afterEach, beforeEach, test} from "node:test";
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
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
    put(
      "index.html",
      '<link rel="stylesheet" href="styles.css"><link rel="icon" href="public/favicon.ico"><script src="posts.js"></script><script src="blog.config.js"></script><script src="blog.js"></script>'
    ),
    put("styles.css", "body {}"),
    put("blog.js", "window.app = true;"),
    put("blog.config.js", "window.BLOG_CONFIG = {};"),
    put("admin/index.html", '<script src="../blog.config.js"></script><script src="./admin.js"></script>'),
    put("admin/admin.js", "window.admin = true;"),
    put("robots.txt", "User-agent: *"),
    put("assets/cover.png", "png"),
    put("assets/nested/diagram.png", "nested"),
    put("public/favicon.ico", "ico"),
    put("public/.index.html.swp", "editor state"),
    put("src/private.js", "do not deploy"),
    put("tmp/private.txt", "do not deploy"),
    put("posts/published.md", published),
    put("posts/unfinished.md", draft),
    put("posts/_template.md.example", published.replace("Published", "Template"))
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
  assert.doesNotMatch(await read("_site/posts.js"), /Template/);
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

test("produces the exact deployable artifact and resolves local references", async () => {
  const {files} = await buildSite({projectRoot: fixtureRoot, outDir});
  assert.deepEqual(files, [
    "admin/admin.js",
    "admin/index.html",
    "assets/cover.png",
    "assets/nested/diagram.png",
    "blog.config.js",
    "blog.js",
    "feed.xml",
    "index.html",
    "posts.js",
    "public/favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "styles.css"
  ]);
  const html = await read("_site/index.html");
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(value => !/^(?:https?:|mailto:|[?#])/i.test(value));
  for (const reference of references) {
    const localPath = reference.split(/[?#]/, 1)[0];
    await lstat(path.join(outDir, localPath));
  }
  assert(!files.some(file => /(^|\/)\.(?!\.)/.test(file)));
  assert(!files.some(file => /(^|\/)(?:posts|test|\.github|tmp|src)(\/|$)/.test(file)));
  assert(!files.some(file => /(?:package(?:-lock)?\.json|\.env)$/i.test(file)));
});

test("rejects symlinks in static inputs", async () => {
  await symlink(path.join(fixtureRoot, "assets/cover.png"), path.join(fixtureRoot, "assets/linked.png"));
  await assert.rejects(
    buildSite({projectRoot: fixtureRoot, outDir}),
    /symbolic link.*assets\/linked\.png/i
  );
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
