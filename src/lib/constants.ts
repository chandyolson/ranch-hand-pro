// ── Design System Colors ──

export const COLORS = {
  navy: "#0E2646",
  midNavy: "#153566",
  teal: "#55BAAA",
  gold: "#F3D12A",
  cullRed: "#9B2335",
  destructiveRed: "#D4183D",
  background: "#F5F5F0",
  white: "#FFFFFF",
  textOnDark: "#F0F0F0",
  textOnLight: "#1A1A1A",
  mutedText: "#717182",
  inputBg: "#F3F3F5",
  borderDivider: "#D4D4D0",
  switchBg: "#CBCED4",
} as const;

// ── Flag System ──

export type FlagColor = "teal" | "gold" | "red";

export const FLAG_OPTIONS: { color: FlagColor; label: string; hex: string }[] = [
  { color: "teal", label: "Management", hex: "#55BAAA" },
  { color: "gold", label: "Production", hex: "#F3D12A" },
  { color: "red", label: "Cull", hex: "#9B2335" },
];

export const FLAG_HEX_MAP: Record<FlagColor, string> = {
  teal: "#55BAAA",
  gold: "#F3D12A",
  red: "#9B2335",
};

// ── Quick Notes with Flag Mapping (17 canonical) ──

export interface QuickNoteConfig {
  label: string;
  flag: FlagColor | null;
  context: "all" | "calving";
}

export const QUICK_NOTES: QuickNoteConfig[] = [
  { label: "Cull", flag: "red", context: "all" },
  { label: "Bad Bag", flag: "gold", context: "all" },
  { label: "Bad Feet", flag: "gold", context: "all" },
  { label: "Lame", flag: "gold", context: "all" },
  { label: "Lump Jaw", flag: "gold", context: "all" },
  { label: "Bad Disposition", flag: "gold", context: "all" },
  { label: "Bad Mother", flag: "gold", context: "all" },
  { label: "Old", flag: "gold", context: "all" },
  { label: "Poor Calf", flag: "gold", context: "all" },
  { label: "Poor Condition", flag: "gold", context: "all" },
  { label: "Needs Tag", flag: "teal", context: "all" },
  { label: "DNA", flag: "teal", context: "all" },
  { label: "Needs Treated", flag: "teal", context: "all" },
  { label: "Sorted", flag: null, context: "all" },
  { label: "Treated", flag: null, context: "all" },
  { label: "Twin", flag: null, context: "calving" },
  { label: "Freemartin", flag: null, context: "all" },
];

// Quick note pill colors based on flag tier

export const QUICK_NOTE_PILL_COLORS: Record<
  string,
  { bg: string; border: string; text: string; bgSel: string; borderSel: string }
> = {
  red: {
    bg: "rgba(155,35,53,0.12)",
    border: "rgba(155,35,53,0.25)",
    text: "#9B2335",
    bgSel: "rgba(155,35,53,0.25)",
    borderSel: "#9B2335",
  },
  gold: {
    bg: "rgba(243,209,42,0.12)",
    border: "rgba(243,209,42,0.30)",
    text: "#B8860B",
    bgSel: "rgba(243,209,42,0.25)",
    borderSel: "#B8860B",
  },
  teal: {
    bg: "rgba(85,186,170,0.12)",
    border: "rgba(85,186,170,0.25)",
    text: "#55BAAA",
    bgSel: "rgba(85,186,170,0.25)",
    borderSel: "#55BAAA",
  },
  none: { bg: "#F5F5F0", border: "#D4D4D0", text: "rgba(26,26,26,0.55)", bgSel: "#E8E8E4", borderSel: "#AAAAAA" },
};

// ── Tag Colors ──

export const TAG_COLOR_OPTIONS = [
  "Red",
  "Yellow",
  "Green",
  "White",
  "Orange",
  "Blue",
  "Purple",
  "Pink",
  "None",
] as const;

export const TAG_COLOR_HEX: Record<string, string> = {
  Red: "#D4606E",
  Yellow: "#F3D12A",
  Green: "#55BAAA",
  White: "#E0E0E0",
  Orange: "#E8863A",
  Blue: "#5B8DEF",
  Purple: "#A77BCA",
  Pink: "#E8A0BF",
  None: "#999999",
};

// ── Animal Dropdowns ──

export const SEX_OPTIONS = ["Bull", "Cow", "Steer", "Spayed Heifer"] as const;
export const CALF_SEX_OPTIONS = ["Bull", "Heifer"] as const;
export const ANIMAL_TYPE_OPTIONS = ["Calf", "Feeder", "Replacement", "Cow", "Bull"] as const;
export const STATUS_OPTIONS = ["Active", "Dead", "Sold"] as const;
export const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => (2026 - i).toString());
export const BREED_OPTIONS = [
  "Angus",
  "Hereford",
  "Simmental",
  "Charolais",
  "Limousin",
  "Red Angus",
  "Shorthorn",
  "Brahman",
  "Brangus",
  "Mixed / Commercial",
  "Other",
] as const;

