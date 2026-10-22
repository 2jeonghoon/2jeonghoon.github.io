import {validateSlug} from "../../lib/post-contract.mjs";

const API = "https://api.github.com";
const OWNER = "2jeonghoon";
const REPOSITORY = "2jeonghoon.github.io";
const REPOSITORY_ID = 781249964;
const BRANCH = "main";
const CATEGORY_PATH = "categories.json";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class GitHubError extends Error {
  constructor(message, {status = 502, code = "upstream", cause} = {}) {
    super(message, {cause});
    this.name = "GitHubError";
    this.status = status;
    this.code = code;
  }
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\s/g, ""));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function headers(token, extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jh-log-admin",
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...extra
  };
}

function mapError(response, body, {mutation = false, create = false} = {}) {
  if (response.status === 404) return new GitHubError("resource not found", {status: 404, code: "not_found"});
  if (response.status === 409 || (create && response.status === 422)) {
    return new GitHubError("post changed or already exists", {status: 409, code: "conflict"});
  }
  if (response.status === 422) return new GitHubError("GitHub rejected the post", {status: 422, code: "validation"});
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return new GitHubError("GitHub rate limit exceeded", {status: 429, code: "rate_limit"});
  }
  return new GitHubError(body?.message || "GitHub request failed", {
    status: mutation ? 502 : response.status,
    code: mutation ? "ambiguous_write" : "upstream"
  });
}

async function appJwt({appId, privateKey, now}) {
  const header = base64Url(encoder.encode(JSON.stringify({alg: "RS256", typ: "JWT"})));
  const seconds = Math.floor(now / 1000);
  const claims = base64Url(encoder.encode(JSON.stringify({iat: seconds - 60, exp: seconds + 540, iss: String(appId)})));
  const pem = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodeBase64(pem),
    {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
    false,
    ["sign"]
  );
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

export async function exchangeOAuthCode({code, clientId, clientSecret, redirectUri, fetchImpl = fetch}) {
  const response = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: headers("", {"Content-Type": "application/json"}),
    body: JSON.stringify({client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri})
  });
  const body = await readJson(response);
  if (!response.ok || typeof body.access_token !== "string") throw mapError(response, body);
  return body.access_token;
}

export async function fetchOAuthUser({token, fetchImpl = fetch}) {
  const response = await fetchImpl(`${API}/user`, {headers: headers(token)});
  const body = await readJson(response);
  if (!response.ok || !Number.isInteger(body.id) || typeof body.login !== "string") throw mapError(response, body);
  return {id: body.id, login: body.login};
}

