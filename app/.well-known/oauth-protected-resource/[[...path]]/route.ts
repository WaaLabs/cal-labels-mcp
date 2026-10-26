import { cors, jsonResponse, origin, SCOPE } from "@/lib/oauth";

export const GET = (req: Request) => {
  const o = origin(req);
  return jsonResponse(
    { resource: `${o}/api/mcp`, authorization_servers: [o], scopes_supported: [SCOPE], bearer_methods_supported: ["header"] },
    200,
    { "Cache-Control": "max-age=3600" },
  );
};
export const OPTIONS = () => new Response(null, { status: 204, headers: cors });
