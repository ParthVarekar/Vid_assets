// Colour and type for the film. Every value except `sanguine` is sampled from
// ProtoVinci's own website or LinkedIn cover (see research/brand-research.md).

export const C = {
  // Paper world (LinkedIn cover)
  paper: "#EEEBE4",
  paperBright: "#F7F5F0",
  taupe: "#A69A8A",
  taupeLight: "#DFD8CE",

  // Ink and interface greys (website)
  ink: "#09090B",
  inkSoft: "#27272A",
  graphite: "#6B7280",
  zinc: "#9898A3",
  rule: "#E4E4E7",
  white: "#FFFFFF",

  // Engine room
  night: "#09090B",
  nightCard: "#141417",
  nightRaise: "#1C1C21",
  nightRule: "#2B2B31",
  nightText: "#F4F4F5",
  nightMuted: "#8B8B95",

  // The idea. Red chalk: the one colour that is not already in the brand.
  sanguine: "#C4472F",
  sanguineBright: "#E8583C",
} as const;

export const FONT = {
  sans: "Switzer",
  mono: "Geist Mono",
} as const;

/** The site sets headlines at about -0.045em. */
export const TRACK = {
  display: "-0.045em",
  title: "-0.035em",
  body: "-0.015em",
  mono: "0.04em",
  monoWide: "0.14em",
} as const;
