import assert from "node:assert/strict";
import {test} from "node:test";

import worker from "../worker/src/index.mjs";
import {issueSession} from "../worker/src/security.mjs";
import {serializePostSource} from "../lib/post-contract.mjs";
import {GitHubError} from "../worker/src/github.mjs";
import * as categoryService from "../worker/src/category-service.mjs";

const origin = "https://admin.example";
const secret = "test-only-session-secret-with-at-least-32-bytes";
const now = Date.UTC(2026, 8, 23, 1, 0, 0);

function post(overrides = {}) {
  return {
    slug: "safe-post", title: "Safe", description: "Description", date: "2026-09-23",
    category: "Systems", tags: ["Security"], image: "", readingTime: "2 min read",
    featured: false, draft: false, aiGenerated: false, body: "## Body", ...overrides
  };
}

function fakeClient() {
  const calls = [];
  return {
    calls,
    async getCategoryConfig() { return {sha: "categories-sha", categories: ["Systems"]}; },
    async writeCategoryConfig(categories, sha) { calls.push(["categories", categories, sha]); return {commit: {sha: "category-commit"}, content: {sha: "categories-next"}}; },
    async verifyRepository() {},
    async listPostEntries() { return [{name: "safe-post.md", path: "posts/safe-post.md", sha: "old"}]; },
    async getPost(slug) { return {sha: "old", source: serializePostSource(post({slug}))}; },
    async createPost(slug, source) { calls.push(["create", slug, source]); return {commit: {sha: "create-commit"}}; },
    async updatePost(slug, source, sha) { calls.push(["update", slug, source, sha]); return {commit: {sha: "update-commit"}}; },
    async deletePost(slug, sha) { calls.push(["delete", slug, sha]); return {commit: {sha: "delete-commit"}}; }
  };
}

function env(overrides = {}) {
  return {
    OWNER_GITHUB_ID: "51705815",
    SESSION_SIGNING_KEY: secret,
    ADMIN_ORIGIN: origin,
    GITHUB_CLIENT: fakeClient(),
    OAUTH_USER: async () => ({id: 51705815, login: "2jeonghoon"}),
    AUTH_RATE_LIMITER: {limit: async () => ({success: true})},
    READ_RATE_LIMITER: {limit: async () => ({success: true})},
    MUTATION_RATE_LIMITER: {limit: async () => ({success: true})},
    AUDIT_LOG: async () => {},
    ASSETS: {fetch: async () => new Response("asset")},
    NOW: () => now,
    ...overrides
  };
}

async function auth() {
  const token = await issueSession({ownerId: "51705815", now, secret});
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  return {cookie: `__Host-jh_admin=${token}`, csrf: payload.csrf};
}

async function request(path, {method = "GET", body, authenticated = true, headers = {}} = {}, bindings = env()) {
  const authData = authenticated ? await auth() : {cookie: "", csrf: ""};
  const init = {method, headers: {...headers}};
  if (authData.cookie) init.headers.cookie = authData.cookie;
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers.origin ??= origin;
    init.headers["content-type"] ??= "application/json";
    init.headers["x-csrf-token"] ??= authData.csrf;
  }
  return worker.fetch(new Request(`${origin}${path}`, init), bindings);
}

test("serves assets without secrets but protects API configuration", async () => {
  const bindings = env({SESSION_SIGNING_KEY: undefined});
  const asset = await request("/", {authenticated: false}, bindings);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await request("/api/session", {authenticated: false}, bindings)).status, 503);
});

test("authenticates before inspecting an oversized body", async () => {
  const response = await request("/api/posts", {
    method: "POST", body: "x".repeat(300 * 1024), authenticated: false,
    headers: {"content-length": String(300 * 1024), origin, "content-type": "application/json"}
  });
  assert.equal(response.status, 401);
});

test("returns the session and supports list, get, and safe preview", async () => {
  const session = await request("/api/session");
  assert.equal(session.status, 200);
  assert.equal((await session.json()).authenticated, true);
  assert.equal((await request("/api/posts")).status, 200);
  assert.equal((await request("/api/posts/safe-post")).status, 200);
  const preview = await request("/api/preview", {method: "POST", body: post({body: "<script>x</script>"})});
  assert.equal(preview.status, 200);
  assert.doesNotMatch((await preview.json()).html, /<script>/);
});

