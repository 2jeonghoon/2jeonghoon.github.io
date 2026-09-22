# Secure Blog Admin Design

**Date:** 2026-09-23  
**Status:** Approved in chat; awaiting written-spec review  
**Repository:** `2jeonghoon/2jeonghoon.github.io`

## Objective

Provide a blog-like authoring experience for the repository owner without placing a GitHub token or application secret in the public GitHub Pages site. The owner can sign in with GitHub, list posts and drafts, create Markdown posts, preview them, update existing posts, delete posts with confirmation, and publish changes directly to `main`. Existing GitHub Actions then validates and deploys the updated site.

The public blog remains at `https://2jeonghoon.github.io/`. The management application is served from a Cloudflare Worker so its HTML, authentication callback, session cookie, and API share one origin. `https://2jeonghoon.github.io/admin/` links or redirects to that management origin.

## Scope

### Included

- A Cloudflare Worker-hosted management UI styled to match JH.LOG.
- A private GitHub App installed only on `2jeonghoon/2jeonghoon.github.io`.
- GitHub sign-in and immutable numeric owner-ID authorization.
- Listing published and draft Markdown sources from `posts/`.
- Creating, previewing, updating, and deleting `posts/<slug>.md`.
- Server-side metadata, slug, content-size, and concurrency validation.
- Direct commits to `main`, followed by the existing Pages workflow.
- Deployment status links and actionable error messages.
- Abuse controls, security headers, CSRF protection, rate limiting, and audit-friendly commits.

### Excluded

- Multiple authors or role management.
- Rich-text/WYSIWYG editing; the editor is Markdown with rendered preview.
- Uploading binary images in the first version. Authors enter an existing `assets/...` path.
- Editing files outside `posts/*.md`.
- Managing Giscus comments from the authoring UI; moderation remains in GitHub Discussions.
- A database containing copies of posts. GitHub remains the source of truth.

## Architecture

```text
Public reader
    |
    v
GitHub Pages (2jeonghoon.github.io)
    |  /admin link
    v
Cloudflare Worker + static admin assets (same origin)
    |  OAuth callback, secure session, validated API
    v
GitHub App installation token (single repository, Contents read/write)
    |
    v
GitHub Contents API -> posts/*.md on main
    |
    v
GitHub Actions -> validated _site artifact -> GitHub Pages
```

The Worker hosts the management UI and API together. This avoids third-party-cookie behavior between `github.io` and `workers.dev` and permits a `Secure`, `HttpOnly`, `SameSite=Lax` session cookie. The public site never receives GitHub credentials.

## Components

### Public-site integration

- Change the current `Writing` navigation item, which only scrolls to `#writing`, into an owner-facing `Write` link to `/admin/`.
- Keep a separate `Notes` link for the public article list so visitor navigation is not lost.
- Add an optional `Manage post` link on article pages. It opens the admin editor for the immutable slug and does not expose credentials.
- Add a small static `/admin/index.html` redirect page to the allowlisted site artifact. Its destination is public runtime configuration, not a secret.

### Cloudflare Worker

The Worker contains:

- Static admin assets.
- OAuth start and callback handlers.
- Signed session and CSRF handling.
- GitHub App JWT and short-lived installation-token generation.
- GitHub Contents API client fixed to one owner, repository, branch, and directory.
- Post parsing, validation, serialization, and preview rendering.
- Rate-limit checks and structured security logging without tokens or post bodies.

Sensitive values are Cloudflare Worker secrets and never committed:

- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `SESSION_SIGNING_KEY`

Non-secret deployment configuration fixes the security boundary:

- owner GitHub numeric ID: `51705815`
- repository: `2jeonghoon/2jeonghoon.github.io`
- repository ID where useful: `781249964`
- branch: `main`
- editable directory: `posts/`
- allowed public blog origin: `https://2jeonghoon.github.io`

### Shared post contract

Extract runtime-neutral validation and Markdown serialization rules from the existing compiler into a shared module. Both the build and Worker use the same rules for:

- immutable lowercase hyphenated slugs;
- required published metadata;
- relaxed draft metadata;
- real `YYYY-MM-DD` dates;
- string-array tags;
- boolean flags;
- safe relative image paths;
- raw-HTML-disabled Markdown preview;
- exact Agent disclosure metadata.

This prevents the editor from accepting a post that the deployment build later rejects.

### Admin UI

The UI has three states:

1. **Signed out:** explanation and `GitHub로 로그인` button.
2. **Post list:** published/draft badges, search, create button, edit action, and delete action.
3. **Editor:** structured metadata fields, Markdown textarea, rendered preview, validation summary, save-draft button, and publish button.

Delete requires a modal and exact re-entry of the post slug. The UI never treats a network timeout as success; it refreshes from GitHub after a mutation.

## API Contract

All `/api/*` responses use JSON and `Cache-Control: no-store`. Mutation requests require an authenticated session, an allowed `Origin`, and a CSRF token.

### Authentication

- `GET /auth/login` — creates an OAuth state nonce, stores it in a short-lived secure cookie, and redirects to GitHub.
- `GET /auth/callback` — verifies state, exchanges the code server-side, calls GitHub `/user`, requires numeric ID `51705815`, discards the user token, and creates the admin session.
- `POST /auth/logout` — validates CSRF and expires the session.
- `GET /api/session` — returns `{ authenticated, login, csrfToken }` without returning any GitHub token.

### Posts

- `GET /api/posts` — returns source metadata, slug, publication state, and blob SHA.
- `GET /api/posts/:slug` — returns parsed fields, Markdown body, and current blob SHA.
- `POST /api/preview` — validates the submitted draft and returns safe rendered HTML without writing.
- `POST /api/posts` — creates a new slug; rejects an existing path.
- `PUT /api/posts/:slug` — requires the current SHA and replaces that exact file.
- `DELETE /api/posts/:slug` — requires the current SHA and typed slug confirmation.

Create, update, and delete are serialized per session. GitHub API `409` or `422` responses become explicit conflict or validation messages rather than automatic retries.

## Security Model

### Authentication and authorization

- Use a private GitHub App rather than a classic OAuth App.
- Install it only on `2jeonghoon/2jeonghoon.github.io`.
- Request only repository metadata read and contents read/write permissions.
- Do not request Actions, Administration, Workflows, Discussions, or organization permissions.
- Authorize by immutable numeric GitHub user ID on every new session.
- Installation tokens are created only when needed, scoped again to the single repository and contents permission, and never returned to the client.
- Sessions expire after 30 minutes of inactivity and have an eight-hour absolute maximum.

### Request integrity

- OAuth state is random, single-use, short-lived, and timing-safe compared.
- The exact callback URL is registered; wildcard callback URLs are disabled.
- Session cookies use `Secure`, `HttpOnly`, `SameSite=Lax`, a `__Host-` prefix, and path `/`.
- Mutation endpoints require a session-bound CSRF token and exact same-origin `Origin`.
- Only JSON requests with the expected content type are accepted.
- Security headers include a restrictive Content Security Policy, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a narrow `Permissions-Policy`.

### Input and repository boundary

- Route parameters are decoded once and must match the slug regular expression.
- The server constructs `posts/${slug}.md`; callers never submit an arbitrary repository path.
- Request bodies have a 256 KiB maximum and bounded field lengths.
- Front matter is generated by the server, not accepted as an opaque block.
- Preview and saved Markdown disable raw HTML and unsafe URL schemes.
- Updates and deletes require the last-read blob SHA to prevent stale overwrite.
- Commit messages are generated from the validated action and slug.

### Abuse controls

- Authentication attempts and API requests use separate Cloudflare Rate Limiting bindings keyed by a hashed client address before login and by owner ID plus session identifier after login.
- Limits are 5 authentication starts per minute per address, 120 authenticated reads per minute per session, and 10 mutations per minute per session. These windows match the binding's supported periods and are defense-in-depth rather than the authorization boundary.
- Repeated unauthorized or malformed requests return generic responses without revealing whether the owner is currently signed in.
- Logs record request ID, route, result, hashed address, GitHub actor ID after login, and GitHub commit SHA. Tokens, cookies, secrets, OAuth codes, and post bodies are never logged.
- Error responses carry a request ID so a failed action can be matched to Worker logs.

### Compromise response

- Rotating the GitHub App private key, client secret, or session key immediately invalidates the affected credential path.
- Uninstalling the GitHub App revokes repository access.
- Git history provides recovery for unwanted content mutations.
- Cloudflare secrets are the only deployed secret store; local `.dev.vars*` files are ignored by Git.

## Data and Publishing Flow

### Create

