import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import {test} from "node:test";

const require = createRequire(import.meta.url);
const {JSDOM} = require("jsdom");
const app = require("../blog.js");
const ui = require("../worker/public/admin.js");
const adminUrl = "https://jh-log-admin.2jeonghoon.workers.dev";

function browserFixture() {
  const values = new Map();
  const requests = [];
  let time = 100000000;
  const browser = {
    BLOG_CONFIG: {adminUrl}, Date: {now: () => time},
    sessionStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)},
    async fetch(url, options) { requests.push({url, options}); return {ok: true}; }
  };
  return {browser, requests, advance: milliseconds => { time += milliseconds; }};
}

test("suppresses same-tab refreshes for 30 minutes while pages remain independent", async () => {
  assert.equal(typeof app.trackView, "function");
  const {browser, requests, advance} = browserFixture();
  await app.trackView(browser, "/");
  await app.trackView(browser, "/");
  await app.trackView(browser, "alpha");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, adminUrl + "/api/analytics/view");
  assert.equal(requests[0].options.credentials, "omit");
  assert.deepEqual(JSON.parse(requests[0].options.body), {page: "/"});
  advance(30 * 60000);
  await app.trackView(browser, "/");
  assert.equal(requests.length, 3);
});

test("failed or pending requests do not cause permanent suppression or duplicate events", async () => {
  assert.equal(typeof app.trackView, "function");
  const {browser} = browserFixture();
  let complete;
  let count = 0;
  browser.fetch = () => { count++; return new Promise(resolve => { complete = resolve; }); };
  const pending = app.trackView(browser, "/");
  await app.trackView(browser, "/");
  assert.equal(count, 1);
  complete({ok: false});
  await pending;
  browser.fetch = async () => { count++; throw new Error("offline"); };
  await app.trackView(browser, "/");
  browser.fetch = async () => { count++; return {ok: true}; };
  await app.trackView(browser, "/");
  assert.equal(count, 3);
});

test("blocked storage and unsafe destinations never break rendering", async () => {
  assert.equal(typeof app.trackView, "function");
  const {browser, requests} = browserFixture();
  Object.defineProperty(browser, "sessionStorage", {get() { throw new Error("blocked"); }});
  await app.trackView(browser, "/");
  assert.equal(requests.length, 0);
  const fixture = browserFixture();
  fixture.browser.BLOG_CONFIG.adminUrl = "https://evil.example";
  await app.trackView(fixture.browser, "/");
  assert.equal(fixture.requests.length, 0);
});

test("tracks rendered home and valid articles but not missing articles, with no management links", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const [search, count] of [["", 1], ["?post=alpha", 1], ["?post=missing", 0]]) {
    const dom = new JSDOM(source, {url: "https://2jeonghoon.github.io/" + search});
    try {
      // The repository's existing jsdom predates this standard DOM method.
      dom.window.Element.prototype.replaceChildren = function (...children) {
        while (this.firstChild) this.removeChild(this.firstChild);
        children.forEach(child => this.appendChild(child));
      };
      const requests = [];
      dom.window.BLOG_CONFIG = {adminUrl};
      dom.window.BLOG_POSTS = [{slug: "alpha", title: "Alpha", description: "Description", date: "2026-10-16", category: "Test", tags: [], content: "<p>Body</p>"}];
      dom.window.fetch = async (...args) => { requests.push(args); return {ok: true}; };
      app.bootstrap(dom.window, dom.window.document);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(requests.length, count);
      assert.equal(dom.window.document.querySelector('nav a[href="./admin/"]'), null);
      assert.equal(dom.window.document.querySelector(".manage-link"), null);
      if (search === "?post=alpha") assert.match(dom.window.document.querySelector(".article-body").textContent, /Body/);
    } finally { dom.window.close(); }
  }
});

test("private statistics renders totals, dates and hostile page labels as text", async () => {
  assert.equal(typeof ui.renderAnalytics, "function");
  const html = await readFile(new URL("../worker/public/index.html", import.meta.url), "utf8");
  const dom = new JSDOM(html);
  try {
    ui.renderAnalytics(dom.window.document, {
      total: 12, today: 3,
      days: [{day: "2026-10-15", views: 0}, {day: "2026-10-16", views: 3}],
      pages: [{page: "<img src=x onerror=alert(1)>", views: 12}]
    });
    const document = dom.window.document;
    assert.equal(document.getElementById("analytics-total").textContent, "12");
    assert.equal(document.getElementById("analytics-today").textContent, "3");
    assert.equal(document.querySelectorAll("#analytics-days tr").length, 2);
    assert.match(document.getElementById("analytics-pages").textContent, /<img src=x/);
    assert.equal(document.querySelector("#analytics-pages img"), null);
  } finally { dom.window.close(); }
});

