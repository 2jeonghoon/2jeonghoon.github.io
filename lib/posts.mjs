import MarkdownIt from "markdown-it";
import {parsePostSource} from "./post-contract.mjs";

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false
});

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
  try {
    const parsed = parsePostSource({filePath, source});
    return {
      slug: parsed.slug,
      title: parsed.title,
      description: parsed.description,
      date: parsed.date,
      category: parsed.category,
      subcategory: parsed.subcategory,
      tags: parsed.tags,
      readingTime: parsed.readingTime || calculateReadingTime(parsed.body),
      image: parsed.image,
      featured: parsed.featured,
      draft: parsed.draft,
      aiGenerated: parsed.aiGenerated,
      content: renderMarkdown(parsed.body)
    };
  } catch (error) {
    if (error.message.startsWith(`${filePath}:`)) throw error;
    throw new Error(`${filePath}: ${error.message}`);
  }
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
