import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import worker from "../worker/src/index.mjs";
import {issueSession} from "../worker/src/security.mjs";
import {sqliteD1} from "./helpers/sqlite-d1.mjs";
import pages from "../worker/src/analytics-pages.json" with {type: "json"};

const origin = "https://admin.example";
const blog = "https://2jeonghoon.github.io";
const now = Date.UTC(2026, 9, 15, 15);
const secret = "test-only-analytics-key-at-least-32-bytes";
function environment(overrides = {}) {
  return {
    OWNER_GITHUB_ID: "51705815", SESSION_SIGNING_KEY: secret, ADMIN_ORIGIN: origin,
    PUBLIC_BLOG_ORIGIN: blog, NOW: () => now,
    VIEW_RATE_LIMITER: {limit: async () => ({success: true})},
    AUDIT_LOG: async () => {},
    ASSETS: {async fetch(request) {
      const file = new URL(request.url).pathname === "/" ? "index.html" : "login.html";
      return new Response(await readFile(new URL(`../worker/public/${file}`, import.meta.url)), {headers: {"Content-Type": "text/html"}});
    }},
    ...overrides
  };
}
async function call(path, env, {method = "GET", body, headers = {}, owner, time = now} = {}) {
  const values = {...headers};
  if (owner) values.cookie = `__Host-jh_admin=${await issueSession({ownerId: owner, now: time, secret})}`;
  return worker.fetch(new Request(origin + path, {method, headers: values, ...(body !== undefined ? {body} : {})}), env);
}
function collect(env, page = "/", options = {}) {
  return call("/api/analytics/view", env, {method: "POST", body: JSON.stringify({page}), headers: {origin: blog, "content-type": "application/json"}, ...options});
}

test("collects anonymous views but never exposes statistics without the owner session", async () => {
  const db = sqliteD1();
  try {
    const env = environment({ANALYTICS_DB: db, AUDIT_LOG: async () => { throw new Error("collection must skip auditing"); }});
    assert.equal((await collect(env)).status, 204);
    assert.equal((await collect(env, pages[0])).status, 204);
    const data = await call("/api/analytics", env, {owner: "51705815"});
    assert.equal(data.status, 200);
    assert.equal((await data.json()).total, 2);
    for (const options of [{}, {owner: "1"}, {owner: "51705815", time: now - 31 * 60000}, {headers: {cookie: "__Host-jh_admin=forged"}}]) {
      assert.equal((await call("/api/analytics", env, options)).status, 401);
    }
  } finally { db.close(); }
});

test("validates collection origin, page, method, JSON shape and bounded body", async () => {
  const db = sqliteD1();
  try {
    const env = environment({ANALYTICS_DB: db});
    const cases = [
      [{headers: {origin: "https://evil.example", "content-type": "application/json"}}, 403],
      [{headers: {"content-type": "application/json"}}, 403],
      [{headers: {origin: blog, "content-type": "text/plain"}}, 415],
      [{body: "{"}, 400], [{body: "null"}, 400], [{body: "[]"}, 400],
      [{body: JSON.stringify({page: "/", secret: "x"})}, 400],
      [{body: JSON.stringify({page: "not-a-public-post"})}, 400],
      [{body: JSON.stringify({page: "../admin"})}, 400],
      [{body: "x".repeat(1025)}, 413]
    ];
    for (const [options, status] of cases) assert.equal((await collect(env, "/", options)).status, status, JSON.stringify(options));
    assert.equal((await call("/api/analytics/view", env, {headers: {origin: blog}})).status, 405);
    assert.equal((await collect(environment({ANALYTICS_DB: db, VIEW_RATE_LIMITER: {limit: async () => ({success: false})}}))).status, 429);
    const summary = await call("/api/analytics", env, {owner: "51705815"});
    assert.equal((await summary.json()).total, 0);
  } finally { db.close(); }
});

test("supports exact-origin credential-free preflight and error responses", async () => {
  const env = environment();
  const preflight = await call("/api/analytics/view", env, {method: "OPTIONS", headers: {origin: blog, "access-control-request-method": "POST", "access-control-request-headers": "content-type"}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), blog);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
  const denied = await call("/api/analytics/view", env, {method: "OPTIONS", headers: {origin: "https://evil.example"}});
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  const unavailable = await collect(env);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("access-control-allow-origin"), blog);
  const failed = await collect(environment({ANALYTICS_DB: {prepare() { throw new Error("private database detail"); }}}));
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /private database detail/);
  assert.equal((await call("/api/analytics", env, {owner: "51705815"})).status, 503);
});

test("never audits public collection, including rejected requests", async () => {
  const entries = [];
  const env = environment({AUDIT_LOG: async value => entries.push(value)});
  await collect(env);
  await collect(env, "../bad");
  assert.equal(entries.length, 0);
});

test("serves workspace HTML only to the owner through every entry point", async () => {
  const env = environment();
  for (const path of ["/", "/?edit=safe-post", "/index.html", "/index.html?edit=safe-post"]) {
    for (const options of [{}, {owner: "1"}, {owner: "51705815", time: now - 31 * 60000}]) {
      const response = await call(path, env, options);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const html = await response.text();
      assert.match(html, /GitHub로 로그인/);
      assert.doesNotMatch(html, /id="workspace"|id="post-form"|admin\.js/);
    }
    const response = await call(path, env, {owner: "51705815"});
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(await response.text(), /id="workspace"/);
  }
  assert.equal((await call("/index", env)).status, 404);
  assert.equal((await call("/", env, {method: "POST"})).status, 405);
});
