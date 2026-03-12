import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SUB_LABEL } from "@/lib/styles";

export default function CowWorkCloseOutScreen() {
  const { id } = useParams<{ id: string }>();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, group:groups(name), location:locations(name), work_types:project_work_types(work_type:work_types(code, name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: workedAnimals } = useQuery({
    queryKey: ["project-animals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cow_work")
        .select("*, animal:animals(tag, tag_color, sex, type, year_born)")
        .eq("project_id", id!)
        .eq("operation_id", operationId)
        .order("record_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const worked = workedAnimals || [];
  const headCount = project?.head_count || 0;
  const projectName = project?.name || "";
  const projectType = (project?.work_types as any)?.[0]?.work_type?.code || "";
  const projectDate = project
    ? new Date(project.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const projectGroup = (project?.group as any)?.name || "—";
  const projectLocation = (project?.location as any)?.name || "—";

  // Stats
  const confirmedCount = worked.filter((a) => a.preg_stage === "Confirmed").length;
  const openCount = worked.filter((a) => a.preg_stage === "Open").length;
  const suspectCount = worked.filter((a) => a.preg_stage === "Suspect").length;
  const weighedAnimals = worked.filter((a) => a.weight);
  const avgWeight =
    weighedAnimals.length > 0
      ? Math.round(weighedAnimals.reduce((s, a) => s + Number(a.weight), 0) / weighedAnimals.length)
      : 0;

  const handleCloseOut = async () => {
    setClosing(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          project_status: "Completed",
          description: closingNotes.trim()
            ? `${project?.description || ""}\n\n--- Close-out Notes ---\n${closingNotes.trim()}`.trim()
            : project?.description || null,
        })
        .eq("id", id!)
        .eq("operation_id", operationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-work-counts"] });
      showToast("success", `${projectName} completed`);
      navigate("/cow-work");
    } catch (err: any) {
      showToast("error", err.message || "Failed to close out");
    } finally {
      setClosing(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4 pb-10">
      {/* Header */}
      <div
        className="rounded-2xl px-5 py-5"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(168,230,218,0.60)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          CLOSE OUT
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.1, marginTop: 4 }}>
          {projectName}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.50)" }}>{projectDate}</span>
          <span style={{ width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.50)" }}>{projectGroup}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: worked.length, label: "WORKED", sub: `of ${headCount} head` },
          { value: headCount - worked.length, label: "REMAINING", sub: headCount - worked.length === 0 ? "All done ✓" : "not processed" },
          { value: confirmedCount, label: "CONFIRMED", sub: worked.length > 0 ? `${Math.round((confirmedCount / worked.length) * 100)}%` : "—" },
          { value: `${avgWeight}`, label: "AVG WEIGHT", sub: weighedAnimals.length > 0 ? `${weighedAnimals.length} weighed` : "No weights" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-white px-4 py-3.5"
            style={{ border: "1px solid rgba(212,212,208,0.60)" }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0E2646", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginTop: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Preg Breakdown (only for PREG projects) */}
      {projectType === "PREG" && (
        <div className="rounded-xl bg-white px-4 py-4" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646", marginBottom: 12 }}>Preg Results</div>
          {[
            { label: "Confirmed", count: confirmedCount, color: "#55BAAA" },
            { label: "Open", count: openCount, color: "#E87461" },
            { label: "Suspect", count: suspectCount, color: "#F3D12A" },
          ].map((r) => {
            const total = worked.length || 1;
            return (
              <div key={r.label} className="flex items-center gap-3 mb-2.5">
                <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: r.color }} />
                <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{r.label}</span>
                <div className="rounded-full" style={{ flex: 2, height: 6, backgroundColor: "rgba(26,26,26,0.06)" }}>
                  <div className="rounded-full" style={{ height: 6, backgroundColor: r.color, width: `${(r.count / total) * 100}%`, transition: "width 300ms" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", minWidth: 24, textAlign: "right" }}>{r.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Animals List */}
      <div className="rounded-xl bg-white px-4 py-4" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={SUB_LABEL}>ANIMALS WORKED · {worked.length}</div>
        <div className="space-y-0 mt-2">
          {worked.map((a, i) => {
            const animalTag = (a.animal as any)?.tag || "Unknown";
            const animalType = (a.animal as any)?.type || (a.animal as any)?.sex || "";
            return (
              <div
                key={a.id || i}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < worked.length - 1 ? "1px solid rgba(212,212,208,0.30)" : "none" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{animalTag}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>{animalType}</span>
                </div>
                <div className="flex items-center gap-3">
                  {a.weight && <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.55)" }}>{a.weight} lbs</span>}
                  {a.preg_stage && (
                    <span
                      className="rounded-full"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 8px",
                        backgroundColor:
                          a.preg_stage === "Confirmed" ? "rgba(85,186,170,0.15)" :
                          a.preg_stage === "Open" ? "rgba(232,116,97,0.15)" :
                          "rgba(243,209,42,0.15)",
                        color:
                          a.preg_stage === "Confirmed" ? "#55BAAA" :
                          a.preg_stage === "Open" ? "#E87461" :
                          "#B8960F",
                      }}
                    >
                      {a.preg_stage}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {worked.length === 0 && (
            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 16 }}>
              No animals were worked in this project
            </div>
          )}
        </div>
      </div>

      {/* Close-out Notes */}
      <div className="rounded-xl bg-white px-4 py-4" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={SUB_LABEL}>CLOSE-OUT NOTES</div>
        <textarea
          value={closingNotes}
          onChange={(e) => setClosingNotes(e.target.value)}
          placeholder="Any final notes about this project…"
          className="w-full resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25 mt-2"
          style={{ minHeight: 80, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 14 }}
        />
      </div>

      {/* Warning if remaining */}
      {headCount - worked.length > 0 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: "rgba(243,209,42,0.12)", border: "1px solid rgba(243,209,42,0.30)" }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#B8960F" }}>
            ⚠ {headCount - worked.length} animal{headCount - worked.length !== 1 ? "s" : ""} not yet processed
          </div>
          <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(184,150,15,0.70)", marginTop: 2 }}>
            You can still close out — remaining animals will not have records.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97] transition-all"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
        <button
          className="rounded-full py-3.5 cursor-pointer active:scale-[0.97] transition-all"
          style={{
            flex: 2,
            fontSize: 14,
            fontWeight: 700,
            color: "#1A1A1A",
            backgroundColor: "#F3D12A",
            border: "none",
            opacity: closing ? 0.5 : 1,
          }}
          disabled={closing}
          onClick={handleCloseOut}
        >
          {closing ? "Closing…" : "Complete Project"}
        </button>
      </div>
    </div>
  );
}
