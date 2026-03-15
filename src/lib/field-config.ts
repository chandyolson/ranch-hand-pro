// ── Dynamic Project Field Configuration ──
// Tag and Notes are ALWAYS present (hardcoded in the Add tab, not in this config).
// Everything else is toggleable. Work-type fields are "recommended" (on by default)
// but the user can turn them off. All-type fields are optional.

export interface FieldDef {
  key: string;
  label: string;
  /** Which work type codes recommend this field (on by default). Empty = other/optional */
  recommendedFor: string[];
  /** Default ON when no template overrides and work type doesn't match */
  defaultOn: boolean;
  /** Input type hint for the Add tab renderer */
  inputType: "number" | "text" | "select" | "pills" | "textarea" | "lookup";
}

// Master field list — order here is the default display order
export const ALL_FIELDS: FieldDef[] = [
  // ── Preg Check recommended fields ──
  { key: "preg_stage",        label: "Preg Stage",         recommendedFor: ["PREG"],  defaultOn: false, inputType: "select" },
  { key: "days_of_gestation", label: "Days of Gestation",  recommendedFor: ["PREG"],  defaultOn: false, inputType: "number" },
  { key: "fetal_sex",         label: "Fetal Sex",          recommendedFor: ["PREG"],  defaultOn: false, inputType: "select" },

  // ── Breeding recommended fields ──
  { key: "breeding_sire",     label: "Breeding Sire",      recommendedFor: ["AI", "BREED", "TO"], defaultOn: false, inputType: "lookup" },
  { key: "breeding_date",     label: "Breeding Date",      recommendedFor: ["AI", "BREED"],       defaultOn: false, inputType: "text" },
  { key: "breeding_type",     label: "Breeding Type",      recommendedFor: ["AI", "BREED", "ET"], defaultOn: false, inputType: "select" },
  { key: "estrus_status",     label: "Estrus Status",      recommendedFor: ["AI", "BREED"],       defaultOn: false, inputType: "select" },
  { key: "technician",        label: "Technician",         recommendedFor: ["AI", "ET"],          defaultOn: false, inputType: "text" },

  // ── BSE recommended fields ──
  { key: "scrotal",           label: "Scrotal Circ.",      recommendedFor: ["BSE"],   defaultOn: false, inputType: "number" },
  { key: "motility_pct",      label: "Motility %",         recommendedFor: ["BSE"],   defaultOn: false, inputType: "number" },
  { key: "morphology",        label: "Morphology %",       recommendedFor: ["BSE"],   defaultOn: false, inputType: "number" },
  { key: "semen_defects",     label: "Semen Defects",      recommendedFor: ["BSE"],   defaultOn: false, inputType: "text" },
  { key: "physical_defects",  label: "Physical Defects",   recommendedFor: ["BSE"],   defaultOn: false, inputType: "text" },
  { key: "bse_result",        label: "Pass / Fail",        recommendedFor: ["BSE"],   defaultOn: false, inputType: "select" },

  // ── Sale/Cull recommended fields ──
  { key: "cull_reason",       label: "Cull Reason",        recommendedFor: ["SALE"],  defaultOn: false, inputType: "select" },
  { key: "disposition",       label: "Disposition",        recommendedFor: ["SALE"],  defaultOn: false, inputType: "select" },
  { key: "sale_weight",       label: "Sale Weight",        recommendedFor: ["SALE"],  defaultOn: false, inputType: "number" },

  // ── Treatment recommended fields ──
  { key: "disease",           label: "Disease",            recommendedFor: ["TREAT"], defaultOn: false, inputType: "select" },

  // ── Common fields (on by default for all work types) ──
  { key: "weight",            label: "Weight",             recommendedFor: [],        defaultOn: true,  inputType: "number" },
  { key: "quick_notes",       label: "Quick Notes",        recommendedFor: [],        defaultOn: true,  inputType: "pills" },
  { key: "dna",               label: "DNA",                recommendedFor: [],        defaultOn: false, inputType: "text" },
  { key: "tag_color",         label: "Tag Color",          recommendedFor: [],        defaultOn: false, inputType: "select" },
  { key: "lot",               label: "Lot",                recommendedFor: [],        defaultOn: false, inputType: "text" },
  { key: "sample",            label: "Sample",             recommendedFor: [],        defaultOn: false, inputType: "text" },
  { key: "pen",               label: "Pen",                recommendedFor: [],        defaultOn: false, inputType: "select" },
  { key: "data1",             label: "Data 1",             recommendedFor: [],        defaultOn: false, inputType: "text" },
  { key: "data2",             label: "Data 2",             recommendedFor: [],        defaultOn: false, inputType: "text" },
  { key: "motility_desc",     label: "Motility (Qual.)",   recommendedFor: [],        defaultOn: false, inputType: "select" },
  { key: "morphology_desc",   label: "Morphology (Qual.)", recommendedFor: [],        defaultOn: false, inputType: "select" },
  { key: "traits",            label: "Traits",             recommendedFor: [],        defaultOn: false, inputType: "select" },
];

/** Shape stored in projects.field_visibility */
export interface FieldVisibilityConfig {
  /** Keys of ALL enabled fields in display order */
  enabledFields: string[];
}

/** Get recommended fields for a given work type code */
export function getRecommendedFields(workTypeCode: string): FieldDef[] {
  return ALL_FIELDS.filter(f => f.recommendedFor.includes(workTypeCode));
}

/** Get other fields (not recommended for this work type) */
export function getOtherFields(workTypeCode: string): FieldDef[] {
  return ALL_FIELDS.filter(f => !f.recommendedFor.includes(workTypeCode));
}

/** Build default config for a work type: recommended fields + defaultOn common fields */
export function getDefaultFieldConfig(workTypeCode?: string): FieldVisibilityConfig {
  const recommended = workTypeCode ? getRecommendedFields(workTypeCode).map(f => f.key) : [];
  const commonOn = ALL_FIELDS.filter(f => f.defaultOn && f.recommendedFor.length === 0).map(f => f.key);
  return { enabledFields: [...recommended, ...commonOn] };
}

/** Merge a saved config with the master list */
export function resolveFieldConfig(saved: FieldVisibilityConfig | null, workTypeCode?: string): FieldVisibilityConfig {
  if (!saved) return getDefaultFieldConfig(workTypeCode);
  // Handle legacy format that used optionalFields
  if ((saved as any).optionalFields && !(saved as any).enabledFields) {
    return { enabledFields: (saved as any).optionalFields };
  }
  if (!saved.enabledFields) return getDefaultFieldConfig(workTypeCode);
  return saved;
}

// Legacy compat — existing code uses these names
export function getLockedFields(workTypeCode: string): FieldDef[] {
  return getRecommendedFields(workTypeCode);
}
export function getOptionalFields(): FieldDef[] {
  return ALL_FIELDS.filter(f => f.recommendedFor.length === 0);
}
