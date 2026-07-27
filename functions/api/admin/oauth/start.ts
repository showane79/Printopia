// GET /api/admin/oauth/start — redirect owner to GitHub to authorize one repo.
// Uses the GitHub App / OAuth web flow. Never asks for a Personal Access Token.
import { ENV } from "../../../_lib/server";

// eslint-disable-next-line
export async function onRequestGet(context: any) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", ENV.oauthClientId);
  url.searchParams.set("redirect_uri", ENV.oauthRedirectUrl);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", crypto.randomUUID());
  return Response.redirect(url.toString(), 302);
}
