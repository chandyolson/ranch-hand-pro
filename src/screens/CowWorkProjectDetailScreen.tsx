import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "../components/ToastContext";
import FlagIcon from "../components/FlagIcon";
import FormFieldRow from "../components/FormFieldRow";
import { PREG_CALF_SEX_OPTIONS, FLAG_HEX_MAP, type FlagColor } from "@/lib/constants";
import { LABEL_STYLE, INPUT_CLS, SUB_LABEL } from "@/lib/styles";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "input" | "worked" | "stats" | "details";

export default function CowWorkProjectDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("input");
  const [headerOpen, setHeaderOpen] = useState(false);
  const [tagField, setTagField] = useState("");
  const [isMatched, setIsMatched] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [matchedAnimal, setMatchedAnimal] = useState<any>(null);
  const [historyTab, setHistoryTab] = useState<"info" | "calving" | "history">("info");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pregResult, setPregResult] = useState("");
  const [pregDays, setPregDays] = useState("");
  const [calfSex, setCalfSex] = useState("");
  const [weight, setWeight] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [memo, setMemo] = useState("");

  // Load project
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

  // Load worked animals
  const { data: workedAnimals, refetch: refetchWorked } = useQuery({
    queryKey: ["project-animals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cow_work")
        .select("*, animal:animals(id, tag, tag_color, sex, type, breed, year_born)")
        .eq("project_id", id!)
        .eq("operation_id", operationId)
        .order("record_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Animal history queries
  const { data: animalCalvings } = useQuery({
    queryKey: ["animal-calvings-cw", matchedAnimal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("calving_records")
        .select("*, calf:animals!calving_records_calf_id_fkey(tag)")
        .eq("dam_id", matchedAnimal.id)
        .order("calving_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!matchedAnimal?.id,
  });

  const { data: animalWork } = useQuery({
    queryKey: ["animal-work-cw", matchedAnimal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cow_work")
        .select("*, project:projects(name)")
        .eq("animal_id", matchedAnimal.id)
        .order("date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!matchedAnimal?.id,
  });

  const projectType = (project?.work_types as any)?.[0]?.work_type?.code || "";
  const projectName = project?.name || "";
  const projectDate = project ? new Date(project.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const projectGroup = (project?.group as any)?.name || "";
  const projectLocation = (project?.location as any)?.name || "";
  const projectStatus = project?.project_status || "Pending";
  const headCount = project?.head_count || 0;
  const worked = workedAnimals || [];

  const lookupTag = async (tag: string) => {
    if (!tag.trim()) { setMatchedAnimal(null); setIsMatched(false); setIsDuplicate(false); return; }
    const { data } = await supabase
      .from("animals")
      .select("*")
      .eq("operation_id", operationId)
      .eq("tag", tag.trim())
      .maybeSingle();
    if (data) {
      setIsMatched(true);
      setMatchedAnimal(data);
      const isDup = worked.some(w => w.animal_id === data.id);
      setIsDuplicate(isDup);
    } else {
      setIsMatched(false);
      setMatchedAnimal(null);
      setIsDuplicate(false);
    }
  };

  const clearForm = () => {
    setTagField("");
    setIsMatched(false);
    setIsDuplicate(false);
    setMatchedAnimal(null);
    setHistoryOpen(false);
    setPregResult("");
    setPregDays("");
    setCalfSex("");
    setWeight("");
    setQuickNote("");
    setSampleId("");
    setMemo("");
  };

  const saveAndNext = async () => {
    if (!tagField.trim()) { showToast("error", "Tag required to save"); return; }
    if (!matchedAnimal) { showToast("error", "Tag not found in herd"); return; }
    setSaving(true);
    try {
      const recordOrder = worked.length + 1;
      const { error } = await supabase
        .from("cow_work")
        .insert({
          operation_id: operationId,
          project_id: id,
          animal_id: matchedAnimal.id,
          date: project?.date || new Date().toISOString().split("T")[0],
          record_order: recordOrder,
          weight: weight ? parseFloat(weight) : null,
          preg_stage: pregResult || null,
          days_of_gestation: pregDays ? parseInt(pregDays) : null,
          fetal_sex: calfSex || null,
          quick_notes: quickNote ? [quickNote] : null,
          memo: memo.trim() || null,
          dna: sampleId.trim() || null,
        });
      if (error) throw error;
      await refetchWorked();
      queryClient.invalidateQueries({ queryKey: ["project-work-counts"] });
      showToast("success", `Tag ${tagField} saved`);
      clearForm();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const confirmedCount = worked.filter(a => a.preg_stage === "Confirmed").length;
  const openCount = worked.filter(a => a.preg_stage === "Open").length;
  const suspectCount = worked.filter(a => a.preg_stage === "Suspect").length;
  const weighedAnimals = worked.filter(a => a.weight);
  const avgWeight =
    weighedAnimals.length > 0
      ? Math.round(weighedAnimals.reduce((s, a) => s + Number(a.weight), 0) / weighedAnimals.length)
      : 0;

  const tabLabels: Record<Tab, string> = { input: "Input", worked: "Animals", stats: "Stats", details: "Details" };

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
    <div className="px-4 space-y-0 pb-10">
      {/* COLLAPSIBLE HEADER */}
      <div
        className="rounded-xl overflow-hidden mb-3 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0E2646 0%, #153566 100%)" }}
      >
        {/* Collapsed row */}
        <div
          className="flex items-center justify-between px-3.5 py-2.5"
          onClick={() => setHeaderOpen(!headerOpen)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {worked.length}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.50)" }}>worked</span>
            <span className="shrink-0" style={{ width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.15)" }} />
            <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: "#A8E6DA" }}>{projectName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="rounded-full"
              style={{ fontSize: 10, fontWeight: 700, color: "#F3D12A", backgroundColor: "rgba(243,209,42,0.15)", padding: "3px 8px" }}
            >
              {tabLabels[activeTab]}
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ transform: headerOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(255,255,255,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {headerOpen && (
          <>
            <div className="px-3.5 pt-3 pb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(168,230,218,0.50)", marginBottom: 8 }}>{projectStatus}</div>
              <div className="flex gap-5">
                {[
                  { label: "HEAD", value: headCount },
                  { label: "WORKED", value: worked.length },
                  { label: "REMAINING", value: Math.max(0, headCount - worked.length) },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <button
                className="mt-2.5 rounded-lg py-1.5 px-4 cursor-pointer active:scale-[0.97] transition-all"
                style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#F3D12A", color: "#1A1A1A", border: "none" }}
                onClick={() => navigate("/cow-work/" + id + "/close-out")}
              >
                Complete Project
              </button>
            </div>

            <div className="flex px-3.5 mt-3" style={{ backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "0 0 12px 12px" }}>
              {(["input", "worked", "stats", "details"] as Tab[]).map(tab => (
                <button
                  key={tab}
                  className="flex-1 py-2.5 cursor-pointer relative"
                  style={{
                    fontSize: 12,
                    fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? "white" : "rgba(255,255,255,0.40)",
                    background: "none", border: "none",
                  }}
                  onClick={() => { setActiveTab(tab); setHeaderOpen(false); }}
                >
                  {tabLabels[tab]}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* TAB CONTENT */}
      <div className="pt-0 space-y-3">
        {/* =================== INPUT TAB =================== */}
        {activeTab === "input" && (
          <>
            {/* Tag / EID field */}
            <div className="rounded-xl bg-white px-3 py-3.5 space-y-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <input
                  className="flex-1 h-12 rounded-lg px-3 outline-none transition-all"
                  style={{ fontSize: 16, fontWeight: 600, color: "#0E2646", border: "2px solid #F3D12A", backgroundColor: "white" }}
                  placeholder="Tag or EID…"
                  value={tagField}
                  onChange={e => { setTagField(e.target.value); setIsMatched(false); setMatchedAnimal(null); setIsDuplicate(false); }}
                  onBlur={() => lookupTag(tagField)}
                  onKeyDown={e => { if (e.key === "Enter") lookupTag(tagField); }}
                />
                <button
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "1px solid rgba(14,38,70,0.10)" }}
                  onClick={() => showToast("info", "Connect EID wand to scan")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                    <rect x="4" y="2" width="1.5" height="12" rx="0.5" fill="#0E2646" opacity="0.6" />
                    <rect x="7" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                    <rect x="10.5" y="1" width="1.5" height="14" rx="0.5" fill="#0E2646" opacity="0.6" />
                    <rect x="13" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                  </svg>
                </button>
              </div>

              {/* Match indicators */}
              {isMatched && matchedAnimal && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: "#55BAAA" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>
                    Tag {matchedAnimal.tag} — {matchedAnimal.tag_color || ""} {matchedAnimal.type || matchedAnimal.sex} {matchedAnimal.year_born || ""}
                  </span>
                </div>
              )}
              {isDuplicate && (
                <div className="rounded-lg px-3 py-2 mt-1" style={{ backgroundColor: "rgba(243,209,42,0.12)", border: "1px solid rgba(243,209,42,0.30)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#B8960F" }}>Already in project · View record</span>
                </div>
              )}
              {tagField.length >= 3 && !isMatched && !isDuplicate && matchedAnimal === null && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: "#E87461" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#E87461" }}>No match found</span>
                </div>
              )}
            </div>

            {/* Cow History Panel */}
            {isMatched && matchedAnimal && (
              <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                <button
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#55BAAA" }}>{matchedAnimal.tag}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.50)" }}>· {matchedAnimal.type || matchedAnimal.sex} · {matchedAnimal.year_born || ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>History</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {historyOpen && (
                  <div style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
                    <div className="flex px-3" style={{ borderBottom: "1px solid rgba(212,212,208,0.40)" }}>
                      {(["info", "calving", "history"] as const).map(t => (
                        <button
                          key={t}
                          className="py-2 cursor-pointer relative mr-4"
                          style={{
                            fontSize: 12,
                            fontWeight: historyTab === t ? 700 : 500,
                            color: historyTab === t ? "#0E2646" : "rgba(26,26,26,0.40)",
                            background: "none", border: "none",
                          }}
                          onClick={() => setHistoryTab(t)}
                        >
                          {t === "info" ? "Info" : t === "calving" ? "Calving" : "History"}
                          {historyTab === t && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Info sub-tab */}
                    {historyTab === "info" && (
                      <div className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {[
                            ["TYPE", matchedAnimal.type || "—"],
                            ["BREED", matchedAnimal.breed || "—"],
                            ["YEAR", matchedAnimal.year_born || "—"],
                            ["SEX", matchedAnimal.sex || "—"],
                            ["STATUS", matchedAnimal.status || "—"],
                            ["TAG COLOR", matchedAnimal.tag_color || "—"],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calving sub-tab */}
                    {historyTab === "calving" && (
                      <div className="px-3 py-3 space-y-2">
                        {(animalCalvings || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 12 }}>No calving records</div>
                        ) : (
                          (animalCalvings || []).map(c => (
                            <div key={c.id} className="rounded-xl px-3 py-3 bg-[#0E2646]">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Calf {(c.calf as any)?.tag || "—"}</span>
                                <span className="rounded-full" style={{
                                  fontSize: 9, fontWeight: 700, padding: "2px 8px",
                                  backgroundColor: c.calf_sex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                                  color: c.calf_sex === "Bull" ? "#55BAAA" : "#E8A0BF",
                                }}>{c.calf_sex || "—"}</span>
                                <span className="ml-auto" style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>
                                  {new Date(c.calving_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                              {c.birth_weight && (
                                <div className="flex gap-2 mt-1.5">
                                  <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(240,240,240,0.08)", color: "rgba(240,240,240,0.60)" }}>
                                    {c.birth_weight} lbs
                                  </span>
                                </div>
                              )}
                              {c.memo && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>{c.memo}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* History sub-tab */}
                    {historyTab === "history" && (
                      <div className="px-3 py-3 space-y-0">
                        {(animalWork || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 12 }}>No work history</div>
                        ) : (
                          (animalWork || []).map(w => (
                            <div key={w.id} className="py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{(w.project as any)?.name || "—"}</span>
                                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                                  {new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1">
                                {w.weight && (
                                  <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>
                                    {w.weight} lbs
                                  </span>
                                )}
                                {w.preg_stage && <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>Preg: {w.preg_stage}</span>}
                              </div>
                              {w.memo && <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 2 }}>{w.memo}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PREG fields — only for PREG projects */}
            {projectType === "PREG" && (
              <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                <div style={SUB_LABEL}>PREG CHECK</div>
                <FormFieldRow label="Preg">
                  <select value={pregResult} onChange={e => setPregResult(e.target.value)} className={INPUT_CLS}>
                    <option value="" disabled>Select…</option>
                    <option>Confirmed</option><option>Open</option><option>Suspect</option><option>First Calf Heifer</option>
                  </select>
                </FormFieldRow>
                <FormFieldRow label="Days Gest.">
                  <input type="number" value={pregDays} onChange={e => setPregDays(e.target.value)} placeholder="0" className={INPUT_CLS} />
                </FormFieldRow>
                <FormFieldRow label="Calf Sex">
                  <select value={calfSex} onChange={e => setCalfSex(e.target.value)} className={INPUT_CLS}>
                    <option value="" disabled>Select…</option>
                    {PREG_CALF_SEX_OPTIONS.filter(o => o !== "None").map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </FormFieldRow>
              </div>
            )}

            {/* Optional fields */}
            <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={SUB_LABEL}>ADDITIONAL</div>
              <FormFieldRow label="Weight">
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="lbs" className={INPUT_CLS} />
              </FormFieldRow>
              <FormFieldRow label="Quick Note">
                <input type="text" value={quickNote} onChange={e => setQuickNote(e.target.value)} placeholder="Select or type…" className={INPUT_CLS} />
              </FormFieldRow>
              <FormFieldRow label="Sample ID">
                <input type="text" value={sampleId} onChange={e => setSampleId(e.target.value)} placeholder="DNA/sample ID" className={INPUT_CLS} />
              </FormFieldRow>
              <div className="pt-2">
                <div style={{ ...SUB_LABEL, marginBottom: 6 }}>MEMO</div>
                <textarea
                  value={memo} onChange={e => setMemo(e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                  style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
                />
              </div>
            </div>

            {/* Products given — placeholder for now */}
            <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase" }}>PRODUCTS GIVEN</span>
                <span className="cursor-pointer" style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA" }}>Edit</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>No products configured</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
                onClick={clearForm}
              >
                Reset
              </button>
              <button
                className="rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
                style={{ flex: 2, fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", opacity: saving ? 0.5 : 1 }}
                disabled={saving}
                onClick={saveAndNext}
              >
                {saving ? "Saving..." : "Save & Next"}
              </button>
            </div>
          </>
        )}

        {/* =================== ANIMALS WORKED TAB =================== */}
        {activeTab === "worked" && (
          <>
            <div style={SUB_LABEL}>
              ANIMALS WORKED · {worked.length}
            </div>
            <div className="space-y-2">
              {worked.map((a, i) => {
                const preg = a.preg_stage || "—";
                const pregColor = preg === "Confirmed" ? { bg: "rgba(85,186,170,0.15)", color: "#55BAAA" }
                  : preg === "Open" ? { bg: "rgba(232,116,97,0.15)", color: "#E87461" }
                    : { bg: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)" };
                const animalTag = (a.animal as any)?.tag || "Unknown";
                return (
                  <div key={a.id || i} className="rounded-xl px-3 py-3.5 bg-[#0E2646] cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => (a.animal as any)?.id && navigate("/animals/" + (a.animal as any).id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(240,240,240,0.90)" }}>{animalTag}</span>
                      </div>
                      <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: pregColor.bg, color: pregColor.color }}>
                        {preg}
                      </span>
                    </div>
                    {(a.weight || a.memo) && (
                      <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>
                        {a.weight && `${a.weight} lbs`}{a.weight && a.memo ? " · " : ""}{a.memo || ""}
                      </div>
                    )}
                  </div>
                );
              })}
              {worked.length === 0 && (
                <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 24 }}>No animals worked yet</div>
              )}
            </div>
          </>
        )}

        {/* =================== STATS TAB =================== */}
        {activeTab === "stats" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: worked.length, label: "WORKED" },
                { value: confirmedCount, label: "CONFIRMED" },
                { value: openCount, label: "OPEN" },
                { value: `${avgWeight} lbs`, label: "AVG WEIGHT" },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-3.5" style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Preg breakdown */}
            <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646", marginBottom: 12 }}>Preg Results</div>
              {[
                { label: "Confirmed", count: confirmedCount, color: "#55BAAA" },
                { label: "Open", count: openCount, color: "#E87461" },
                { label: "Suspect", count: suspectCount, color: "#F3D12A" },
              ].map(r => {
                const total = worked.length || 1;
                return (
                  <div key={r.label} className="flex items-center gap-3 mb-2">
                    <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: r.color }} />
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{r.label}</span>
                    <div className="rounded-full" style={{ flex: 2, height: 6, backgroundColor: "rgba(26,26,26,0.06)" }}>
                      <div className="rounded-full" style={{ height: 6, backgroundColor: r.color, width: `${(r.count / total) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", minWidth: 20, textAlign: "right" }}>{r.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== DETAILS TAB =================== */}
        {activeTab === "details" && (
          <div className="rounded-xl bg-white px-3 py-3.5 space-y-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={SUB_LABEL}>PROJECT DETAILS</div>
            {[
              ["Date", projectDate],
              ["Type", projectType],
              ["Group", projectGroup],
              ["Location", projectLocation],
              ["Status", projectStatus],
              ["Head Count", String(headCount)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 min-w-0">
                <span style={LABEL_STYLE}>{label}</span>
                <span style={{ fontSize: 14, color: "rgba(26,26,26,0.70)" }}>{value || "—"}</span>
              </div>
            ))}

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            <div style={SUB_LABEL}>PRODUCTS GIVEN</div>
            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products configured</div>

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            <div className="flex gap-2 flex-wrap">
              <button
                className="rounded-full px-4 py-2 border border-[#D4D4D0] cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", backgroundColor: "transparent" }}
              >Edit Project</button>
              <button
                className="rounded-full px-4 py-2 cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", backgroundColor: "#F3D12A", border: "none" }}
                onClick={() => navigate("/cow-work/" + id + "/close-out")}
              >Close Out</button>
              <button
                className="rounded-full px-4 py-2 cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 13, color: "rgba(212,24,61,0.60)", border: "1px solid rgba(212,24,61,0.20)", backgroundColor: "transparent" }}
              >Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
