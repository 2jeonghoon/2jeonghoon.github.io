import {copyFile, mkdir, readFile, readdir, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";

// Keep public reading and the private editor self-contained, including fonts.
const require = createRequire(import.meta.url);
const katexRoot = path.dirname(require.resolve("katex/package.json"));
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const css = (await readFile(path.join(katexRoot, "dist/katex.min.css"), "utf8"))
  .replace(/,url\(fonts\/[^)]+\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g, "");
for (const relative of ["assets/katex", "worker/public/katex"]) {
  const target = path.join(projectRoot, relative);
  await mkdir(path.join(target, "fonts"), {recursive: true});
  await writeFile(path.join(target, "katex.min.css"), css);
  await copyFile(path.join(katexRoot, "LICENSE"), path.join(target, "LICENSE"));
  for (const font of await readdir(path.join(katexRoot, "dist/fonts"))) {
    if (font.endsWith(".woff2")) {
      await copyFile(path.join(katexRoot, "dist/fonts", font), path.join(target, "fonts", font));
    }
  }
}
