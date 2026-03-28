import { describe, it, expect } from "vitest";
import { applyFilters, buildFilterLabel } from "@/lib/filter-utils";
import type { ActiveFilter, FilterFieldConfig } from "@/lib/filter-types";

// ─── applyFilters ────────────────────────────────────────────────────────────

type Animal = {
  tag: string;
  breed: string | null;
  sex: string;
  status: string;
  year_born: number | null;
  birth_date: string | null;
  has_eid: boolean;
  notes: string[];
};

const animals: Animal[] = [
  { tag: "001", breed: "Angus",    sex: "Cow",  status: "Active",   year_born: 2018, birth_date: "2018-03-15", has_eid: true,  notes: ["check feet"] },
  { tag: "002", breed: "Hereford", sex: "Bull", status: "Active",   year_born: 2020, birth_date: "2020-05-01", has_eid: false, notes: [] },
  { tag: "003", breed: "Angus",    sex: "Cow",  status: "Sold",     year_born: 2016, birth_date: "2016-07-22", has_eid: true,  notes: ["limping", "old"] },
  { tag: "004", breed: null,       sex: "Cow",  status: "Active",   year_born: null, birth_date: null,         has_eid: false, notes: [] },
  { tag: "005", breed: "Hereford", sex: "Cow",  status: "Active",   year_born: 2019, birth_date: "2019-11-30", has_eid: true,  notes: [] },
];

// ── text filter ──────────────────────────────────────────────────────────────

