import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CowWorkProjectCard from "@/components/CowWorkProjectCard";
import StatsBar from "@/components/StatsBar";
import EmptyState from "@/components/EmptyState";
import LoadingGrid from "@/components/LoadingGrid";
import QueryError from "@/components/QueryError";

const STATUS_ORDER: Record<string, number> = { "in-progress": 0, pending: 1, completed: 2 };

interface ProjectRow {
  id: string;
  name: string;
  date: string;
  project_status: string;
  estimated_head: number | null;
  head_count: number | null;
  group: { name: string } | null;
  work_types: Array<{ work_type: { code: string; name: string } | null }>;
}

export default function CowWorkScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const { operationId } = useOperation();

  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, group:groups(name), work_types:project_work_types(work_type:work_types(code, name))")
        .eq("operation_id", operationId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectRow[];
    },
  });

  const { data: workCounts } = useQuery({
    queryKey: ["project-work-counts", operationId],
    enabled: !!operationId,
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
    const workType = p.work_types[0]?.work_type;
    return {
      id: p.id,
      name: p.name,
      date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      rawDate: p.date,
      status: p.project_status.toLowerCase().replace(" ", "-") as "pending" | "in-progress" | "completed",
      type: workType?.name || workType?.code || "",
      typeCode: workType?.code || "",
      group: p.group?.name || "",
      headCount: p.estimated_head || p.head_count || 0,
      workedCount: workCounts?.[p.id] || 0,
    };
  });

  // Get unique work type codes for the filter pills
  const typeCodeSet = new Set(mapped.map(p => p.typeCode).filter(Boolean));
  const typeCodes = Array.from(typeCodeSet).sort();

  // Get unique years for the year filter
  const yearSet = new Set(mapped.map(p => p.rawDate.substring(0, 4)).filter(Boolean));
  const years = Array.from(yearSet).sort().reverse(); // newest first

  // Apply filters
  const filtered = mapped
    .filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.typeCode !== typeFilter) return false;
      if (yearFilter !== "all" && !p.rawDate.startsWith(yearFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.type.toLowerCase().includes(q) && !p.group.toLowerCase().includes(q) && !p.typeCode.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    // Sort: In Progress first, then Pending, then Completed. Within each group, newest date first.
    .sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (statusDiff !== 0) return statusDiff;
      return b.rawDate.localeCompare(a.rawDate);
    });

  const stats = {
    total: mapped.length,
    inProgress: mapped.filter(p => p.status === "in-progress").length,
    pending: mapped.filter(p => p.status === "pending").length,
    completed: mapped.filter(p => p.status === "completed").length,
  };

  const PS = { fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 9999, cursor: "pointer", border: "none", transition: "all 150ms" } as const;
  const pillOn = (active: boolean, color?: string) => ({
    ...PS,
    backgroundColor: active ? (color || "#0E2646") : "rgba(26,26,26,0.05)",
    color: active ? "#FFFFFF" : "rgba(26,26,26,0.50)",
    fontWeight: active ? 700 : 500,
  });

  return (
    <div style={{ padding: "6px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Search + New Project */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 40, borderRadius: 10, border: "1px solid #D4D4D0", backgroundColor: "white", paddingLeft: 12, paddingRight: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{ flex: 1, border: "none", outline: "none", backgroundColor: "transparent", fontSize: 16, fontFamily: "'Inter', sans-serif", color: "#1A1A1A" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", fontSize: 16, color: "rgba(26,26,26,0.30)", cursor: "pointer", padding: 0 }}>×</button>
          )}
        </div>
        <button
          onClick={() => navigate("/cow-work/new")}
          style={{ height: 40, paddingLeft: 14, paddingRight: 14, borderRadius: 10, border: "none", backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          + New
        </button>
      </div>

      <StatsBar isLoading={isLoading} stats={[
        { label: "TOTAL",   value: stats.total },
        { label: "ACTIVE",  value: stats.inProgress },
        { label: "PENDING", value: stats.pending },
        { label: "DONE",    value: stats.completed },
      ]} />

      {/* Filter toggle + active filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
            borderRadius: 9999, border: "1px solid #D4D4D0", backgroundColor: filtersOpen ? "rgba(14,38,70,0.06)" : "white",
            fontSize: 12, fontWeight: 600, color: "#0E2646", cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filters
        </button>
        {/* Show active filters as pills when collapsed */}
        {!filtersOpen && (statusFilter !== "all" || typeFilter !== "all" || yearFilter !== "all") && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {statusFilter !== "all" && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 9999, backgroundColor: "rgba(85,186,170,0.12)", color: "#3D9A8B" }}>
                {statusFilter === "in-progress" ? "In Progress" : statusFilter === "pending" ? "Pending" : "Completed"}
                <button onClick={() => setStatusFilter("all")} style={{ background: "none", border: "none", color: "#3D9A8B", marginLeft: 4, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
              </span>
            )}
            {typeFilter !== "all" && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 9999, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>
                {typeFilter}
                <button onClick={() => setTypeFilter("all")} style={{ background: "none", border: "none", color: "#0E2646", marginLeft: 4, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
              </span>
            )}
            {yearFilter !== "all" && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 9999, backgroundColor: "rgba(243,209,42,0.12)", color: "#B8960F" }}>
                {yearFilter}
                <button onClick={() => setYearFilter("all")} style={{ background: "none", border: "none", color: "#B8960F", marginLeft: 4, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded filter pills */}
      {filtersOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 12px", borderRadius: 12, backgroundColor: "rgba(26,26,26,0.02)", border: "1px solid rgba(212,212,208,0.40)" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 6 }}>STATUS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setStatusFilter("all")} style={pillOn(statusFilter === "all")}>All</button>
              <button onClick={() => setStatusFilter("in-progress")} style={pillOn(statusFilter === "in-progress", "#55BAAA")}>In Progress</button>
              <button onClick={() => setStatusFilter("pending")} style={pillOn(statusFilter === "pending", "#717182")}>Pending</button>
              <button onClick={() => setStatusFilter("completed")} style={pillOn(statusFilter === "completed", "#B8960F")}>Completed</button>
            </div>
          </div>
          {typeCodes.length > 1 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 6 }}>WORK TYPE</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setTypeFilter("all")} style={pillOn(typeFilter === "all")}>All</button>
                {typeCodes.map(code => (
                  <button key={code} onClick={() => setTypeFilter(code)} style={pillOn(typeFilter === code)}>{code}</button>
                ))}
              </div>
            </div>
          )}
          {years.length > 1 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 6 }}>YEAR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setYearFilter("all")} style={pillOn(yearFilter === "all")}>All</button>
                {years.map(yr => (
                  <button key={yr} onClick={() => setYearFilter(yr)} style={pillOn(yearFilter === yr, "#B8960F")}>{yr}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project list */}
      {error && <QueryError message="Couldn't load projects" onRetry={refetch} />}
      {isLoading && <LoadingGrid count={3} columns={1} height={100} />}

      {!isLoading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => (
            <CowWorkProjectCard
              key={p.id}
              {...p}
              onClick={() => navigate("/cow-work/" + p.id)}
            />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title="No projects found"
          subtitle="Try a different search or filter"
        />
      )}
    </div>
  );
}
