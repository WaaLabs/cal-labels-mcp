import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteLabels, ensureLabels, getLabels, labelName, listCalendars, listEvents, setCalendarColor, setEventLabels } from "./calendar";
import { withGoogleUser } from "./google";
import { readSkill } from "./skill";
import { THEMES, findTheme, textColorFor, themeColor } from "./themes";

type Extra = { authInfo?: { extra?: Record<string, unknown> } };
type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

const calendarId = z.string().default("primary").describe('Calendar ID. Defaults to "primary".');
const json = (data: unknown): Result => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (err: unknown): Result => ({ isError: true, content: [{ type: "text", text: (err as Error).message }] });

/** Returns a runner that executes a tool body as the signed-in Google user (or the owner on the legacy secret-path endpoint). */
const makeAsUser = (requireUser: boolean) => (extra: Extra, fn: () => Promise<Result>): Promise<Result> => {
  const a = extra?.authInfo?.extra;
  const user = a && typeof a.rt === "string" ? { refreshToken: a.rt, email: String(a.email ?? "") } : null;
  // On the shared OAuth endpoint a request must carry its own user; never fall back to the owner's token.
  if (!user && requireUser) return Promise.resolve(fail(new Error("Not signed in. Reconnect the cal-labels connector.")));
  return withGoogleUser(user, async () => {
    try {
      return await fn();
    } catch (e) {
      return fail(e);
    }
  });
};

