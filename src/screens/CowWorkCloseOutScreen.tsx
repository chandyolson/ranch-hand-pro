import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SUB_LABEL, INPUT_CLS, LABEL_STYLE } from "@/lib/styles";
import { ANIMAL_TYPE_OPTIONS, SEX_OPTIONS, BREED_OPTIONS, TAG_COLOR_HEX } from "@/lib/constants";

export default function CowWorkCloseOutScreen() {
  const { id } = useParams<{ id: string }>();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [reconOpen, setReconOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [actionedMissing, setActionedMissing] = useState<Record<string, string>>({});

  // Phase E: Review New Animals wizard state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewData, setReviewData] = useState<Record<string, { year_born?: string; type?: string; sex?: string; breed?: string }>>({});
  const [reviewComplete, setReviewComplete] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

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
  const headCount = project?.estimated_head || project?.head_count || 0;
  const projectName = project?.name || "";
  const projectType = (project?.work_types as any)?.[0]?.work_type?.code || "";

  // Expected animals (from group preload)
  const { data: expectedAnimals } = useQuery({
    queryKey: ["project-expected-closeout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_expected_animals")
        .select("*, animal:animals(id, tag, tag_color, sex, type, year_born)")
        .eq("project_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const expected = expectedAnimals || [];
  const hasExpected = expected.length > 0;

  // Reconciliation buckets
  const workedAnimalIds = new Set(worked.map(w => w.animal_id));
  const expectedAnimalIds = new Set(expected.map((e: any) => e.animal_id));
  const matched = expected.filter((e: any) => workedAnimalIds.has(e.animal_id));
  const missing = expected.filter((e: any) => !workedAnimalIds.has(e.animal_id));
  const extra = worked.filter(w => !expectedAnimalIds.has(w.animal_id));
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

  // Phase E: New animals that need review
  const newAnimals = worked.filter(a => a.is_new_animal);
  const hasNewAnimals = newAnimals.length > 0 && !reviewComplete;
  const currentNewAnimal = newAnimals[reviewIndex];
  const currentAnimalId = (currentNewAnimal?.animal as any)?.id || currentNewAnimal?.animal_id;

  // Smart defaults for year_born based on cattle type
  const getSmartYearDefault = (cattleType: string) => {
    const currentYear = new Date().getFullYear();
    if (cattleType === "Calf") return String(currentYear);
    if (cattleType === "Replacement") return String(currentYear - 1);
    return "";
  };

  // Get current review values for the active animal
  const getReviewField = (field: string) => {
    if (!currentAnimalId) return "";
    return (reviewData[currentAnimalId] as any)?.[field] || "";
  };

  const setReviewField = (field: string, value: string) => {
    if (!currentAnimalId) return;
    setReviewData(prev => ({
      ...prev,
      [currentAnimalId]: {
        ...prev[currentAnimalId],
        [field]: value,
        // Smart default: when type changes, auto-fill year_born
        ...(field === "type" ? { year_born: prev[currentAnimalId]?.year_born || getSmartYearDefault(value) } : {}),
      },
    }));
  };

  const handleReviewNext = () => {
    if (reviewIndex < newAnimals.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      handleSaveReview();
    }
  };

  const handleReviewBack = () => {
    if (reviewIndex > 0) setReviewIndex(reviewIndex - 1);
  };

  const handleSkipAll = () => {
    handleSaveReview();
  };

  const handleSaveReview = async () => {
    setSavingReview(true);
    try {
      // Update each animal that has review data
      for (const [animalId, data] of Object.entries(reviewData)) {
        const updates: any = {};
        if (data.year_born) updates.year_born = parseInt(data.year_born);
        if (data.type) updates.type = data.type;
        if (data.sex) updates.sex = data.sex;
        if (data.breed) updates.breed = data.breed;
        if (Object.keys(updates).length > 0) {
          await supabase.from("animals").update(updates).eq("id", animalId);
        }
      }
      setReviewComplete(true);
      showToast("success", "New animal details saved");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save animal details");
    } finally {
      setSavingReview(false);
    }
  };

  const handleCloseOut = async () => {
    setClosing(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          project_status: "Completed",
          head_count: worked.length, // Lock final worked count
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
      showToast("success", `${projectName} completed — ${worked.length} head`);
      navigate("/cow-work");
    } catch (err: any) {
      showToast("error", err.message || "Failed to close out");
    } finally {
      setClosing(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) { showToast("error", "Template name is required"); return; }
    setSavingTemplate(true);
    try {
      const workTypeId = (project?.work_types as any)?.[0]?.work_type_id;
      const { error } = await supabase.from("project_templates").insert({
        operation_id: operationId,
        name: templateName.trim(),
        work_type_id: workTypeId || null,
        default_cattle_type: null,
        default_field_visibility: project?.field_visibility || {},
        default_products: null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      showToast("success", `Template "${templateName.trim()}" saved`);
      setTemplateOpen(false);
      setTemplateName("");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
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

      {/* Reconciliation (optional, expandable) */}
      {hasExpected && (
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
          <button
            onClick={() => setReconOpen(!reconOpen)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646" }}>Reconcile Animals</div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>
                {matched.length} matched · {missing.length} missing · {extra.length} extra
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: reconOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M4 6L8 10L12 6" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {reconOpen && (
            <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(212,212,208,0.30)" }}>
              {/* Matched bucket */}
              <div style={{ paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#55BAAA", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#55BAAA" }}>Matched — {matched.length}</span>
                </div>
                {matched.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {matched.map((e: any) => (
                      <span key={e.animal_id} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 9999, backgroundColor: "rgba(85,186,170,0.10)", color: "#3D9A8B" }}>
                        {(e.animal as any)?.tag || "?"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing bucket — expanded by default */}
              <div style={{ paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F3D12A", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#B8960F" }}>Missing — {missing.length}</span>
                </div>
                {missing.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {missing.map((e: any) => {
                      const animalId = e.animal_id;
                      const tag = (e.animal as any)?.tag || "?";
                      const actioned = actionedMissing[animalId];
                      return (
                        <div key={animalId} style={{ borderRadius: 8, backgroundColor: actioned ? "rgba(85,186,170,0.06)" : "rgba(243,209,42,0.06)", border: `1px solid ${actioned ? "rgba(85,186,170,0.20)" : "rgba(243,209,42,0.15)"}`, padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {(e.animal as any)?.tag_color && (
                                <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TAG_COLOR_HEX[(e.animal as any).tag_color] || "#999", flexShrink: 0 }} />
                              )}
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{tag}</span>
                              <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{(e.animal as any)?.type || (e.animal as any)?.sex || ""}</span>
                            </div>
                            {actioned && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, backgroundColor: "rgba(85,186,170,0.15)", color: "#3D9A8B" }}>{actioned}</span>
                            )}
                          </div>
                          {!actioned && (
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                              <button
                                onClick={async () => {
                                  await supabase.from("animal_flags").insert({
                                    operation_id: operationId, animal_id: animalId,
                                    flag_tier: "management", flag_name: "Missing from project",
                                    flag_note: `Missing from ${projectName} close-out`,
                                  });
                                  setActionedMissing(prev => ({ ...prev, [animalId]: "Flagged" }));
                                  showToast("success", `${tag} flagged`);
                                }}
                                style={{ padding: "5px 12px", borderRadius: 9999, border: "1px solid rgba(85,186,170,0.30)", backgroundColor: "white", fontSize: 11, fontWeight: 600, color: "#55BAAA", cursor: "pointer" }}
                              >
                                Flag
                              </button>
                              <button
                                onClick={async () => {
                                  await supabase.from("animals").update({ status: "Sold" }).eq("id", animalId);
                                  setActionedMissing(prev => ({ ...prev, [animalId]: "Sold" }));
                                  showToast("success", `${tag} marked Sold`);
                                }}
                                style={{ padding: "5px 12px", borderRadius: 9999, border: "1px solid rgba(232,116,97,0.30)", backgroundColor: "white", fontSize: 11, fontWeight: 600, color: "#E87461", cursor: "pointer" }}
                              >
                                Mark Sold
                              </button>
                              <button
                                onClick={() => setActionedMissing(prev => ({ ...prev, [animalId]: "Skipped" }))}
                                style={{ padding: "5px 12px", borderRadius: 9999, border: "none", backgroundColor: "rgba(26,26,26,0.04)", fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)", cursor: "pointer" }}
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>All expected animals were worked</div>
                )}}
              </div>

              {/* Extra bucket */}
              {extra.length > 0 && (
                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E87461", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E87461" }}>Extra — {extra.length}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {extra.map((w: any) => (
                      <span key={w.id} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 9999, backgroundColor: "rgba(232,116,97,0.10)", color: "#E87461" }}>
                        {(w.animal as any)?.tag || "?"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
                  {a.is_new_animal && (
                    <span className="rounded-full" style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", backgroundColor: "rgba(243,209,42,0.20)", color: "#B8960F" }}>NEW</span>
                  )}
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

      {/* Phase E: Review New Animals Wizard */}
      {hasNewAnimals && currentNewAnimal && (
        <div className="rounded-xl bg-white px-4 py-4 space-y-3" style={{ border: "2px solid #F3D12A" }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646" }}>
                Review {newAnimals.length} New Animal{newAnimals.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", marginTop: 2 }}>
                Fill in the basics so your herd list stays clean.
              </div>
            </div>
            <span
              className="rounded-full shrink-0"
              style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", backgroundColor: "rgba(243,209,42,0.20)", color: "#B8960F" }}
            >
              {reviewIndex + 1} of {newAnimals.length}
            </span>
          </div>

          {/* Animal context card */}
          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(14,38,70,0.04)", border: "1px solid rgba(14,38,70,0.08)" }}>
            <div className="flex items-center gap-2">
              {(currentNewAnimal.animal as any)?.tag_color && (
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 10, height: 10, backgroundColor: TAG_COLOR_HEX[(currentNewAnimal.animal as any).tag_color] || "#999" }}
                />
              )}
              <span style={{ fontSize: 18, fontWeight: 800, color: "#0E2646" }}>
                {(currentNewAnimal.animal as any)?.tag || "Unknown"}
              </span>
              <span
                className="rounded-full"
                style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.20)", color: "#F3D12A" }}
              >
                NEW
              </span>
            </div>
            {(currentNewAnimal.weight || currentNewAnimal.memo) && (
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", marginTop: 4 }}>
                {currentNewAnimal.weight && `${currentNewAnimal.weight} lbs`}
                {currentNewAnimal.weight && currentNewAnimal.memo ? " · " : ""}
                {currentNewAnimal.memo || ""}
              </div>
            )}
          </div>

          {/* Review fields */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <label style={LABEL_STYLE}>Cattle Type</label>
              <select
                value={getReviewField("type")}
                onChange={e => setReviewField("type", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select…</option>
                {ANIMAL_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <label style={LABEL_STYLE}>Year Born</label>
              <input
                type="number"
                inputMode="numeric"
                value={getReviewField("year_born")}
                onChange={e => setReviewField("year_born", e.target.value)}
                placeholder={getReviewField("type") ? getSmartYearDefault(getReviewField("type")) || "Year" : "Year"}
                className={INPUT_CLS}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <label style={LABEL_STYLE}>Sex</label>
              <select
                value={getReviewField("sex")}
                onChange={e => setReviewField("sex", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select…</option>
                {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <label style={LABEL_STYLE}>Breed</label>
              <select
                value={getReviewField("breed")}
                onChange={e => setReviewField("breed", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select…</option>
                {BREED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              className="rounded-full px-5 py-2.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", opacity: reviewIndex === 0 ? 0.35 : 1 }}
              disabled={reviewIndex === 0}
              onClick={handleReviewBack}
            >
              ← Back
            </button>
            <button
              className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)", background: "none", border: "none", textDecoration: "underline" }}
              onClick={handleSkipAll}
            >
              Skip All
            </button>
            <button
              className="rounded-full px-5 py-2.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none", opacity: savingReview ? 0.5 : 1 }}
              disabled={savingReview}
              onClick={handleReviewNext}
            >
              {savingReview ? "Saving…" : reviewIndex < newAnimals.length - 1 ? "Next →" : "Done"}
            </button>
          </div>
        </div>
      )}

      {/* Review complete confirmation */}
      {newAnimals.length > 0 && reviewComplete && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(85,186,170,0.08)", border: "1px solid rgba(85,186,170,0.20)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#3D9A8B" }}>
            ✓ {newAnimals.length} new animal{newAnimals.length !== 1 ? "s" : ""} reviewed
          </span>
        </div>
      )}

      {/* Save as Template */}
      {!templateOpen ? (
        <button
          onClick={() => setTemplateOpen(true)}
          style={{ width: "100%", padding: "10px 16px", borderRadius: 12, border: "1px solid #55BAAA", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#55BAAA", cursor: "pointer" }}
        >
          Save as Template
        </button>
      ) : (
        <div style={{ borderRadius: 12, backgroundColor: "white", border: "2px solid #55BAAA", padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#55BAAA", letterSpacing: "0.04em", marginBottom: 8 }}>SAVE AS TEMPLATE</div>
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name…"
            style={{ ...({ flex: 1, minWidth: 0, height: 36, borderRadius: 8, border: "1px solid #D4D4D0", paddingLeft: 12, paddingRight: 12, fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: "#1A1A1A", outline: "none", backgroundColor: "#FFFFFF", boxSizing: "border-box" as const, width: "100%" }) }}
            autoFocus
          />
          <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 6 }}>
            Saves work type, field config, and products from this project
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { setTemplateOpen(false); setTemplateName(""); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "1px solid #D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "rgba(26,26,26,0.50)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={saveAsTemplate}
              disabled={savingTemplate}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "none", backgroundColor: "#55BAAA", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer", opacity: savingTemplate ? 0.5 : 1 }}
            >
              {savingTemplate ? "Saving…" : "Save Template"}
            </button>
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
          disabled={closing || hasNewAnimals}
          onClick={handleCloseOut}
        >
          {closing ? "Closing…" : hasNewAnimals ? "Review New Animals First" : "Complete Project"}
        </button>
      </div>

      {/* Export section */}
      <div style={{ borderRadius: 12, backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)", padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>EXPORT</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={async () => {
              try {
                const XLSX = await import("xlsx");
                const rows = worked.map((w: any, i: number) => ({
                  "#": i + 1,
                  "Tag": (w.animal as any)?.tag || "",
                  "Tag Color": (w.animal as any)?.tag_color || "",
                  "Sex": (w.animal as any)?.sex || "",
                  "Type": (w.animal as any)?.type || "",
                  "Year Born": (w.animal as any)?.year_born || "",
                  "Weight": w.weight || "",
                  "Preg Stage": w.preg_stage || "",
                  "Days Gest.": w.days_of_gestation || "",
                  "Fetal Sex": w.fetal_sex || "",
                  "Memo": w.memo || "",
                  "Quick Notes": Array.isArray(w.quick_notes) ? w.quick_notes.join(", ") : "",
                  "New Animal": w.is_new_animal ? "Yes" : "",
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Animals");
                // Summary sheet
                const summary = [
                  { Field: "Project", Value: projectName },
                  { Field: "Date", Value: projectDate },
                  { Field: "Type", Value: projectType },
                  { Field: "Group", Value: projectGroup },
                  { Field: "Location", Value: projectLocation },
                  { Field: "Head Expected", Value: headCount },
                  { Field: "Head Worked", Value: worked.length },
                  { Field: "Avg Weight", Value: avgWeight || "N/A" },
                ];
                const ws2 = XLSX.utils.json_to_sheet(summary);
                XLSX.utils.book_append_sheet(wb, ws2, "Summary");
                XLSX.writeFile(wb, `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_export.xlsx`);
                showToast("success", "Excel exported");
              } catch (err: any) {
                showToast("error", "Export failed: " + err.message);
              }
            }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 9999, border: "1px solid #0E2646", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}
          >
            Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              const rows = worked.map((w: any) => [
                (w.animal as any)?.tag || "",
                (w.animal as any)?.tag_color || "",
                (w.animal as any)?.sex || "",
                (w.animal as any)?.type || "",
                w.weight || "",
                w.preg_stage || "",
                w.memo || "",
              ].join(","));
              const header = "Tag,Tag Color,Sex,Type,Weight,Preg Stage,Memo";
              const csv = [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_export.csv`;
              a.click();
              URL.revokeObjectURL(url);
              showToast("success", "CSV exported");
            }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 9999, border: "1px solid rgba(26,26,26,0.20)", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "rgba(26,26,26,0.60)", cursor: "pointer" }}
          >
            CSV (.csv)
          </button>
        </div>
      </div>
    </div>
  );
}
