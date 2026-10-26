// A small, stateless OAuth 2.1 authorization server in front of Google.
// Claude registers (DCR), sends the user here, we send them to Google, and we
// hand back our own tokens that wrap the user's Google refresh token.

import { getPublicOrigin } from "mcp-handler";
import { env } from "./google";

export const SCOPE = "calendar";
export const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar";
export const ACCESS_TTL = 3600; // seconds

export function origin(req: Request): string {
  return process.env.PUBLIC_URL?.replace(/\/$/, "") ?? getPublicOrigin(req);
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
};

export function jsonResponse(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors, ...extra },
  });
}

export function oauthError(error: string, description: string, status = 400) {
  return jsonResponse({ error, error_description: description }, status);
}

export function authServerMetadata(req: Request) {
  const o = origin(req);
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    registration_endpoint: `${o}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
    service_documentation: `${o}/`,
  };
}

export function googleRedirectUri(req: Request) {
  return `${origin(req)}/oauth/google/callback`;
}

export async function exchangeGoogleCode(req: Request, code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  const j = (await res.json()) as { refresh_token?: string; id_token?: string; scope?: string; error?: string; error_description?: string };
  if (!res.ok) throw new Error(`Google: ${j.error ?? res.status} ${j.error_description ?? ""}`.trim());
  if (!j.refresh_token) throw new Error("Google did not return a refresh token. Remove cal-labels from your Google account's third-party access and try again.");
  if (!j.scope?.includes("https://www.googleapis.com/auth/calendar")) throw new Error("Calendar access wasn't granted. Try again and allow calendar access.");
  let email = "";
  if (j.id_token) {
    try {
      email = JSON.parse(Buffer.from(j.id_token.split(".")[1], "base64url").toString("utf8")).email ?? "";
    } catch {}
  }
  return { refreshToken: j.refresh_token, email };
}

export async function sha256base64url(input: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input).digest("base64url");
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple error page for the browser parts of the flow. Text is escaped. */
export function htmlPage(title: string, message: string, status = 400) {
  const body = esc(message);
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><body style="font-family:system-ui;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.5"><h1 style="font-size:22px">${esc(title)}</h1><p>${body}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
