# Two-Level Blog Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backward-compatible parent/optional-child category hierarchy to post authoring, storage, generation, and public filtering.

**Architecture:** Normalize both legacy string catalogs and the new nested JSON catalog in the Worker category service, which remains the single authority for hierarchy validation and GitHub writes. Extend the shared post contract with an optional `subcategory`, then pass it through the build, admin editor, and public blog. Keep public filtering and browser option handling in small pure helpers so hierarchy behavior can be tested without a DOM browser.

**Tech Stack:** Node.js ESM, Cloudflare Worker, GitHub Contents API, vanilla browser JavaScript, `node:test`, `js-yaml`, Markdown-It.

**Spec:** `docs/superpowers/specs/2026-09-26-hierarchical-categories-design.md`

## Global Constraints

- Support exactly two levels: one parent and one optional child.
- A published post requires a parent category; its child category is optional.
- A selected child must belong to the selected parent.
- Existing flat `categories.json` data and Markdown without `subcategory` must work without manual migration.
- Category names are trimmed, non-empty, at most 80 characters, and contain no control characters.
- Parent names are unique case-insensitively; child names are unique case-insensitively among siblings.
- Preserve authentication, CSRF checks, rate limiting, GitHub SHA concurrency, no-store API responses, and safe text rendering.
- Do not add category rename, deletion, reordering, or a third hierarchy level.
- Do not touch the existing untracked `tmp/` directory.

## Review Focus

- A legacy string catalog mixed with nested nodes normalizes without losing order or existing children; Task 2 adds this mixed-input test.
- A child with a `children` property is rejected instead of silently creating a third level; Task 2 adds this malformed-depth test.
- Changing a post's parent clears an incompatible child while editing; Task 4 adds the pure linked-selection test.
- Parent filtering includes both direct posts and every child post while an exact child filter excludes siblings; Task 5 adds both cases.
- Repository-controlled category names containing markup render as escaped text, never HTML; Task 5 adds a rendering assertion.

---

## File Structure

- `lib/post-contract.mjs`: validate, parse, and serialize the optional `subcategory` field.
- `lib/posts.mjs`: carry `subcategory` into generated public post objects.
- `worker/src/category-service.mjs`: canonical tree normalization, merging, category creation, and post/category relationship validation.
- `worker/src/post-service.mjs`: include `subcategory` in post summaries used by category merging.
- `worker/src/github.mjs`: continue reading and writing `categories.json`, now preserving nested nodes.
- `worker/src/index.mjs`: validate post category relationships before create/update writes.
- `worker/public/index.html`: parent/child category manager and linked post selectors.
- `worker/public/admin.js`: browser state and pure hierarchy helpers for the admin.
- `worker/public/admin.css`: layout and responsive styling for the added controls.
- `blog.js`: pure public category-tree/filter helpers and two-level filter rendering.
- `categories.json`: canonical empty nested catalog shape; it remains `{ "categories": [] }` when no categories exist.
- `README.md`: document direct Markdown and admin usage for parent-only and parent/child posts.
- `test/post-contract.test.mjs`, `test/posts.test.mjs`: shared-contract and build-data coverage.
- `test/admin-api.test.mjs`, `test/admin-github.test.mjs`: Worker service, hierarchy validation, persistence, and concurrency coverage.
- `test/admin-ui.test.mjs`: admin helper and markup coverage.
- `test/blog.test.mjs`: public hierarchy, filtering, search, and escaping coverage.

### Task 1: Extend the Shared Post Contract and Generated Data

**Files:**
- Modify: `lib/post-contract.mjs`
- Modify: `lib/posts.mjs`
- Modify: `test/post-contract.test.mjs`
- Modify: `test/posts.test.mjs`

**Interfaces:**
- Produces: `validatePostInput(input)` and `parsePostSource(...)` results with `subcategory: string`.
- Produces: `serializePostSource(input)` with deterministic `subcategory` front matter.
- Produces: public post records from `parsePost(...)` with `subcategory: string`.
- Consumes: existing `boundedString`, Markdown parsing, and build serialization behavior.

