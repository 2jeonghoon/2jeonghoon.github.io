import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {
  compilePosts,
  createFeedXml,
  createSitemapXml,
  serializePosts
} from "../lib/posts.mjs";

const SITE_URL = "https://2jeonghoon.github.io/";
const STATIC_FILES = [
  "index.html",
  "styles.css",
  "blog.js",
  "blog.config.js",
  "robots.txt"
];
const STATIC_DIRECTORIES = ["admin", "assets", "public"];
const PREVIEW_ARTIFACTS = ["posts.js", "feed.xml", "sitemap.xml"];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(target, content) {
  const temporary = `${target}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, target);
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute, relative)));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function copyStaticDirectory(source, destination, relativeRoot) {
  await mkdir(destination, {recursive: true});
  const entries = await readdir(source, {withFileTypes: true});
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(relativeRoot, entry.name);
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing symbolic link in static files: ${relative}`);
    }
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      await copyStaticDirectory(sourcePath, destinationPath, relative);
    } else if (entry.isFile()) {
      await cp(sourcePath, destinationPath);
    }
  }
}

function assertSafeOutDir(projectRoot, outDir) {
  const root = path.resolve(projectRoot);
  const output = path.resolve(outDir);
  if (output === root || !output.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing unsafe output directory: ${outDir}`);
  }
}

async function loadSourceRecords(projectRoot) {
  const postsDir = path.join(projectRoot, "posts");
  const entries = (await readdir(postsDir, {withFileTypes: true}))
    .filter(entry => entry.isFile() && path.extname(entry.name) === ".md")
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(
    entries.map(async entry => ({
      filePath: entry.name,
      source: await readFile(path.join(postsDir, entry.name), "utf8"),
      projectRoot
    }))
  );
}

async function verifyImages(posts, projectRoot) {
  for (const post of posts) {
    if (!post.image) continue;
    const imagePath = path.join(projectRoot, ...post.image.split("/"));
    try {
      const details = await stat(imagePath);
      if (!details.isFile()) throw new Error("not a file");
    } catch {
      throw new Error(`${post.slug}.md: image not found: ${post.image}`);
    }
  }
}

export async function buildSite({projectRoot, outDir, syncPreview = false}) {
  assertSafeOutDir(projectRoot, outDir);
  const posts = compilePosts(await loadSourceRecords(projectRoot));
  await verifyImages(posts, projectRoot);

  await rm(outDir, {recursive: true, force: true});
  await mkdir(outDir, {recursive: true});

  for (const relative of STATIC_FILES) {
    const source = path.join(projectRoot, relative);
    if (await exists(source)) {
      await cp(source, path.join(outDir, relative));
    }
  }
  for (const relative of STATIC_DIRECTORIES) {
    const source = path.join(projectRoot, relative);
    if (await exists(source)) {
      await copyStaticDirectory(source, path.join(outDir, relative), relative);
    }
  }

  const generated = {
    "posts.js": serializePosts(posts),
    "feed.xml": createFeedXml(posts, SITE_URL),
    "sitemap.xml": createSitemapXml(posts, SITE_URL)
  };
  for (const [relative, content] of Object.entries(generated)) {
    await writeAtomic(path.join(outDir, relative), content);
  }

  if (syncPreview) {
    for (const relative of PREVIEW_ARTIFACTS) {
      await writeAtomic(path.join(projectRoot, relative), generated[relative]);
    }
  }

  return {posts, files: await listFiles(outDir)};
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedFile && pathToFileURL(invokedFile).href === pathToFileURL(currentFile).href) {
  const projectRoot = path.resolve(path.dirname(currentFile), "..");
  const outDir = path.join(projectRoot, "_site");
  const syncPreview = process.argv.includes("--sync-preview");
  const result = await buildSite({projectRoot, outDir, syncPreview});
  console.log(`Built ${result.posts.length} posts into ${outDir}`);
}
