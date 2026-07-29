// Protect every /api/admin/* request (except login + OAuth start) with a valid
// session cookie, and require a CSRF token on state-changing methods.
import { verifySession, createCsrfToken, json } from "./_lib/server";

const PUBLIC = ["/api/admin/login", "/api/admin/oauth/start", "/api/admin/oauth/callback"];

// eslint-disable-next-line
export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin")) return context.next();

  if (PUBLIC.includes(url.pathname)) return context.next();

  const cookie = request.headers.get("Cookie") || "";
  const sessionMatch = cookie.match(/printopia_admin=([^;]+)/);
  const ok = await verifySession(sessionMatch?.[1] ?? null);
  if (!ok) return json({ message: "غیرمجاز" }, 401);

  // CSRF: double-submit header on writes.
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (mutating) {
    const expected = await createCsrfToken(sessionMatch![1]);
    const provided = request.headers.get("x-csrf-token");
    if (provided !== expected) return json({ message: "درخواست نامعتبر (CSRF)" }, 403);
  }

  return context.next();
}