- [ ] **Step 1: Write failing contract tests for optional child categories**

Add `subcategory: "Linux"` to the `valid()` fixture in `test/post-contract.test.mjs`, then add assertions covering parent-only input, child-without-parent rejection, the 80-character limit, and Markdown round-trip:

```js
test("allows a parent-only category and validates an optional child", () => {
  assert.equal(validatePostInput(valid({subcategory: ""})).subcategory, "");
  assert.equal(validatePostInput(valid({subcategory: "  Linux  "})).subcategory, "Linux");
  assert.throws(
    () => validatePostInput(valid({draft: true, category: "", subcategory: "Linux"})),
    /subcategory.*category/i
  );
  assert.throws(
    () => validatePostInput(valid({subcategory: "x".repeat(LIMITS.subcategory + 1)})),
    /subcategory.*80/i
  );
});
```

Update the deterministic round-trip expectation so `parsed` contains the fixture's `subcategory`.

- [ ] **Step 2: Run the contract test and confirm the new assertions fail**

Run: `node --test test/post-contract.test.mjs`

Expected: FAIL because `LIMITS.subcategory` and normalized `subcategory` do not exist.

- [ ] **Step 3: Implement the minimal shared-contract change**

In `lib/post-contract.mjs`, add the limit, normalize the field, reject a child without a parent, and serialize it immediately after `category`:

```js
export const LIMITS = Object.freeze({
  title: 200,
  description: 600,
  category: 80,
  subcategory: 80,
  tag: 60,
  body: 240 * 1024
});

const category = boundedString(input.category, "category", {required});
const subcategory = boundedString(input.subcategory, "subcategory");
if (subcategory && !category) fail("subcategory requires category", "subcategory");

// Returned post fields
category,
subcategory,

// serializePostSource fields, immediately after category
["subcategory", post.subcategory],
```

- [ ] **Step 4: Write the failing generated-data test**

Update the `source()` fixture in `test/posts.test.mjs` to include `subcategory`, emit `subcategory:` in its front matter, and add:

```js
test("carries an optional child category into generated post data", () => {
  const child = parsePost(record("child.md", source({subcategory: "Linux"})));
  const parentOnly = parsePost(record("parent.md", source({subcategory: ""})));
  assert.equal(child.subcategory, "Linux");
  assert.equal(parentOnly.subcategory, "");
  assert.match(serializePosts([child]), /"subcategory": "Linux"/);
});
```

- [ ] **Step 5: Run the generated-data test and confirm it fails**

Run: `node --test test/posts.test.mjs`

Expected: FAIL because `lib/posts.mjs` does not expose `subcategory`.

- [ ] **Step 6: Pass `subcategory` through `lib/posts.mjs`**

Add the parsed child field beside `category` in the public post record:

```js
return {
  // existing fields
  category: parsed.category,
  subcategory: parsed.subcategory,
  // existing fields
};
```

- [ ] **Step 7: Run both focused test files**

