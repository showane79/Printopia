// POST /api/admin/login — verify password (PBKDF2), enforce rate limit,
// set HttpOnly session cookie + issue CSRF token.
import { verifyPassword, rateLimit, createSessionCookie, createCsrfToken, cookieHeader, json, ENV } from "../../_lib/server";

// eslint-disable-next-line
export async function onRequestPost(context: any) {
  const { request } = context;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit(`login:${ip}`, 8, 60_000)) {
    return json({ message: "تلاش‌های زیادی؛ کمی بعد دوباره امتحان کنید." }, 429);
  }

  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  if (!ENV.adminPasswordHash) {
    return json({ message: "رمز مدیریت هنوز تنظیم نشده است." }, 500);
  }

  const ok = await verifyPassword(password, ENV.adminPasswordHash);
  if (!ok) return json({ message: "رمز عبور نادرست است." }, 401);

  const cookie = await createSessionCookie();
  const csrf = await createCsrfToken(cookie.value);
  return json({ ok: true, csrf }, 200, { "Set-Cookie": cookieHeader(cookie.name, cookie.value, 60 * 60 * 12) });
}