export async function createInstallationToken({appId, privateKey, installationId, permissions = {contents: "write"}, now = Date.now(), fetchImpl = fetch}) {
  const jwt = await appJwt({appId, privateKey, now});
  const response = await fetchImpl(`${API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: headers(jwt, {"Content-Type": "application/json"}),
    body: JSON.stringify({repository_ids: [REPOSITORY_ID], permissions})
  });
  const body = await readJson(response);
  if (!response.ok || typeof body.token !== "string") throw mapError(response, body);
  return body.token;
}

function contentPath(slug) {
  return `posts/${validateSlug(slug)}.md`;
}

function encodeContent(source) {
  return base64(encoder.encode(source));
}

export function createGitHubContentsClient({token, fetchImpl = fetch}) {
  async function request(url, init = {}, options = {}) {
    try {
      const response = await fetchImpl(url, {...init, headers: headers(token, init.headers)});
      const body = await readJson(response);
      if (!response.ok) throw mapError(response, body, options);
      return body;
    } catch (error) {
      if (error instanceof GitHubError) throw error;
      throw new GitHubError(options.mutation ? "GitHub write result is unknown" : "GitHub request unavailable", {
        status: 502,
        code: options.mutation ? "ambiguous_write" : "upstream",
        cause: error
      });
    }
  }

  async function write(slug, payload, options = {}) {
    return request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/${contentPath(slug)}`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({...payload, branch: BRANCH})
    }, {mutation: true, ...options});
  }

  return {
    async verifyRepository() {
      const repository = await request(`${API}/repos/${OWNER}/${REPOSITORY}`);
      if (repository.id !== REPOSITORY_ID) throw new GitHubError("repository identity mismatch", {status: 503, code: "repository_mismatch"});
      return true;
    },
    async listComments() {
      const fields = "id body createdAt url author { login }";
      const pageFields = "pageInfo { hasNextPage endCursor }";
      const replyFields = `${fields} replies(first: 100) { ${pageFields} nodes { ${fields} } }`;
      const query = `query { repository(owner: "${OWNER}", name: "${REPOSITORY}") {
        discussions(first: 20, categoryId: "DIC_kwDOLpDtrM4DGKAp", orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo { hasNextPage }
          nodes { id title comments(first: 100) { ${pageFields} nodes {
            ${replyFields}
          } } }
        }
      } }`;
      const result = await request(`${API}/graphql`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({query})});
      if (result.errors?.length || !result.data?.repository?.discussions) throw new GitHubError("Discussions read permission required", {status: 502});
      const discussions = result.data.repository.discussions;
      let limited = discussions.pageInfo.hasNextPage;
      let requests = 0;
      async function allNodes(connection, id, type, field, selection) {
        const nodes = [...connection.nodes];
        while (connection.pageInfo.hasNextPage) {
          if (++requests > 100) { limited = true; break; }
          const query = `query($id: ID!, $after: String!) { node(id: $id) { ... on ${type} { ${field}(first: 100, after: $after) { ${pageFields} nodes { ${selection} } } } } }`;
          const next = await request(`${API}/graphql`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({query, variables: {id, after: connection.pageInfo.endCursor}})});
          if (next.errors?.length || !next.data?.node?.[field]) throw new GitHubError("Comment pagination failed", {status: 502});
          connection = next.data.node[field];
          nodes.push(...connection.nodes);
        }
        return nodes;
      }
      const comments = [];
      for (const discussion of discussions.nodes) {
        const parents = await allNodes(discussion.comments, discussion.id, "Discussion", "comments", replyFields);
        for (const parent of parents) {
          const replies = await allNodes(parent.replies, parent.id, "DiscussionComment", "replies", fields);
          for (const item of [parent, ...replies]) {
            comments.push({id: item.id, body: item.body.slice(0, 2000), createdAt: item.createdAt, url: item.url,
              author: item.author?.login || "탈퇴한 사용자", slug: discussion.title, reply: item !== parent});
          }
        }
      }
      comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {comments: comments.slice(0, 100), limited: Boolean(limited || comments.length > 100)};
    },
    async listPostEntries() {
      const entries = await request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/posts?ref=${BRANCH}`);
      if (!Array.isArray(entries)) throw new GitHubError("invalid repository response");
      return entries.filter(entry => /^posts\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.path));
    },
    async listPostSources() {
      const entries = await this.listPostEntries();
      const sources = [];
      // Batch immutable blobs so large post collections stay below Worker fetch limits.
      for (let offset = 0; offset < entries.length; offset += 20) {
        const batch = entries.slice(offset, offset + 20);
        const fields = batch.map((entry, index) => `post${index}: object(expression: ${JSON.stringify(entry.sha)}) { ... on Blob { oid text isTruncated } }`).join("\n");
        const query = `query { repository(owner: "${OWNER}", name: "${REPOSITORY}") { ${fields} } }`;
        const result = await request(`${API}/graphql`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({query})});
        if (result.errors?.length || !result.data?.repository) throw new GitHubError("post batch query failed");
        batch.forEach((entry, index) => {
          const blob = result.data.repository[`post${index}`];
          if (!blob || blob.oid !== entry.sha || typeof blob.text !== "string" || blob.isTruncated) throw new GitHubError("incomplete post batch response");
          sources.push({name: entry.name, sha: blob.oid, source: blob.text});
        });
      }
      return sources;
    },
    async getCategoryConfig() {
      try {
        const item = await request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/${CATEGORY_PATH}?ref=${BRANCH}`);
        let parsed;
        try {
          parsed = JSON.parse(decoder.decode(decodeBase64(item.content ?? "")));
        } catch (error) {
          throw new GitHubError("invalid category configuration", {cause: error});
        }
        if (!Array.isArray(parsed?.categories)) throw new GitHubError("invalid category configuration");
        return {sha: item.sha, categories: parsed.categories};
      } catch (error) {
        if (error instanceof GitHubError && error.code === "not_found") return {sha: "", categories: []};
        throw error;
      }
    },
    writeCategoryConfig(categories, sha) {
      const payload = {
        message: "blog: update categories",
        content: encodeContent(`${JSON.stringify({categories}, null, 2)}\n`),
        branch: BRANCH,
        ...(sha ? {sha} : {})
      };
      return request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/${CATEGORY_PATH}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      }, {mutation: true, create: !sha});
    },
    async getPost(slug) {
      const item = await request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/${contentPath(slug)}?ref=${BRANCH}`);
      return {sha: item.sha, source: decoder.decode(decodeBase64(item.content ?? ""))};
    },
    createPost(slug, source) {
      return write(slug, {message: `blog: create ${validateSlug(slug)}`, content: encodeContent(source)}, {create: true});
    },
    updatePost(slug, source, sha) {
      validateSlug(slug);
      if (typeof sha !== "string" || !sha) return Promise.reject(new GitHubError("sha is required", {status: 422, code: "validation"}));
      return write(slug, {message: `blog: update ${slug}`, content: encodeContent(source), sha});
    },
    deletePost(slug, sha) {
      validateSlug(slug);
      if (typeof sha !== "string" || !sha) return Promise.reject(new GitHubError("sha is required", {status: 422, code: "validation"}));
      return request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/${contentPath(slug)}`, {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: `blog: delete ${slug}`, sha, branch: BRANCH})
      }, {mutation: true});
    }
  };
}