Run: `node --test test/post-contract.test.mjs test/posts.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit the contract slice**

```bash
git add lib/post-contract.mjs lib/posts.mjs test/post-contract.test.mjs test/posts.test.mjs
git commit -m "feat: add optional post subcategories"
```

### Task 2: Normalize and Mutate the Two-Level Category Catalog

**Files:**
- Modify: `worker/src/category-service.mjs`
- Modify: `worker/src/post-service.mjs`
- Modify: `worker/src/github.mjs`
- Modify: `test/admin-api.test.mjs`
- Modify: `test/admin-github.test.mjs`

**Interfaces:**
- Produces: `normalizeCategoryTree(values): Array<{name: string, children: Array<{name: string}>}>`.
- Produces: `mergeCategoryTrees(...trees)` preserving first-seen parent and child order with case-insensitive deduplication.
- Produces: `createCategoryService(client, postService).list()` returning `{categories, sha}`.
- Produces: `.create({name, parent?, sha})` for parent or child creation.
- Produces: post summaries shaped as `{slug, title, date, category, subcategory, draft, sha}`.
- Consumes: `client.getCategoryConfig()` and `client.writeCategoryConfig(categories, sha)` without changing their method signatures.

- [ ] **Step 1: Replace flat category API expectations with tree expectations**

Change the fake client catalog in `test/admin-api.test.mjs` to a legacy string array so compatibility remains exercised. Update list/create assertions to the canonical result:

```js
{
  categories: [
    {name: "Systems", children: []},
    {name: "Game Client", children: []}
  ],
  sha: "categories-next",
  commitSha: "category-commit"
}
```

Add child creation and sibling-duplicate cases:

```js
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
```

Add tests that reject an unknown parent, a duplicate sibling with case differences, and a malformed child containing `children: []`.

- [ ] **Step 2: Add direct normalization tests for mixed legacy and nested input**

Import `normalizeCategoryTree` and `mergeCategoryTrees` from the service and add:

```js
test("normalizes mixed legacy and nested categories without losing order", () => {
  assert.deepEqual(normalizeCategoryTree([
    "Systems",
    {name: "Games", children: [{name: "Unity"}]}
  ]), [
    {name: "Systems", children: []},
    {name: "Games", children: [{name: "Unity"}]}
  ]);
});

test("rejects a third category level", () => {
  assert.throws(
    () => normalizeCategoryTree([{name: "Games", children: [{name: "Unity", children: []}]}]),
    /two levels|invalid child/i
  );
});
```

- [ ] **Step 3: Run the category API tests and confirm they fail**

Run: `node --test test/admin-api.test.mjs`

Expected: FAIL because the service still returns and writes flat strings and exports no tree helpers.

- [ ] **Step 4: Implement canonical normalization and merging**

Replace `mergeCategoryNames` with exported tree helpers in `worker/src/category-service.mjs`. Use this public shape and reject extra child keys that would express another level:

```js
export function normalizeCategoryTree(values) {
  if (!Array.isArray(values)) throw new ContractError("categories must be an array", "categories");
  return mergeCategoryTrees(values.map(value => {
    if (typeof value === "string") return {name: normalizeCategoryName(value), children: []};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ContractError("invalid category", "categories");
    }
    const children = Array.isArray(value.children) ? value.children.map(child => {
      if (!child || typeof child !== "object" || Array.isArray(child) || "children" in child) {
        throw new ContractError("categories support only two levels", "categories");
      }
      return {name: normalizeCategoryName(child.name)};
    }) : (() => { throw new ContractError("invalid category children", "categories"); })();
    return {name: normalizeCategoryName(value.name), children};
  }));
}
```

Implement `mergeCategoryTrees(...trees)` to preserve the first spelling/order of a parent, merge later children into it, and deduplicate parent and sibling names with `toLocaleLowerCase("ko")`.

- [ ] **Step 5: Implement parent and child creation**

Make `list()` normalize the stored catalog and merge a tree derived from post summaries. Make `create(input)` use `input.parent` to distinguish child creation, resolve the parent case-insensitively, reject duplicates, preserve the existing SHA requirement, and call:

```js
await client.writeCategoryConfig(categories, input?.sha || "");
```

Return the canonical tree through the existing `commitResult` fields.

- [ ] **Step 6: Include child paths in post summaries**

In `worker/src/post-service.mjs`, extend the list result:

```js
return {
  slug,
  title: post.title,
  date: post.date,
  category: post.category,
  subcategory: post.subcategory,
  draft: post.draft,
  sha: item.sha
};
```

- [ ] **Step 7: Update GitHub persistence tests for nested nodes**

In `test/admin-github.test.mjs`, change the category fixture and expected write payload to:

```js
const categories = [
  {name: "Systems", children: [{name: "Linux"}]},
  {name: "Game Client", children: []}
];
```

Assert `getCategoryConfig()` returns those objects unchanged and the PUT body's decoded content equals `{categories}` with a trailing newline. Keep the existing SHA and branch assertions.

- [ ] **Step 8: Run Worker category and GitHub tests**

Run: `node --test test/admin-api.test.mjs test/admin-github.test.mjs`

Expected: PASS, including flat-reader compatibility, child creation, depth rejection, and SHA conflict coverage.

- [ ] **Step 9: Commit the catalog slice**

```bash
git add worker/src/category-service.mjs worker/src/post-service.mjs worker/src/github.mjs test/admin-api.test.mjs test/admin-github.test.mjs
git commit -m "feat: support nested category catalogs"
```

### Task 3: Enforce Post-to-Catalog Relationships Before GitHub Writes

**Files:**
- Modify: `worker/src/category-service.mjs`
- Modify: `worker/src/index.mjs`
- Modify: `test/admin-api.test.mjs`

**Interfaces:**
- Consumes: Task 2's canonical category tree and `createCategoryService(client, postService)`.
- Produces: `categoryService.assertPostSelection(input): Promise<void>`.
- Preserves: synchronous post preview; hierarchy membership applies only to post create/update mutations.

- [ ] **Step 1: Write failing API tests for allowed and rejected relationships**

Add tests using a nested fake catalog with `Systems > Linux`:

```js
test("accepts parent-only and matching child post mutations", async () => {
  const client = fakeClient();
  client.getCategoryConfig = async () => ({
    sha: "categories-sha",
    categories: [{name: "Systems", children: [{name: "Linux"}]}]
  });
  const bindings = env({GITHUB_CLIENT: client});
  assert.equal((await request("/api/posts", {
    method: "POST", body: post({subcategory: ""})
  }, bindings)).status, 201);
  assert.equal((await request("/api/posts/safe-post", {
    method: "PUT", body: {...post({subcategory: "Linux"}), sha: "old"}
  }, bindings)).status, 200);
});

