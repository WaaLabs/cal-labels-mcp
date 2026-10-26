// Stateless tokens: JSON payloads encrypted with AES-256-GCM. The server keeps
// no database; everything it needs later (a user's Google refresh token, a
// pending OAuth request) travels inside these opaque strings.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(purpose: string): Buffer {
  const secret = process.env.TOKEN_KEY;
  if (!secret || secret.length < 32) throw new Error("TOKEN_KEY is not configured");
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

export function seal(purpose: string, payload: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

/** Returns the payload, or null if the token is forged, from another purpose, or expired (exp in seconds). */
export function unseal<T extends Record<string, unknown>>(purpose: string, token: string | null | undefined): T | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key(purpose), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]);
    const payload = JSON.parse(out.toString("utf8")) as T & { exp?: number };
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const now = () => Math.floor(Date.now() / 1000);
