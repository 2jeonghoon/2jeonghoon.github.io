# Markdown Publishing and Comments Design

## Summary

JH.LOG will use Markdown files in the GitHub repository as its post-management interface. A deterministic build step will validate and compile those files into the data consumed by the existing static blog. GitHub Actions will build and deploy the site to GitHub Pages. Each published article will embed Giscus so visitors with GitHub accounts can leave comments backed by GitHub Discussions.

Posts written by an Agent from information supplied by the site owner will show this disclosure near the article header:

> 이 글은 Agent가 제공된 정보를 기반으로 작성했습니다.

The current visual design, search, category filtering, article navigation, RSS feed, and sitemap remain part of the site.

## Goals

- Manage posts by adding, editing, or deleting Markdown files in GitHub.
- Support drafts without exposing them in any public index or feed.
- Validate post metadata before deployment.
- Preserve the current blog presentation and responsive behavior.
- Let visitors comment under each post using a GitHub account.
- Let the owner moderate comments in GitHub Discussions.
- Clearly disclose posts created by an Agent from owner-provided information.
- Generate derived artifacts during deployment rather than requiring manual synchronization.

## Non-goals

- A custom browser-based administration dashboard.
- Anonymous comments or a custom account system.
- A custom database or server-side application.
- Automatic deletion of Discussions when posts are removed.
- Rich collaborative editing or revision workflows beyond GitHub's normal file history.

## Post Source Format

Source posts live in `posts/` and use one Markdown file per article. The filename, excluding `.md`, is the immutable slug used by URLs and Giscus.

Example:

```markdown
---
title: MMORPG 서버의 병렬 처리 구조
description: 태스크 시스템과 동기화 방식을 비교한 기록
date: 2024-08-31
category: Game Server
tags: [C, Multithreading, MMORPG]
image: assets/mmorpg-server-architecture.png
featured: false
draft: false
aiGenerated: true
---

여기에 Markdown으로 본문을 작성합니다.
```

Required metadata:

- `title`: article title.
- `description`: summary used on cards and in page metadata.
- `date`: publication date in `YYYY-MM-DD` format.
- `category`: one category name.
- `tags`: a non-empty list of tags.
- `draft`: whether the article is excluded from public output.
- `aiGenerated`: whether the Agent disclosure is shown.

Optional metadata:

- `image`: repository-relative cover image path.
- `featured`: whether the post is eligible for the featured position. Defaults to `false`.
- `readingTime`: explicit reading-time text. If omitted, the build calculates it from the body.

Rules:

- Slugs must be unique and contain lowercase ASCII letters, digits, and hyphens only.
- Published posts with missing or invalid required metadata fail the build.
- Draft posts are validated for parseable front matter but may omit publication-only fields while still being edited.
- If several published posts have `featured: true`, the newest one is used.
- If no published post is marked featured, the newest published post is used.
- A missing optional image produces the image-free article layout.

## Build Architecture

A Node.js build script will:

1. Discover `posts/*.md` in a stable filename order.
2. Parse front matter and Markdown.
3. Validate metadata and slug uniqueness.
4. Exclude drafts from all public output.
5. Sort published posts by date descending.
6. Calculate reading time when it is not supplied.
7. Generate the post data consumed by the existing frontend.
8. Generate `feed.xml` and `sitemap.xml` from the same published-post set.
9. Assemble a clean `_site/` directory containing only deployable files and assets.

Markdown is compiled only from repository-controlled source files. Raw HTML in Markdown will be disabled so accidental markup cannot bypass the article layout or inject executable content.

The three existing posts will be migrated from `posts.js` into Markdown files. The generated post-data file replaces the hand-maintained post content while preserving the existing `window.BLOG_POSTS` interface, keeping frontend changes focused.

## GitHub Actions Deployment

A Pages workflow will run for pushes to `main` and manual dispatches. It will:

