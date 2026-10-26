import { gcal, enc } from "./google";

export type Label = { id: string; backgroundColor: string; name?: string };

// Google's 24 default event colours, keyed by the hex the API reports.
export const DEFAULT_NAMES: Record<string, string> = {
  "#ad1457": "Beetroot",
  "#d81b60": "Cherry Blossom",
  "#e67c73": "Flamingo",
  "#d50000": "Tomato",
  "#f4511e": "Tangerine",
  "#ef6c00": "Pumpkin",
  "#f09300": "Mango",
  "#f6bf26": "Banana",
  "#e4c441": "Citron",
  "#c0ca33": "Avocado",
  "#7cb342": "Pistachio",
  "#0b8043": "Basil",
  "#33b679": "Sage",
  "#009688": "Eucalyptus",
  "#039be5": "Peacock",
  "#4285f4": "Cobalt",
  "#7986cb": "Lavender",
  "#3f51b5": "Blueberry",
  "#b39ddb": "Wisteria",
  "#9e69af": "Amethyst",
  "#8e24aa": "Grape",
  "#795548": "Cocoa",
  "#616161": "Graphite",
  "#a79b8e": "Birch",
};

const norm = (s: string) => s.trim().toLowerCase();
const normHex = (h: string) => {
  const x = norm(h);
  return x.startsWith("#") ? x : `#${x}`;
};

export function labelName(l: Label): string {
  return l.name ?? DEFAULT_NAMES[normHex(l.backgroundColor)] ?? normHex(l.backgroundColor);
}

export async function getLabels(calendarId: string): Promise<Label[]> {
  const cal = await gcal<{ labelProperties?: { eventLabels?: Label[] } }>(`/calendars/${enc(calendarId)}`);
  return cal.labelProperties?.eventLabels ?? [];
}

/** Resolve a label reference (id, name, default colour name or hex) to a label id. "" or "none" clears. */
export function resolveLabel(labels: Label[], ref: string): string {
  const r = norm(ref);
  if (r === "" || r === "none" || r === "default") return "";
  const byId = labels.find((l) => l.id === ref.trim());
  if (byId) return byId.id;
  const byName = labels.find((l) => l.name && norm(l.name) === r);
  if (byName) return byName.id;
  const byDefault = labels.find((l) => norm(DEFAULT_NAMES[normHex(l.backgroundColor)] ?? "") === r);
  if (byDefault) return byDefault.id;
  if (/^#?[0-9a-f]{6}$/.test(r)) {
    const byHex = labels.find((l) => normHex(l.backgroundColor) === normHex(r));
    if (byHex) return byHex.id;
  }
  throw new Error(`No label matches "${ref}". Use list_labels to see what exists, or ensure_labels to create it.`);
}

/** Create or update named labels. Matches existing labels by name; never removes labels. */
export async function ensureLabels(calendarId: string, wanted: { name: string; hex: string }[]) {
  const labels = await getLabels(calendarId);
  const merged: Label[] = labels.map((l) => ({ ...l }));
  const created: string[] = [];
  const updated: string[] = [];
  for (const w of wanted) {
    const hex = normHex(w.hex);
    const existing = merged.find((l) => l.name && norm(l.name) === norm(w.name));
    if (existing) {
      if (normHex(existing.backgroundColor) !== hex) {
        existing.backgroundColor = hex;
        updated.push(w.name);
      }
    } else {
      merged.push({ id: crypto.randomUUID(), name: w.name, backgroundColor: hex });
      created.push(w.name);
    }
  }
  if (created.length || updated.length) {
    await gcal(`/calendars/${enc(calendarId)}`, {
      method: "PATCH",
      body: { labelProperties: { eventLabels: merged } },
    });
  }
  const after = await getLabels(calendarId);
  return { created, updated, labels: after.map((l) => ({ id: l.id, name: labelName(l), hex: l.backgroundColor })) };
}

type GEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  eventLabelId?: string;
  recurringEventId?: string;
  status?: string;
  eventType?: string;
};

