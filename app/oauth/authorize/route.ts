// Start of the browser flow: check the client, then send the user to Google.
import { env } from "@/lib/google";
import { GOOGLE_SCOPES, googleRedirectUri, htmlPage } from "@/lib/oauth";
import { now, seal, unseal } from "@/lib/seal";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const client = unseal<{ r: string[]; n: string }>("client", q.get("client_id"));
  if (!client) return htmlPage("Can't connect", "This app isn't registered with cal-labels. Remove the connector and add it again.");
  const redirectUri = q.get("redirect_uri") ?? (client.r.length === 1 ? client.r[0] : "");
  if (!client.r.includes(redirectUri)) return htmlPage("Can't connect", "The app's return address doesn't match its registration.");

  const back = (params: Record<string, string>) => {
    const u = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const state = q.get("state");
    if (state) u.searchParams.set("state", state);
    return Response.redirect(u.toString(), 302);
  };
  if (q.get("response_type") !== "code") return back({ error: "unsupported_response_type" });
  const challenge = q.get("code_challenge");
  if (!challenge || q.get("code_challenge_method") !== "S256") {
    return back({ error: "invalid_request", error_description: "PKCE with S256 is required" });
  }

  const pending = seal("pending", {
    cid: q.get("client_id"),
    ru: redirectUri,
    st: q.get("state") ?? "",
    cc: challenge,
    exp: now() + 600,
  });
  const g = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  g.search = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: pending,
  }).toString();
  return Response.redirect(g.toString(), 302);
}
