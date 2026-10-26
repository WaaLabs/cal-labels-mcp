# Calendar Themes (cal-labels-mcp)

Colour-code your Google Calendar with a theme, and let your AI assistant do the sorting. It reads your calendar, suggests categories in your own words, lets you pick a theme, colours everything in, and can keep new events coloured twice a day.

Themes: Rosé Pine, Catppuccin Mocha, Gruvbox, Alpine Lake, Shallows, Alpenglow. **[Preview them →](https://cal-labels-mcp.vercel.app/themes)**

It uses Google Calendar's newer event colours (any hex), which the standard Google Calendar connector can't set.

## Set it up

**1. Add the connector.** In Claude: Settings → Connectors → Add custom connector.

- Name: `Calendar Themes`
- URL: `https://cal-labels-mcp.vercel.app/api/mcp`
- Leave the OAuth fields empty.

Connect it and sign in with Google. You'll see Google's "this app isn't verified" screen; choose **Advanced → Go to cal-labels** and allow calendar access. You only ever give access to your own calendar.

**2. Paste this into a new chat:**

```text
Set up Calendar Themes for my Google Calendar.

First, read the skill instructions at
https://raw.githubusercontent.com/WaaLabs/cal-labels-mcp/main/skill/calendar-themes/SKILL.md
and follow them exactly. If you can save skills, offer to save it as a skill
called "calendar-themes" so I can reuse it.

Use the Calendar Themes connector (its tools are list_themes, apply_theme,
list_events, set_event_labels and so on). If the tools aren't available, tell me
to add the connector first and stop.

Then walk me through it: read my calendar, suggest categories, show me the
themes, apply the one I pick, colour this week and next, and offer to set up a
scheduled task to keep new events coloured.
```

That's it. To change things later, just ask: "try the Gruvbox theme", "make Exercise a different colour", "add a category for my side project", "start over".

## How it works

- **No database.** Your categories are labels on your own calendar (the calendar is the record), and your sorting rules live in your scheduled task's prompt. Sign-in is a small stateless OAuth server: your Google token is encrypted into the token your AI client holds, and the server stores nothing.
- **Your data stays yours.** The server only reads events and changes their colour labels. It never edits times, titles, notes or guests, and sends no notifications. See the [privacy policy](https://cal-labels-mcp.vercel.app/privacy).
- Google picks light or dark text on each colour itself, and the web and phone apps can differ. If something's hard to read, ask for a lighter colour.

## Repo

| Path | What |
|---|---|
| `skill/calendar-themes/SKILL.md` | The instructions the AI follows (setup, sorting rules, changes) |
| `lib/themes.ts` | Theme palettes. Add a theme here and it appears in the tool and the preview page |
| `lib/tools.ts` | MCP tools |
| `lib/oauth.ts`, `app/oauth/*`, `app/.well-known/*` | Stateless OAuth (dynamic client registration + PKCE) in front of Google |
| `app/themes/page.tsx` | The theme preview page |

### Tools

| Tool | What it does |
|---|---|
| `list_themes` | Theme palettes plus the preview page URL |
| `get_current_theme` | Which theme a calendar uses, read from its label colours |
| `apply_theme` | One label per category in theme colours; main calendar set to the theme's neutral |
| `list_events` | Events in a range with their current label |
| `set_event_labels` | Set or clear labels on events, no notifications |
| `delete_labels` | Remove custom labels |
| `list_calendars`, `set_calendar_color` | Other calendars' colours (per user) |
| `list_labels`, `ensure_labels` | Low-level label access |

All Google requests use `eventLabelVersion=1`.

### Self-hosting

Deploy to Vercel and set (Production):

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client (Web), Calendar API enabled. Redirect URI: `https://<your-host>/oauth/google/callback`. Keep the OAuth app **Published** (unverified is fine for up to 100 users) or refresh tokens expire after 7 days. |
| `TOKEN_KEY` | 32+ random characters. Encrypts all tokens; rotating it signs everyone out. |
| `PUBLIC_URL` | `https://<your-host>` |

Update the preview URL in `lib/tools.ts` and the links in this README and the skill to your host.
