// Server-side helpers for the Cloudflare Pages Functions (NOT used by the
// single-file preview build). Real auth + GitHub publishing lives here so the
// admin UI only needs to call these endpoints. See README for required env vars.

export const ENV = {
  adminPasswordHash: process?.env?.ADMIN_PASSWORD_HASH ?? "",
  sessionSecret: process?.env?.SESSION_SECRET ?? "",
  githubAppId: process?.env?.GITHUB_APP_ID ?? "",
  githubAppPrivateKey: process?.env?.GITHUB_APP_PRIVATE_KEY ?? "",
  githubInstallationId: process?.env?.GITHUB_INSTALLATION_ID ?? "",
  githubOwner: process?.env?.GITHUB_OWNER ?? "",
  githubRepo: process?.env?.GITHUB_REPO ?? "",
  githubBranch: process?.env?.GITHUB_BRANCH ?? "main",
  oauthClientId: process?.env?.GITHUB_CLIENT_ID ?? "",
  oauthClientSecret: process?.env?.GITHUB_CLIENT_SECRET ?? "",
  oauthRedirectUrl: process?.env?.OAUTH_REDIRECT_URL ?? "",
};

// ----------------------------- JSON helpers -----------------------------
export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// ----------------------------- Crypto: PBKDF2 -----------------------------
const enc = new TextEncoder();

function buf2hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pbkdf2Hash(password: string, saltB64?: string) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" }, key, 256);
  const saltB64Out = btoa(String.fromCharCode(...salt));
  return `${saltB64Out}:${buf2hex(bits)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltB64, expected] = stored.split(":");
  if (!saltB64 || !expected) return false;
  const computed = await pbkdf2Hash(password, saltB64);
  return computed.split(":")[1] === expected;
}

// ----------------------------- HMAC session + CSRF -----------------------------
async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(ENV.sessionSecret || "dev-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return buf2hex(sig);
}

export async function createSessionCookie(): Promise<{ name: string; value: string }> {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12h
  const payload = `admin.${exp}`;
  const sig = await hmac(payload);
  return { name: "printopia_admin", value: `${payload}.${sig}` };
}

export async function verifySession(cookie: string | null): Promise<boolean> {
  if (!cookie) return false;
  const [payload, sig] = cookie.split(".");
  const [_, expStr] = payload.split(".");
  if (!payload || !sig || Number(expStr) < Date.now()) return false;
  return (await hmac(payload)) === sig;
}

export function cookieHeader(name: string, value: string, maxAgeSec: number) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

export function clearCookieHeader(name: string) {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// CSRF: double-submit token. Issue on login; require matching header on writes.
export async function createCsrfToken(session: string) {
  return (await hmac(`csrf.${session}`)).slice(0, 32);
}

// ----------------------------- Rate limit (per-isolate, approximate) -----------------------------
const attempts = new Map<string, { count: number; first: number }>();
export function rateLimit(key: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > windowMs) {
    attempts.set(key, { count: 1, first: now });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

// ----------------------------- GitHub (App installation token) -----------------------------
function b64url(input: string) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
}

async function createAppJwt() {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: Math.floor(Date.now() / 1000) - 60, exp: Math.floor(Date.now() / 1000) + 600, iss: ENV.githubAppId }));
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(ENV.githubAppPrivateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(data));
  return `${data}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function getInstallationToken() {
  const jwt = await createAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${ENV.githubInstallationId}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages" },
  });
  if (!res.ok) throw new Error("GitHub installation token failed");
  const data = (await res.json()) as { token: string };
  return data.token;
}

function utf8ToBase64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

export class ConflictError extends Error {}

export async function commitFile(opts: { path: string; content: string; message: string }) {
  const token = await getInstallationToken();
  const { owner, repo, branch } = ENV;
  // Read current SHA to detect conflicts before overwriting.
  let sha: string | undefined;
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(opts.path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages" },
  });
  if (getRes.status === 200) {
    const got = (await getRes.json()) as { sha: string };
    sha = got.sha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(opts.path)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages", "Content-Type": "application/json" },
    body: JSON.stringify({ message: opts.message, content: utf8ToBase64(opts.content), sha, branch }),
  });
  if (putRes.status === 409) throw new ConflictError("تعارض: فایل از سوی دیگری تغییر کرده. دوباره تلاش کنید.");
  if (!putRes.ok) throw new Error(`GitHub commit failed: ${putRes.status}`);
  return (await putRes.json()) as { commit: { sha: string } };
}

export async function deleteFile(opts: { path: string; message: string }) {
  const token = await getInstallationToken();
  const { owner, repo, branch } = ENV;
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(opts.path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages" },
  });
  if (!getRes.ok) return;
  const got = (await getRes.json()) as { sha: string };
  await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(opts.path)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages", "Content-Type": "application/json" },
    body: JSON.stringify({ message: opts.message, sha: got.sha, branch }),
  });
}
