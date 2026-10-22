import {ContractError, validateSlug} from "../../lib/post-contract.mjs";
import {GitHubError, createGitHubContentsClient, createInstallationToken, exchangeOAuthCode, fetchOAuthUser} from "./github.mjs";
import {createPostService} from "./post-service.mjs";
import {createCategoryService} from "./category-service.mjs";
import {recordView, readAnalytics} from "./analytics.mjs";
import analyticsPages from "./analytics-pages.json" with {type: "json"};
import {
  SecurityError, assertMutationRequest, createOAuthState, expireSessionCookie,
  issueSession, jsonResponse, securityHeaders, serializeSessionCookie, verifySession
} from "./security.mjs";

const BODY_LIMIT = 256 * 1024;
const OAUTH_COOKIE = "__Host-jh_oauth";
const PUBLIC_PAGES = new Set(["/", ...analyticsPages]);
const VIEW_PATH = "/api/analytics/view";

function now(env) { return env.NOW ? env.NOW() : Date.now(); }
function requestId() { return createOAuthState().slice(0, 22); }
function withRequestId(response, id) {
  const copy = new Response(response.body, response);
  copy.headers.set("X-Request-Id", id);
  for (const [name, value] of Object.entries(securityHeaders())) copy.headers.set(name, value);
  return copy;
}
function oauthCookie(value) { return `${OAUTH_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`; }
function expireOAuthCookie() { return `${OAUTH_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`; }
function cookie(request, name) {
  return (request.headers.get("cookie") ?? "").split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
}

async function rateLimit(binding, key) {
  if (!binding) return;
  const result = await binding.limit({key});
  if (!result.success) throw new SecurityError("rate limit exceeded", 429);
}

async function hashedRateLimitKey(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function auditRequest(env, request, url, id, status) {
  const entry = {
    requestId: id,
    method: request.method,
    path: url.pathname,
    status,
    addressHash: await hashedRateLimitKey(request.headers.get("cf-connecting-ip") || "unknown")
  };
  try {
    if (env.AUDIT_LOG) await env.AUDIT_LOG(entry);
    else console.log(JSON.stringify(entry));
  } catch {
    // Audit transport must never change the request result.
  }
}

function requireConfig(env) {
  if (!env.SESSION_SIGNING_KEY || !env.OWNER_GITHUB_ID || !env.ADMIN_ORIGIN) {
    throw new SecurityError("admin service is not configured", 503);
  }
}

async function githubClient(env, permissions) {
  if (env.GITHUB_CLIENT) return env.GITHUB_CLIENT;
  for (const name of ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_APP_INSTALLATION_ID"]) {
    if (!env[name]) throw new SecurityError("admin service is not configured", 503);
  }
  const token = await createInstallationToken({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    permissions
  });
  return createGitHubContentsClient({token});
}

async function oauthUser(env, code) {
  if (env.OAUTH_USER) return env.OAUTH_USER(code);
  if (!env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET) {
    throw new SecurityError("admin service is not configured", 503);
  }
  const token = await exchangeOAuthCode({
    code,
    clientId: env.GITHUB_APP_CLIENT_ID,
    clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    redirectUri: `${env.ADMIN_ORIGIN}/auth/callback`
  });
  return fetchOAuthUser({token});
}

async function session(request, env, required = true) {
  const token = cookie(request, "__Host-jh_admin");
  if (!token) {
    if (required) throw new SecurityError("authentication required", 401);
    return null;
  }
  return verifySession({cookie: token, ownerId: env.OWNER_GITHUB_ID, now: now(env), secret: env.SESSION_SIGNING_KEY});
}

async function readBody(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > BODY_LIMIT) throw new SecurityError("request body too large", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > BODY_LIMIT) throw new SecurityError("request body too large", 413);
  try { return JSON.parse(text); } catch { throw new SecurityError("invalid JSON", 400); }
}

function routeSlug(pathname) {
  const match = pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (!match) return null;
  try { return validateSlug(decodeURIComponent(match[1])); } catch { throw new ContractError("invalid slug", "slug"); }
}

