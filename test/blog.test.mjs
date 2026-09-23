import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {after, test} from "node:test";

const require = createRequire(import.meta.url);
const genericNode = {
  innerHTML: "",
  textContent: "",
  addEventListener() {},
  querySelector() {
    return this;
  },
  querySelectorAll() {
    return [];
  }
};

global.window = {
  BLOG_POSTS: [],
  BLOG_CONFIG: {},
  location: {search: ""}
};
global.document = {
  getElementById() {
    return genericNode;
  },
  querySelector() {
    return {setAttribute() {}};
  }
};

const {
  createAdminUrl,
  escapeHtml,
  mountGiscus,
  renderAiDisclosure,
  renderCommentsShell
} = require("../blog.js");

test("creates only safe workers.dev admin edit URLs", () => {
  assert.equal(createAdminUrl("https://jh-log.example.workers.dev", "safe-post"), "https://jh-log.example.workers.dev/?edit=safe-post");
  for (const value of ["", "javascript:alert(1)", "http://bad.workers.dev", "https://example.com"]) assert.equal(createAdminUrl(value, "safe-post"), "");
  assert.equal(createAdminUrl("https://jh-log.example.workers.dev", "../bad"), "");
});

after(() => {
  delete global.window;
  delete global.document;
});

const completeConfig = {
  repo: "2jeonghoon/2jeonghoon.github.io",
  repoId: "R_testRepo",
  category: "Blog Comments",
  categoryId: "DIC_testCategory"
};

function commentFixture() {
  const status = {
    textContent: "",
    removed: false,
    remove() {
      this.removed = true;
    }
  };
  let script;
  const ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "script");
      script = {dataset: {}};
      return script;
    }
  };
  const container = {
    ownerDocument,
    textContent: "previous",
    children: [{old: true}],
    appended: [],
    replaceChildren() {
      this.children = [];
      this.textContent = "";
    },
    querySelector(selector) {
      assert.equal(selector, ".comments-status");
      return status;
    },
    appendChild(node) {
      this.appended.push(node);
    },
    set innerHTML(value) {
      this._innerHTML = value;
      this.textContent = value;
    },
    get innerHTML() {
      return this._innerHTML ?? "";
    }
  };
  return {container, status, get script() { return script; }};
}

test("shows the exact disclosure for Agent-generated posts", () => {
  assert.match(
    renderAiDisclosure({aiGenerated: true}),
    /이 글은 Agent가 제공된 정보를 기반으로 작성했습니다\./
  );
  assert.equal(renderAiDisclosure({aiGenerated: false}), "");
});

test("escapes front matter before inserting it into HTML", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> & notes'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; notes"
  );
});

test("renders an accessible comments shell", () => {
  const output = renderCommentsShell();
  assert.match(output, /data-comments/);
  assert.match(output, /댓글/);
});

test("maps Giscus to the immutable slug", () => {
  const fixture = commentFixture();
  mountGiscus(fixture.container, {slug: "stable-slug"}, completeConfig);
  const {script} = fixture;
  assert.equal(script.dataset.mapping, "specific");
  assert.equal(script.dataset.term, "stable-slug");
  assert.equal(script.dataset.lang, "ko");
});

test("sets the complete Giscus contract and clears a previous widget", () => {
  const fixture = commentFixture();
  mountGiscus(fixture.container, {slug: "post"}, completeConfig);
  const {script, container} = fixture;
  assert.deepEqual(script.dataset, {
    repo: "2jeonghoon/2jeonghoon.github.io",
    repoId: "R_testRepo",
    category: "Blog Comments",
    categoryId: "DIC_testCategory",
    mapping: "specific",
    term: "post",
    reactionsEnabled: "1",
    emitMetadata: "0",
    inputPosition: "top",
    theme: "light",
    lang: "ko",
    loading: "lazy"
  });
  assert.equal(script.src, "https://giscus.app/client.js");
  assert.equal(script.crossOrigin, "anonymous");
  assert.equal(script.async, true);
  assert.equal(container.children.length, 0);
  assert.deepEqual(container.appended, [script]);
});

test("shows setup status when public IDs are absent", () => {
  const fixture = commentFixture();
  mountGiscus(
    fixture.container,
    {slug: "post"},
    {...completeConfig, repoId: "", categoryId: ""}
  );
  assert.match(
    fixture.container.textContent,
    /댓글 설정이 아직 완료되지 않았습니다/
  );
  assert.equal(fixture.script, undefined);
});

test("shows load failure without removing article content", () => {
  const fixture = commentFixture();
  mountGiscus(fixture.container, {slug: "post"}, completeConfig);
  fixture.script.onerror();
  assert.match(fixture.status.textContent, /댓글을 불러오지 못했습니다/);
});

test("removes the loading status after Giscus loads", () => {
  const fixture = commentFixture();
  mountGiscus(fixture.container, {slug: "post"}, completeConfig);
  fixture.script.onload();
  assert.equal(fixture.status.removed, true);
});
