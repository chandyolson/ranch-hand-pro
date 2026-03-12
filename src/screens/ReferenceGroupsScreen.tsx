import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import DataCard from "@/components/DataCard";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useGroups } from "@/hooks/useGroups";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import { applyFilters } from "@/lib/filter-utils";
import type { FilterFieldConfig } from "@/lib/filter-types";

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "name", label: "Name", type: "text", group: "Identity" },
  { key: "description", label: "Description", type: "text", group: "Identity" },
  { key: "cattle_type", label: "Cattle Type", type: "select", options: ["Cows", "Bulls", "Calves", "Mixed", "All"], group: "Identity" },
  { key: "is_active", label: "Active", type: "boolean", group: "Status" },
];

const ReferenceGroupsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { data: groups, isLoading, error, refetch } = useGroups();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newCattleType, setNewCattleType] = useState("Cows");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const { showToast } = useChuteSideToast();
  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_groups");
  const { presets, addPreset, deletePreset } = useFilterPresets("chuteside_presets_groups");

  const handleAdd = async () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    const { error } = await supabase.from("groups").insert({
      operation_id: operationId,
      name: newName.trim(),
      description: newMemo.trim() || null,
      cattle_type: newCattleType,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewMemo(""); setNewCattleType("Cows"); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    showToast("success", name + " deleted");
  };

  const allGroups = groups || [];
  const filtered = applyFilters(
    allGroups.filter(g =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(search.toLowerCase())
    ),
    filters
  ).sort((a, b) => {
    switch (sort) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "newest": return (b.created_at || "").localeCompare(a.created_at || "");
      default: return 0;
    }
  });

  const isFiltering = search.length > 0 || filters.length > 0;
  const stats = {
    total: allGroups.length,
    active: allGroups.filter(g => g.is_active).length,
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
          { label: "ACTIVE", value: isLoading ? "—" : stats.active },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>{stat.label}</span>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />}
          </div>
        ))}
      </div>

      <ListScreenToolbar
        title="Groups"
        addLabel="New Group"
        hideTitle
        compactAdd
        onAdd={() => setAddOpen(!addOpen)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search groups…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={[
          { value: "name-asc", label: "Name ↑" },
          { value: "name-desc", label: "Name ↓" },
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
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Type</span>
            <select value={newCattleType} onChange={e => setNewCattleType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              {["Cows", "Bulls", "Calves", "Mixed", "All"].map(t => <option key={t}>{t}</option>)}
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Failed to load groups</div>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: "#0E2646", color: "white" }}>Retry</button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(g => (
            <div key={g.id} className="rounded-xl px-3.5 py-3 flex items-center gap-3" style={{ backgroundColor: "#0E2646", minHeight: 56 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{g.name}</span>
                  <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em", backgroundColor: "rgba(85,186,170,0.25)", color: "#55BAAA" }}>
                    {g.cattle_type || "—"}
                  </span>
                </div>
                {g.description && (
                  <div className="truncate" style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.45)", marginTop: 2 }}>{g.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={async () => {
                    const newName = window.prompt("Edit group name:", g.name);
                    if (!newName || newName.trim() === g.name) return;
                    const { error } = await supabase.from("groups").update({ name: newName.trim() }).eq("id", g.id);
                    if (error) { showToast("error", error.message); return; }
                    queryClient.invalidateQueries({ queryKey: ["groups"] });
                    showToast("success", newName.trim() + " updated");
                  }}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5M1 11L1.5 8.5L9 1L11 3L3.5 10.5L1 11Z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={() => handleDelete(g.id, g.name)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", backgroundColor: "rgba(155,35,53,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3H10M4.5 5V9M7.5 5V9M3 3L3.5 10.5H8.5L9 3" stroke="rgba(155,35,53,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No groups found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
};

export default ReferenceGroupsScreen;