async function handleAuth(request, env, url) {
  if (url.pathname === "/auth/login" && request.method === "GET") {
    const address = request.headers.get("cf-connecting-ip") || "unknown";
    await rateLimit(env.AUTH_RATE_LIMITER, await hashedRateLimitKey(address));
    const state = createOAuthState();
    const signed = await issueSession({ownerId: state, now: now(env), secret: env.SESSION_SIGNING_KEY});
    const location = new URL("https://github.com/login/oauth/authorize");
    location.searchParams.set("client_id", env.GITHUB_APP_CLIENT_ID || "unconfigured");
    location.searchParams.set("redirect_uri", `${env.ADMIN_ORIGIN}/auth/callback`);
    location.searchParams.set("state", state);
    return new Response(null, {status: 302, headers: {Location: location.href, "Set-Cookie": oauthCookie(signed)}});
  }
  if (url.pathname === "/auth/callback" && request.method === "GET") {
    const state = url.searchParams.get("state") ?? "";
    const code = url.searchParams.get("code") ?? "";
    const clear = {"Set-Cookie": expireOAuthCookie()};
    if (!state || !code) throw new SecurityError("invalid OAuth callback");
    try {
      try {
        await verifySession({cookie: cookie(request, OAUTH_COOKIE), ownerId: state, now: now(env), secret: env.SESSION_SIGNING_KEY});
      } catch {
        throw new SecurityError("invalid OAuth state", 403);
      }
      const user = await oauthUser(env, code);
      if (String(user.id) !== String(env.OWNER_GITHUB_ID)) throw new SecurityError("access denied");
      const token = await issueSession({ownerId: env.OWNER_GITHUB_ID, now: now(env), secret: env.SESSION_SIGNING_KEY});
      const response = new Response(null, {status: 302, headers: {Location: `${env.ADMIN_ORIGIN}/`}});
      response.headers.append("Set-Cookie", serializeSessionCookie(token));
      response.headers.append("Set-Cookie", expireOAuthCookie());
      return response;
    } catch (error) {
      error.responseHeaders = clear;
      throw error;
    }
  }
  if (url.pathname === "/auth/logout" && request.method === "POST") {
    const current = await session(request, env);
    assertMutationRequest(request, current, env.ADMIN_ORIGIN);
    return jsonResponse({ok: true}, {headers: {"Set-Cookie": expireSessionCookie()}});
  }
  return null;
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/session" && request.method === "GET") {
    const current = await session(request, env, false);
    return jsonResponse(current ? {authenticated: true, login: "2jeonghoon", csrfToken: current.csrfToken} : {authenticated: false});
  }
  const current = await session(request, env);
  const mutation = ["POST", "PUT", "DELETE"].includes(request.method);
  await rateLimit(
    mutation ? env.MUTATION_RATE_LIMITER : env.READ_RATE_LIMITER,
    `${current.ownerId}:${current.sessionId}`
  );
  if (mutation) assertMutationRequest(request, current, env.ADMIN_ORIGIN);
  if (url.pathname === "/api/analytics") {
    if (request.method !== "GET") throw new SecurityError("method not allowed", 405);
    return jsonResponse(await readAnalytics(env.ANALYTICS_DB, now(env)));
  }
  if (url.pathname === "/api/comments") {
    if (request.method !== "GET") throw new SecurityError("method not allowed", 405);
    const client = await githubClient(env, {discussions: "read"});
    return jsonResponse(await client.listComments());
  }
  const client = await githubClient(env);
  const service = createPostService(client);
  const categories = createCategoryService(client, service);

  if (url.pathname === "/api/categories") {
    if (request.method === "GET") return jsonResponse(await categories.list());
    if (request.method === "POST") return jsonResponse(await categories.create(await readBody(request)), {status: 201});
    throw new SecurityError("method not allowed", 405);
  }

  if (url.pathname === "/api/posts") {
    if (request.method === "GET") return jsonResponse({posts: await service.list()});
    if (request.method === "POST") {
      const input = await readBody(request);
      await categories.assertPostSelection(input);
      return jsonResponse(await service.create(input), {status: 201});
    }
    throw new SecurityError("method not allowed", 405);
  }
  if (url.pathname === "/api/preview") {
    if (request.method !== "POST") throw new SecurityError("method not allowed", 405);
    return jsonResponse(service.preview(await readBody(request)));
  }
  const slug = routeSlug(url.pathname);
  if (slug) {
    if (request.method === "GET") return jsonResponse(await service.get(slug));
    if (request.method === "PUT") {
      const input = await readBody(request);
      await categories.assertPostSelection(input);
      return jsonResponse(await service.update(slug, input));
    }
    if (request.method === "DELETE") return jsonResponse(await service.delete(slug, await readBody(request)));
    throw new SecurityError("method not allowed", 405);
  }
  throw new SecurityError("not found", 404);
}

