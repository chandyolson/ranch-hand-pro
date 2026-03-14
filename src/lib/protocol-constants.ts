// src/lib/protocol-constants.ts
// Single source of truth for protocol stage definitions.
// Both ProtocolTemplateBuilderScreen and CustomerProtocolScreen import from here.
// Stage names match the validated CATL protocol templates exactly.

export const PROTOCOL_ANIMAL_TYPES = ["Calf", "Replacement", "Cow", "Bull", "Feeder"] as const;
export type ProtocolAnimalType = (typeof PROTOCOL_ANIMAL_TYPES)[number];

// Display labels for animal types (used in badges, headers, PDFs)
export const ANIMAL_CLASS_LABELS: Record<ProtocolAnimalType, string> = {
  Calf: "Spring-Born Calves",
  Replacement: "Replacement Heifers",
  Cow: "Cows (Mature / 2YO)",
  Bull: "Bulls (Yearling / 2YO / Herd)",
  Feeder: "Stocker & Feeder Cattle",
};

// Default stages when creating a NEW blank protocol (no template selected).
// These match the validated CATL template stage names exactly.
export const DEFAULT_STAGES: Record<ProtocolAnimalType, string[]> = {
  Calf: ["First Working (Branding)", "Second Working (Pre-Weaning)"],
  Replacement: ["Bangs / Pre-Breeding Working", "Pre-Breeding Booster (at Preg Check)"],
  Cow: ["Annual Working (at Preg Check)"],
  Bull: ["BSE / Pre-Breeding Working"],
  Feeder: ["Arrival Processing (Day 0)"],
};

// Approximate timing labels for display on customer protocol cards.
// These are display-only hints — actual dates come from days_offset calculations.
export const STAGE_TIMING_HINTS: Record<string, string> = {
  "First Working (Branding)": "April-May, calves 60-120 days",
  "Second Working (Pre-Weaning)": "September-October, ~140 days later",
  "Annual Working (at Preg Check)": "September-November at preg check",
  "Bangs / Pre-Breeding Working": "January-March, heifers 4-12 months",
  "Pre-Breeding Booster (at Preg Check)": "August, ~75 days later",
  "BSE / Pre-Breeding Working": "March-June, before turnout",
  "Arrival Processing (Day 0)": "At arrival, varies",
};

// Badge colors by animal class (consistent across hub, builder, detail, customer screens)
// Includes both singular and plural forms so lookups never fail
export const CLASS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Calf:        { bg: "rgba(85,186,170,0.12)",  text: "#55BAAA" },
  Calves:      { bg: "rgba(85,186,170,0.12)",  text: "#55BAAA" },
  Replacement: { bg: "rgba(232,116,97,0.12)",  text: "#E87461" },
  Replacements:{ bg: "rgba(232,116,97,0.12)",  text: "#E87461" },
  Cow:         { bg: "rgba(14,38,70,0.12)",    text: "#0E2646" },
  Cows:        { bg: "rgba(14,38,70,0.12)",    text: "#0E2646" },
  Bull:        { bg: "rgba(243,209,42,0.12)",  text: "#B8860B" },
  Bulls:       { bg: "rgba(243,209,42,0.12)",  text: "#B8860B" },
  Feeder:      { bg: "rgba(168,168,168,0.12)", text: "#888888" },
  Feeders:     { bg: "rgba(168,168,168,0.12)", text: "#888888" },
};