test("lists configured categories and creates a normalized category", async () => {
  const bindings = env();
  const listed = await request("/api/categories", {}, bindings);
  assert.equal(listed.status, 200);
  assert.deepEqual(await listed.json(), {
    categories: [{name: "Systems", children: []}],
    sha: "categories-sha"
  });

  const created = await request("/api/categories", {
    method: "POST",
    body: {name: "  Game Client  ", sha: "categories-sha"}
  }, bindings);
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), {
    categories: [
      {name: "Systems", children: []},
      {name: "Game Client", children: []}
    ],
    sha: "categories-next",
    commitSha: "category-commit"
  });
  assert.deepEqual(bindings.GITHUB_CLIENT.calls, [
    ["categories", [
      {name: "Systems", children: []},
      {name: "Game Client", children: []}
    ], "categories-sha"]
  ]);
});

test("normalizes mixed legacy and nested categories without losing order", () => {
  assert.equal(typeof categoryService.normalizeCategoryTree, "function");
  assert.deepEqual(categoryService.normalizeCategoryTree([
    "Systems",
    {name: "Games", children: [{name: "Unity"}]}
  ]), [
    {name: "Systems", children: []},
    {name: "Games", children: [{name: "Unity"}]}
  ]);
});

test("rejects a third category level", () => {
  assert.equal(typeof categoryService.normalizeCategoryTree, "function");
  assert.throws(
    () => categoryService.normalizeCategoryTree([{name: "Games", children: [{name: "Unity", children: []}]}]),
    /two levels|invalid child/i
  );
});

test("creates a child under an existing parent", async () => {
  const bindings = env();
  const response = await request("/api/categories", {
    method: "POST",
    body: {parent: " systems ", name: " Linux ", sha: "categories-sha"}
  }, bindings);
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).categories, [
    {name: "Systems", children: [{name: "Linux"}]}
  ]);
});

test("rejects an unknown child parent and a duplicate sibling", async () => {
  const unknown = await request("/api/categories", {
    method: "POST",
    body: {parent: "Unknown", name: "Linux", sha: "categories-sha"}
  });
  assert.equal(unknown.status, 422);

  const client = fakeClient();
  client.getCategoryConfig = async () => ({
    sha: "categories-sha",
    categories: [{name: "Systems", children: [{name: "Linux"}]}]
  });
  const duplicate = await request("/api/categories", {
    method: "POST",
    body: {parent: "Systems", name: " linux ", sha: "categories-sha"}
  }, env({GITHUB_CLIENT: client}));
  assert.equal(duplicate.status, 422);
  assert.deepEqual(client.calls, []);
});

test("keeps parent and child categories that are already used by repository posts", async () => {
  const client = fakeClient();
  client.getCategoryConfig = async () => ({sha: "categories-sha", categories: ["Linux"]});
  client.getPost = async slug => ({
    sha: "old",
    source: serializePostSource(post({slug, category: "Systems", subcategory: "Networking"}))
  });
  const response = await request("/api/categories", {}, env({GITHUB_CLIENT: client}));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    categories: [
      {name: "Linux", children: []},
      {name: "Systems", children: [{name: "Networking"}]}
    ],
    sha: "categories-sha"
  });
});

test("rejects duplicate and unsafe category names without writing", async () => {
  const bindings = env();
  for (const name of [" systems ", "", "bad\nname", "x".repeat(81)]) {
    const response = await request("/api/categories", {
      method: "POST",
      body: {name, sha: "categories-sha"}
    }, bindings);
    assert.equal(response.status, 422);
  }
  assert.deepEqual(bindings.GITHUB_CLIENT.calls, []);
});

test("preserves category SHA conflict semantics", async () => {
  const client = fakeClient();
  client.getCategoryConfig = async () => ({sha: "categories-new", categories: ["Systems"]});
  client.writeCategoryConfig = async () => {
    throw new GitHubError("stale", {status: 409, code: "conflict"});
  };
  const response = await request("/api/categories", {
    method: "POST",
    body: {name: "Linux", sha: "categories-old"}
  }, env({GITHUB_CLIENT: client}));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, "conflict");
});

test("creates, updates, and deletes only validated posts with SHA concurrency", async () => {
  const bindings = env();
  assert.equal((await request("/api/posts", {method: "POST", body: post()}, bindings)).status, 201);
  assert.equal((await request("/api/posts/safe-post", {method: "PUT", body: {...post(), sha: "old"}}, bindings)).status, 200);
  assert.equal((await request("/api/posts/safe-post", {method: "DELETE", body: {sha: "old", confirmation: "safe-post"}}, bindings)).status, 200);
  assert.deepEqual(bindings.GITHUB_CLIENT.calls.map(call => call[0]), ["create", "update", "delete"]);
  assert.equal((await request("/api/posts/%252e%252e", {authenticated: true}, bindings)).status, 422);
});