test("rejects unknown parents and mismatched children before writes", async () => {
  for (const overrides of [
    {category: "Unknown", subcategory: ""},
    {category: "Systems", subcategory: "Unity"}
  ]) {
    const bindings = env();
    const response = await request("/api/posts", {
      method: "POST", body: post(overrides)
    }, bindings);
    assert.equal(response.status, 422);
    assert.equal(bindings.GITHUB_CLIENT.calls.length, 0);
  }
});
```

Also assert that a draft with both category fields empty remains valid, while a draft with only `subcategory` is rejected by the shared contract.

- [ ] **Step 2: Run the focused API tests and confirm they fail**

Run: `node --test test/admin-api.test.mjs`

Expected: FAIL because post mutations do not consult the category catalog.

- [ ] **Step 3: Implement `assertPostSelection` in the category service**

Add `validatePostInput` to the existing import from `lib/post-contract.mjs`. Normalize the submitted post first with that function, then load the canonical tree:

```js
async function assertPostSelection(input) {
  const post = validatePostInput(input);
  if (!post.category && !post.subcategory) return;
  const {categories} = await list();
  const parent = categories.find(item => key(item.name) === key(post.category));
  if (!parent) throw new ContractError("category does not exist", "category");
  if (post.subcategory && !parent.children.some(child => key(child.name) === key(post.subcategory))) {
    throw new ContractError("subcategory does not belong to category", "subcategory");
  }
}
```

Export it on the service object. Keep `key(value)` private and consistently based on `toLocaleLowerCase("ko")`.

- [ ] **Step 4: Call hierarchy validation in create and update routes**

In `worker/src/index.mjs`, read each mutation body once, await validation, and then pass the same object to the post service:

```js
const input = await readBody(request);
await categories.assertPostSelection(input);
return jsonResponse(await service.create(input), {status: 201});
```

Use the same sequence for `PUT /api/posts/:slug`. Do not add the check to preview or delete.

- [ ] **Step 5: Run API and contract tests**

Run: `node --test test/admin-api.test.mjs test/post-contract.test.mjs`

Expected: PASS with no GitHub write for invalid paths.

- [ ] **Step 6: Commit the relationship-validation slice**

```bash
git add worker/src/category-service.mjs worker/src/index.mjs test/admin-api.test.mjs
git commit -m "feat: validate post category relationships"
```

### Task 4: Add Linked Parent and Child Controls to the Admin

**Files:**
- Modify: `worker/public/index.html`
- Modify: `worker/public/admin.js`
- Modify: `worker/public/admin.css`
- Modify: `test/admin-ui.test.mjs`

**Interfaces:**
- Consumes: `GET /api/categories` tree and `POST /api/categories` parent/child payloads from Tasks 2–3.
- Produces: `mergeCategoryTrees(categories, currentPath?)`, `childNamesFor(categories, parent)`, and `nextCategorySelection(categories, parent, child)` as CommonJS-testable pure helpers.
- Produces: editor payload fields `category` and `subcategory`.

- [ ] **Step 1: Write failing pure-helper tests**

Replace the flat `mergeCategoryNames` test in `test/admin-ui.test.mjs` with:

```js
test("merges category trees and keeps an uncataloged current path", () => {
  assert.deepEqual(ui.mergeCategoryTrees(
    [{name: "Systems", children: [{name: "Linux"}]}],
    {category: "Legacy", subcategory: "Old"}
  ), [
    {name: "Systems", children: [{name: "Linux"}]},
    {name: "Legacy", children: [{name: "Old"}]}
  ]);
});

test("clears an incompatible child when the parent changes", () => {
  const tree = [
    {name: "Systems", children: [{name: "Linux"}]},
    {name: "Games", children: [{name: "Unity"}]}
  ];
  assert.deepEqual(ui.nextCategorySelection(tree, "Games", "Linux"), {
    category: "Games", subcategory: ""
  });
  assert.deepEqual(ui.nextCategorySelection(tree, "Systems", "Linux"), {
    category: "Systems", subcategory: "Linux"
  });
});
```

- [ ] **Step 2: Write failing admin markup assertions**

Extend the accessibility test to require:

```js
assert.match(html, /<select[^>]*id="post-subcategory"/);
assert.match(html, /<input[^>]*id="new-parent-name"/);
assert.match(html, /<select[^>]*id="child-parent"/);
assert.match(html, /<input[^>]*id="new-child-name"/);
assert.match(html, /<button[^>]*id="add-parent-category"/);
assert.match(html, /<button[^>]*id="add-child-category"/);
```

Keep the existing external-script, CSP, text rendering, and browser-storage assertions.

- [ ] **Step 3: Run admin UI tests and confirm they fail**

Run: `node --test test/admin-ui.test.mjs`

Expected: FAIL because tree helpers and hierarchical controls do not exist.

- [ ] **Step 4: Implement pure admin hierarchy helpers**

At the exported helper boundary in `worker/public/admin.js`, implement:

```js
function childNamesFor(categories, parent) {
  const key = String(parent || "").trim().toLocaleLowerCase("ko");
  return (categories || []).find(item => item.name.toLocaleLowerCase("ko") === key)?.children
    .map(child => child.name) || [];
}

function nextCategorySelection(categories, category, subcategory) {
  const children = childNamesFor(categories, category);
  return {
    category: String(category || "").trim(),
    subcategory: children.some(name => name.toLocaleLowerCase("ko") === String(subcategory || "").trim().toLocaleLowerCase("ko"))
      ? String(subcategory || "").trim()
      : ""
  };
}
```

Implement `mergeCategoryTrees` with the same first-seen/case-insensitive behavior as the Worker helper and export all three functions for Node tests.

- [ ] **Step 5: Add semantic parent/child controls**

In `worker/public/index.html`, replace the flat category manager with separate parent and child forms, and add a child select after the required parent select:

```html
<label for="post-category">대분류</label>
<select id="post-category" name="category" required>
  <option value="">대분류 선택</option>
</select>
<label for="post-subcategory">소분류 (선택)</label>
<select id="post-subcategory" name="subcategory" disabled>
  <option value="">소분류 없음</option>
</select>
```

The category manager uses `new-parent-name`/`add-parent-category` and `child-parent`/`new-child-name`/`add-child-category`, each with an explicit label.

- [ ] **Step 6: Wire tree state, linked selectors, and payloads**

In `worker/public/admin.js`:

- replace `categoryNames` with `categoryTree`;
- add `subcategory: ""` to `createEditorModel`;
- include `subcategory` in `formModel()`;
- render parent choices from `categoryTree`;
- populate/disable the child select through `childNamesFor`;
- on parent change, call `nextCategorySelection` and clear an incompatible child;
- load the current post's parent and child before painting options;
- send `{name, sha}` for a parent and `{parent, name, sha}` for a child;
- preserve the current compatible selection after reloading categories;
- render every repository-controlled name with `textContent` or `createTextNode`.

- [ ] **Step 7: Style the added controls without changing the existing layout model**

In `worker/public/admin.css`, extend the existing category manager and field-grid selectors so parent and child add rows wrap on narrow screens, inputs/selects take available width, and status text remains below both forms. Reuse existing colors, spacing variables, button styles, and the current `@media (max-width: 720px)` breakpoint.

- [ ] **Step 8: Run admin UI and API tests**

Run: `node --test test/admin-ui.test.mjs test/admin-api.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit the admin slice**

```bash
git add worker/public/index.html worker/public/admin.js worker/public/admin.css test/admin-ui.test.mjs
git commit -m "feat: add hierarchical category controls"
```

### Task 5: Render and Filter the Public Two-Level Hierarchy

**Files:**
- Modify: `blog.js`
- Modify: `test/blog.test.mjs`

**Interfaces:**
- Consumes: post records containing `category` and optional `subcategory` from Task 1.
- Produces: `formatCategoryPath(post): string`.
- Produces: `deriveCategoryTree(posts): Array<{name: string, children: Array<{name: string}>}>`.
- Produces: `filterPosts(posts, {category, subcategory, query}): Post[]`.
- Preserves: article rendering, Giscus, AdSense, admin-edit links, and existing exports.

- [ ] **Step 1: Write failing pure public-filter tests**

Import the three new helpers in `test/blog.test.mjs` and add:

```js
const categorizedPosts = [
  {title: "Parent", description: "", content: "", category: "Systems", subcategory: ""},
  {title: "Linux", description: "", content: "", category: "Systems", subcategory: "Linux"},
  {title: "Unity", description: "", content: "", category: "Games", subcategory: "Unity"}
];

test("derives a two-level tree and formats category paths", () => {
  assert.deepEqual(deriveCategoryTree(categorizedPosts), [
    {name: "Systems", children: [{name: "Linux"}]},
    {name: "Games", children: [{name: "Unity"}]}
  ]);
  assert.equal(formatCategoryPath(categorizedPosts[0]), "Systems");
  assert.equal(formatCategoryPath(categorizedPosts[1]), "Systems / Linux");
});

test("parent filters include direct and descendant posts while child filters are exact", () => {
  assert.deepEqual(
    filterPosts(categorizedPosts, {category: "Systems", subcategory: "", query: ""}).map(post => post.title),
    ["Parent", "Linux"]
  );
  assert.deepEqual(
    filterPosts(categorizedPosts, {category: "Systems", subcategory: "Linux", query: ""}).map(post => post.title),
    ["Linux"]
  );
});

test("search includes parent and child category names", () => {
  assert.deepEqual(filterPosts(categorizedPosts, {category: "", subcategory: "", query: "linux"}).map(post => post.title), ["Linux"]);
});
```

- [ ] **Step 2: Add a failing escaping test for category metadata**

Render an article or card with `category: "<img src=x>"` and `subcategory: "<script>x</script>"`, then assert the output contains escaped text and no literal `<img` or `<script>` element.

- [ ] **Step 3: Run public blog tests and confirm they fail**

Run: `node --test test/blog.test.mjs`

Expected: FAIL because the helpers and child-aware rendering do not exist.

- [ ] **Step 4: Implement the pure hierarchy and filtering helpers**

In `blog.js`, define and export:

```js
function formatCategoryPath(post) {
  return post.subcategory ? `${post.category} / ${post.subcategory}` : post.category;
}

function filterPosts(posts, {category = "", subcategory = "", query = ""} = {}) {
  const needle = query.trim().toLocaleLowerCase("ko");
  return posts.filter(post => {
    const categoryMatch = !category || post.category === category;
    const childMatch = !subcategory || post.subcategory === subcategory;
    const searchable = [post.title, post.description, post.content, post.category, post.subcategory]
      .join(" ").toLocaleLowerCase("ko");
    return categoryMatch && childMatch && (!needle || searchable.includes(needle));
  });
}
```

Implement `deriveCategoryTree` with first-seen order and case-insensitive deduplication of parents and sibling children. Treat a missing child as `""` and never create an empty child node.

- [ ] **Step 5: Replace the home filter with parent and child rows**

Update home rendering to:

- render `All` plus parent buttons in the first row;
- keep `activeCategory` and `activeSubcategory` state;
- render the selected parent's child buttons in a second row only when children exist;
- clear the active child on `All` or parent changes;
- call `filterPosts` for every state/search update;
- use `data-category` and `data-subcategory` values only for selection, and escape all generated labels.

- [ ] **Step 6: Render child-aware metadata**

Use `escapeHtml(formatCategoryPath(post))` for card and article metadata. Preserve current date, reading-time, AI disclosure, AdSense, Giscus, and edit-link rendering.

- [ ] **Step 7: Run public tests**

Run: `node --test test/blog.test.mjs`

Expected: PASS, including direct-parent inclusion, exact child narrowing, category search, and escaping.

- [ ] **Step 8: Commit the public slice**

```bash
git add blog.js test/blog.test.mjs
git commit -m "feat: filter posts by category hierarchy"
```

### Task 6: Document, Migrate the Checked-In Shape, and Verify the Complete Feature

**Files:**
- Modify: `categories.json`
- Modify: `README.md`
- Test: `test/*.test.mjs`

**Interfaces:**
- Consumes: all prior task interfaces.
- Produces: user documentation for admin creation and direct Markdown editing.
- Produces: a verified repository ready for the existing GitHub Pages and Worker deployment paths.

- [ ] **Step 1: Confirm the checked-in category catalog is canonical**

Keep an empty catalog exactly as:

```json
{
  "categories": []
}
```

If categories exist when executing the plan, convert each string to `{ "name": "...", "children": [] }` and preserve its order instead of replacing live data.

- [ ] **Step 2: Update the README authoring examples**

Document both allowed front-matter forms:

```yaml
category: "Development"
subcategory: ""
```

```yaml
category: "Development"
subcategory: "Unity"
```

Explain that the admin can add a parent or add a child beneath an existing parent, the parent is required for publishing, the child is optional, and only two levels are supported.

- [ ] **Step 3: Run the full Node test suite**

Run: `npm run test:blog`

Expected: all tests pass with zero failures.

- [ ] **Step 4: Run the production blog build**

Run: `npm run build:blog`

Expected: exit code 0; generated `blog-posts.js`, feed, and sitemap are created successfully even with zero posts.

- [ ] **Step 5: Run the combined validation command**

Run: `npm run validate:blog`

Expected: all tests pass and the blog build exits 0.

- [ ] **Step 6: Validate Worker deployment configuration without publishing**

Run: `npx wrangler deploy --config worker/wrangler.toml --dry-run`

Expected: Worker bundle completes successfully with no configuration or module-resolution errors.

- [ ] **Step 7: Inspect the final diff and repository state**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended feature files are modified, plus the pre-existing untracked `tmp/` directory.

- [ ] **Step 8: Commit documentation and any canonical catalog migration**

```bash
git add README.md categories.json
git commit -m "docs: explain hierarchical blog categories"
```

- [ ] **Step 9: Record final verification evidence**

Run:

```bash
git log --oneline -8
npm run test:blog
npm run build:blog
npx wrangler deploy --config worker/wrangler.toml --dry-run
```

Expected: the task commits are present; every test passes; the build and Worker dry run exit 0. Do not claim completion or deploy until these fresh commands have succeeded.