describe("applyFilters — text", () => {
  it("matches case-insensitively", () => {
    const f: ActiveFilter = { key: "breed", type: "text", value: "angus", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001", "003"]);
  });

  it("matches substring", () => {
    const f: ActiveFilter = { key: "breed", type: "text", value: "here", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["002", "005"]);
  });

  it("empty string returns all rows", () => {
    const f: ActiveFilter = { key: "breed", type: "text", value: "", label: "" };
    expect(applyFilters(animals, [f])).toHaveLength(animals.length);
  });

  it("matches against array fields", () => {
    const f: ActiveFilter = { key: "notes", type: "text", value: "limping", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["003"]);
  });

  it("returns empty when no match", () => {
    const f: ActiveFilter = { key: "breed", type: "text", value: "Longhorn", label: "" };
    expect(applyFilters(animals, [f])).toHaveLength(0);
  });
});

// ── select filter ────────────────────────────────────────────────────────────

describe("applyFilters — select", () => {
  it("exact match", () => {
    const f: ActiveFilter = { key: "status", type: "select", value: "Active", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001", "002", "004", "005"]);
  });

  it("matches null when value is 'none'", () => {
    const f: ActiveFilter = { key: "breed", type: "select", value: "none", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["004"]);
  });

  it("matches null when value is 'None'", () => {
    const f: ActiveFilter = { key: "breed", type: "select", value: "None", label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["004"]);
  });
});

// ── multi-select filter ──────────────────────────────────────────────────────

describe("applyFilters — multi-select", () => {
  it("matches any of selected values", () => {
    const f: ActiveFilter = { key: "sex", type: "multi-select", value: ["Cow", "Bull"], label: "" };
    expect(applyFilters(animals, [f])).toHaveLength(5);
  });

  it("single selection works", () => {
    const f: ActiveFilter = { key: "sex", type: "multi-select", value: ["Bull"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["002"]);
  });

  it("empty selection returns all rows", () => {
    const f: ActiveFilter = { key: "sex", type: "multi-select", value: [], label: "" };
    expect(applyFilters(animals, [f])).toHaveLength(animals.length);
  });

  it("'none' in multi-select matches null values", () => {
    const f: ActiveFilter = { key: "breed", type: "multi-select", value: ["none", "Angus"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001", "003", "004"]);
  });
});

// ── range filter ─────────────────────────────────────────────────────────────

describe("applyFilters — range", () => {
  it("filters with min and max", () => {
    const f: ActiveFilter = { key: "year_born", type: "range", value: ["2018", "2019"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001", "005"]);
  });

  it("min only", () => {
    const f: ActiveFilter = { key: "year_born", type: "range", value: ["2019", ""], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["002", "005"]);
  });

  it("max only", () => {
    const f: ActiveFilter = { key: "year_born", type: "range", value: ["", "2017"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["003"]);
  });

  it("excludes null numeric values", () => {
    const f: ActiveFilter = { key: "year_born", type: "range", value: ["2010", "2025"], label: "" };
    const result = applyFilters(animals, [f]);
    // tag 004 has year_born: null — NaN check should exclude it
    expect(result.map(a => a.tag)).not.toContain("004");
  });
});

// ── date-range filter ────────────────────────────────────────────────────────

describe("applyFilters — date-range", () => {
  it("filters within date range", () => {
    const f: ActiveFilter = { key: "birth_date", type: "date-range", value: ["2018-01-01", "2019-01-01"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001"]);
  });

  it("excludes null dates", () => {
    const f: ActiveFilter = { key: "birth_date", type: "date-range", value: ["2000-01-01", "2030-01-01"], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).not.toContain("004");
  });

  it("from-only filter", () => {
    const f: ActiveFilter = { key: "birth_date", type: "date-range", value: ["2020-01-01", ""], label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["002"]);
  });
});

// ── boolean filter ───────────────────────────────────────────────────────────

describe("applyFilters — boolean", () => {
  it("true matches truthy values", () => {
    const f: ActiveFilter = { key: "has_eid", type: "boolean", value: true, label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["001", "003", "005"]);
  });

  it("false matches falsy values", () => {
    const f: ActiveFilter = { key: "has_eid", type: "boolean", value: false, label: "" };
    const result = applyFilters(animals, [f]);
    expect(result.map(a => a.tag)).toEqual(["002", "004"]);
  });
});

// ── AND logic across multiple filters ────────────────────────────────────────

describe("applyFilters — multiple filters (AND)", () => {
  it("combines text + select", () => {
    const filters: ActiveFilter[] = [
      { key: "breed", type: "text", value: "angus", label: "" },
      { key: "status", type: "select", value: "Active", label: "" },
    ];
    const result = applyFilters(animals, filters);
    expect(result.map(a => a.tag)).toEqual(["001"]);
  });

  it("no filters returns all rows", () => {
    expect(applyFilters(animals, [])).toHaveLength(animals.length);
  });
});

// ── custom matchers ───────────────────────────────────────────────────────────

describe("applyFilters — custom matchers", () => {
  it("overrides default matching for a field", () => {
    const f: ActiveFilter = { key: "tag", type: "text", value: "0", label: "" };
    const result = applyFilters(animals, [f], {
      customMatchers: {
        tag: (row) => Number(row.tag) % 2 === 0,
      },
    });
    expect(result.map(a => a.tag)).toEqual(["002", "004"]);
  });
});

// ─── buildFilterLabel ────────────────────────────────────────────────────────

describe("buildFilterLabel", () => {
  const field = (type: FilterFieldConfig["type"]): FilterFieldConfig => ({
    key: "x", label: "Breed", type,
  });

  it("text", () => {
    expect(buildFilterLabel(field("text"), "Angus")).toBe('Breed: "Angus"');
  });

  it("select", () => {
    expect(buildFilterLabel(field("select"), "Active")).toBe("Breed: Active");
  });

  it("multi-select 1 item", () => {
    expect(buildFilterLabel(field("multi-select"), ["Angus"])).toBe("Breed: Angus");
  });

  it("multi-select 2 items", () => {
    expect(buildFilterLabel(field("multi-select"), ["Angus", "Hereford"])).toBe("Breed: Angus, Hereford");
  });

  it("multi-select 3+ items shows count", () => {
    expect(buildFilterLabel(field("multi-select"), ["A", "B", "C"])).toBe("Breed: 3 selected");
  });

  it("range min + max", () => {
    expect(buildFilterLabel(field("range"), ["2018", "2020"])).toBe("Breed: 2018\u20132020");
  });

  it("range min only", () => {
    expect(buildFilterLabel(field("range"), ["2018", ""])).toBe("Breed: 2018+");
  });

  it("range max only", () => {
    expect(buildFilterLabel(field("range"), ["", "2020"])).toBe("Breed: \u22642020");
  });

  it("boolean", () => {
    expect(buildFilterLabel(field("boolean"), true)).toBe("Breed: Yes");
  });
});
