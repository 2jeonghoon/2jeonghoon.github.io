import {rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const PUBLIC_ID = /^[A-Za-z0-9_-]+$/;

function validateId(value, name) {
  if (typeof value !== "string" || !PUBLIC_ID.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
}

export function createGiscusConfig({repoId, categoryId}) {
  validateId(repoId, "repo ID");
  validateId(categoryId, "category ID");
  return `window.BLOG_CONFIG = {
  giscus: {
    repo: "2jeonghoon/2jeonghoon.github.io",
    repoId: "${repoId}",
    category: "Blog Comments",
    categoryId: "${categoryId}"
  }
};
`;
}

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!value) throw new Error(`Missing value for ${flag || "argument"}`);
    if (flag === "--repo-id") result.repoId = value;
    else if (flag === "--category-id") result.categoryId = value;
    else if (flag === "--output") result.output = value;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!result.output) throw new Error("Missing --output");
  return result;
}

export async function writeGiscusConfig({repoId, categoryId, output}) {
  const target = path.resolve(output);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, createGiscusConfig({repoId, categoryId}), {
    flag: "wx"
  });
  await rename(temporary, target);
  return target;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedFile && pathToFileURL(invokedFile).href === pathToFileURL(currentFile).href) {
  const options = parseArguments(process.argv.slice(2));
  const target = await writeGiscusConfig(options);
  console.log(`Wrote public Giscus configuration to ${target}`);
}