export function registerTools(server: McpServer) {
  const asUser = makeAsUser(true);
  server.tool(
    "get_instructions",
    "Start here. Returns the step-by-step instructions for setting up, changing and syncing the user's calendar theme (categories, theme choice, sorting rules, scheduled sync). Call this before using the other tools and follow it.",
    {},
    async () => ({ content: [{ type: "text" as const, text: readSkill() }] }),
  );

  server.tool(
    "list_themes",
    "List the available calendar themes (colour palettes inspired by popular editor/terminal themes and nature scenes). Each theme has named colours for event categories plus a light neutral for the main calendar. Show the user previewUrl (a hosted page that previews every theme) so they can pick one.",
    {},
    async () => json({ previewUrl: "https://cal-labels-mcp.vercel.app/themes", themes: THEMES }),
  );

  server.tool(
    "get_current_theme",
    "Work out which theme a calendar is using by comparing its custom label colours with each theme. No database: the calendar itself is the record.",
    { calendarId },
    async ({ calendarId }, extra) =>
      asUser(extra, async () => {
        const custom = (await getLabels(calendarId)).filter((l) => l.name);
        if (!custom.length) return json({ theme: null, reason: "No custom labels yet", labels: [] });
        const hexes = custom.map((l) => l.backgroundColor.toLowerCase());
        const scored = THEMES.map((t) => {
          const palette = new Set(t.colors.map((c) => c.hex));
          return { id: t.id, name: t.name, matched: hexes.filter((h) => palette.has(h)).length };
        }).sort((a, b) => b.matched - a.matched);
        const best = scored[0];
        return json({
          theme: best.matched ? { id: best.id, name: best.name } : null,
          matched: `${best.matched} of ${custom.length} labels`,
          labels: custom.map((l) => ({ category: l.name, hex: l.backgroundColor })),
        });
      }),
  );

  server.tool(
    "apply_theme",
    "Apply a theme: create or recolour one label per category (label name = category name) using colours from the theme, and optionally set the main calendar to the theme's neutral (the colour of unlabelled events, i.e. the default category). Pick colours so similar categories sit close and busy ones stay distinct. Existing events keep their labels and change colour automatically.",
    {
      calendarId,
      theme: z.string().describe('Theme id or name, e.g. "rose-pine"'),
      assignments: z
        .array(z.object({ category: z.string().min(1), color: z.string().describe("Colour name from the theme (or one of its hexes)") }))
        .min(1)
        .max(20),
      setMainCalendarColor: z.boolean().default(true).describe("Also set this calendar's own colour to the theme neutral"),
    },
    async ({ calendarId, theme, assignments, setMainCalendarColor }, extra) =>
      asUser(extra, async () => {
        const t = findTheme(theme);
        const labels = assignments.map((a) => ({ name: a.category, hex: themeColor(t, a.color) }));
        const r = await ensureLabels(calendarId, labels);
        const cal = setMainCalendarColor ? await setCalendarColor(calendarId, t.neutral, textColorFor(t.neutral)) : null;
        return json({ theme: t.name, created: r.created, updated: r.updated, labels, calendar: cal });
      }),
  );

  server.tool(
    "list_calendars",
    "List the user's calendars with their IDs and current colours (to find e.g. a shared family calendar).",
    {},
    async (_args, extra) => asUser(extra, async () => json(await listCalendars())),
  );

  server.tool(
    "set_calendar_color",
    "Set a calendar's colour for this user (any hex). A suggested text colour is sent too (Google apps may still choose their own). Only changes how the calendar looks to this user.",
    {
      calendarId: z.string().describe('Calendar ID from list_calendars, or "primary"'),
      hex: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
      textColor: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
    },
    async ({ calendarId, hex, textColor }, extra) =>
      asUser(extra, async () => {
        const bg = (hex.startsWith("#") ? hex : `#${hex}`).toLowerCase();
        const fg = textColor ? (textColor.startsWith("#") ? textColor : `#${textColor}`) : textColorFor(bg);
        return json(await setCalendarColor(calendarId, bg, fg));
      }),
  );

  server.tool(
    "list_labels",
    "List the event colour labels on a calendar: Google's 24 default colours (by name) plus any custom named labels, with their IDs and hex values.",
    { calendarId },
    async ({ calendarId }, extra) =>
      asUser(extra, async () => {
        const labels = await getLabels(calendarId);
        return json(labels.map((l) => ({ id: l.id, name: labelName(l), hex: l.backgroundColor, custom: Boolean(l.name) })));
      }),
  );

  server.tool(
    "ensure_labels",
    "Create or update custom named colour labels on a calendar (matched by name; existing labels are never removed). Use this to define exact hex colours beyond the 24 defaults.",
    {
      calendarId,
      labels: z
        .array(z.object({ name: z.string().min(1), hex: z.string().regex(/^#?[0-9a-fA-F]{6}$/) }))
        .min(1)
        .describe('e.g. [{"name":"Work","hex":"#eb6f92"}]'),
    },
    async ({ calendarId, labels }, extra) => asUser(extra, async () => json(await ensureLabels(calendarId, labels))),
  );

  server.tool(
    "delete_labels",
    "Delete custom labels by name (e.g. when removing a category or resetting). Events using them go back to the calendar's own colour. Google's default colours can't be deleted. Clear events first with set_event_labels if you want a clean record.",
    { calendarId, names: z.array(z.string().min(1)).min(1).max(50) },
    async ({ calendarId, names }, extra) => asUser(extra, async () => json(await deleteLabels(calendarId, names))),
  );

  server.tool(
    "list_events",
    "List events in a time range with their current colour label. Recurring events are expanded into individual instances. Times are RFC 3339 with an offset, e.g. 2026-10-26T00:00:00+09:00.",
    {
      calendarId,
      timeMin: z.string().describe("Start of range, RFC 3339 with offset"),
      timeMax: z.string().describe("End of range, RFC 3339 with offset"),
      query: z.string().optional().describe("Optional free-text filter"),
    },
    async ({ calendarId, timeMin, timeMax, query }, extra) =>
      asUser(extra, async () => json(await listEvents(calendarId, timeMin, timeMax, query))),
  );

  server.tool(
    "set_event_labels",
    'Set the colour label on one or more events. Only the label changes; no notifications are sent. label can be a custom label name, a default colour name (e.g. "Eucalyptus"), a hex, a label ID, or "" to clear back to the calendar default colour.',
    {
      calendarId,
      changes: z
        .array(z.object({ eventId: z.string().min(1), label: z.string() }))
        .min(1)
        .max(200),
    },
    async ({ calendarId, changes }, extra) => asUser(extra, async () => json(await setEventLabels(calendarId, changes))),
  );
}
