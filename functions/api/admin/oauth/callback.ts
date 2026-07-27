// GET /api/admin/oauth/callback — GitHub redirects back here.
// On Cloudflare, the resulting authorization is recorded as a GitHub App
// installation; commits then use the installation token (see _lib/server).
import { ENV, json } from "../../../_lib/server";

// eslint-disable-next-line
export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ message: "کد بازگشتی وجود ندارد." }, 400);

  // Exchange the code for an access token (server-side only).
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: ENV.oauthClientId, client_secret: ENV.oauthClientSecret, code }),
  });
  if (!res.ok) return json({ message: "تبدیل کد ناموفق بود." }, 502);
  // Token is NOT exposed to the browser. Subsequent writes use the GitHub App
  // installation token (GITHUB_APP_ID / PRIVATE_KEY / INSTALLATION_ID).
  return json({ ok: true, message: "اتصال GitHub تأیید شد." });
}
