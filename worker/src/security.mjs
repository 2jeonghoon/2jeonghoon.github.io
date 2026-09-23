const SESSION_COOKIE = "__Host-jh_admin";
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const ABSOLUTE_LIMIT_MS = 8 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class SecurityError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "SecurityError";
    this.status = status;
  }
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function hmac(value, secret) {
  if (typeof secret !== "string" || encoder.encode(secret).length < 32) {
    throw new SecurityError("session configuration unavailable", 503);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {name: "HMAC", hash: "SHA-256"},
    false,
    ["sign"]
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export function createOAuthState() {
  return randomToken(32);
}

export function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function issueSession({ownerId, now, secret, issuedAt = now}) {
  const payload = {
    v: 1,
    sub: String(ownerId),
    sid: randomToken(24),
    csrf: randomToken(32),
    iat: issuedAt,
    seen: now
  };
  const encoded = base64Url(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(encoded, secret)}`;
}

function tokenFromCookie(cookie) {
  if (typeof cookie !== "string") return "";
  if (!cookie.includes("=")) return cookie;
  return cookie
    .split(";")
    .map(part => part.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.slice(1).join("=") ?? "";
}

export async function verifySession({cookie, ownerId, now, secret}) {
  try {
    const token = tokenFromCookie(cookie);
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) throw new Error("shape");
    const expected = await hmac(encoded, secret);
    if (!timingSafeEqual(signature, expected)) throw new Error("signature");
    const payload = JSON.parse(decoder.decode(fromBase64Url(encoded)));
    if (payload.v !== 1 || payload.sub !== String(ownerId) || !payload.sid || !payload.csrf) {
      throw new Error("claims");
    }
    if (![payload.iat, payload.seen].every(Number.isFinite) || now < payload.iat || now < payload.seen) {
      throw new Error("time");
    }
    if (now - payload.seen > IDLE_LIMIT_MS || now - payload.iat > ABSOLUTE_LIMIT_MS) {
      throw new SecurityError("session expired", 401);
    }
    return {
      ownerId: payload.sub,
      sessionId: payload.sid,
      csrfToken: payload.csrf,
      issuedAt: payload.iat,
      lastSeenAt: payload.seen
    };
  } catch (error) {
    if (error instanceof SecurityError) throw error;
    throw new SecurityError("invalid session", 401);
  }
}

export function serializeSessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800`;
}

export function expireSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function assertMutationRequest(request, session, expectedOrigin) {
  if (request.headers.get("origin") !== expectedOrigin) {
    throw new SecurityError("request forbidden");
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new SecurityError("JSON content type required", 415);
  }
  if (!timingSafeEqual(request.headers.get("x-csrf-token") ?? "", session?.csrfToken ?? "")) {
    throw new SecurityError("request forbidden");
  }
}

export function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data: https://2jeonghoon.github.io; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self' https://github.com; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
  };
}

export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  for (const [name, value] of Object.entries(securityHeaders())) headers.set(name, value);
  return new Response(JSON.stringify(body), {...init, headers});
}