export async function listEvents(calendarId: string, timeMin: string, timeMax: string, query?: string) {
  const labels = await getLabels(calendarId);
  const byId = new Map(labels.map((l) => [l.id, l]));
  const out: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const page = await gcal<{ items?: GEvent[]; nextPageToken?: string }>(`/calendars/${enc(calendarId)}/events`, {
      query: { timeMin, timeMax, singleEvents: true, orderBy: "startTime", maxResults: 250, q: query, pageToken },
    });
    for (const e of page.items ?? []) {
      if (e.status === "cancelled") continue;
      const l = e.eventLabelId ? byId.get(e.eventLabelId) : undefined;
      out.push({
        id: e.id,
        summary: e.summary ?? "",
        description: e.description ? e.description.slice(0, 500) : undefined,
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
        eventType: e.eventType,
        recurringEventId: e.recurringEventId,
        label: l ? labelName(l) : e.eventLabelId ? `unknown (${e.eventLabelId})` : null,
        labelId: e.eventLabelId ?? null,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

export async function setEventLabels(calendarId: string, changes: { eventId: string; label: string }[]) {
  const labels = await getLabels(calendarId);
  const results: { eventId: string; ok: boolean; label?: string; error?: string }[] = [];
  for (const c of changes) {
    try {
      const id = resolveLabel(labels, c.label);
      await gcal(`/calendars/${enc(calendarId)}/events/${enc(c.eventId)}`, {
        method: "PATCH",
        query: { sendUpdates: "none" },
        body: { eventLabelId: id },
      });
      const l = labels.find((x) => x.id === id);
      results.push({ eventId: c.eventId, ok: true, label: l ? labelName(l) : "default (cleared)" });
    } catch (err) {
      results.push({ eventId: c.eventId, ok: false, error: (err as Error).message });
    }
  }
  return { changed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

// ---- Calendar list (per-user calendar colours) ----

type CalListEntry = { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string; foregroundColor?: string; primary?: boolean; accessRole?: string };

export async function listCalendars() {
  const out: { id: string; name: string; color?: string; textColor?: string; primary: boolean; access?: string }[] = [];
  let pageToken: string | undefined;
  do {
    const page = await gcal<{ items?: CalListEntry[]; nextPageToken?: string }>(`/users/me/calendarList`, {
      query: { maxResults: 250, pageToken },
    });
    for (const c of page.items ?? []) {
      out.push({ id: c.id, name: c.summaryOverride ?? c.summary ?? c.id, color: c.backgroundColor, textColor: c.foregroundColor, primary: Boolean(c.primary), access: c.accessRole });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

/** Set how a calendar is coloured for this user (does not affect other people who share it). */
export async function setCalendarColor(calendarId: string, background: string, foreground: string) {
  // The calendar list API doesn't accept the "primary" alias, so resolve it to the real ID.
  const id = calendarId === "primary" ? (await gcal<{ id: string }>(`/calendars/primary`)).id : calendarId;
  const r = await gcal<CalListEntry>(`/users/me/calendarList/${enc(id)}`, {
    method: "PATCH",
    query: { colorRgbFormat: true },
    body: { backgroundColor: background, foregroundColor: foreground },
  });
  return { id: r.id, name: r.summaryOverride ?? r.summary, color: r.backgroundColor, textColor: r.foregroundColor };
}

/** Delete custom (named) labels by name. Events that used them lose their colour. Default colours can't be deleted. */
export async function deleteLabels(calendarId: string, names: string[]) {
  const labels = await getLabels(calendarId);
  const wanted = new Set(names.map(norm));
  const removed = labels.filter((l) => l.name && wanted.has(norm(l.name))).map((l) => l.name as string);
  const notFound = names.filter((n) => !removed.some((r) => norm(r) === norm(n)));
  if (removed.length) {
    await gcal(`/calendars/${enc(calendarId)}`, {
      method: "PATCH",
      body: { labelProperties: { eventLabels: labels.filter((l) => !(l.name && wanted.has(norm(l.name)))) } },
    });
  }
  return { removed, notFound };
}