test("rejects missing SHA, wrong origin, oversized authenticated bodies, and unknown methods", async () => {
  assert.equal((await request("/api/posts/safe-post", {method: "PUT", body: post()})).status, 422);
  assert.equal((await request("/api/posts/safe-post", {method: "PUT", body: {...post(), sha: "old"}, headers: {origin: "https://evil.example"}})).status, 403);
  assert.equal((await request("/api/posts", {method: "POST", body: "x".repeat(300 * 1024), headers: {"content-length": String(300 * 1024)}})).status, 413);
  assert.equal((await request("/api/posts", {method: "PATCH", body: {}})).status, 405);
  assert.equal((await request("/api/unknown")).status, 404);
});

test("starts OAuth, rejects mismatched state, and denies a non-owner", async () => {
  const bindings = env();
  const login = await request("/auth/login", {authenticated: false}, bindings);
  assert.equal(login.status, 302);
  const state = new URL(login.headers.get("location")).searchParams.get("state");
  const oauthCookie = login.headers.get("set-cookie").split(";")[0];

  const mismatch = await worker.fetch(new Request(`${origin}/auth/callback?code=x&state=wrong`, {headers: {cookie: oauthCookie}}), bindings);
  assert.equal(mismatch.status, 403);

  const deniedEnv = env({OAUTH_USER: async () => ({id: 1, login: "attacker"})});
  const denied = await worker.fetch(new Request(`${origin}/auth/callback?code=x&state=${state}`, {headers: {cookie: oauthCookie}}), deniedEnv);
  assert.equal(denied.status, 403);
  assert.match(denied.headers.get("set-cookie"), /Max-Age=0/);
});

test("completes owner OAuth and logs out through CSRF-protected POST", async () => {
  const bindings = env();
  const login = await request("/auth/login", {authenticated: false}, bindings);
  const state = new URL(login.headers.get("location")).searchParams.get("state");
  const oauthCookie = login.headers.get("set-cookie").split(";")[0];
  const callback = await worker.fetch(new Request(`${origin}/auth/callback?code=x&state=${state}`, {headers: {cookie: oauthCookie}}), bindings);
  assert.equal(callback.status, 302);
  assert.match(callback.headers.get("set-cookie"), /__Host-jh_admin=/);
  const logout = await request("/auth/logout", {method: "POST", body: {}}, bindings);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("preserves conflict and ambiguous-write semantics without retrying", async () => {
  for (const scenario of [
    {error: new GitHubError("stale", {status: 409, code: "conflict"}), status: 409, code: "conflict"},
    {error: new GitHubError("unknown", {status: 502, code: "ambiguous_write"}), status: 502, code: "ambiguous_write"}
  ]) {
    let calls = 0;
    const client = fakeClient();
    client.updatePost = async () => { calls += 1; throw scenario.error; };
    const response = await request("/api/posts/safe-post", {method: "PUT", body: {...post(), sha: "old"}}, env({GITHUB_CLIENT: client}));
    assert.equal(response.status, scenario.status);
    const payload = await response.json();
    assert.equal(payload.error.code, scenario.code);
    assert.equal(calls, 1);
  }
});

test("enforces rate limits and emits no-store request-correlated errors", async () => {
  const bindings = env({READ_RATE_LIMITER: {limit: async () => ({success: false})}});
  const response = await request("/api/posts", {}, bindings);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-request-id"), /^[A-Za-z0-9_-]+$/);
});

test("uses privacy-preserving, owner-scoped rate-limit keys", async () => {
  let authKey = "";
  const authBindings = env({AUTH_RATE_LIMITER: {limit: async ({key}) => { authKey = key; return {success: true}; }}});
  await worker.fetch(new Request(`${origin}/auth/login`, {headers: {"cf-connecting-ip": "203.0.113.9"}}), authBindings);
  assert.notEqual(authKey, "203.0.113.9");
  assert.match(authKey, /^[a-f0-9]{64}$/);

  let readKey = "";
  const readBindings = env({READ_RATE_LIMITER: {limit: async ({key}) => { readKey = key; return {success: true}; }}});
  await request("/api/posts", {}, readBindings);
  assert.match(readKey, /^51705815:[A-Za-z0-9_-]+$/);
});

test("audits auth failures without logging OAuth codes or query strings", async () => {
  const entries = [];
  const bindings = env({AUDIT_LOG: async entry => entries.push(entry)});
  const response = await worker.fetch(new Request(
    `${origin}/auth/callback?code=must-not-appear&state=wrong`,
    {headers: {"cf-connecting-ip": "203.0.113.9"}}
  ), bindings);
  assert.equal(response.status, 403);
  assert.equal(entries.length, 1);
  assert.deepEqual(Object.keys(entries[0]).sort(), ["addressHash", "method", "path", "requestId", "status"]);
  assert.equal(entries[0].path, "/auth/callback");
  assert.equal(entries[0].status, 403);
  assert.match(entries[0].addressHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(entries[0]), /must-not-appear|state=wrong/);
});
