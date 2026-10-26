import { THEMES, type Theme } from "@/lib/themes";

export const metadata = {
  title: "Calendar themes",
  description: "Colour themes for Google Calendar event labels, from cal-labels.",
};

// A sample week with generic categories, filled from each theme's first colours.
const CATS = ["Work", "Side project", "Exercise", "Home", "Study", "Social", "Default"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// [day, startRow, span, categoryIndex]; category 6 (Default: no label) uses the neutral
const PLAN: [number, number, number, number][] = [
  [0, 0, 1, 2], [0, 1, 3, 0], [0, 5, 1, 6], [0, 6, 2, 3],
  [1, 0, 2, 4], [1, 2, 3, 0], [1, 6, 2, 1],
  [2, 0, 1, 2], [2, 1, 3, 0], [2, 4, 1, 6], [2, 6, 2, 3],
  [3, 0, 2, 4], [3, 2, 3, 0], [3, 6, 2, 5],
  [4, 0, 1, 2], [4, 1, 2, 0], [4, 3, 2, 1], [4, 6, 2, 5],
  [5, 0, 2, 2], [5, 3, 3, 3], [5, 6, 2, 5],
  [6, 1, 3, 1], [6, 5, 3, 3],
];

function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 >= 128 ? "#1d1d1d" : "#ffffff";
}

function Week({ t }: { t: Theme }) {
  const colorFor = (i: number) => (i === 6 ? t.neutral : t.colors[i].hex);
  return (
    <div className="week">
      {DAYS.map((d, di) => (
        <div className="day" key={d}>
          <span>{d}</span>
          {PLAN.filter((p) => p[0] === di).map(([, r, sp, ci], k) => (
            <div
              key={k}
              className="ev"
              style={{ gridRow: `${r + 2} / span ${sp}`, background: colorFor(ci), color: textOn(colorFor(ci)) }}
            >
              {CATS[ci]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ThemesPage() {
  return (
    <main>
      <style>{CSS}</style>
      <header>
        <h1>Calendar themes</h1>
        <p>
          Pick a theme and your assistant will create one Google Calendar colour label per category from its palette,
          keeping similar categories close and busy ones easy to tell apart. The sample week uses the first six colours; your assistant picks the best fit for your own categories.
        </p>
      </header>
      <div className="grid">
        {THEMES.map((t) => (
          <article key={t.id} className="card">
            <div className="band">
              {t.colors.map((c) => (
                <i key={c.name} style={{ background: c.hex }} />
              ))}
            </div>
            <div className="body">
              <div className="title">
                <h2>{t.name}</h2>
                <code>{t.id}</code>
              </div>
              <p className="desc">{t.description}</p>
              <p className="insp">{t.inspiration}</p>
              <ul className="sw">
                {t.colors.map((c) => (
                  <li key={c.name}>
                    <span className="chip" style={{ background: c.hex }} />
                    <b>{c.name}</b>
                    <code>{c.hex}</code>
                  </li>
                ))}
                <li>
                  <span className="chip neutral" style={{ background: t.neutral }} />
                  <b>neutral</b>
                  <code>{t.neutral}</code>
                </li>
              </ul>
              <Week t={t} />
            </div>
          </article>
        ))}
      </div>
      <footer>
        <p>Neutral is the main calendar&apos;s own colour. Events without a label show it, so it works as a default category for whatever you like. Google chooses light or dark text on each colour itself, and the web and phone apps don&apos;t always agree.</p>
      </footer>
    </main>
  );
}

const CSS = `
:root{--bg:#faf4ed;--surface:#fffaf3;--overlay:#f2e9e1;--fg:#575279;--muted:#797593;--line:#dfdad9;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#191724;--surface:#1f1d2e;--overlay:#26233a;--fg:#e0def4;--muted:#908caa;--line:#2f2c45;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif}
main{max-width:1120px;margin:0 auto;padding:40px max(16px,env(safe-area-inset-left)) 64px max(16px,env(safe-area-inset-right));display:grid;gap:32px}
header{display:grid;gap:8px;max-width:64ch}
h1{margin:0;font-size:clamp(28px,5vw,42px);letter-spacing:-.02em;line-height:1.1}
header p,footer p{margin:0;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,500px),1fr));gap:24px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.band{display:flex;height:56px}.band i{flex:1}
.body{padding:18px 20px 20px;display:grid;gap:12px;min-width:0}
.title{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
h2{margin:0;font-size:22px}
code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
.desc{margin:0}.insp{margin:-8px 0 0;color:var(--muted);font-size:13px}
.sw{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 12px}
.sw li{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:8px;font-size:13px;min-width:0}
.sw b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip{width:18px;height:18px;border-radius:5px}.chip.neutral{outline:1.5px dashed var(--muted);outline-offset:1px}
.week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;background:var(--overlay);border-radius:10px;padding:8px}
.day{display:grid;grid-template-rows:auto repeat(8,18px);gap:3px;min-width:0}
.day>span{font:10px ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:0 0 4px 2px}
.ev{border-radius:4px;font-size:10px;font-weight:600;padding:2px 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.4}
@media (max-width:440px){.ev{font-size:8.5px;padding:2px}}
`;
