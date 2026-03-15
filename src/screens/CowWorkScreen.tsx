import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CowWorkProjectCard from "@/components/CowWorkProjectCard";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useChuteSideToast } from "@/components/ToastContext";
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import { applyFilters } from "@/lib/filter-utils";
import type { FilterFieldConfig } from "@/lib/filter-types";

const COWWORK_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "name", label: "Project Name", type: "text", group: "Project" },
  { key: "type", label: "Work Type", type: "text", group: "Project" },
  { key: "status", label: "Status", type: "select", options: ["pending", "in-progress", "completed"], group: "Project" },
  { key: "group", label: "Group", type: "text", group: "Project" },
];

export default function CowWorkScreen() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_cowwork");
  const { presets, addPreset, deletePreset } = useFilterPresets("chuteside_presets_cowwork");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, group:groups(name), work_types:project_work_types(work_type:work_types(code, name))")
        .eq("operation_id", operationId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workCounts } = useQuery({
    queryKey: ["project-work-counts", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cow_work")
        .select("project_id")
        .eq("operation_id", operationId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r) => {
        if (r.project_id) counts[r.project_id] = (counts[r.project_id] || 0) + 1;
      });
      return counts;
    },
  });

  const mapped = (projects || []).map((p) => {
    const workType = (p.work_types as any)?.[0]?.work_type;
    return {
      id: p.id,
      name: p.name,
      date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: p.project_status.toLowerCase().replace(" ", "-") as "pending" | "in-progress" | "completed",
      type: workType?.name || workType?.code || "",
      typeCode: workType?.code || "",
      group: (p.group as any)?.name || "",
      headCount: p.estimated_head || p.head_count || 0,
      workedCount: workCounts?.[p.id] || 0,
    };
  });

  const filtered = applyFilters(
    mapped.filter((p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()) ||
      p.group.toLowerCase().includes(search.toLowerCase())
    ),
    filters
  )
    .sort((a, b) => {
      switch (sort) {
        case "newest": return 0;
        case "oldest": return -1;
        case "name": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  const isFiltering = search.length > 0 || filters.length > 0;

  const allProjects = mapped;
  const stats = {
    total: allProjects.length,
    open: allProjects.filter((p) => p.status !== "completed").length,
    inProgress: allProjects.filter((p) => p.status === "in-progress").length,
    headActive: allProjects
      .filter((p) => p.status === "pending" || p.status === "in-progress")
      .reduce((s, p) => s + p.headCount, 0),
  };

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Toolbar (search + menu + add) */}
      <ListScreenToolbar
        title="Cow Work"
        addLabel="New Project"
        hideTitle
        compactAdd
        onAdd={() => navigate("/cow-work/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects, types, groups…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "name", label: "Name" },
        ]}
        activeSort={sort}
        onSortChange={setSort}
        onFilter={() => setFilterOpen(!filterOpen)}
        onImport={() => showToast("info", "Import — coming soon")}
        onExport={() => showToast("info", "Export — coming soon")}
        onMassSelect={() => showToast("info", "Mass Select — coming soon")}
        onMassEdit={() => showToast("info", "Mass Edit — coming soon")}
        resultCount={filtered.length}
        isFiltering={isFiltering}
      />

      {/* Advanced filter panel (toggled from menu) */}
      {filterOpen && (
        <AdvancedSearchPanel
          fields={COWWORK_FILTER_FIELDS}
          filters={filters}
          onFiltersChange={setFilters}
          presets={presets}
          onAddPreset={addPreset}
          onDeletePreset={deletePreset}
          onClearAll={clearFilters}
        />
      )}

      {/* Stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL", value: isLoading ? "—" : stats.total },
          { label: "OPEN", value: isLoading ? "—" : stats.open },
          { label: "ACTIVE", value: isLoading ? "—" : stats.inProgress },
          { label: "HEAD", value: isLoading ? "—" : stats.headActive },
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

      {/* Project list */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <CowWorkProjectCard
                key={p.id}
                {...p}
                onClick={() => navigate("/cow-work/" + p.id)}
              />
            ))
          ) : (
            <div className="py-12 text-center space-y-1.5">
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No projects found</div>
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