1. Check out the repository.
2. Set up the supported Node.js runtime.
3. Install locked build dependencies.
4. Run automated tests and the production build.
5. Upload `_site/` as the GitHub Pages artifact.
6. Deploy the artifact using the official Pages deployment action.

The workflow will use least-privilege permissions: repository contents read access, Pages write access, and an identity token for deployment. Pull requests may run validation without deploying.

## Article Rendering and AI Disclosure

The frontend will continue to render post lists and article details from the generated data. On an article whose `aiGenerated` value is `true`, an accessible disclosure block appears after the article summary and before the cover image or body:

> 이 글은 Agent가 제공된 정보를 기반으로 작성했습니다.

The disclosure is visible text, not only an icon or tooltip. Posts with `aiGenerated: false` do not render the block.

## Comments Architecture

Giscus will be loaded only on valid, published article pages. The widget will use:

- Repository: `2jeonghoon/2jeonghoon.github.io`.
- Discussion mapping: `specific`.
- Discussion term: the immutable post slug.
- Category: a dedicated Discussions category such as `Blog Comments`.
- Language: Korean.
- Reactions: enabled.
- Metadata emission: disabled.
- Theme: a light theme compatible with the current article design.

The frontend creates the Giscus script element after rendering the article and supplies the slug as the discussion term. This gives each post a stable discussion even if its title changes. Comments are moderated through GitHub Discussions.

The repository must have Discussions enabled and the Giscus GitHub App installed for the repository. The final repository ID and category ID will be configured without embedding any secret or personal access token.

If Giscus configuration is incomplete, the site shows a clear owner-facing setup notice instead of a broken empty region. If the external script fails at runtime, the article remains fully usable and the comments region shows a short retry/help message where browser capabilities allow failure detection.

## Data and Navigation Behavior

- Adding a Markdown file and pushing it to `main` publishes the post after a successful build.
- Editing a file updates the post without changing its URL or Discussion as long as the filename stays unchanged.
- Renaming a file intentionally changes the URL and creates a new comment mapping.
- Deleting a file removes the post from the site, RSS, and sitemap but leaves its Discussion available for manual archival or deletion.
- `draft: true` excludes a post from the homepage, search, category filters, direct article data, RSS, and sitemap.
- Search and filters operate on the generated published-post data exactly as they do now.

## Error Handling

The build exits non-zero with a filename and actionable message for:

- malformed front matter;
- missing required published-post fields;
- invalid dates or slugs;
- duplicate slugs;
- invalid metadata types;
- missing referenced local images;
- Markdown compilation failures.

No deployment occurs after validation failure. Runtime failures in the optional comment integration do not prevent article content from rendering.

## Testing and Verification

Automated checks will cover:

- front-matter parsing and required-field validation;
- invalid and duplicate slug rejection;
- draft exclusion from every generated artifact;
- date ordering and featured-post selection;
- calculated and explicit reading time;
- safe Markdown conversion with raw HTML disabled;
- correct AI-disclosure data propagation;
- RSS and sitemap entries for published posts only;
- Giscus configuration using the article slug;
- successful assembly of the `_site/` deployment directory.

Browser verification will cover desktop and mobile versions of:

- the homepage and article list;
- search and category filtering;
- each migrated article;
- AI disclosure visibility;
- comments section placement and fallback state;
- next-article navigation and return-to-list navigation.

The final verification will also inspect the GitHub Actions workflow syntax and the produced Pages artifact.

## One-time Repository Setup

The owner must enable GitHub Discussions and install the Giscus GitHub App for `2jeonghoon/2jeonghoon.github.io`. A dedicated `Blog Comments` category should be created. Once its public repository and category identifiers are available, they will be placed in the frontend configuration. No secret is required in the repository or browser.

## Documentation

The repository README will document:

- how to copy the post template;
- every supported front-matter field;
- how to preview and validate locally;
- how publishing and drafts work;
- how to moderate Giscus comments;
- how to change the featured post;
- how to mark Agent-authored posts accurately.
