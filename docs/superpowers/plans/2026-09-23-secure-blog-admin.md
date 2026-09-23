# Secure Blog Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloudflare Worker-hosted, GitHub-authenticated admin application that lets the repository owner safely create, preview, update, publish, and delete Markdown blog posts.

**Architecture:** The public GitHub Pages site links to an admin application whose UI and API share one Cloudflare Worker origin. The Worker verifies the owner's immutable GitHub ID, keeps all credentials server-side, validates every post against the same contract as the static build, and uses a single-repository GitHub App installation token to commit only `posts/<slug>.md` on `main`.

**Tech Stack:** Node.js 20+, Node built-in test runner, vanilla HTML/CSS/JavaScript, `gray-matter`, `markdown-it`, Cloudflare Workers/Wrangler 4.36+, Web Crypto, GitHub App OAuth, GitHub Contents REST API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-23-secure-blog-admin-design.md`

## Fixed constraints

- Owner GitHub user ID: `51705815`.
- Repository: `2jeonghoon/2jeonghoon.github.io`, ID `781249964`, branch `main`.
- Writable paths: validated `posts/<slug>.md` only.
- GitHub App permission: Metadata read and Contents read/write; no Actions, Administration, Workflows, Discussions, or webhook permission.
- Secrets exist only as Cloudflare secret bindings. Never expose them to browser code, logs, fixtures, commits, or `.dev.vars` tracked by Git.
- Session cookie is `__Host-` prefixed, `Secure`, `HttpOnly`, `SameSite=Lax`, with 30-minute idle and 8-hour absolute lifetime.
- Mutation requests require a valid session, exact `Origin`, JSON content type, and CSRF token.
- Request body limit is 256 KiB. Reads and writes use independent rate-limit bindings.
- Existing untracked `tmp/` is user-owned and must remain untouched.

## Review focus

1. Encoded or double-encoded traversal, slashes, uppercase characters, and backslashes must never form a GitHub path (Tasks 1 and 4).
2. Forged, expired, or wrong-owner sessions must be rejected (Task 2).
3. OAuth state replay/mismatch and non-owner authorization must fail closed (Task 4).
4. Stale SHA and duplicate-slug writes must return `409` and never overwrite content (Tasks 3 and 4).
5. Ambiguous GitHub write timeouts must not be retried or reported as success (Tasks 4 and 5).

## Task 1: Extract a shared post contract

**Files:**
- Create: `lib/post-contract.mjs`
- Create: `test/post-contract.test.mjs`
- Modify: `lib/posts.mjs`

- [ ] Write failing tests for `validateSlug`, `validatePostInput`, `parsePostSource`, and `serializePostSource`.

Cover a valid parse/serialize/parse round trip; boolean `draft`; required published metadata; maximum lengths; safe image paths; and rejection of `../escape`, `%2e%2e`, `%252e%252e`, `Bad-Slug`, `a/b`, `a\\b`, and `a_b`.

- [ ] Run `node --test test/post-contract.test.mjs` and confirm it fails because the module does not exist.
- [ ] Implement these runtime-neutral exports:

```js
validateSlug(slug)                 // returns normalized slug or throws ContractError
validatePostInput(input)           // returns a normalized post object
parsePostSource({ filePath, source })
serializePostSource(input)         // deterministic UTF-8 Markdown source
```

Use `gray-matter`; a lowercase ASCII slug expression; date validation; and limits `{ title: 200, description: 600, category: 80, tag: 60, body: 240 * 1024 }`. Do not accept an encoded value and then decode it into a path.

- [ ] Refactor `lib/posts.mjs` to delegate source validation/parsing to the shared contract while preserving current generated output.
- [ ] Run `node --test test/post-contract.test.mjs test/posts.test.mjs` and `npm run build:blog`.
- [ ] Commit with `git commit -m "refactor: share blog post contract"`.

## Task 2: Implement security primitives

**Files:**
- Modify: `.gitignore`
- Create: `worker/src/security.mjs`
- Create: `test/admin-security.test.mjs`

- [ ] Add failing unit tests for signed sessions, cookie serialization, expiry, origin checks, JSON content type, CSRF checks, and security headers.

Test a modified signature, wrong owner ID, 30-minute idle expiry, 8-hour absolute expiry, clock-boundary cases, missing/incorrect Origin, and missing/incorrect CSRF token.

- [ ] Run `node --test test/admin-security.test.mjs` and confirm the missing-module failure.
- [ ] Add `.dev.vars`, `.dev.vars.*`, `.wrangler/`, and `worker/.wrangler/` to `.gitignore`.
- [ ] Implement:

```js
createOAuthState()
timingSafeEqual(a, b)
issueSession({ ownerId, now, secret })
verifySession({ cookie, ownerId, now, secret })
serializeSessionCookie(value)
expireSessionCookie()
assertMutationRequest(request, session, expectedOrigin)
securityHeaders()
jsonResponse(body, init)
```

Sign opaque, versioned session data with HMAC-SHA-256 using Web Crypto. Rotate the idle timestamp only after successful authenticated requests. Never place access tokens in the session.

- [ ] Apply CSP `default-src 'self'; connect-src 'self'; img-src 'self' data: https://2jeonghoon.github.io; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self' https://github.com; frame-ancestors 'none'`, plus `nosniff`, strict referrer policy, permissions policy, and `Cache-Control: no-store` for auth/API responses.
- [ ] Run `node --test test/admin-security.test.mjs` and commit `feat: secure admin sessions and requests`.

