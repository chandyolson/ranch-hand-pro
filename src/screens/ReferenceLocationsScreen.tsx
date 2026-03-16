import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useLocations } from "@/hooks/useLocations";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import { applyFilters } from "@/lib/filter-utils";
import type { FilterFieldConfig } from "@/lib/filter-types";

const LOCATION_TYPES = ["Pasture", "Pen", "Barn", "Corral", "Feedlot", "Headquarters", "Working Facility", "Water Source", "Lot", "Other"];

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "name", label: "Name", type: "text", group: "Identity" },
  { key: "description", label: "Description", type: "text", group: "Identity" },
  { key: "location_type", label: "Type", type: "select", options: LOCATION_TYPES, group: "Identity" },
  { key: "is_active", label: "Active", type: "boolean", group: "Status" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Pasture:            { bg: "rgba(85,186,170,0.25)", text: "#55BAAA" },
  Pen:                { bg: "rgba(243,209,42,0.20)", text: "#B8860B" },
  Barn:               { bg: "rgba(232,138,58,0.25)", text: "#E88A3A" },
  Corral:             { bg: "rgba(91,141,239,0.25)", text: "#5B8DEF" },
  Feedlot:            { bg: "rgba(155,35,53,0.15)", text: "#9B2335" },
  Headquarters:       { bg: "rgba(14,38,70,0.15)", text: "#0E2646" },
  "Working Facility": { bg: "rgba(168,168,240,0.20)", text: "#A8A8F0" },
  "Water Source":     { bg: "rgba(85,186,170,0.15)", text: "#0F6E56" },
  Lot:                { bg: "rgba(243,209,42,0.15)", text: "#B8860B" },
};

const ReferenceLocationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { data: locations, isLoading, error, refetch } = useLocations();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Pasture");
  const [newMemo, setNewMemo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const { showToast } = useChuteSideToast();
  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_locations");
  const { presets, addPreset, deletePreset } = useFilterPresets("chuteside_presets_locations");

  const handleAdd = async () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    const { error } = await supabase.from("locations").insert({
      operation_id: operationId,
      name: newName.trim(),
      location_type: newType,
      description: newMemo.trim() || null,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewMemo(""); setNewType("Pasture"); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    showToast("success", name + " deleted");
  };

  const allLocations = locations || [];
  const topLevel = allLocations.filter(l => !l.parent_location_id);
  const children = allLocations.filter(l => !!l.parent_location_id);

  const filtered = applyFilters(
    topLevel.filter(l =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.description || "").toLowerCase().includes(search.toLowerCase()) ||
      l.location_type.toLowerCase().includes(search.toLowerCase())
    ),
    filters
  ).sort((a, b) => {
    switch (sort) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "type": return a.location_type.localeCompare(b.location_type);
      case "newest": return (b.created_at || "").localeCompare(a.created_at || "");
      default: return 0;
    }
  });

  const isFiltering = search.length > 0 || filters.length > 0;
  const stats = {
    total: allLocations.length,
    pastures: allLocations.filter(l => l.location_type === "Pasture").length,
    pens: allLocations.filter(l => l.location_type === "Pen").length,
  };

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL", value: isLoading ? "—" : stats.total },
          { label: "PASTURES", value: isLoading ? "—" : stats.pastures },
          { label: "PENS", value: isLoading ? "—" : stats.pens },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center" style={{ minWidth: 50 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>{stat.label}</span>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />}
          </div>
        ))}
      </div>

      <ListScreenToolbar
        title="Locations"
        addLabel="New Location"
        hideTitle
        compactAdd
        onAdd={() => setAddOpen(!addOpen)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search locations…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={[
          { value: "name-asc", label: "Name ↑" },
          { value: "name-desc", label: "Name ↓" },
          { value: "type", label: "Type" },
          { value: "newest", label: "Newest" },
        ]}
        activeSort={sort}
        onSortChange={setSort}
        resultCount={filtered.length}
        isFiltering={isFiltering}
        advancedFilter={
          <AdvancedSearchPanel
            fields={FILTER_FIELDS}
            filters={filters}
            onFiltersChange={setFilters}
            presets={presets}
            onAddPreset={addPreset}
            onDeletePreset={deletePreset}
            onClearAll={clearFilters}
          />
        }
      />

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Location name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Type</span>
            <select value={newType} onChange={e => setNewType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              {LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Memo</span>
            <input type="text" value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="Optional note" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewMemo(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="py-12 text-center space-y-3">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Failed to load locations</div>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: "#0E2646", color: "white" }}>Retry</button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(loc => {
            const subs = children.filter(c => c.parent_location_id === loc.id);
            const tc = TYPE_COLORS[loc.location_type] || { bg: "rgba(240,240,240,0.12)", text: "rgba(240,240,240,0.6)" };
            return (
              <div key={loc.id}>
                <div onClick={() => navigate("/reference/locations/" + loc.id)} className="rounded-xl px-3.5 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform" style={{ backgroundColor: "#0E2646", minHeight: 56 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{loc.name}</span>
                      <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em", backgroundColor: tc.bg, color: tc.text }}>
                        {loc.location_type}
                      </span>
                      {subs.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(168,230,218,0.50)" }}>{subs.length} sub</span>
                      )}
                    </div>
                    {loc.description && (
                      <div className="truncate" style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.45)", marginTop: 2 }}>{loc.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        const nn = window.prompt("Edit location name:", loc.name);
                        if (!nn || nn.trim() === loc.name) return;
                        const { error } = await supabase.from("locations").update({ name: nn.trim() }).eq("id", loc.id);
                        if (error) { showToast("error", error.message); return; }
                        queryClient.invalidateQueries({ queryKey: ["locations"] });
                        showToast("success", nn.trim() + " updated");
                      }}
                      style={{ width: 28, height: 28, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5M1 11L1.5 8.5L9 1L11 3L3.5 10.5L1 11Z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id, loc.name)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: "none", backgroundColor: "rgba(155,35,53,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3H10M4.5 5V9M7.5 5V9M3 3L3.5 10.5H8.5L9 3" stroke="rgba(155,35,53,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                {/* Sub-locations */}
                {subs.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {subs.map(sub => (
                      <div key={sub.id} className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "1px solid rgba(14,38,70,0.08)" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", flex: 1 }}>{sub.name}</span>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: "rgba(155,35,53,0.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 3H10M4.5 5V9M7.5 5V9M3 3L3.5 10.5H8.5L9 3" stroke="rgba(155,35,53,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No locations found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
};

export default ReferenceLocationsScreen;