function collectionCors(response, request, env) {
  const copy = new Response(response.body, response);
  copy.headers.set("Cache-Control", "no-store");
  copy.headers.set("Vary", "Origin");
  if (env.PUBLIC_BLOG_ORIGIN && request.headers.get("origin") === env.PUBLIC_BLOG_ORIGIN) {
    copy.headers.set("Access-Control-Allow-Origin", env.PUBLIC_BLOG_ORIGIN);
    copy.headers.set("Access-Control-Allow-Methods", "POST");
    copy.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return copy;
}

async function collectView(request, env) {
  if (!env.PUBLIC_BLOG_ORIGIN || request.headers.get("origin") !== env.PUBLIC_BLOG_ORIGIN) throw new SecurityError("request forbidden");
  if (request.method === "OPTIONS") {
    if (request.headers.get("access-control-request-method") !== "POST") throw new SecurityError("method not allowed", 405);
    const headers = (request.headers.get("access-control-request-headers") || "").toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
    if (headers.some(value => value !== "content-type")) throw new SecurityError("request forbidden");
    return new Response(null, {status: 204});
  }
  if (request.method !== "POST") throw new SecurityError("method not allowed", 405);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) throw new SecurityError("JSON content type required", 415);
  if (!env.VIEW_RATE_LIMITER) throw new SecurityError("collection unavailable", 503);
  await rateLimit(env.VIEW_RATE_LIMITER, await hashedRateLimitKey(request.headers.get("cf-connecting-ip") || "unknown"));
  if (Number(request.headers.get("content-length") || 0) > 1024) throw new SecurityError("request body too large", 413);
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader) {
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 1024) { await reader.cancel(); throw new SecurityError("request body too large", 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input;
  try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new SecurityError("invalid JSON", 400); }
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || typeof input.page !== "string" || !PUBLIC_PAGES.has(input.page)) throw new SecurityError("invalid page", 400);
  await recordView(env.ANALYTICS_DB, input.page, now(env));
  return new Response(null, {status: 204});
}

async function serveWorkspace(request, env, url) {
  if (!["GET", "HEAD"].includes(request.method)) throw new SecurityError("method not allowed", 405);
  let current = null;
  try { current = await session(request, env, false); }
  catch (error) { if (error.status !== 401) throw error; }
  const assetUrl = new URL(current ? "/" : "/login", url);
  const asset = await env.ASSETS.fetch(new Request(assetUrl, {method: "GET"}));
  const response = new Response(request.method === "HEAD" ? null : asset.body, asset);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

async function fetchHandler(request, env) {
  const id = requestId();
  const url = new URL(request.url);
  try {
    if (url.pathname === VIEW_PATH) return withRequestId(collectionCors(await collectView(request, env), request, env), id);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      requireConfig(env);
      return withRequestId(await serveWorkspace(request, env, url), id);
    }
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) {
      const mathAsset = url.pathname === "/katex/katex.min.css" || /^\/katex\/fonts\/KaTeX_[A-Za-z0-9_-]+\.woff2$/.test(url.pathname);
      if (!mathAsset && !["/admin.js", "/admin.css", "/login", "/login.html"].includes(url.pathname)) throw new SecurityError("not found", 404);
      return withRequestId(await env.ASSETS.fetch(request), id);
    }
    requireConfig(env);
    const response = url.pathname.startsWith("/auth/")
      ? await handleAuth(request, env, url)
      : await handleApi(request, env, url);
    if (!response) throw new SecurityError("not found", 404);
    await auditRequest(env, request, url, id, response.status);
    return withRequestId(response, id);
  } catch (error) {
    const status = error instanceof ContractError ? 422 : error.status || 500;
    const body = {error: {code: error.code || (status === 422 ? "validation" : "request_failed"), message: status >= 500 ? "Request failed" : error.message}, requestId: id};
    if (url.pathname !== VIEW_PATH) await auditRequest(env, request, url, id, status);
    const response = jsonResponse(body, {status, headers: error.responseHeaders});
    return withRequestId(url.pathname === VIEW_PATH ? collectionCors(response, request, env) : response, id);
  }
}

export default {fetch: fetchHandler};
