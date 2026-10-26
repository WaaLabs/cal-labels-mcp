// Thin Google Calendar client, acting as whichever Google user the request belongs to.
// Every request carries eventLabelVersion=1 so event labels (the 24 default
// colours plus custom ones) are read and written instead of legacy colorId.

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

const API = "https://www.googleapis.com/calendar/v3";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export type GoogleUser = { refreshToken: string; email: string };

// The Google account a request acts as. Signed-in connector users carry their
// own refresh token inside their encrypted access token.
const userContext = new AsyncLocalStorage<GoogleUser | null>();

export function withGoogleUser<T>(user: GoogleUser | null, fn: () => Promise<T>): Promise<T> {
  return userContext.run(user, fn);
}

export function currentUser(): GoogleUser | null {
  return userContext.getStore() ?? null;
}

const cache = new Map<string, { token: string; expiresAt: number }>();

async function accessToken(): Promise<string> {
  const refreshToken = currentUser()?.refreshToken;
  if (!refreshToken) throw new Error("Not signed in. Reconnect the cal-labels connector.");
  const key = createHash("sha256").update(refreshToken).digest("hex");
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google sign-in has expired or been revoked (${json.error ?? res.status}). Reconnect the cal-labels connector.`);
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}

export class GoogleError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function gcal<T = unknown>(
  path: string,
  opts: { method?: string; query?: Record<string, string | number | boolean | undefined>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(API + path);
  url.searchParams.set("eventLabelVersion", "1");
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
    } catch {}
    throw new GoogleError(res.status, `Google Calendar ${res.status}: ${msg}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export const enc = encodeURIComponent;