1. Owner opens the admin UI and signs in.
2. UI validates fields locally and requests a server preview.
3. Worker validates the same post contract.
4. Worker confirms the path does not exist.
5. Worker commits `posts/<slug>.md` to `main` through the Contents API.
6. UI displays the commit and Actions links and refreshes the list.
7. Existing Pages workflow validates, builds, and deploys.

### Update

1. UI loads the file and its blob SHA.
2. Owner edits and previews.
3. Worker fetches or submits against the same SHA.
4. A changed SHA returns `409 Conflict`; the owner reloads before retrying.
5. A successful commit triggers deployment.

The slug is immutable in the first version. Renaming would break article URLs and Giscus mapping, so changing a slug requires creating a new post and deliberately deleting the old one.

### Delete

1. Owner selects delete and retypes the exact slug.
2. Worker validates CSRF, slug, confirmation, and SHA.
3. Worker commits deletion through the Contents API.
4. The UI explains that the associated GitHub Discussion is not deleted automatically.
5. Git history retains the deleted source for recovery.

## Error Handling

- `401`: session absent or expired; return to sign-in while preserving unsaved editor content in memory.
- `403`: authenticated GitHub user is not the configured owner, or origin/CSRF validation failed.
- `404`: post source no longer exists.
- `409`: slug already exists or SHA changed since load.
- `413`: request exceeds the content limit.
- `422`: metadata or Markdown contract violation with field-level messages.
- `429`: rate limit exceeded with a retry time.
- `502`: GitHub API failure; do not report success or discard editor content.

GitHub API mutations are not blindly retried because an ambiguous network result could duplicate an action. The client reloads the post or list to resolve the actual state.

## Testing Strategy

### Unit tests

- Shared post validation and serialization.
- Slug/path traversal rejection.
- owner numeric-ID authorization.
- session signature, expiration, state, and CSRF validation.
- origin and content-type enforcement.
- request-size and field-length limits.
- rate-limit decisions.
- GitHub error mapping and SHA conflicts.

### Worker integration tests

- OAuth callback with a mocked GitHub identity.
- no token or secret in responses, logs, or static assets.
- create, update, delete, conflict, and unauthorized flows against a mocked GitHub API.
- only `posts/*.md` requests can be constructed.
- all sensitive responses use `no-store` and required security headers.

### Browser tests

- sign-in state and forbidden-user state.
- create draft, preview, publish, edit, conflict, and delete confirmation.
- editor content survives recoverable errors.
- keyboard navigation, labels, focus handling, and mobile layout.
- public `Write` and `Manage post` links point to the configured admin origin.

### End-to-end acceptance

- Install the GitHub App only on the target repository.
- Create a disposable draft through the live admin.
- Edit it and confirm a second stale edit is rejected.
- Publish and verify the Pages workflow and public article.
- Delete it, verify deployment, and confirm recovery remains possible through Git history.
- Send unauthenticated, wrong-origin, missing-CSRF, invalid-path, oversized, and rate-limited requests and verify no repository change occurs.

## Deployment and Rollout

1. Implement Worker and UI locally with mocked GitHub APIs.
2. Deploy the Worker without secrets to obtain its stable `workers.dev` URL.
3. Register a private GitHub App with the exact Worker callback URL and minimum permissions.
4. Install the App only on the blog repository.
5. Store credentials with Cloudflare Worker secrets.
6. Deploy the configured Worker and complete live authentication tests.
7. Add the public `/admin/`, `Write`, and `Manage post` links to GitHub Pages.
8. Push the public-site integration only after the live Worker is ready, preventing broken management links.
9. Run the disposable-draft end-to-end acceptance sequence.

If Cloudflare or GitHub configuration is incomplete, the public blog continues to function unchanged and the management link shows a clear unavailable state.

## Success Criteria

- Only GitHub user ID `51705815` can establish an admin session.
- No GitHub token, private key, client secret, or session signing key is present in repository files, public assets, browser storage, URLs, or logs.
- The management API cannot construct or mutate a path outside `posts/<valid-slug>.md`.
- Create, preview, update, and delete work from the branded admin UI.
- Conflicting edits never silently overwrite newer content.
- Valid mutations produce auditable commits and successful Pages deployments.
- Malformed, unauthorized, cross-origin, CSRF-free, oversized, and rate-limited requests produce no repository changes.
- The existing public blog, Giscus comments, feeds, sitemap, and legacy tests continue to pass.
