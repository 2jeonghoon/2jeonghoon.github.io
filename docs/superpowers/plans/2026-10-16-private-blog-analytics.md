# Private Blog Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record page views privately and restrict writing, management and analytics to the existing GitHub owner.

**Architecture:** GitHub Pages sends anonymous, write-only view events to the existing Worker. D1 stores daily page counters. The existing owner session protects analytics reads and the workspace HTML; public management links are removed.

**Tech Stack:** Browser JavaScript, Cloudflare Workers/D1, SQLite, Node test runner, existing Wrangler.

**Spec:** `docs/superpowers/specs/2026-10-16-private-blog-analytics-design.md`

## Global Constraints

- Owner remains GitHub numeric ID `51705815`; preserve existing Origin, CSRF and signed HttpOnly session checks.
- D1 binding is `ANALYTICS_DB`; timezone is `Asia/Seoul`.
- Store only `day`, `page`, `views`; never visitor identifiers, IP, User-Agent, referrer or full URL in analytics.
- Same-tab refresh suppression is 30 minutes and timestamps are recorded only after successful collection.
- Public pages have no Write or Manage post links; owner uses the existing administrator URL.
- Missing analytics storage must not interrupt public rendering or editing.
- No public statistics read endpoint, cross-domain administrator cookie access or browser-stored credentials.
- No historical backfill; collection begins after deployment.

## Review Focus

1. Midnight in Korea must change the collection day even when the UTC day is unchanged.
2. Concurrent collection must increment counters atomically without losing updates.
3. An expired or wrong-owner session must not receive workspace HTML through `/index.html` or `/`.
4. Blocked storage or failed collection must preserve rendered content and permit retry after a failed request.
5. Unavailable D1 must show unavailable statistics rather than a misleading zero or failed editor initialization.

---

### Task 1: Daily counters and approved page manifest

**Files:** Create `worker/src/analytics.mjs`, `worker/migrations/0001_analytics.sql`, `scripts/build-analytics-pages.mjs`, `worker/src/analytics-pages.json`, `test/analytics.test.mjs`; modify `package.json`.

**Interfaces:** `koreaDay(now: number): string`, `recordView(db, page: string, now: number): Promise<void>`, `readAnalytics(db, now: number): Promise<{total:number,today:number,days:Array<{day:string,views:number}>,pages:Array<{page:string,views:number}>}>`. Manifest generator uses existing `compilePosts` and returns only published slugs. DB-facing functions accept the D1 prepare/bind/run/all interface.

- [ ] Write tests asserting `koreaDay(Date.UTC(2026,9,15,15)) === '2026-10-16'`, two writes to the same day/page produce 2, different pages aggregate correctly, and days has 30 entries including zero days. Exercise real SQLite through a D1-compatible test adapter, not SQL-string assertions.
- [ ] Test that drafts are absent from the manifest and invalid post metadata fails manifest generation.
- [ ] Run `node --test test/analytics.test.mjs` and confirm failures indicate missing behavior.
- [ ] Implement the schema with primary key `(day,page)` and integer counters; use one parameterized UPSERT per event. Use parameterized queries for all dates. Derive total and page aggregates from all records; return 30 Korean calendar days in ascending order and pages by views descending/page ascending.
- [ ] Implement the deterministic manifest generator using existing Markdown compilation. Provide `build:analytics-pages` and run it before Worker deployment, with no changes to the public build's output contract.
- [ ] Run `node --test test/analytics.test.mjs`; require all assertions to pass. Commit the task files.

### Task 2: Worker collection, private reads and workspace protection

**Files:** Modify `worker/src/index.mjs`, `worker/wrangler.toml`, `test/admin-api.test.mjs`; create `worker/public/login.html`, `test/analytics-api.test.mjs`.

**Interfaces:** `POST /api/analytics/view` accepts exactly `{page:string}` where page is `/` or an allowed public slug; returns 204. `GET /api/analytics` returns Task 1's object for the existing owner session. OPTIONS supports only the collection route and exact configured public Origin.

