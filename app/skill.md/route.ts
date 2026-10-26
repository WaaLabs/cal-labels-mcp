import { readFileSync } from "node:fs";
import { join } from "node:path";

// The skill as plain markdown, for people (and agents) who want to read it.
export const GET = () =>
  new Response(readFileSync(join(process.cwd(), "skill/calendar-themes/SKILL.md"), "utf8"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
