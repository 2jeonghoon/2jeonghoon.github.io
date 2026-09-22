import path from "node:path";

import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false
});

function fail(filePath, message) {
  throw new Error(`${filePath}: ${message}`);
}

function requireString(data, field, filePath) {
  if (typeof data[field] !== "string" || data[field].trim() === "") {
    fail(filePath, `${field} is required`);
  }
}

function normalizeDate(value, filePath, draft, declaredValue = "") {
  if (draft && (value === undefined || value === null || value === "")) {
    return "";
  }

  let normalized = value;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    normalized = value.toISOString().slice(0, 10);
  }
  const declared = declaredValue.trim().replace(/^(["'])(.*)\1$/, "$2");
  if (declared && declared !== normalized) {
    fail(filePath, "invalid date; expected a real calendar day");
  }
  if (typeof normalized !== "string" || !DATE.test(normalized)) {
    fail(filePath, "invalid date; expected YYYY-MM-DD");
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    fail(filePath, "invalid date; expected a real calendar day");
  }
  return normalized;
}

function validateImage(image, filePath) {
  if (image === undefined || image === "") return;
  if (typeof image !== "string") fail(filePath, "image must be a string");
  const segments = image.replaceAll("\\", "/").split("/");
  if (
    path.isAbsolute(image) ||
    image.includes("\\") ||
    segments.includes("..") ||
    segments.includes("")
  ) {
    fail(filePath, "invalid image path");
  }
}

function validatePublishedMetadata(data, filePath) {
  for (const field of ["title", "description", "category"]) {
    requireString(data, field, filePath);
  }
  normalizeDate(data.date, filePath, false);
  if (
    !Array.isArray(data.tags) ||
    data.tags.length === 0 ||
    data.tags.some(tag => typeof tag !== "string" || tag.trim() === "")
  ) {
    fail(filePath, "tags must be a non-empty string array");
  }
  validateImage(data.image, filePath);
  if (
    data.readingTime !== undefined &&
    (typeof data.readingTime !== "string" || data.readingTime.trim() === "")
  ) {
    fail(filePath, "readingTime must be a non-empty string");
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function postUrl(siteUrl, slug) {
  return `${siteUrl.replace(/\/$/, "")}/?post=${encodeURIComponent(slug)}`;
}

export function renderMarkdown(source) {
  return markdown.render(source);
}

export function calculateReadingTime(source) {
  const words = source
    .replace(/[`#>*_\[\]()!-]/g, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function parsePost({filePath, source, projectRoot = ""}) {
  void projectRoot;
  const basename = path.basename(filePath);
  const slug = path.basename(filePath, ".md");
  if (
    filePath !== basename ||
    basename !== `${slug}.md` ||
    !SLUG.test(slug)
  ) {
    fail(filePath, "invalid slug");
  }

  let parsed;
  try {
    parsed = matter(source);
  } catch (error) {
    fail(filePath, `malformed front matter (${error.message})`);
  }
  const {data, content} = parsed;
  const declaredDate =
    source.match(/^date:\s*([^#\n]+?)\s*$/m)?.[1] ?? "";

  if (typeof data.draft !== "boolean") {
    fail(filePath, "draft must be boolean");
  }
  if (typeof data.aiGenerated !== "boolean") {
    fail(filePath, "aiGenerated must be boolean");
  }
  if (data.featured !== undefined && typeof data.featured !== "boolean") {
    fail(filePath, "featured must be boolean");
  }
  if (!data.draft) validatePublishedMetadata(data, filePath);
  else validateImage(data.image, filePath);

  return {
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: normalizeDate(data.date, filePath, data.draft, declaredDate),
    category: data.category ?? "",
    tags: data.tags ?? [],
    readingTime: data.readingTime ?? calculateReadingTime(content),
    image: data.image ?? "",
    featured: data.featured ?? false,
    draft: data.draft,
    aiGenerated: data.aiGenerated,
    content: renderMarkdown(content)
  };
}

export function compilePosts(sourceRecords) {
  const seen = new Set();
  const parsed = sourceRecords.map(record => {
    const post = parsePost(record);
    if (seen.has(post.slug)) {
      throw new Error(`${record.filePath}: duplicate slug ${post.slug}`);
    }
    seen.add(post.slug);
    return post;
  });

  return parsed
    .filter(post => !post.draft)
    .sort((left, right) =>
      right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug)
    );
}

export function selectFeatured(posts) {
  return posts.find(post => post.featured) ?? posts[0] ?? null;
}

export function serializePosts(posts) {
  return `window.BLOG_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
}

export function createFeedXml(posts, siteUrl) {
  const items = posts
    .map(post => {
      const url = postUrl(siteUrl, post.slug);
      const pubDate = new Date(`${post.date}T00:00:00+09:00`).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>JH.LOG</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>게임과 시스템을 만드는 이정훈의 개발 기록</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;
}

export function createSitemapXml(posts, siteUrl) {
  const home = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const urls = [home, ...posts.map(post => postUrl(siteUrl, post.slug))]
    .map(url => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
