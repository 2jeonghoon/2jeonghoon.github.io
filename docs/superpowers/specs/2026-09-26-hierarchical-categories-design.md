# Two-Level Blog Categories Design

**Date:** 2026-09-26

## Purpose

Extend the existing flat blog category catalog to support exactly two levels: a required parent category and an optional child category. Authors must be able to publish a post with only a parent category. Visitors must be able to select a parent to see every post beneath it, then optionally narrow the result to one child category.

The change must preserve existing posts, the GitHub-backed administration workflow, SHA concurrency protection, and the ability to edit Markdown directly on GitHub.

## Scope

This work includes:

- a nested category catalog in `categories.json`;
- parent and child category creation in the authenticated admin;
- linked parent and optional child selectors in the post editor;
- `subcategory` support in Markdown front matter, post parsing, and generated post data;
- parent and child filtering on the public blog;
- compatibility with the existing flat catalog and posts without a child category;
- validation, conflict handling, and automated tests for the new behavior.

Category rename, category deletion, reordering, and hierarchies deeper than two levels are outside this scope.

## Data Model

### Category catalog

The canonical `categories.json` shape is:

```json
{
  "categories": [
    {
      "name": "Development",
      "children": [
        { "name": "Unity" },
        { "name": "Server" }
      ]
    }
  ]
}
```

Each parent has a `name` and a `children` array. Each child has a `name`. No third level is accepted or emitted.

For backward compatibility, the reader also accepts the current flat shape:

```json
{ "categories": ["Development", "Operations"] }
```

Flat strings are normalized in memory to parent objects with empty `children` arrays. The next successful category write persists the canonical nested shape. No bulk migration is required.

### Post front matter

Posts continue to store the human-readable parent name in `category`. They may store a child name in `subcategory`:

```yaml
category: "Development"
subcategory: "Unity"
```

When a post uses only the parent, `subcategory` is serialized as an empty string. This keeps serialization deterministic and matches the existing explicit front-matter field style. Existing Markdown without `subcategory` parses as an empty child category.

Published posts require `category`. `subcategory` is optional. A non-empty `subcategory` is invalid when `category` is empty. Drafts may retain empty category fields under the existing draft rules.

The category catalog is the source of choices in the admin interface. Existing repository posts remain visible even if their recorded parent or child is absent from the catalog; their values are merged into the in-memory category tree returned to the admin. This prevents older content from becoming uneditable or disappearing.

## Category Service and API

The category service will own catalog normalization, merging, validation, and creation. Other components consume its normalized tree rather than reproducing hierarchy rules.

`GET /api/categories` keeps its authenticated behavior and returns:

```json
{
  "categories": [
    {
      "name": "Development",
      "children": [{ "name": "Unity" }]
    }
  ],
  "sha": "current-content-sha"
}
```

`POST /api/categories` accepts one of two explicit operations:

- parent creation: `{ "name": "Development", "sha": "..." }`
- child creation: `{ "name": "Unity", "parent": "Development", "sha": "..." }`

When `parent` is absent or empty, the service creates a parent. When it is present, the service must find the parent case-insensitively and add the child beneath it. A missing parent is rejected; the API never creates both levels implicitly.

Names are trimmed and must be non-empty strings of at most 80 characters without control characters. Parent names must be unique case-insensitively across the catalog. Child names must be unique case-insensitively among siblings; the same child name may appear beneath different parents.

The existing SHA rules remain unchanged. If a catalog already exists, writes require the current SHA. GitHub content conflicts return the existing conflict response so the admin can ask the author to refresh and retry.

Post creation and update validate hierarchy membership before committing: a selected parent must exist in the normalized catalog, and a selected child must belong to that parent. Parent-only posts pass validation. This validation belongs in the authenticated request flow because the shared Markdown parser must continue to accept older repository content whose category is no longer cataloged.

## Admin Interface

The category manager provides two creation paths:

- **Add parent category:** enter a name and submit.
- **Add child category:** choose an existing parent, enter a child name, and submit.

The post editor replaces the single category select with two linked selects:

- Parent category is required for a published post.
- Child category is optional.
- The child select is disabled until a parent is selected.
- Selecting or changing the parent repopulates the child select with only that parent's children and clears an incompatible child value.

When editing an older post, its recorded category path is temporarily included in the available options even if it is missing from the stored catalog. Reloading categories after a successful addition preserves the editor's current compatible selection.

The admin sends `category` and `subcategory` with preview, create, and update requests. User-facing validation and conflict messages follow the existing status/error patterns.

## Public Blog

Generated post data includes `subcategory`, defaulting to an empty string. Cards and article metadata display `Parent / Child` when a child exists and only `Parent` otherwise.

The home page filter has two levels:

1. The first row contains `All` and every parent category.
2. After a parent is selected, a second row shows that parent's child categories when any exist.

Selecting a parent displays both posts assigned directly to that parent and posts assigned to any of its children. Selecting a child narrows the results to that exact parent/child pair. Selecting `All` clears both selections and hides the child row. Changing the parent clears the previous child selection.

Text search continues to combine with category filters and includes both parent and child names in its searchable text. Filter labels and metadata use the existing escaping or DOM text APIs so category names cannot inject markup.

## Data Flow

1. The authenticated admin requests the normalized category tree from the Worker.
2. The Worker reads `categories.json`, loads post summaries, normalizes the legacy or nested catalog, and merges category paths already used by posts.
3. The admin creates a parent or child using the current catalog SHA.
4. The Worker validates the operation and writes the canonical nested catalog through the GitHub Contents API.
5. When saving a post, the admin submits the selected parent and optional child. The Worker validates their relationship and serializes both front-matter fields.
6. The existing build parses posts, emits `subcategory` into the generated data, and the public client renders and filters the hierarchy.

## Error Handling

- Invalid, empty, overlong, or control-character names produce a field-specific 400 response.
- Duplicate parents or sibling children produce a 400 response without a GitHub write.
- Child creation under an unknown parent produces a 400 response.
- A post whose child does not belong to its selected parent is rejected before a GitHub write.
- A stale or missing required catalog SHA follows the existing 409/validation semantics.
- A malformed nested catalog is rejected clearly rather than silently dropping entries.
- Existing posts with uncataloged category paths remain readable and are merged into admin choices.
- Public rendering treats missing `subcategory` as empty and never hides a post solely because its category is absent from the catalog.

## Testing Strategy

Tests will be added or updated at the existing unit and integration boundaries:

- category normalization converts flat strings to parent nodes;
- nested catalogs round-trip through the GitHub client;
- invalid depth, malformed nodes, unsafe names, unknown parents, and duplicates are rejected;
- parent and child creation preserve SHA concurrency behavior;
- post validation and Markdown parsing/serialization round-trip an optional `subcategory`;
- parent-only published posts remain valid;
- child-without-parent and mismatched parent/child submissions are rejected before writes;
- admin markup exposes parent and child controls;
- admin logic repopulates and clears the linked child select correctly;
- generated post data includes the child category;
- public parent filters include direct and descendant posts;
- public child filters narrow to an exact pair;
- search includes both category levels;
- legacy catalogs and posts without `subcategory` continue to work.

The complete test suite and production build must pass before deployment. Worker configuration will also be checked with the existing dry-run deployment command.

## Success Criteria

- An administrator can add a parent category or add a child beneath an existing parent.
- An administrator can publish with a parent only or with a parent and child.
- The system rejects invalid third-level or mismatched category data.
- Visitors can browse all posts, all posts under one parent, or posts in one child.
- Existing content and the existing flat catalog continue to work without manual migration.
- SHA conflict protection, authentication boundaries, and safe rendering remain intact.
