import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import { useChuteSideToast } from "@/components/ToastContext";
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import { applyFilters } from "@/lib/filter-utils";
import type { FilterFieldConfig } from "@/lib/filter-types";

const CALVING_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "damTag", label: "Dam Tag", type: "text", group: "Identity" },
  { key: "calfTag", label: "Calf Tag", type: "text", group: "Identity" },
  { key: "calfSex", label: "Calf Sex", type: "select", options: ["Bull", "Heifer", "Unknown"], group: "Calf" },
  { key: "calfStatus", label: "Calf Status", type: "select", options: ["Alive", "Dead"], group: "Calf" },
  { key: "rawDate", label: "Calving Date", type: "date-range", group: "Event" },
  { key: "assistance", label: "Assistance", type: "select", options: ["None", "Easy Pull", "Hard Pull", "C-Section"], group: "Cow Traits" },
  { key: "note", label: "Memo", type: "text", group: "Notes" },
];

const TAG_HEX: Record<string, string> = {
  Red: "#D4606E", Yellow: "#F3D12A", Green: "#55BAAA", White: "#E0E0E0",
  Orange: "#E8863A", Blue: "#5B8DEF", Purple: "#A77BCA", Pink: "#E8A0BF", None: "#999",
};

const assistanceLabel = (v: number | null) => {
  if (!v || v === 1) return "None";
  if (v === 2) return "Easy Pull";
  if (v === 3) return "Hard Pull";
  if (v === 4) return "C-Section";
  return "";
};

const parseDateForSort = (d: string) => new Date(d).getTime();

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function CalvingScreen() {
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();
  const { operationId } = useOperation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_calving");
  const { presets, addPreset, deletePreset } = useFilterPresets("chuteside_presets_calving");

  const { data: rawRecords, isLoading } = useQuery({
    queryKey: ["calving-list", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calving_records")
        .select("*, dam:animals!dam_id(tag, tag_color), calf:animals!calf_id(tag)")
        .eq("operation_id", operationId)
        .order("calving_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const records = (rawRecords || []).map(r => ({
    id: r.id,
    damTag: (r.dam as any)?.tag || "Unknown",
    damColor: (r.dam as any)?.tag_color || "None",
    damColorHex: TAG_HEX[(r.dam as any)?.tag_color || "None"] || "#999",
    calfTag: r.calf_tag || (r as any).calf?.tag || "",
    calfSex: (r.calf_sex || "Unknown") as string,
    calfStatus: (r.calf_status || "Alive") as string,
    date: fmtDate(r.calving_date),
    rawDate: r.calving_date,
    birthWeight: r.birth_weight ? `${r.birth_weight} lbs` : "",
    assistance: assistanceLabel(r.assistance),
    note: r.memo || "",
  }));

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "dam", label: "Dam Tag" },
    { value: "calf", label: "Calf Tag" },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = applyFilters(
    records.filter(r =>
      !search ||
      r.damTag.toLowerCase().includes(search.toLowerCase()) ||
      r.calfTag.toLowerCase().includes(search.toLowerCase()) ||
      (r.note && r.note.toLowerCase().includes(search.toLowerCase()))
    ),
    filters
  )
    .sort((a, b) => {
      switch (sort) {
        case "newest": return parseDateForSort(b.rawDate) - parseDateForSort(a.rawDate);
        case "oldest": return parseDateForSort(a.rawDate) - parseDateForSort(b.rawDate);
        case "dam": return a.damTag.localeCompare(b.damTag);
        case "calf": return a.calfTag.localeCompare(b.calfTag);
        default: return 0;
      }
    });

  const calvingStats = {
    total: records.length,
    heifers: records.filter(r => r.calfSex === "Heifer").length,
    bulls: records.filter(r => r.calfSex === "Bull").length,
    dead: records.filter(r => r.calfStatus === "Dead").length,
  };

  const isFiltering = search.length > 0 || filters.length > 0;

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Season stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL",   value: isLoading ? "…" : calvingStats.total },
          { label: "HEIFERS", value: isLoading ? "…" : calvingStats.heifers },
          { label: "BULLS",   value: isLoading ? "…" : calvingStats.bulls },
          { label: "DEAD",    value: isLoading ? "…" : calvingStats.dead },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>
                {stat.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />
            )}
          </div>
        ))}
      </div>

      <ListScreenToolbar
        title="Calving"
        addLabel="New Entry"
        hideTitle
        compactAdd
        hideSort
        onAdd={() => navigate("/calving/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search dam tag, calf tag, notes…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={sortOptions}
        activeSort={sort}
        onSortChange={setSort}
        onImport={() => showToast("info", "Import — coming soon")}
        onExport={() => showToast("info", "Export — coming soon")}
        onMassSelect={() => showToast("info", "Mass Select — coming soon")}
        resultCount={filtered.length}
        isFiltering={isFiltering}
        advancedFilter={
          <AdvancedSearchPanel
            fields={CALVING_FILTER_FIELDS}
            filters={filters}
            onFiltersChange={setFilters}
            presets={presets}
            onAddPreset={addPreset}
            onDeletePreset={deletePreset}
            onClearAll={clearFilters}
          />
        }
      />

      {/* Section label + sort */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
          RECENT RECORDS
        </span>
        <div className="relative" ref={sortRef}>
          <button
            className="flex items-center gap-1 cursor-pointer active:scale-[0.96]"
            style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)", background: "none", border: "none", padding: 0 }}
            onClick={() => setSortOpen(!sortOpen)}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {sortOptions.find(s => s.value === sort)?.label || "Sort"}
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 mt-1 z-50 rounded-xl py-1"
              style={{ backgroundColor: "white", border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", minWidth: 130 }}
            >
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  className="flex items-center w-full cursor-pointer"
                  style={{
                    height: 36, paddingLeft: 12, paddingRight: 12, border: "none",
                    backgroundColor: sort === opt.value ? "rgba(14,38,70,0.06)" : "transparent",
                    fontSize: 12, fontWeight: sort === opt.value ? 700 : 500, color: "#1A1A1A",
                  }}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                >{opt.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0E2646] rounded-xl px-4 py-3.5 animate-pulse" style={{ height: 72 }} />
          ))}
        </div>
      )}

      {/* Record list */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-[#0E2646] rounded-xl px-4 py-3.5 cursor-pointer active:scale-[0.98] transition-all duration-150"
              onClick={() => navigate("/calving/" + r.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{r.damTag}</span>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: r.damColorHex, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(240,240,240,0.30)" }}>→</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#55BAAA" }}>{r.calfTag || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full"
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em",
                      backgroundColor: r.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                      color: r.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                    }}
                  >
                    {r.calfSex.toUpperCase()}
                  </span>
                  {r.calfStatus === "Dead" && (
                    <span
                      className="rounded-full"
                      style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.20)", color: "#D4606E" }}
                    >
                      DEAD
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)" }}>{r.date}</span>
                {r.birthWeight && (
                  <>
                    <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,240,240,0.50)" }}>{r.birthWeight}</span>
                  </>
                )}
                {r.assistance !== "None" && (
                  <>
                    <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(243,209,42,0.70)" }}>{r.assistance}</span>
                  </>
                )}
              </div>
              {r.note && (
                <div style={{ fontSize: 12, color: "rgba(240,240,240,0.40)", marginTop: 4, lineHeight: 1.4 }}>{r.note}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No records found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
}
