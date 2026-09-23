import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {test} from "node:test";

const require = createRequire(import.meta.url);
const ui = require("../worker/public/admin.js");

test("constructs same-origin JSON mutations with CSRF and current SHA", () => {
  const {url, init} = ui.createApiRequest("/api/posts/safe-post", {
    method: "PUT", csrfToken: "csrf", body: {slug: "safe-post", sha: "current"}
  });
  assert.equal(url, "/api/posts/safe-post");
  assert.equal(init.method, "PUT");
  assert.deepEqual(init.headers, {"Content-Type": "application/json", "X-CSRF-Token": "csrf"});
  assert.deepEqual(JSON.parse(init.body), {slug: "safe-post", sha: "current"});
  assert.equal(init.credentials, "same-origin");
});

test("keeps editor data after every recoverable server error", () => {
  const model = ui.createEditorModel({slug: "safe-post", body: "unsaved", sha: "old"});
  for (const status of [401, 409, 422, 429, 502]) {
    const next = ui.withRequestError(model, {status, message: "failed"});
    assert.equal(next.body, "unsaved");
    assert.equal(next.sha, "old");
    assert.equal(next.error.status, status);
  }
});

test("locks an existing slug and requires exact delete confirmation", () => {
  assert.equal(ui.canEditSlug({sha: "old"}), false);
  assert.equal(ui.canEditSlug({sha: ""}), true);
  assert.equal(ui.canDelete("safe-post", "safe-post"), true);
  assert.equal(ui.canDelete("safe-post", "Safe-post"), false);
});

test("ships accessible external-script UI and responsive editor styles", async () => {
  const html = await readFile(new URL("../worker/public/index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../worker/public/admin.css", import.meta.url), "utf8");
  const headers = await readFile(new URL("../worker/public/_headers", import.meta.url), "utf8");
  assert.match(html, /<main[^>]*id="app"/);
  assert.match(html, /<label[^>]*for="post-title"/);
  assert.match(html, /<dialog[^>]*id="delete-dialog"/);
  assert.match(html, /src="\.\/admin\.js"/);
  assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(headers, /Content-Security-Policy:.*script-src 'self'/);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /X-Robots-Tag:\s*noindex/);
});

test("does not persist credentials or editor content in browser storage", async () => {
  const source = await readFile(new URL("../worker/public/admin.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|GITHUB_APP_PRIVATE_KEY|CLIENT_SECRET/);
});

test("renders repository-controlled post titles as text", async () => {
  const source = await readFile(new URL("../worker/public/admin.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /b\.innerHTML\s*=/);
  assert.match(source, /b\.append\(document\.createTextNode/);
});