// ── Work Types (9 codes from Build Manual) ──

export interface WorkTypeConfig {
  code: string;
  name: string;
  appliesTo: string;
}

export const WORK_TYPES: WorkTypeConfig[] = [
  { code: "AI", name: "Artificial Insemination", appliesTo: "Cow, Replacement" },
  { code: "BRAND", name: "Branding", appliesTo: "Calf" },
  { code: "BREED", name: "Breeding", appliesTo: "Cow, Replacement" },
  { code: "BSE", name: "Breeding Soundness Exam", appliesTo: "Bull" },
  { code: "BV", name: "Brucellosis Vaccination", appliesTo: "Replacement" },
  { code: "CU", name: "Carcass Ultrasound", appliesTo: "Feeder, Calf" },
  { code: "ET", name: "Embryo Transfer", appliesTo: "Cow, Replacement" },
  { code: "FB", name: "Freeze Branding", appliesTo: "All" },
  { code: "MOVE", name: "Movement", appliesTo: "All" },
  { code: "PC", name: "Preconditioning", appliesTo: "Calf" },
  { code: "PREG", name: "Pregnancy Check", appliesTo: "Cow, Replacement" },
  { code: "PRO", name: "Processing", appliesTo: "All" },
  { code: "RTS", name: "Reproductive Track Score", appliesTo: "Replacement" },
  { code: "SALE", name: "Sale", appliesTo: "All" },
  { code: "TO", name: "Turn Out", appliesTo: "Cow, Replacement, Bull" },
  { code: "TREAT", name: "Mass Treatment", appliesTo: "All" },
  { code: "WEAN", name: "Weaning", appliesTo: "Calf" },
  { code: "WEIGH", name: "Weights", appliesTo: "All" },
];

// ── Preg Check Calf Sex (for cow work preg projects) ──

export const PREG_CALF_SEX_OPTIONS = [
  "None",
  "Bull",
  "Heifer",
  "Twin Bulls",
  "Twin Heifers",
  "Twin Heifer/Bull",
] as const;

// ── Product / Treatment ──

export type ProductCategory = "vaccine" | "injectable" | "parasiticide" | "reproductive" | "supply" | "service" | "diagnostic" | "other";

export const PRODUCT_CATEGORIES: ProductCategory[] = ["vaccine", "injectable", "parasiticide", "reproductive", "supply", "service", "diagnostic", "other"];

export const PRODUCT_CATEGORY_CONFIG: Record<ProductCategory, { label: string; color: string; bg: string }> = {
  vaccine: { label: "Vaccine", color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  injectable: { label: "Injectable", color: "#E87461", bg: "rgba(232,116,97,0.12)" },
  parasiticide: { label: "Parasiticide", color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  reproductive: { label: "Reproductive", color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
  supply: { label: "Supply", color: "#BA7517", bg: "rgba(186,117,23,0.12)" },
  service: { label: "Service", color: "#888780", bg: "rgba(136,135,128,0.12)" },
  diagnostic: { label: "Diagnostic", color: "#5B8DEF", bg: "rgba(91,141,239,0.12)" },
  other: { label: "Other", color: "#888780", bg: "rgba(136,135,128,0.12)" },
};

export const ROUTE_OPTIONS = ["SubQ", "IM", "IV", "Oral", "Topical", "Pour-On"] as const;

// ═══ CALVING TRAIT SCORE LABELS (Build Manual, Section 8) ═══
// Scores stored as integers. UI shows TEXT ONLY — no integer prefix.
// Index 0 = empty (unselected). Index N = score N.

export const TRAIT_LABELS = {
  assistance: [
    "",
    "No Assistance", // 1
    "Easy Pull", // 2
    "Hard Pull", // 3
    "C-Section", // 4
    "Abnormal Presentation", // 5
  ],
  disposition: [
    "",
    "Docile", // 1
    "Restless", // 2
    "Nervous", // 3
    "Flighty/Excitable", // 4
    "Aggressive", // 5
    "Very Aggressive", // 6
  ],
  udder: [
    "",
    "Very Pendulous", // 1
    "Pendulous", // 2
    "Weak Attachment", // 3
    "Moderate Low", // 4
    "Average", // 5
    "Above Average", // 6
    "Good Support", // 7
    "Strong Support", // 8
    "Excellent", // 9
  ],
  teat: [
    "",
    "Very Large", // 1
    "Large", // 2
    "Thick", // 3
    "Moderate Large", // 4
    "Average", // 5
    "Above Average", // 6
    "Good", // 7
    "Very Good", // 8
    "Ideal", // 9
  ],
  claw: [
    "",
    "Extremely Open/Divergent", // 1 (worst)
    "Open/Divergent", // 2
    "Moderately Open", // 3
    "Slightly Open", // 4
    "Ideal", // 5 (best)
    "Slight Curl Tendency", // 6
    "Curl Tendency", // 7
    "Moderate Scissor/Screw", // 8
    "Extreme Scissor/Screw", // 9 (worst)
  ],
  foot: [
    "",
    "Extremely Straight Pasterns", // 1 (worst)
    "Straight Pasterns", // 2
    "Moderately Straight", // 3
    "Slightly Straight", // 4
    "Ideal", // 5 (best)
    "Slightly Shallow Heel", // 6
    "Moderately Shallow Heel", // 7
    "Shallow Heel/Long Toe", // 8
    "Extremely Shallow/Long", // 9 (worst)
  ],
  mothering: [
    "",
    "Excellent", // 1 (best)
    "Good", // 2
    "Fair", // 3
    "Poor", // 4
    "Rejects Calf", // 5 (worst)
  ],
  calfVigor: [
    "",
    "Excellent", // 1 (best)
    "Good", // 2
    "Fair", // 3
    "Poor", // 4
    "Dead/Stillborn", // 5 (worst)
  ],
  calfSize: [
    "",
    "Very Small", // 1
    "Small", // 2
    "Average", // 3
    "Large", // 4
    "Very Large", // 5
  ],
} as const;

// ── Nine-scale optgroup config for Udder & Teat selectors ──

export interface NineScaleGroup {
  range: string;
  label: string;
  start: number;
  end: number;
}

export const NINE_SCALE_GROUPS: Record<string, NineScaleGroup[]> = {
  udder: [
    { range: "1-2", label: "Poor", start: 1, end: 2 },
    { range: "3-4", label: "Marginal", start: 3, end: 4 },
    { range: "5-6", label: "Acceptable", start: 5, end: 6 },
    { range: "7-8", label: "Desirable", start: 7, end: 8 },
    { range: "9", label: "Excellent", start: 9, end: 9 },
  ],
  teat: [
    { range: "1-2", label: "Poor", start: 1, end: 2 },
    { range: "3-4", label: "Marginal", start: 3, end: 4 },
    { range: "5-6", label: "Acceptable", start: 5, end: 6 },
    { range: "7-8", label: "Desirable", start: 7, end: 8 },
    { range: "9", label: "Excellent", start: 9, end: 9 },
  ],
};

// ── Graft & Death Reasons (Calving) ──

export const GRAFT_REASONS = ["Dam Died", "Rejected Calf", "No Milk", "Twin", "Other"] as const;

export const DEATH_REASONS = [
  "Stillborn",
  "Dystocia",
  "Scours",
  "Pneumonia",
  "Exposure/Weather",
  "Predator",
  "Birth Defect",
  "Crushed by Dam",
  "Unknown",
  "Other",
] as const;

// ── BSE (Breeding Soundness Exam) Values ──
export const BSE_PASS_FAIL = ["Pass", "Fail", "Marginal", "Deferred", "Permanent Fail"] as const;

export const BSE_MOTILITY = ["Excellent", "Very Good", "Good", "Poor", "No Motility"] as const;

export const BSE_PHYSICAL_DEFECTS = [
  "Epididymitis", "Penile Injury", "Bad Feet", "Corkscrew",
  "Testicular Trauma", "Warts", "Persistent Frenulum", "Frenulum-Okay",
  "Cryptorchid", "Vesiculitis",
] as const;

export const BSE_SEMEN_DEFECTS = [
  "Proximal Droplets", "Distal Droplets", "Coiled Tails", "Bent Tails",
  "Detached Heads", "Abnormal Acrosomes", "Pyriform Heads", "Midpiece Defects",
  "Fractured Heads", "White Blood Cells", "Red Blood Cells",
] as const;

// ── Sale / Cull Reasons ──
export const SALE_REASONS = [
  "Open", "Pregnancy Status", "Drought", "Poor Production", "Poor Mother",
  "Body Condition", "Injury", "Age", "Private Sale", "Dispersal",
  "Disposition", "Bad Bag", "Bad Feet", "Lameness", "Disease", "Market Animal",
] as const;

// ── Disease Types ──
export const DISEASE_TYPES = [
  "Pneumonia", "Scours", "Pinkeye", "Navel Infection", "Diphtheria",
  "Bloat", "Footrot", "Lameness", "Retained Placenta", "Ain't Doin Right",
] as const;

// ── Breeding Method ──
export const BREEDING_METHODS = ["AI", "IVF", "Natural", "ET"] as const;

// ── Estrus Status ──
export const ESTRUS_STATUS = ["Heat", "Estrus", "FTAI", "Unknown"] as const;