## Task 3: Build the repository-bound GitHub client

**Files:**
- Create: `worker/src/github.mjs`
- Create: `test/admin-github.test.mjs`

- [ ] Write failing tests using injected `fetch`, clock, and Web Crypto dependencies.

Cover RS256 app-JWT claims (`iat = now - 60`, `exp = now + 540`); OAuth code exchange; `/user`; repository-ID verification; installation-token request restricted to repository `781249964` and `{ contents: "write" }`; Unicode Base64; mandatory current SHA for update/delete; duplicate/stale conflict mapping; and exactly one fetch for every write.

- [ ] Run `node --test test/admin-github.test.mjs` and confirm the missing-module failure.
- [ ] Implement a client fixed to owner `2jeonghoon`, repository `2jeonghoon.github.io`, repository ID `781249964`, and branch `main`.
- [ ] Export `exchangeOAuthCode`, `fetchOAuthUser`, `createInstallationToken`, and `createGitHubContentsClient` with methods `listPostEntries`, `getPost`, `createPost`, `updatePost`, and `deletePost`.
- [ ] Construct GitHub paths only from Task 1's validated raw slug. Map GitHub `404`, `409`, `422`, rate-limit, and network/ambiguous errors to typed errors. Never automatically retry a mutation.
- [ ] Run `node --test test/admin-github.test.mjs` and commit `feat: add repository-bound GitHub client`.

