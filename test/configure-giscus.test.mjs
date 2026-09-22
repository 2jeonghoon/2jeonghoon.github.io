import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {promisify} from "node:util";
import {afterEach, test} from "node:test";

import {createGiscusConfig} from "../scripts/configure-giscus.mjs";

const run = promisify(execFile);
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory =>
      rm(directory, {recursive: true, force: true})
    )
  );
});

test("generates public Giscus identifiers without secrets", () => {
  const output = createGiscusConfig({
    repoId: "R_testRepo",
    categoryId: "DIC_testCategory"
  });
  assert.match(output, /repoId: "R_testRepo"/);
  assert.match(output, /categoryId: "DIC_testCategory"/);
  assert.doesNotMatch(output, /token|secret/i);
  assert.match(output, /repo: "2jeonghoon\/2jeonghoon\.github\.io"/);
  assert.match(output, /category: "Blog Comments"/);
});

test("rejects empty and unsafe identifiers", () => {
  for (const identifiers of [
    {repoId: "", categoryId: "DIC_valid"},
    {repoId: "R_valid", categoryId: ""},
    {repoId: "R bad", categoryId: "DIC_valid"},
    {repoId: "R_valid", categoryId: "../category"}
  ]) {
    assert.throws(() => createGiscusConfig(identifiers), /invalid/i);
  }
});

test("CLI writes only the explicit output path", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "giscus-config-"));
  temporaryDirectories.push(directory);
  const output = path.join(directory, "custom-config.js");
  const sentinel = path.join(directory, "keep.txt");
  await writeFile(sentinel, "unchanged");
  await run(
    process.execPath,
    [
      path.resolve("scripts/configure-giscus.mjs"),
      "--repo-id",
      "R_cliRepo",
      "--category-id",
      "DIC_cliCategory",
      "--output",
      output
    ],
    {cwd: path.resolve(".")}
  );
  assert.match(await readFile(output, "utf8"), /R_cliRepo/);
  assert.equal(await readFile(sentinel, "utf8"), "unchanged");
  await assert.rejects(readFile(path.join(directory, "blog.config.js")), /ENOENT/);
});
