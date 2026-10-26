// Token endpoint: authorization_code (with PKCE) and refresh_token grants.
// Access and refresh tokens are sealed payloads carrying the Google refresh token.
import { ACCESS_TTL, cors, jsonResponse, oauthError, SCOPE, sha256base64url } from "@/lib/oauth";
import { now, seal, unseal } from "@/lib/seal";

async function params(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await req.json()) as Record<string, string>;
    return new URLSearchParams(j);
  }
  return new URLSearchParams(await req.text());
}

function issue(cid: string, rt: string, em: string, refreshToken?: string) {
  return jsonResponse({
    access_token: seal("access", { cid, rt, em, exp: now() + ACCESS_TTL }),
    token_type: "Bearer",
    expires_in: ACCESS_TTL,
    refresh_token: refreshToken ?? seal("refresh", { cid, rt, em }),
    scope: SCOPE,
  });
}

export async function POST(req: Request) {
  const p = await params(req);
  const grant = p.get("grant_type");

  if (grant === "authorization_code") {
    const c = unseal<{ cid: string; ru: string; cc: string; rt: string; em: string }>("code", p.get("code"));
    if (!c) return oauthError("invalid_grant", "Authorization code is invalid or expired");
    if (p.get("client_id") && p.get("client_id") !== c.cid) return oauthError("invalid_grant", "Code was issued to a different client");
    if (p.get("redirect_uri") && p.get("redirect_uri") !== c.ru) return oauthError("invalid_grant", "redirect_uri mismatch");
    const verifier = p.get("code_verifier");
    if (!verifier || (await sha256base64url(verifier)) !== c.cc) return oauthError("invalid_grant", "PKCE verification failed");
    return issue(c.cid, c.rt, c.em);
  }

  if (grant === "refresh_token") {
    const token = p.get("refresh_token");
    const r = unseal<{ cid: string; rt: string; em: string }>("refresh", token);
    if (!r || !token) return oauthError("invalid_grant", "Refresh token is invalid");
    if (p.get("client_id") && p.get("client_id") !== r.cid) return oauthError("invalid_grant", "Refresh token was issued to a different client");
    return issue(r.cid, r.rt, r.em, token);
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });
