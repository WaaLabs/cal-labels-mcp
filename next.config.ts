import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the skill with the functions that serve it.
  outputFileTracingIncludes: {
    "/api/mcp": ["./skill/calendar-themes/SKILL.md"],
    "/skill.md": ["./skill/calendar-themes/SKILL.md"],
  },
};

export default nextConfig;
