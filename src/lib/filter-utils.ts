import type { ActiveFilter, FilterFieldConfig } from "./filter-types";

/**
 * Apply an array of active filters to a data array.
 * Filters combine with AND logic (all must match).
 * Returns the filtered subset.
 */
export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filters: ActiveFilter[],
  options?: {
    /** Custom matchers for fields that need joined/derived data */
    customMatchers?: Record<string, (row: T, filter: ActiveFilter) => boolean>;
  }
): T[] {
  if (filters.length === 0) return data;
  const custom = options?.customMatchers || {};

  return data.filter((row) =>
    filters.every((f) => {
      // Use custom matcher if provided for this field
      if (custom[f.key]) return custom[f.key](row, f);
      return matchesFilter(row, f);
    })
  );
}

/**
 * Default filter matching logic by type.
 */
function matchesFilter<T extends Record<string, any>>(
  row: T,
  filter: ActiveFilter
): boolean {
  const val = row[filter.key];

  switch (filter.type) {
    case "text": {
      const search = String(filter.value).toLowerCase();
      if (!search) return true;
      // Handle array fields (like quickNotes)
      if (Array.isArray(val)) {
        return val.some((item) =>
          String(item).toLowerCase().includes(search)
        );
      }
      return String(val || "").toLowerCase().includes(search);
    }

    case "select": {
      const target = String(filter.value);
      if (target === "none" || target === "None") {
        return !val || val === "" || val === null || val === undefined;
      }
      return String(val || "") === target;
    }

    case "multi-select": {
      const selected = filter.value as string[];
      if (selected.length === 0) return true;
      // If "none" is in selections, also match null/empty
      const hasNone = selected.includes("none") || selected.includes("None");
      if (hasNone && (!val || val === "" || val === null)) return true;
      // Array field: check if any item matches any selection
      if (Array.isArray(val)) {
        return val.some((item) =>
          selected.some((s) => String(item).toLowerCase() === s.toLowerCase())
        );
      }
      return selected.some(
        (s) => String(val || "").toLowerCase() === s.toLowerCase()
      );
    }

    case "range": {
      const [min, max] = filter.value as [string, string];
      const numVal = Number(val);
      if (isNaN(numVal)) return false;
      if (min && numVal < Number(min)) return false;
      if (max && numVal > Number(max)) return false;
      return true;
    }

    case "date-range": {
      const [from, to] = filter.value as [string, string];
      if (!val) return false;
      const dateVal = String(val).slice(0, 10); // normalize to YYYY-MM-DD
      if (from && dateVal < from) return false;
      if (to && dateVal > to) return false;
      return true;
    }

    case "boolean": {
      return !!val === !!filter.value;
    }

    default:
      return true;
  }
}

/**
 * Build a display label for a filter chip.
 */
export function buildFilterLabel(
  fieldConfig: FilterFieldConfig,
  value: ActiveFilter["value"]
): string {
  const name = fieldConfig.label;

  switch (fieldConfig.type) {
    case "text":
      return `${name}: "${value}"`;
    case "select":
      return `${name}: ${value}`;
    case "multi-select": {
      const arr = value as string[];
      if (arr.length <= 2) return `${name}: ${arr.join(", ")}`;
      return `${name}: ${arr.length} selected`;
    }
    case "range": {
      const [min, max] = value as [string, string];
      if (min && max) return `${name}: ${min}\u2013${max}`;
      if (min) return `${name}: ${min}+`;
      if (max) return `${name}: \u2264${max}`;
      return name;
    }
    case "date-range": {
      const [from, to] = value as [string, string];
      const fmt = (d: string) => {
        const date = new Date(d + "T12:00:00");
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      };
      if (from && to) return `${name}: ${fmt(from)}\u2013${fmt(to)}`;
      if (from) return `${name}: after ${fmt(from)}`;
      if (to) return `${name}: before ${fmt(to)}`;
      return name;
    }
    case "boolean":
      return `${name}: Yes`;
    default:
      return `${name}: ${value}`;
  }
}
