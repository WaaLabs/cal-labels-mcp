// Google sends the user back here. Swap Google's code for the user's refresh
// token, seal it into a short-lived authorization code, and return to the app.
import { exchangeGoogleCode, htmlPage } from "@/lib/oauth";
import { now, seal, unseal } from "@/lib/seal";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const p = unseal<{ cid: string; ru: string; st: string; cc: string }>("pending", q.get("state"));
  if (!p) return htmlPage("Sign-in expired", "That sign-in link has expired. Go back to Claude and connect again.");
  const back = (params: Record<string, string>) => {
    const u = new URL(p.ru);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    if (p.st) u.searchParams.set("state", p.st);
    return Response.redirect(u.toString(), 302);
  };
  if (q.get("error")) return back({ error: "access_denied", error_description: "Google sign-in was cancelled" });
  const code = q.get("code");
  if (!code) return back({ error: "server_error", error_description: "Google returned no code" });
  try {
    const { refreshToken, email } = await exchangeGoogleCode(req, code);
    const authCode = seal("code", { cid: p.cid, ru: p.ru, cc: p.cc, rt: refreshToken, em: email, exp: now() + 300 });
    return back({ code: authCode });
  } catch (e) {
    return htmlPage("Couldn't finish signing in", (e as Error).message);
  }
}
