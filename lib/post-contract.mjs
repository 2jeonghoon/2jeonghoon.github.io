import matter from "gray-matter";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const LIMITS = Object.freeze({
  title: 200,
  description: 600,
  category: 80,
  tag: 60,
  body: 240 * 1024
});

export class ContractError extends Error {
  constructor(message, field = "") {
    super(message);
    this.name = "ContractError";
    this.field = field;
  }
}

function fail(message, field = "") {
  throw new ContractError(message, field);
}

function boundedString(value, field, {required = false, limit = LIMITS[field]} = {}) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") fail(`${field} must be a string`, field);
  const normalized = value.trim();
  if (required && normalized === "") fail(`${field} is required`, field);
  if (limit && normalized.length > limit) {
    fail(`${field} must be at most ${limit} characters`, field);
  }
  return normalized;
}

function boolean(value, field, defaultValue) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (typeof value !== "boolean") fail(`${field} must be boolean`, field);
  return value;
}

function normalizeDate(value, draft) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    value = value.toISOString().slice(0, 10);
  }
  if (draft && (value === undefined || value === null || value === "")) return "";
  if (typeof value !== "string" || !DATE.test(value)) {
    fail("invalid date; expected YYYY-MM-DD", "date");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("invalid date; expected a real calendar day", "date");
  }
  return value;
}

function normalizeTags(value, draft) {
  if (draft && (value === undefined || value === null)) return [];
  if (
    !Array.isArray(value) ||
    (!draft && value.length === 0) ||
    value.some(tag => typeof tag !== "string" || tag.trim() === "")
  ) {
    fail("tags must be a non-empty string array", "tags");
  }
  return value.map(tag => {
    const normalized = boundedString(tag, "tag", {required: true, limit: LIMITS.tag});
    return normalized;
  });
}

function normalizeImage(value) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string") fail("image must be a string", "image");
  const segments = value.split("/");
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    !/^[A-Za-z0-9._/-]+$/.test(value) ||
    segments.some(segment => segment === "" || segment === "." || segment === "..")
  ) {
    fail("invalid image path", "image");
  }
  return value;
}

export function validateSlug(slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) fail("invalid slug", "slug");
  return slug;
}

export function validatePostInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("post must be an object");
  }
  const slug = validateSlug(input.slug);
  const draft = boolean(input.draft, "draft");
  const body = boundedString(input.body ?? "", "body", {limit: LIMITS.body});
  const required = !draft;

  return {
    slug,
    title: boundedString(input.title, "title", {required}),
    description: boundedString(input.description, "description", {required}),
    date: normalizeDate(input.date, draft),
    category: boundedString(input.category, "category", {required}),
    tags: normalizeTags(input.tags, draft),
    image: normalizeImage(input.image),
    readingTime: boundedString(input.readingTime, "readingTime", {limit: 80}),
    featured: boolean(input.featured, "featured", false),
    draft,
    aiGenerated: boolean(input.aiGenerated, "aiGenerated"),
    body
  };
}

export function parsePostSource({filePath, source}) {
  if (typeof filePath !== "string" || typeof source !== "string") {
    fail("filePath and source must be strings");
  }
  if (!filePath.endsWith(".md")) fail("invalid slug", "slug");
  const slug = filePath.slice(0, -3);
  if (filePath !== `${slug}.md`) fail("invalid slug", "slug");
  validateSlug(slug);

  let parsed;
  try {
    parsed = matter(source);
  } catch (error) {
    fail(`malformed front matter (${error.message})`);
  }
  const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1] ?? "";
  const declaredDate = frontMatter.match(/^date:\s*([^#\n]+?)\s*$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2");
  if (parsed.data.date instanceof Date && declaredDate) {
    const normalizedDate = parsed.data.date.toISOString().slice(0, 10);
    if (declaredDate !== normalizedDate) {
      fail("invalid date; expected a real calendar day", "date");
    }
  }
  return validatePostInput({...parsed.data, slug, body: parsed.content.trimEnd()});
}

function yamlValue(value) {
  return JSON.stringify(value);
}

export function serializePostSource(input) {
  const post = validatePostInput(input);
  const fields = [
    ["title", post.title],
    ["description", post.description],
    ["date", post.date],
    ["category", post.category],
    ["tags", post.tags],
    ["image", post.image],
    ["readingTime", post.readingTime],
    ["featured", post.featured],
    ["draft", post.draft],
    ["aiGenerated", post.aiGenerated]
  ];
  const frontMatter = fields.map(([key, value]) => `${key}: ${yamlValue(value)}`).join("\n");
  return `---\n${frontMatter}\n---\n${post.body}\n`;
}