- [ ] Add failing request-level tests for valid collection, unknown/draft slug, bad Origin, wrong method, invalid JSON, non-JSON, body over 1 KiB, 429, absent/broken DB, and exact-origin preflight without credential headers. Assert no collection audit log entry is written.
- [ ] Add failing tests for owner-only analytics, wrong/forged/expired session rejection, and continued post API operation without D1. Assert analytics reads do not call GitHub.
- [ ] Add failing tests for anonymous `/` and `/index.html` receiving login-only HTML, and owner sessions receiving the workspace. Include query strings and expired sessions. Require `Cache-Control: no-store` and existing security headers on HTML responses.
- [ ] Run `node --test test/analytics-api.test.mjs test/admin-api.test.mjs` and inspect expected failures.
- [ ] Route collection before required administrator authentication, bound its read size to 1 KiB, validate exact input and manifest membership, enforce a separate per-address rate limiter, and set CORS only on collection/preflight responses. Do not include totals in collection responses or raw collection payloads in logs.
- [ ] Route analytics reads after owner verification/read limiting but before GitHub client creation. Keep existing editor APIs unchanged.
- [ ] Serve a dedicated script-free login document for missing/invalid sessions; only an owner session receives workspace HTML. Set Worker-first routing for HTML entry points including directory root. Reject unexpected non-GET HTML methods.
- [ ] Add the analytics rate-limiter binding and document D1 configuration without inserting a fabricated deployable database ID. Existing configuration remains deployable until a real ID is added; collection then reports storage unavailable.
- [ ] Run request tests and `npm run test:admin`; require all to pass. Commit task files.

### Task 3: Anonymous browser collection and private statistics UI

**Files:** Modify `blog.js`, `index.html`, `worker/public/index.html`, `worker/public/admin.js`, `worker/public/admin.css`, `test/blog.test.mjs`, `test/admin-ui.test.mjs`; create `test/analytics-browser.test.mjs`.

**Interfaces:** `trackView(browser, page): Promise<void>` reads the configured administrator URL, uses `credentials: 'omit'` and JSON, and never throws into page rendering. `renderAnalytics(document, data): void` populates owner-only counters/tables through DOM text APIs.

- [ ] Write failing tests that a valid home/article triggers one event, a missing article triggers none, same-page repeats within 30 minutes are suppressed, different pages are independent, and a failed request permits retry. Test pending-request suppression and sessionStorage read/write exceptions.
- [ ] Add failing tests asserting public header/article output omits Write/Manage post, including the built public page. Update old tests only where they intentionally assert the superseded public management link.
- [ ] Add failing UI tests for totals, zero dates, deterministic page order, malicious page labels rendered as text, and failed statistics leaving existing editor controls usable.
- [ ] Run new/affected tests and confirm failures correspond to missing behavior.
- [ ] Implement collection after successful rendering, using the existing validated admin URL policy and a per-page sessionStorage timestamp. Do not store a timestamp on failed responses; handle inaccessible storage by skipping collection. Add no dependencies.
- [ ] Remove public management links. Keep the `/admin/` handoff and administrator bookmark workflow.
- [ ] Add accessible private summary cards plus date/page tables with a refresh button, loading/error status and Korean day labels. Load analytics independently after authenticated startup; analytics errors never reach the editor's global error state.
- [ ] Run affected tests plus `npm run test:blog`; require all to pass. Commit task files.

### Task 4: Operational setup and final verification

**Files:** Modify `README.md`, update this plan's task checkboxes and validation notes.

**Interfaces:** Existing `deploy:admin` runs manifest generation before Wrangler deploy. Document D1 creation, real ID binding, migrations, Worker deployment and Pages deployment in that order, and explain that newly published slugs require a refreshed manifest/Worker deployment.

- [ ] Document the metrics definition, 30-minute same-tab suppression, privacy, collection start date, administrator bookmark, storage-unavailable behavior, and rollback that preserves the D1 database.
- [ ] Run `npm run validate:blog`, the real SQLite-backed analytics tests, `git diff --check`, and a Wrangler dry run. Record exact results and any unavailable tooling.
- [ ] If Cloudflare credentials are available, create the dedicated D1 database, bind its real ID, apply the migration, and deploy the Worker. Never print credentials. If access is unavailable, preserve implementation and report the exact remaining setup.
- [ ] Verify deployed anonymous analytics reads are rejected and login HTML excludes workspace; verify public-origin collection succeeds after DB provisioning. Confirm Pages deployment separately and do not claim public changes are live without evidence.
- [ ] Review all changed authentication/collection paths against the spec and resolve discovered issues. Record any owner-login verification requiring the user's browser session.
- [ ] Commit verified implementation changes; report tests, deployment status and material limitations without claiming unperformed checks.

## Plan self-review

All spec sections map to Tasks 1–4. Korean midnight, concurrent writes, alternate HTML paths, storage failures and independent editor operation have explicit behavioral tests. No new frontend dependency, credential storage, public statistics endpoint or domain migration is required. Actual production provisioning is contingent on available account access, not a fabricated configuration.
