// ── Advanced Search Type Definitions ──
// Used by AdvancedSearchPanel and all list screens

export interface FilterFieldConfig {
  key: string;
  label: string;
  type: "text" | "select" | "multi-select" | "range" | "date-range" | "boolean";
  options?: string[];
  group?: string;
}

export interface ActiveFilter {
  key: string;
  type: FilterFieldConfig["type"];
  value: string | string[] | [string, string] | boolean;
  label: string; // display text: "Breed: Angus"
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: ActiveFilter[];
  createdAt: string;
}