test("unavailable statistics does not prevent authenticated editing and refresh recovers", async () => {
  const html = await readFile(new URL("../worker/public/index.html", import.meta.url), "utf8");
  const source = await readFile(new URL("../worker/public/admin.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {url: adminUrl});
  let available = false;
  const context = vm.createContext({module: {exports: {}}, document: dom.window.document, location: dom.window.location, URL, setTimeout, clearTimeout,
    fetch: async path => {
      const data = path === "/api/session" ? {authenticated: true, csrfToken: "csrf"} :
        path === "/api/categories" ? {categories: [], sha: "current"} :
        path === "/api/posts" ? {posts: []} : available ? {total: 0, today: 0, days: [], pages: []} : {error: {message: "Request failed"}};
      return {ok: path !== "/api/analytics" || available, status: available ? 200 : 503, json: async () => data};
    }});
  try {
    vm.runInContext(source, context);
    await context.module.exports.bootstrap(dom.window.document);
    await new Promise(resolve => setImmediate(resolve));
    const document = dom.window.document;
    assert.equal(document.getElementById("workspace").hidden, false);
    assert.equal(document.getElementById("validation").textContent, "");
    assert.match(document.getElementById("analytics-status").textContent, /불러오지 못|사용할 수 없/);
    assert.equal(document.getElementById("analytics-total").textContent, "—");
    assert.equal(document.getElementById("post-slug").disabled, false);
    available = true;
    document.getElementById("refresh-analytics").click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(document.getElementById("analytics-total").textContent, "0");
  } finally { dom.window.close(); }
});


test("comments render safely, acknowledge explicitly, and preserve acknowledgement on failure", async () => {
  const html = await readFile(new URL("../worker/public/index.html", import.meta.url), "utf8");
  const source = await readFile(new URL("../worker/public/admin.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {url: adminUrl});
  let available = true;
  const comment = {id: "one", author: "reader", body: "<img src=x onerror=alert(1)>", createdAt: "2026-10-19T00:00:00Z", slug: "safe-post", url: "https://github.com/2jeonghoon/2jeonghoon.github.io/discussions/1#discussioncomment-1"};
  const context = vm.createContext({module: {exports: {}}, document: dom.window.document, location: dom.window.location, localStorage: dom.window.localStorage, URL, setTimeout, clearTimeout,
    fetch: async path => ({ok: path !== "/api/comments" || available, status: 503, json: async () =>
      path === "/api/session" ? {authenticated: true, csrfToken: "csrf"} :
      path === "/api/categories" ? {categories: [], sha: "current"} :
      path === "/api/posts" ? {posts: []} :
      path === "/api/comments" ? {comments: [comment], limited: false} : {total: 0, today: 0, days: [], pages: []}})});
  try {
    vm.runInContext(source, context);
    await context.module.exports.bootstrap(dom.window.document);
    await new Promise(resolve => setImmediate(resolve));
    const document = dom.window.document;
    assert.equal(document.getElementById("comments-count").textContent, "새 댓글 1");
    assert.equal(document.querySelector("#comment-list img"), null);
    assert.match(document.getElementById("comment-list").textContent, /<img/);
    assert.equal(document.querySelector('#comment-list a:last-child').href, "https://2jeonghoon.github.io/?post=safe-post");
    assert.equal(dom.window.localStorage.length, 0);
    document.getElementById("read-comments").click();
    assert.equal(document.getElementById("comments-count").textContent, "");
    assert.equal(dom.window.localStorage.getItem("jh-admin-comments-seen"), comment.createdAt);
    available = false;
    document.getElementById("refresh-comments").click();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(document.getElementById("comments-status").textContent, /불러오지 못/);
    assert.equal(dom.window.localStorage.getItem("jh-admin-comments-seen"), comment.createdAt);
    assert.equal(document.getElementById("workspace").hidden, false);
  } finally { dom.window.close(); }
});


test("category failure does not hide published and draft post lists or show a false login prompt", async () => {
  const html = await readFile(new URL("../worker/public/index.html", import.meta.url), "utf8");
  const source = await readFile(new URL("../worker/public/admin.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {url: adminUrl});
  const context = vm.createContext({module: {exports: {}}, document: dom.window.document, location: dom.window.location, URL, setTimeout, clearTimeout,
    fetch: async path => ({ok: path !== "/api/categories", status: path === "/api/categories" ? 502 : 200, json: async () =>
      path === "/api/session" ? {authenticated: true, csrfToken: "csrf"} :
      path === "/api/categories" ? {error: {message: "Category unavailable"}} :
      path === "/api/posts" ? {posts: [{slug: "published", title: "Published post", draft: false}, {slug: "draft", title: "Draft post", draft: true}]} :
      path === "/api/comments" ? {comments: [], limited: false} : {total: 0, today: 0, days: [], pages: []}})});
  try {
    vm.runInContext(source, context);
    await context.module.exports.bootstrap(dom.window.document);
    const document = dom.window.document;
    assert.match(document.getElementById("post-list").textContent, /Published post/);
    assert.match(document.getElementById("post-list").textContent, /Draft post/);
    assert.equal(document.getElementById("signed-out").hidden, true);
    assert.match(document.getElementById("category-status").textContent, /불러오지 못/);
  } finally { dom.window.close(); }
});
