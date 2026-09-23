import {validateSlug} from "../../lib/post-contract.mjs";

const API = "https://api.github.com";
const OWNER = "2jeonghoon";
const REPOSITORY = "2jeonghoon.github.io";
const REPOSITORY_ID = 781249964;
const BRANCH = "main";
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

export async function createInstallationToken({appId, privateKey, installationId, now = Date.now(), fetchImpl = fetch}) {
  const jwt = await appJwt({appId, privateKey, now});
  const response = await fetchImpl(`${API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: headers(jwt, {"Content-Type": "application/json"}),
    body: JSON.stringify({repository_ids: [REPOSITORY_ID], permissions: {contents: "write"}})
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
    async listPostEntries() {
      const entries = await request(`${API}/repos/${OWNER}/${REPOSITORY}/contents/posts?ref=${BRANCH}`);
      if (!Array.isArray(entries)) throw new GitHubError("invalid repository response");
      return entries.filter(entry => /^posts\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.path));
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
