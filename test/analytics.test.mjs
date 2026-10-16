import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {sqliteD1} from "./helpers/sqlite-d1.mjs";

test("uses Korean midnight for daily counters", async () => {
  const service = await import("../worker/src/analytics.mjs");
  assert.equal(service.koreaDay(Date.UTC(2026, 9, 15, 14, 59, 59)), "2026-10-15");
  assert.equal(service.koreaDay(Date.UTC(2026, 9, 15, 15)), "2026-10-16");
});

test("real SQL increments counters and returns lifetime, today and zero-filled 30 days", async () => {
  const {recordView, readAnalytics} = await import("../worker/src/analytics.mjs");
  const db = sqliteD1();
  try {
    const now = Date.UTC(2026, 9, 15, 15);
    await Promise.all(Array.from({length: 20}, () => recordView(db, "alpha", now)));
    await recordView(db, "/", now);
    await recordView(db, "beta", now - 86400000);
    await recordView(db, "deleted", now - 90 * 86400000);
    const data = await readAnalytics(db, now);
    assert.equal(data.total, 23);
    assert.equal(data.today, 21);
    assert.equal(data.days.length, 30);
    assert.deepEqual(data.days[0], {day: "2026-09-17", views: 0});
    assert.deepEqual(data.days.at(-1), {day: "2026-10-16", views: 21});
    assert.deepEqual(data.pages, [
      {page: "alpha", views: 20}, {page: "/", views: 1},
      {page: "beta", views: 1}, {page: "deleted", views: 1}
    ]);
  } finally { db.close(); }
});

test("builds a public-only manifest and rejects invalid post metadata", async () => {
  const {buildAnalyticsPages} = await import("../scripts/build-analytics-pages.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "jh-analytics-"));
  try {
    await mkdir(path.join(root, "posts"));
    await writeFile(path.join(root, "posts/public.md"), '---\ntitle: Public\ndescription: Description\ndate: 2026-10-16\ncategory: Test\ntags: [test]\ndraft: false\nfeatured: false\naiGenerated: false\n---\nBody');
    await writeFile(path.join(root, "posts/private.md"), '---\ndraft: true\nfeatured: false\naiGenerated: false\n---\nSecret');
    assert.deepEqual(await buildAnalyticsPages(root), ["public"]);
    await writeFile(path.join(root, "posts/broken.md"), '---\ntitle: Broken\n---\nBody');
    await assert.rejects(buildAnalyticsPages(root), /broken/);
  } finally { await rm(root, {recursive: true, force: true}); }
});
