import {readdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {compilePosts} from "../lib/posts.mjs";

export async function buildAnalyticsPages(projectRoot) {
  const directory = path.join(projectRoot, "posts");
  const entries = (await readdir(directory, {withFileTypes: true})).filter(entry => entry.isFile() && entry.name.endsWith(".md"));
  const records = await Promise.all(entries.map(async entry => ({filePath: entry.name, source: await readFile(path.join(directory, entry.name), "utf8"), projectRoot})));
  return compilePosts(records).map(post => post.slug).sort();
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pages = await buildAnalyticsPages(root);
  await writeFile(path.join(root, "worker/src/analytics-pages.json"), JSON.stringify(pages, null, 2) + "\n");
  console.log(`Prepared ${pages.length} public analytics pages`);
}
