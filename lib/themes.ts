// Calendar themes: palettes, not fixed mappings. The AI assigns a theme's
// colours to each person's own categories (keeping similar categories close
// and the busiest ones distinct), then calls apply_theme.
//
// Google picks the text colour (light or dark) on events itself, and it varies
// between the web and mobile apps, so colours avoid the very dark end.
// `neutral` is a light colour for the person's main calendar: the default
// category, i.e. events left without a label.

export type Theme = {
  id: string;
  name: string;
  inspiration: string;
  description: string;
  neutral: string;
  colors: { name: string; hex: string }[];
};

export const THEMES: Theme[] = [
  {
    id: "rose-pine",
    name: "Rosé Pine",
    inspiration: "The Rosé Pine editor/terminal theme",
    description: "Soho vibes: muted rose, gold, pine and iris on a soft violet-grey base.",
    neutral: "#c8c3e2",
    colors: [
      { name: "love", hex: "#eb6f92" },
      { name: "gold", hex: "#f6c177" },
      { name: "rose", hex: "#ebbcba" },
      { name: "pine", hex: "#31748f" },
      { name: "foam", hex: "#9ccfd8" },
      { name: "iris", hex: "#c4a7e7" },
      { name: "sage", hex: "#8fbf7f" },
      { name: "subtle", hex: "#908caa" },
      { name: "text", hex: "#e0def4" },
    ],
  },
  {
    id: "catppuccin",
    name: "Catppuccin Mocha",
    inspiration: "The Catppuccin editor/terminal theme (Mocha flavour)",
    description: "Soothing pastels: peach, mauve, sapphire and green on a cosy dark base.",
    neutral: "#bac2de",
    colors: [
      { name: "red", hex: "#f38ba8" },
      { name: "peach", hex: "#fab387" },
      { name: "yellow", hex: "#f9e2af" },
      { name: "green", hex: "#a6e3a1" },
      { name: "teal", hex: "#94e2d5" },
      { name: "sapphire", hex: "#74c7ec" },
      { name: "blue", hex: "#89b4fa" },
      { name: "mauve", hex: "#cba6f7" },
      { name: "pink", hex: "#f5c2e7" },
      { name: "flamingo", hex: "#f2cdcd" },
    ],
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    inspiration: "The Gruvbox editor/terminal theme (dark, bright accents)",
    description: "Retro groove: warm, earthy reds, oranges, yellows and aquas.",
    neutral: "#d5c4a1",
    colors: [
      { name: "red", hex: "#fb4934" },
      { name: "orange", hex: "#fe8019" },
      { name: "yellow", hex: "#fabd2f" },
      { name: "green", hex: "#b8bb26" },
      { name: "aqua", hex: "#8ec07c" },
      { name: "blue", hex: "#83a598" },
      { name: "purple", hex: "#d3869b" },
      { name: "gray", hex: "#a89984" },
      { name: "fg", hex: "#ebdbb2" },
    ],
  },
  {
    id: "alpine-lake",
    name: "Alpine Lake",
    inspiration: "A mountain scene: granite peaks over a glacier lake at first light",
    description: "Cool blues and pine greens with a warm sunrise accent.",
    neutral: "#c9d1da",
    colors: [
      { name: "glacier sky", hex: "#6f93c9" },
      { name: "lake", hex: "#3f8f9a" },
      { name: "pine forest", hex: "#5a8a5e" },
      { name: "meadow", hex: "#b5c96e" },
      { name: "granite", hex: "#8c9096" },
      { name: "snowfield", hex: "#e3e9ef" },
      { name: "first light", hex: "#eba35f" },
      { name: "wildflower", hex: "#a88bd0" },
      { name: "dawn pink", hex: "#e8a1a8" },
    ],
  },
  {
    id: "shallows",
    name: "Shallows",
    inspiration: "A beach scene: deep water over a reef to warm sand",
    description: "Ocean blues and sea greens, sand, coral and a low sun.",
    neutral: "#d9cfc0",
    colors: [
      { name: "deep water", hex: "#4a76b0" },
      { name: "reef", hex: "#3faac4" },
      { name: "shallows", hex: "#7fd3b8" },
      { name: "sand", hex: "#ead8a4" },
      { name: "coral", hex: "#f08a72" },
      { name: "sun", hex: "#f4bb4c" },
      { name: "driftwood", hex: "#a99a86" },
      { name: "urchin", hex: "#9583c4" },
      { name: "shell", hex: "#f2c9cf" },
    ],
  },
  {
    id: "alpenglow",
    name: "Alpenglow",
    inspiration: "A mountain scene: the minutes after sunset when the peaks glow pink",
    description: "Dusk violets and blues with glowing pinks and golds.",
    neutral: "#cfcad8",
    colors: [
      { name: "high sky", hex: "#6b8fdc" },
      { name: "dusk", hex: "#9d7cc8" },
      { name: "lit peaks", hex: "#f0a0b0" },
      { name: "last light", hex: "#f3c57c" },
      { name: "forest", hex: "#5d8c6c" },
      { name: "snowfield", hex: "#dde2ef" },
      { name: "ember", hex: "#e57d5f" },
      { name: "twilight teal", hex: "#5fa7ac" },
      { name: "stone", hex: "#938d99" },
    ],
  },
];

export function findTheme(idOrName: string): Theme {
  const k = idOrName.trim().toLowerCase();
  const t = THEMES.find((t) => t.id === k || t.name.toLowerCase() === k);
  if (!t) throw new Error(`Unknown theme "${idOrName}". Themes: ${THEMES.map((t) => t.id).join(", ")}`);
  return t;
}

/** Resolve a colour reference within a theme: a colour name ("foam") or one of its hexes. */
export function themeColor(theme: Theme, ref: string): string {
  const r = ref.trim().toLowerCase();
  const byName = theme.colors.find((c) => c.name.toLowerCase() === r);
  if (byName) return byName.hex;
  const hex = r.startsWith("#") ? r : `#${r}`;
  if (theme.neutral === hex || theme.colors.some((c) => c.hex === hex)) return hex;
  throw new Error(`"${ref}" is not a colour in ${theme.name}. Colours: ${theme.colors.map((c) => c.name).join(", ")}`);
}

/** Suggested text colour for a calendar colour (Google apps may override it). */
export function textColorFor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const yiq = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff"; // Google only accepts pure black or white here
}