## Task 4: Add the Worker routes and API

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/post-service.mjs`
- Create: `worker/src/index.mjs`
- Create: `test/admin-api.test.mjs`

- [ ] Install exact dev dependency `wrangler@4.36.0`; add scripts `test:admin`, `dev:admin`, and `deploy:admin`.
- [ ] Configure `worker/wrangler.toml` with `compatibility_date = "2026-09-23"`, `nodejs_compat`, `worker/public` assets, `ASSETS` binding, and Worker-first routing for `/auth/*` and `/api/*`.
- [ ] Configure non-secret vars for the fixed owner/repository/branch and rate-limit bindings: auth namespace `1001` at 5/minute/address, reads `1002` at 120/minute/session, and mutations `1003` at 10/minute/session.
- [ ] Write failing request-level tests for:
  - `GET /auth/login`, `GET /auth/callback`, `POST /auth/logout`;
  - `GET /api/session`, `GET /api/posts`, `GET /api/posts/:slug`;
  - `POST /api/preview`, `POST /api/posts`, `PUT /api/posts/:slug`, `DELETE /api/posts/:slug`;
  - authentication before body parsing, 256-KiB rejection, exact routes/methods, non-owner OAuth, replayed/mismatched state, rate limits, security/no-store headers, invalid slugs, safe preview, stale SHA, and ambiguous write failure.
- [ ] Run `node --test test/admin-api.test.mjs` and confirm missing implementations fail.
- [ ] Implement OAuth state as a short-lived signed `__Host-` cookie, consume it once at the exact callback, and authorize only numeric user ID `51705815`.
- [ ] Implement request-ID propagation and structured error envelopes without secrets or post bodies. Missing secret bindings return `503` for auth/API routes while static assets remain available.
- [ ] Require `sha` for update/delete. Create returns `409` if the slug exists; stale SHA returns `409`; an ambiguous write returns `502` with request ID and no retry.
- [ ] Run `npm run test:admin` and commit `feat: add secure blog admin API`.

## Task 5: Build the same-origin admin interface

**Files:**
- Create: `worker/public/index.html`
- Create: `worker/public/admin.css`
- Create: `worker/public/admin.js`
- Create: `test/admin-ui.test.mjs`

- [ ] Write failing DOM/source-contract tests for accessible controls, signed-out and signed-in states, post listing, editor state, preview, exact-slug delete confirmation, and mobile layout.
- [ ] Test that every mutation uses same-origin `fetch`, JSON, CSRF, and server-returned SHA; that neither Web Storage nor embedded credentials are used; and that form data remains after `401`, `409`, `422`, `429`, and `502` errors.
- [ ] Run `node --test test/admin-ui.test.mjs` and confirm failure.
- [ ] Implement an external-script-only UI with GitHub sign-in, published/draft filters, new post, Markdown editor, metadata fields, validation messages, preview, save/publish controls, deployment/commit links, and logout.
- [ ] Make slug immutable after creation. Require the user to retype the exact slug in the delete dialog.
- [ ] Debounce preview by 300 ms and cancel obsolete preview requests with `AbortController`. Preserve the current model whenever a request fails, especially ambiguous writes.
- [ ] Export pure state/request helpers from `admin.js` in a browser-safe UMD pattern so Node tests cover request construction without browser secrets.
- [ ] Run `npm run test:admin`; run `npm run dev:admin`; verify static UI loads and secret-dependent endpoints return a helpful `503` in an unconfigured local environment.
- [ ] Commit `feat: add blog admin interface`.

## Task 6: Connect the public blog

**Files:**
- Create: `admin/index.html`
- Modify: `blog.config.js`
- Modify: `blog.js`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `scripts/build-blog.mjs`
- Modify: `test/blog-config.test.mjs`
- Modify: `test/blog-ui.test.mjs`
- Modify: `README.md`

- [ ] Add failing tests for an optional safe HTTPS `adminUrl`, rejection of `javascript:`/non-HTTPS URLs, and preservation of a valid `?edit=<slug>` handoff.
- [ ] Test navigation labels: `Notes` scrolls to `#writing`, `Write` opens `/admin/`, and an article's owner-only `Manage post` link passes its validated slug.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement `admin/index.html` as a no-inline-script handoff page. Redirect only to an HTTPS `.workers.dev` target from trusted config; show a clear unavailable state when it is not configured.
- [ ] Add `adminUrl: ""` to the config initially. Ensure public readers never see a token or privileged API and existing article/comment behavior is unchanged.
- [ ] Add `admin` to the build allowlist, then run `npm run test:blog`, `npm run build:blog`, and the repository's legacy regression test.
- [ ] Commit `feat: connect blog to secure admin`.

## Task 7: Configure GitHub App and deploy the Worker

**External state:** Cloudflare account, private GitHub App, GitHub App installation, Worker secrets, public `blog.config.js`.

- [ ] Run a clean local gate: `npm ci`, `npm run test:admin`, `npm run test:blog`, and `npm run build:blog`.
- [ ] Authenticate Wrangler and deploy once to obtain the stable `https://<name>.<subdomain>.workers.dev` origin.
- [ ] Create a private GitHub App named `JH.LOG Admin` with that origin as homepage and exact `/auth/callback`; enable expiring user tokens and authorization during installation; disable webhooks and device flow; allow only Metadata read and Contents read/write.
- [ ] Install it only on repository `2jeonghoon/2jeonghoon.github.io`. Confirm the installation repository ID is `781249964`.
- [ ] Store `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, and a random 32-byte-or-longer `SESSION_SIGNING_KEY` using `wrangler secret put`. Keep the PEM outside the repository.
- [ ] Redeploy. Verify the public admin asset loads, unauthenticated API returns `401`, and login/callback rejects a mismatched state.
- [ ] Put the verified Worker origin in `blog.config.js`, document setup/rotation in `README.md`, rerun all local tests, and commit `chore: enable secure blog admin`.
- [ ] Push `main` only after the Worker is usable, so the Pages `Write` link never points to an unavailable destination.

## Task 8: Live acceptance, abuse probes, and recovery runbook

**Files:**
- Modify: `README.md`

- [ ] Sign in as the owner and create draft `admin-acceptance-test`; confirm the file is committed but absent from the public feed, sitemap, and post list.
- [ ] Open the draft in two tabs. Save in the first, then confirm the stale second tab gets `409` and does not overwrite the first edit.
- [ ] Publish it, wait for Pages deployment, and verify the article, feed, sitemap, comments, and AI disclosure behavior. A manually authored acceptance post must not falsely claim Agent authorship.
- [ ] Probe logged-out writes, wrong Origin, missing CSRF, oversized body, invalid/encoded slugs, duplicate create, stale SHA, and the configured rate limits. Confirm no request can address a path outside `posts/*.md`.
- [ ] Delete only after retyping `admin-acceptance-test`; verify public removal after deployment and prove the deleted Markdown is recoverable from Git history.
- [ ] Document daily operation, deployment troubleshooting, deletion recovery, GitHub App revocation, Cloudflare secret rotation, session-key rotation, rate-limit adjustment, and free-tier monitoring in `README.md`.
- [ ] Run the final verification gate:

```sh
npm ci
npm run test:admin
npm run test:blog
npm run build:blog
node --check worker/public/admin.js
node --check worker/src/index.mjs
xmllint --noout _site/feed.xml _site/sitemap.xml
git diff --check
git status --short
```

- [ ] Request a security-focused review against the five Review focus items. Resolve every high/medium finding, rerun the complete gate, and commit `docs: add blog admin operations runbook`.
- [ ] Use `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch` to report the deployment and integration state accurately.

## Definition of done

- Only GitHub user ID `51705815` can obtain an admin session.
- Browser code and public files contain no GitHub or Cloudflare secret.
- All mutations are session-, Origin-, CSRF-, schema-, path-, size-, concurrency-, and rate-limit-protected.
- Create/update/delete affect only validated `posts/<slug>.md` on `main`, and ambiguous writes are never automatically retried.
- Owner can perform the full authoring flow from mobile or desktop; public GitHub Pages remains a static, working blog.
- Tests and live probes demonstrate conflict handling, abuse resistance, deployment, deletion, and Git-history recovery.
