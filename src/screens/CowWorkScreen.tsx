import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CowWorkProjectCard from "@/components/CowWorkProjectCard";
import { Skeleton } from "@/components/ui/skeleton";

const filterOptions: { value: "all" | "pending" | "in-progress" | "completed"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const statusMap: Record<string, string> = {
  "pending": "Pending",
  "in-progress": "In Progress",
  "completed": "Completed",
};

export default function CowWorkScreen() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const navigate = useNavigate();
  const { operationId } = useOperation();

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

  const mapped = (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: p.project_status.toLowerCase().replace(" ", "-") as "pending" | "in-progress" | "completed",
    type: (p.work_types as any)?.[0]?.work_type?.code || "",
    group: (p.group as any)?.name || "",
    headCount: p.head_count || 0,
    workedCount: workCounts?.[p.id] || 0,
  }));

  const filtered = statusFilter === "all" ? mapped : mapped.filter((p) => p.status === statusFilter);
  const inProgressCount = mapped.filter((p) => p.status === "in-progress").length;
  const activeHead = mapped.filter((p) => p.status === "pending" || p.status === "in-progress").reduce((s, p) => s + p.headCount, 0);

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Cow Work</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full w-9 h-9 flex items-center justify-center border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="#0E2646" />
              <rect x="2" y="7" width="8" height="2" rx="1" fill="#0E2646" />
              <rect x="2" y="11" width="10" height="2" rx="1" fill="#0E2646" />
            </svg>
          </button>
          <button
            className="rounded-full h-9 px-4 bg-[#F3D12A] flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
            style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
            onClick={() => navigate("/cow-work/new")}
          >
            + New
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              className="rounded-full px-3.5 py-1.5 cursor-pointer border transition-all duration-150 active:scale-[0.96]"
              style={{
                backgroundColor: active ? "#0E2646" : "white",
                borderColor: active ? "#0E2646" : "rgba(212,212,208,0.80)",
                color: active ? "white" : "rgba(26,26,26,0.50)",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
              }}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stats summary */}
      <div className="flex gap-3">
        {[
          { value: inProgressCount, label: "IN PROGRESS" },
          { value: activeHead, label: "HEAD ACTIVE" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex-1 rounded-xl px-4 py-3"
            style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((p) => (
            <CowWorkProjectCard
              key={p.id}
              {...p}
              onClick={() => navigate("/cow-work/" + p.id)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No projects</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(26,26,26,0.30)", marginTop: 4 }}>Try a different filter</div>
          </div>
        )}
      </div>
    </div>
  );
}
