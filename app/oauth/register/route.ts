// Dynamic client registration, stateless: the client_id *is* the sealed registration.
import { cors, jsonResponse, oauthError } from "@/lib/oauth";
import { now, seal } from "@/lib/seal";

function okRedirect(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON");
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (!uris.length || uris.length > 10 || !uris.every(okRedirect)) {
    return oauthError("invalid_redirect_uri", "Provide 1–10 https (or localhost) redirect_uris");
  }
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 100) : "MCP client";
  const issued = now();
  const client_id = seal("client", { r: uris, n: name, iat: issued });
  return jsonResponse(
    {
      client_id,
      client_id_issued_at: issued,
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
}

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });
