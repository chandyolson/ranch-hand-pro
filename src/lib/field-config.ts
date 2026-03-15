// ── Dynamic Project Field Configuration ──
// 24 fields total. Work-type fields are locked/required when their type is selected.
// All-type fields are optional with toggle on/off and drag-to-reorder.

export interface FieldDef {
  key: string;
  label: string;
  /** Which work type codes lock this field. Empty = optional/all-type */
  lockedFor: string[];
  /** Default ON when no template overrides */
  defaultOn: boolean;
  /** Input type hint for the Add tab renderer */
  inputType: "number" | "text" | "select" | "pills" | "textarea" | "lookup";
}

// Master field list — order here is the default order for optional fields
export const ALL_FIELDS: FieldDef[] = [
  // ── Preg Check locked fields ──
  { key: "preg_stage",        label: "Preg Stage",         lockedFor: ["PREG"],  defaultOn: true, inputType: "select" },
  { key: "days_of_gestation", label: "Days of Gestation",  lockedFor: ["PREG"],  defaultOn: true, inputType: "number" },
  { key: "fetal_sex",         label: "Fetal Sex",          lockedFor: ["PREG"],  defaultOn: true, inputType: "select" },

  // ── Breeding locked fields ──
  { key: "breeding_sire",     label: "Breeding Sire",      lockedFor: ["AI", "BREED", "TO"], defaultOn: true, inputType: "lookup" },
  { key: "breeding_date",     label: "Breeding Date",      lockedFor: ["AI", "BREED"],       defaultOn: true, inputType: "text" },
  { key: "breeding_type",     label: "Breeding Type",      lockedFor: ["AI", "BREED", "ET"], defaultOn: true, inputType: "select" },
  { key: "estrus_status",     label: "Estrus Status",      lockedFor: ["AI", "BREED"],       defaultOn: true, inputType: "select" },
  { key: "technician",        label: "Technician",         lockedFor: ["AI", "ET"],          defaultOn: true, inputType: "text" },

  // ── BSE locked fields ──
  { key: "bse_result",        label: "Pass / Fail",        lockedFor: ["BSE"],   defaultOn: true, inputType: "select" },
  { key: "scrotal",           label: "Scrotal Circ.",      lockedFor: ["BSE"],   defaultOn: true, inputType: "number" },
  { key: "motility",          label: "Motility %",         lockedFor: ["BSE"],   defaultOn: true, inputType: "number" },
  { key: "morphology",        label: "Morphology %",       lockedFor: ["BSE"],   defaultOn: true, inputType: "number" },
  { key: "semen_defects",     label: "Semen Defects",      lockedFor: ["BSE"],   defaultOn: true, inputType: "text" },
  { key: "physical_defects",  label: "Physical Defects",   lockedFor: ["BSE"],   defaultOn: true, inputType: "text" },

  // ── Sale/Cull locked fields ──
  { key: "cull_reason",       label: "Cull Reason",        lockedFor: ["SALE"],  defaultOn: true, inputType: "select" },
  { key: "disposition",       label: "Disposition",        lockedFor: ["SALE"],  defaultOn: true, inputType: "select" },
  { key: "sale_weight",       label: "Sale Weight",        lockedFor: ["SALE"],  defaultOn: true, inputType: "number" },

  // ── Treatment locked fields ──
  { key: "disease",           label: "Disease",            lockedFor: ["TREAT"], defaultOn: true, inputType: "select" },

  // ── Optional / All-type fields (user can toggle and reorder) ──
  { key: "weight",            label: "Weight",             lockedFor: [],        defaultOn: true,  inputType: "number" },
  { key: "quick_notes",       label: "Quick Notes",        lockedFor: [],        defaultOn: true,  inputType: "pills" },
  { key: "memo",              label: "Notes",              lockedFor: [],        defaultOn: true,  inputType: "textarea" },
  { key: "dna",               label: "DNA",                lockedFor: [],        defaultOn: true,  inputType: "text" },
  { key: "tag_color",         label: "Tag Color",          lockedFor: [],        defaultOn: false, inputType: "select" },
  { key: "lot",               label: "Lot",                lockedFor: [],        defaultOn: false, inputType: "text" },
  { key: "sample",            label: "Sample",             lockedFor: [],        defaultOn: false, inputType: "text" },
  { key: "pen",               label: "Pen",                lockedFor: [],        defaultOn: false, inputType: "select" },
  { key: "data1",             label: "Data 1",             lockedFor: [],        defaultOn: false, inputType: "text" },
  { key: "data2",             label: "Data 2",             lockedFor: [],        defaultOn: false, inputType: "text" },
  { key: "traits",            label: "Traits",             lockedFor: [],        defaultOn: false, inputType: "select" },
];

/** Shape stored in projects.field_visibility and project_templates.default_field_visibility */
export interface FieldVisibilityConfig {
  /** Keys of enabled optional fields, in display order */
  optionalFields: string[];
}

/** Get locked fields for a given work type code */
export function getLockedFields(workTypeCode: string): FieldDef[] {
  return ALL_FIELDS.filter(f => f.lockedFor.includes(workTypeCode));
}

/** Get optional (all-type) fields */
export function getOptionalFields(): FieldDef[] {
  return ALL_FIELDS.filter(f => f.lockedFor.length === 0);
}

/** Build default config: all defaultOn optional fields in their default order */
export function getDefaultFieldConfig(): FieldVisibilityConfig {
  return {
    optionalFields: getOptionalFields().filter(f => f.defaultOn).map(f => f.key),
  };
}

/** Merge a saved config with the master list — handles new fields added after config was saved */
export function resolveFieldConfig(saved: FieldVisibilityConfig | null): FieldVisibilityConfig {
  if (!saved || !saved.optionalFields) return getDefaultFieldConfig();
  return saved;
}
