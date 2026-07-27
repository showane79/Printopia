// POST /api/admin/logout — clear the session cookie.
import { clearCookieHeader, json } from "../../_lib/server";

// eslint-disable-next-line
export async function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": clearCookieHeader("printopia_admin") });
}
