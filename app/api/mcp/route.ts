// The multi-user MCP endpoint: https://<host>/api/mcp, protected by OAuth.
// Each request acts as the Google user inside its (sealed) access token.
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { SCOPE } from "@/lib/oauth";
import { unseal } from "@/lib/seal";
import { SERVER_INSTRUCTIONS } from "@/lib/skill";
import { registerTools } from "@/lib/tools";

export const maxDuration = 60;

const mcp = createMcpHandler(registerTools, { serverInfo: { name: "cal-labels", version: "0.5.0" }, instructions: SERVER_INSTRUCTIONS }, {
  basePath: "/api",
  maxDuration: 60,
  disableSse: true,
});

const handler = withMcpAuth(
  mcp,
  (_req, bearer) => {
    const t = unseal<{ cid: string; rt: string; em: string; exp: number }>("access", bearer);
    if (!t) return undefined;
    return { token: bearer!, clientId: t.cid, scopes: [SCOPE], expiresAt: t.exp, extra: { rt: t.rt, email: t.em } };
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp" },
);

export { handler as GET, handler as POST, handler as DELETE };
