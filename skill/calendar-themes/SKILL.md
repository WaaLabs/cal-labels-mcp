---
name: calendar-themes
description: Colour-code someone's Google Calendar with a theme. Sort their events into categories, let them pick a theme, apply it, and keep new events coloured. Use for calendar colours, themes, colour-coding, recolouring events, or setting up a colour sync.
---

# Calendar themes

You colour-code a person's Google Calendar. They don't sort their events and they don't write keyword lists: you read their calendar, propose categories, and do the sorting. They choose a theme and say yes or no to your proposals.

Everything runs through the **Calendar Themes** connector (server name `cal-labels`, URL `https://cal-labels-mcp.vercel.app/api/mcp`). The connector also serves these instructions through its `get_instructions` tool. If its tools are missing, load them with ToolSearch (`cal-labels`). If they still aren't available, tell the person to add the connector (Settings → Connectors → Add custom connector, with the URL above) and stop.

**Never colour events with the Google Calendar connector's `colorId`.** It only knows Google's 11 old colours and overwrites theme labels. Use cal-labels for all colouring. The Google Calendar connector is fine for reading or creating events.

## How it works (no database)

- A theme is a palette of named colours plus a light **neutral**. Themes live in the connector: `list_themes` returns them along with `previewUrl`, a hosted page that previews every theme. Don't build your own preview; send the link.
- Each category becomes a custom **label** on the person's main calendar, named after the category. The calendar is the record: `get_current_theme` reads the labels back and works out which theme is active.
- Events with **no label** show the main calendar's own colour, which `apply_theme` sets to the theme's neutral. That makes "no label" a category in its own right: the **default category**. Ask the person what it should mean for them. It might be "everything else", life admin, personal time, or one of their real categories. Some people won't want one; then every event gets a label and anything unsure is just left alone.
- Changing a label's colour recolours every event that uses it straight away. Switching themes is just a recolour of the labels. No event-by-event work is needed.

## Tools

| Tool | Use |
|---|---|
| `get_current_theme` | Start here: shows existing categories (labels) and the active theme |
| `list_themes` | Themes and `previewUrl` |
| `list_events` | Events in a range with their current label (recurring events come expanded) |
| `apply_theme` | One label per category in theme colours; sets the main calendar to the neutral (the default category's colour) |
| `set_event_labels` | Label or clear (`""`) events, up to 50 per call, no notifications |
| `list_calendars`, `set_calendar_color` | Other calendars' colours (per person) |
| `delete_labels` | Remove custom labels by name (dropped categories, resets) |
| `list_labels`, `ensure_labels` | Low-level label access when needed |

## First-time setup

1. **Check what's there.** Call `get_current_theme`. If there are already custom labels, this person has a setup. Treat it as a change (see below), not a fresh start.
2. **Read their calendar.** Call `list_events` for the main calendar from 3 weeks ago to 2 weeks ahead. Look at titles, notes, recurring blocks, times of day and who is invited.
3. **Propose categories.** Aim for 5–8, and suggest one of them as the default (unlabelled) category if it fits. Name them in the person's own words: their business names, their gym, their study. Give each a one-line definition and 2–4 real example titles from their calendar. Only split two areas when the split helps at a glance; merge anything thin. Present this as a short table and ask them to confirm, rename or merge. Ask once, then go with their answer.
4. **Pick a theme.** Call `list_themes`, send `previewUrl`, and list the theme names with one line each. Let them choose.
5. **Assign colours.** Map categories to the theme's colours yourself:
   - The busiest categories, and ones that often sit next to each other in a day, get the most clearly different colours.
   - Related categories (two kinds of work; their own training and a coaching job) can share a hue family.
   - Low-attention categories (a job they want to fade, chores) suit the theme's quieter colours.
   - Never give two categories near-identical colours. The neutral belongs to the default category; don't give it to a label too.
   Show the mapping in one line per category and apply it unless they object.
6. **Apply.** Call `apply_theme` with the theme and the category → colour assignments. Leave `setMainCalendarColor` at true.
7. **Colour their events.** Label events from the start of this week to 2 weeks ahead using the sorting rules below. Report the counts and list any events you left alone.
8. **Other calendars (optional).** Call `list_calendars`. Offer to colour shared calendars, such as a family calendar, with a theme colour the labels don't use, so those events stand out. Use `set_calendar_color`.
9. **Keep it coloured.** Offer a scheduled task that re-runs the sorting twice a day. Use whichever scheduling tool the session has, and call it a "scheduled task". Its prompt must stand alone, so include the person's scheme in full: category names, definitions, example patterns and the rules below. That prompt is their saved scheme, so no other storage is needed. If they keep a scheme file of their own (a markdown file in a repo, a note), point the task at that instead and treat the file as the source of truth.

## Sorting rules (setup and every sync)

- Only the person's **main calendar**. Don't touch shared or other calendars' events.
- Look at events **from now to 14 days ahead** (setup also covers the current week).
- Tags in an event's notes override everything (case doesn't matter):
  - `#keep`: never change this event's colour. It's for one-off manual colours.
  - A category tag (`#` plus the category name without spaces, e.g. `#home`, `#sideproject`): use that category.
  - Two different category tags: unclear, so leave the event alone.
- Otherwise decide from the title, notes and context, using the scheme's definitions and examples.
- **If unsure, leave it** and list it (title + date) in the summary so the person can add a tag. Never guess.
- Skip events that already have the right label. The default category means label `""` (cleared).
- Change only the label. Never touch times, titles, notes or attendees. `set_event_labels` sends no notifications.
- Recurring events arrive as individual instances. Label the instances, not the series.

## Changes later

- **Try a different theme:** read categories with `get_current_theme`, assign colours from the new theme, then `apply_theme`. Events update by themselves.
- **Swap one colour:** use `apply_theme` with the full assignment list (only the changed labels update). Update the scheduled task's prompt if it lists hexes.
- **Rename a category:** `apply_theme` creates a new label under the new name. Relabel that category's events (14 days back to 14 ahead), `delete_labels` the old name, and update the task prompt.
- **New category:** propose it, assign a colour, `apply_theme`, relabel matching events, update the task prompt.
- **Drop a category:** relabel or clear its events, then `delete_labels`, and update the task prompt.
- **Start over:** clear labels on recent and upcoming events (`set_event_labels` with `""`), `delete_labels` for every custom label, then run first-time setup again.

## Gotchas

- Google chooses light or dark text on each colour itself, and the web and phone apps don't always agree: the same colour can get light text on the web and dark text on a phone. There's no fixed cut-off to rely on. The theme colours avoid the very dark end, but if the person finds any event or calendar hard to read in the app they use most, swap that category to a lighter colour from the theme.
- `set_calendar_color` sends a suggested text colour, but Google's apps may ignore it.
- A label is per calendar, so a person with several calendars has labels only on the one you set up.
