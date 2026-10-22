import assert from "node:assert/strict";
import {readFile, readdir, stat} from "node:fs/promises";
import {test} from "node:test";
import {renderMarkdown} from "../lib/markdown.mjs";
import {parsePost} from "../lib/posts.mjs";
import {createPostService} from "../worker/src/post-service.mjs";

test("editor preview and published Markdown use the same math renderer", () => {
  const body = String.raw`$A=LU$

$$
\begin{bmatrix}1&0\\2&1\end{bmatrix}
$$`;
  const preview = createPostService({}).preview({slug: "math-example", draft: true, aiGenerated: true, body});
  assert.equal(preview.html, renderMarkdown(body));
  assert.match(preview.html, /katex-display/);
});

test("math stylesheets and every referenced font ship with both surfaces", async () => {
  for (const [htmlPath, assetPath, href] of [
    ["index.html", "assets/katex", "assets/katex/katex.min.css"],
    ["worker/public/index.html", "worker/public/katex", "./katex/katex.min.css"]
  ]) {
    const html = await readFile(new URL(`../${htmlPath}`, import.meta.url), "utf8");
    assert(html.includes(`href="${href}"`));
    const css = await readFile(new URL(`../${assetPath}/katex.min.css`, import.meta.url), "utf8");
    const fonts = [...css.matchAll(/url\((fonts\/[^)]+)\)/g)];
    assert(fonts.length > 0);
    for (const [, font] of fonts) {
      assert((await stat(new URL(`../${assetPath}/${font}`, import.meta.url))).size > 0);
    }
  }
});

test("linear algebra worked examples render without invalid LaTeX", async () => {
  const filePath = "linear-algebra-6e-02-solving-linear-equations.md";
  const source = await readFile(new URL(`../posts/${filePath}`, import.meta.url), "utf8");
  const post = parsePost({filePath, source});
  assert((post.content.match(/katex-display/g) ?? []).length >= 15);
  assert.doesNotMatch(post.content, /katex-error|<pre>/);
});

test("every post containing math renders without KaTeX errors", async () => {
  const directory = new URL("../posts/", import.meta.url);
  let mathPosts = 0;
  for (const filePath of await readdir(directory)) {
    if (!filePath.endsWith(".md")) continue;
    const source = await readFile(new URL(filePath, directory), "utf8");
    const post = parsePost({filePath, source});
    if (post.content.includes('class="katex"')) mathPosts++;
    assert.doesNotMatch(post.content, /katex-error/, filePath);
  }
  assert(mathPosts >= 5, "expected worked math examples across multiple posts");
});
