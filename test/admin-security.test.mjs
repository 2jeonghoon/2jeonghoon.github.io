import assert from "node:assert/strict";
import {test} from "node:test";

import {
  SecurityError,
  assertMutationRequest,
  createOAuthState,
  expireSessionCookie,
  issueSession,
  jsonResponse,
  securityHeaders,
  serializeSessionCookie,
  timingSafeEqual,
  verifySession
} from "../worker/src/security.mjs";

const secret = "test-only-signing-key-with-at-least-32-bytes";
const ownerId = "51705815";
const start = Date.UTC(2026, 8, 23, 1, 0, 0);

test("issues and verifies an owner-bound signed session", async () => {
  const token = await issueSession({ownerId, now: start, secret});
  const session = await verifySession({cookie: token, ownerId, now: start + 60_000, secret});
  assert.equal(session.ownerId, ownerId);
  assert.match(session.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.ok(!token.includes(ownerId));
});

test("rejects forged and wrong-owner sessions", async () => {
  const token = await issueSession({ownerId, now: start, secret});
  await assert.rejects(
    verifySession({cookie: `${token.slice(0, -1)}x`, ownerId, now: start, secret}),
    /invalid session/i
  );
  await assert.rejects(
    verifySession({cookie: token, ownerId: "1", now: start, secret}),
    /invalid session/i
  );
});

test("enforces idle and absolute session boundaries", async () => {
  const token = await issueSession({ownerId, now: start, secret});
  await assert.doesNotReject(
    verifySession({cookie: token, ownerId, now: start + 30 * 60_000, secret})
  );
  await assert.rejects(
    verifySession({cookie: token, ownerId, now: start + 30 * 60_000 + 1, secret}),
    /expired/i
  );

  const refreshed = await issueSession({
    ownerId,
    now: start + 7.75 * 60 * 60_000,
    issuedAt: start,
    secret
  });
  await assert.doesNotReject(
    verifySession({cookie: refreshed, ownerId, now: start + 8 * 60 * 60_000, secret})
  );
  await assert.rejects(
    verifySession({cookie: refreshed, ownerId, now: start + 8 * 60 * 60_000 + 1, secret}),
    /expired/i
  );
});

test("creates unpredictable state and compares values without prefix matches", () => {
  assert.notEqual(createOAuthState(), createOAuthState());
  assert.equal(timingSafeEqual("same", "same"), true);
  assert.equal(timingSafeEqual("same", "same-longer"), false);
  assert.equal(timingSafeEqual("same", "samp"), false);
});

test("serializes a hardened host cookie and an expiry cookie", () => {
  assert.equal(
    serializeSessionCookie("token"),
    "__Host-jh_admin=token; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800"
  );
  assert.match(expireSessionCookie(), /^__Host-jh_admin=;.*Max-Age=0/);
});

test("requires exact origin, JSON, and session CSRF for mutations", () => {
  const request = new Request("https://admin.example/api/posts", {
    method: "POST",
    headers: {
      origin: "https://admin.example",
      "content-type": "application/json; charset=utf-8",
      "x-csrf-token": "csrf"
    },
    body: "{}"
  });
  assert.doesNotThrow(() => assertMutationRequest(request, {csrfToken: "csrf"}, "https://admin.example"));

  for (const headers of [
    {origin: "https://evil.example", "content-type": "application/json", "x-csrf-token": "csrf"},
    {origin: "https://admin.example", "content-type": "text/plain", "x-csrf-token": "csrf"},
    {origin: "https://admin.example", "content-type": "application/json"}
  ]) {
    const bad = new Request("https://admin.example/api/posts", {method: "POST", headers, body: "{}"});
    assert.throws(() => assertMutationRequest(bad, {csrfToken: "csrf"}, "https://admin.example"), SecurityError);
  }
});

test("applies restrictive headers to JSON responses", async () => {
  const headers = securityHeaders();
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "no-referrer");

  const response = jsonResponse({ok: true}, {status: 201});
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(await response.json(), {ok: true});
});
