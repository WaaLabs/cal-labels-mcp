import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The calendar-themes skill, bundled with the deployment (see next.config.ts). Frontmatter stripped. */
export function readSkill(): string {
  const md = readFileSync(join(process.cwd(), "skill/calendar-themes/SKILL.md"), "utf8");
  return md.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

/** Short pointer the MCP client sees when it connects (server instructions). */
export const SERVER_INSTRUCTIONS =
  "Calendar Themes colour-codes the user's Google Calendar with theme colours. Before setting up, changing or syncing calendar colours, call get_instructions and follow what it returns. Never colour events with another calendar connector's colorId; use this connector's tools.";
