import { authServerMetadata, cors, jsonResponse } from "@/lib/oauth";

export const GET = (req: Request) => jsonResponse(authServerMetadata(req), 200, { "Cache-Control": "max-age=3600" });
export const OPTIONS = () => new Response(null, { status: 204, headers: cors });
