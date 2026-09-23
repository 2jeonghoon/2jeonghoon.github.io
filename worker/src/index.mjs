import {ContractError, validateSlug} from "../../lib/post-contract.mjs";
import {GitHubError, createGitHubContentsClient, createInstallationToken, exchangeOAuthCode, fetchOAuthUser} from "./github.mjs";
import {createPostService} from "./post-service.mjs";
import {
  SecurityError, assertMutationRequest, createOAuthState, expireSessionCookie,
  issueSession, jsonResponse, serializeSessionCookie, verifySession
} from "./security.mjs";

const BODY_LIMIT = 256 * 1024;
const OAUTH_COOKIE = "__Host-jh_oauth";

function now(env) { return env.NOW ? env.NOW() : Date.now(); }
function requestId() { return createOAuthState().slice(0, 22); }
function withRequestId(response, id) { const copy = new Response(response.body, response); copy.headers.set("X-Request-Id", id); return copy; }
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

function requireConfig(env) {
  if (!env.SESSION_SIGNING_KEY || !env.OWNER_GITHUB_ID || !env.ADMIN_ORIGIN) {
    throw new SecurityError("admin service is not configured", 503);
  }
}

async function githubClient(env) {
  if (env.GITHUB_CLIENT) return env.GITHUB_CLIENT;
  for (const name of ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_APP_INSTALLATION_ID"]) {
    if (!env[name]) throw new SecurityError("admin service is not configured", 503);
  }
  const token = await createInstallationToken({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    installationId: env.GITHUB_APP_INSTALLATION_ID
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
    await rateLimit(env.AUTH_RATE_LIMITER, request.headers.get("cf-connecting-ip") || "unknown");
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
  await rateLimit(mutation ? env.MUTATION_RATE_LIMITER : env.READ_RATE_LIMITER, current.sessionId);
  if (mutation) assertMutationRequest(request, current, env.ADMIN_ORIGIN);
  const client = await githubClient(env);
  const service = createPostService(client);

  if (url.pathname === "/api/posts") {
    if (request.method === "GET") return jsonResponse({posts: await service.list()});
    if (request.method === "POST") return jsonResponse(await service.create(await readBody(request)), {status: 201});
    throw new SecurityError("method not allowed", 405);
  }
  if (url.pathname === "/api/preview") {
    if (request.method !== "POST") throw new SecurityError("method not allowed", 405);
    return jsonResponse(service.preview(await readBody(request)));
  }
  const slug = routeSlug(url.pathname);
  if (slug) {
    if (request.method === "GET") return jsonResponse(await service.get(slug));
    if (request.method === "PUT") return jsonResponse(await service.update(slug, await readBody(request)));
    if (request.method === "DELETE") return jsonResponse(await service.delete(slug, await readBody(request)));
    throw new SecurityError("method not allowed", 405);
  }
  throw new SecurityError("not found", 404);
}

async function fetchHandler(request, env) {
  const id = requestId();
  const url = new URL(request.url);
  try {
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) return env.ASSETS.fetch(request);
    requireConfig(env);
    const response = url.pathname.startsWith("/auth/")
      ? await handleAuth(request, env, url)
      : await handleApi(request, env, url);
    if (!response) throw new SecurityError("not found", 404);
    return withRequestId(response, id);
  } catch (error) {
    const status = error instanceof ContractError ? 422 : error.status || 500;
    const body = {error: {code: error.code || (status === 422 ? "validation" : "request_failed"), message: status >= 500 ? "Request failed" : error.message}, requestId: id};
    return withRequestId(jsonResponse(body, {status, headers: error.responseHeaders}), id);
  }
}

export default {fetch: fetchHandler};
