import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnimal } from "@/hooks/useAnimals";
import { useQueryClient } from "@tanstack/react-query";
import { useOperation } from "@/contexts/OperationContext";
import FlagIcon from "../components/FlagIcon";
import CollapsibleSection from "../components/CollapsibleSection";
import { useChuteSideToast } from "../components/ToastContext";
import {
  FLAG_OPTIONS,
  TAG_COLOR_OPTIONS,
  TAG_COLOR_HEX,
  SEX_OPTIONS,
  ANIMAL_TYPE_OPTIONS,
  YEAR_OPTIONS,
  STATUS_OPTIONS,
  QUICK_NOTES,
  type FlagColor,
} from "@/lib/constants";
import { LABEL_STYLE, INPUT_BASE, INPUT_READONLY, focusGold, blurReset } from "@/lib/styles";

const quickNoteLabels = QUICK_NOTES.map((n) => n.label);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const assistanceLabel = (v: number | null) => {
  if (!v || v === 1) return "None";
  if (v === 2) return "Easy Pull";
  if (v === 3) return "Hard Pull";
  if (v === 4) return "C-Section";
  return "";
};

export default function AnimalDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { operationId } = useOperation();
  const { data: animal, isLoading } = useAnimal(id);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Queries ──
  const { data: calvingRecords } = useQuery({
    queryKey: ["animal-calvings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calving_records")
        .select("*")
        .eq("dam_id", id!)
        .eq("operation_id", operationId)
        .order("calving_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: workRecords } = useQuery({
    queryKey: ["animal-work", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cow_work")
        .select("*, project:projects(name)")
        .eq("animal_id", id!)
        .eq("operation_id", operationId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: flags } = useQuery({
    queryKey: ["animal-flags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animal_flags")
        .select("*")
        .eq("animal_id", id!)
        .eq("operation_id", operationId)
        .is("resolved_at", null);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: idHistoryRecords } = useQuery({
    queryKey: ["animal-id-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("id_history")
        .select("*")
        .eq("animal_id", id!)
        .eq("operation_id", operationId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ── Local edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [fields, setFields] = useState({
    tag: "",
    tagColor: "",
    sex: "",
    animalType: "",
    yearBorn: "",
    status: "",
    eid: "",
    eid2: "",
    breed: "",
    lifetimeId: "",
  });
  const [memo, setMemo] = useState("");
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync from animal data
  useEffect(() => {
    if (animal && !initialized) {
      setFields({
        tag: animal.tag || "",
        tagColor: animal.tag_color || "None",
        sex: animal.sex || "",
        animalType: animal.type || "",
        yearBorn: animal.year_born ? String(animal.year_born) : "",
        status: animal.status || "Active",
        eid: animal.eid || "",
        eid2: animal.eid2 || "",
        breed: animal.breed || "",
        lifetimeId: animal.lifetime_id || "",
      });
      setMemo(animal.memo || "");
      setSelectedQuickNotes(animal.quick_notes || []);
      setInitialized(true);
    }
  }, [animal, initialized]);

  const [originalFields, setOriginalFields] = useState(fields);
  const [originalMemo, setOriginalMemo] = useState(memo);

  useEffect(() => {
    if (initialized && !isEditing) {
      setOriginalFields({ ...fields });
      setOriginalMemo(memo);
    }
  }, [initialized]);

  const update = (key: keyof typeof fields) => (val: string) => setFields((prev) => ({ ...prev, [key]: val }));

  const handleCancel = () => {
    setFields({ ...originalFields });
    setMemo(originalMemo);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!fields.tag.trim()) {
      showToast("error", "Tag is required");
      return;
    }
    try {
      const { error } = await supabase
        .from("animals")
        .update({
          tag: fields.tag.trim(),
          tag_color: fields.tagColor === "None" ? null : fields.tagColor,
          sex: fields.sex,
          type: fields.animalType || null,
          year_born: fields.yearBorn ? parseInt(fields.yearBorn) : null,
          status: fields.status,
          eid: fields.eid.trim() || null,
          eid2: fields.eid2.trim() || null,
          breed: fields.breed.trim() || null,
          lifetime_id: fields.lifetimeId.trim() || null,
          memo: memo.trim() || null,
          quick_notes: selectedQuickNotes.length > 0 ? selectedQuickNotes : null,
        })
        .eq("id", id)
        .eq("operation_id", operationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["animal", id] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["animal-counts"] });
      setOriginalFields({ ...fields });
      setOriginalMemo(memo);
      showToast("success", `Animal ${fields.tag.trim()} saved`);
      setIsEditing(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    }
  };

  const toggleQuickNote = (note: string) => {
    if (!isEditing) return;
    setSelectedQuickNotes((prev) => (prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]));
  };

  // ── Flag display ──
  const activeFlag = flags?.[0];
  const flagColor = activeFlag ? (activeFlag.flag_tier as FlagColor) : null;
  const flagLabel = flagColor ? FLAG_OPTIONS.find((f) => f.color === flagColor)?.label : null;
  const flagHex = flagColor ? FLAG_OPTIONS.find((f) => f.color === flagColor)?.hex : null;

  const displayedNotes = selectedQuickNotes.slice(0, 3);
  const moreCount = selectedQuickNotes.length - 3;

  // ── Derived history arrays ──
  const calvingHistory = (calvingRecords || []).map((c) => ({
    date: fmtDate(c.calving_date),
    calfTag: c.calf_tag || "(no tag)",
    calfSex: c.calf_sex || "Unknown",
    birthWeight: c.birth_weight ? `${c.birth_weight} lbs` : "",
    calfSize: c.calf_size,
    assistance: assistanceLabel(c.assistance),
    notes: c.memo || "",
  }));

  const workHistory = (workRecords || []).map((w) => ({
    date: fmtDate(w.date),
    project: (w.project as any)?.name || "Work Record",
    weight: w.weight ? String(w.weight) : "",
    preg: w.preg_stage || null,
    memo: w.memo || "",
  }));

  // Weight history derived from work records that have weight
  const weightHistory = (workRecords || [])
    .filter((w) => w.weight)
    .map((w) => ({
      weight: String(w.weight),
      date: fmtDate(w.date),
      project: (w.project as any)?.name || "Work Record",
      note: "",
    }));

  const idHistory = (idHistoryRecords || []).map((h) => ({
    field: h.field_name,
    oldNew: h.old_value ? `${h.old_value} → ${h.new_value}` : `Set to ${h.new_value}`,
    date: h.changed_at ? fmtDate(h.changed_at) : "",
    changedBy: "",
  }));

  /* ── Field row helper ── */
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
      <span style={{ ...LABEL_STYLE, paddingTop: 8 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {children}
      </div>
    </div>
  );

  const TextInput = ({
    value,
    onChange,
    placeholder,
    readOnly,
  }: {
    value: string;
    onChange?: (v: string) => void;
    placeholder?: string;
    readOnly?: boolean;
  }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly || !isEditing}
      style={readOnly || !isEditing ? INPUT_READONLY : INPUT_BASE}
      onFocus={(e) => {
        if (isEditing) {
          e.currentTarget.style.borderColor = "#F3D12A";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#D4D4D0";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );

  const SelectInput = ({
    value,
    options,
    onChange,
    disabled,
  }: {
    value: string;
    options: readonly string[];
    onChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled || !isEditing}
      style={{
        ...(disabled || !isEditing ? INPUT_READONLY : INPUT_BASE),
        appearance: "auto" as const,
      }}
      onFocus={(e) => {
        if (isEditing) {
          e.currentTarget.style.borderColor = "#F3D12A";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#D4D4D0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );

  const NavyCard = ({ children }: { children: React.ReactNode }) => (
    <div style={{ borderRadius: 12, padding: "14px 16px", backgroundColor: "#0E2646" }}>{children}</div>
  );

  const Badge = ({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span
      style={{
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        backgroundColor: "rgba(240,240,240,0.08)",
        color: "rgba(240,240,240,0.60)",
        ...s,
      }}
    >
      {children}
    </span>
  );

  /* ═══════ LOADING ═══════ */
  if (isLoading || !animal) {
    return (
      <div className="px-4 py-10 flex items-center justify-center">
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #D4D4D0",
            borderTopColor: "#0E2646",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══════ RENDER ═══════ */
  return (
    <div className="px-4 space-y-0 pb-10">
      {/* 1 — GRADIENT HEADER CARD */}
      <div
        style={{
          borderRadius: 16,
          padding: "20px",
          background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }} className="space-y-1.5">
            <div style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {fields.tag}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 9999,
                  backgroundColor: TAG_COLOR_HEX[fields.tagColor] || "#ccc",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.45)" }}>
                {fields.tagColor} · {fields.sex} · {fields.animalType} · {fields.yearBorn}
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#A8E6DA" }}>{fields.status}</div>
            {selectedQuickNotes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 2 }}>
                {displayedNotes.map((n) => (
                  <span
                    key={n}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.10)",
                      color: "rgba(240,240,240,0.80)",
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 9999,
                      padding: "2px 8px",
                    }}
                  >
                    {n}
                  </span>
                ))}
                {moreCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(240,240,240,0.40)" }}>+{moreCount}</span>
                )}
              </div>
            )}
          </div>
          {flagColor && flagHex && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <FlagIcon color={flagColor} size="md" />
              <span style={{ fontSize: 9, fontWeight: 600, color: flagHex }}>{flagLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2 — TAB BAR */}
      <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
        {(["details", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === tab ? "#0E2646" : "transparent",
              color: activeTab === tab ? "white" : "rgba(26,26,26,0.40)",
              border: `1px solid ${activeTab === tab ? "transparent" : "#D4D4D0"}`,
              borderRadius: tab === "details" ? "10px 0 0 10px" : "0 10px 10px 0",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══ DETAILS TAB ═══ */}
      {activeTab === "details" && (
        <div className="space-y-3" style={{ paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  type="button"
                  style={{
                    padding: "6px 16px",
                    borderRadius: 9999,
                    border: "1px solid #D4D4D0",
                    backgroundColor: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(26,26,26,0.55)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  type="button"
                  style={{
                    padding: "6px 16px",
                    borderRadius: 9999,
                    border: "none",
                    backgroundColor: "#F3D12A",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1A1A1A",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                type="button"
                style={{
                  padding: "6px 16px",
                  borderRadius: 9999,
                  border: "1px solid #D4D4D0",
                  backgroundColor: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0E2646",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            )}
          </div>

          <CollapsibleSection title="Identity" defaultOpen>
            <div className="space-y-2">
              <FieldRow label="Tag">
                <TextInput value={fields.tag} onChange={update("tag")} />
              </FieldRow>
              <FieldRow label="Tag Color">
                <SelectInput value={fields.tagColor} options={TAG_COLOR_OPTIONS} onChange={update("tagColor")} />
              </FieldRow>
              <FieldRow label="Sex">
                <SelectInput value={fields.sex} options={SEX_OPTIONS} onChange={update("sex")} />
              </FieldRow>
              <FieldRow label="Type">
                <SelectInput value={fields.animalType} options={ANIMAL_TYPE_OPTIONS} onChange={update("animalType")} />
              </FieldRow>
              <FieldRow label="Year Born">
                <SelectInput value={fields.yearBorn} options={YEAR_OPTIONS} onChange={update("yearBorn")} />
              </FieldRow>
              <FieldRow label="Status">
                <SelectInput value={fields.status} options={STATUS_OPTIONS} onChange={update("status")} />
              </FieldRow>
              <FieldRow label="Breed">
                <TextInput value={fields.breed} onChange={update("breed")} />
              </FieldRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="IDs">
            <div className="space-y-2">
              <FieldRow label="EID">
                <TextInput value={fields.eid} onChange={update("eid")} />
              </FieldRow>
              <FieldRow label="EID 2">
                <TextInput value={fields.eid2} onChange={update("eid2")} placeholder="—" />
              </FieldRow>
              <FieldRow label="Lifetime ID">
                <TextInput value={fields.lifetimeId} readOnly />
              </FieldRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Quick Notes">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {quickNoteLabels.map((note) => {
                const active = selectedQuickNotes.includes(note);
                return (
                  <button
                    key={note}
                    onClick={() => toggleQuickNote(note)}
                    type="button"
                    style={{
                      borderRadius: 9999,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: active ? "2px solid #0E2646" : "1px solid #D4D4D0",
                      backgroundColor: active ? "#0E2646" : "white",
                      color: active ? "white" : "rgba(26,26,26,0.55)",
                      cursor: isEditing ? "pointer" : "default",
                      opacity: isEditing ? 1 : 0.7,
                    }}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Memo">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              readOnly={!isEditing}
              placeholder="Notes about this animal…"
              style={{
                width: "100%",
                minHeight: 80,
                resize: "none",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #D4D4D0",
                backgroundColor: isEditing ? "#FFFFFF" : "#F3F3F5",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                if (isEditing) focusGold(e);
              }}
              onBlur={blurReset}
            />
          </CollapsibleSection>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div className="space-y-3" style={{ paddingTop: 10 }}>
          {/* Calving History */}
          <CollapsibleSection title="Calving History" defaultOpen>
            <div className="space-y-2">
              {calvingHistory.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: 8 }}>No calving records</div>
              )}
              {calvingHistory.map((c, i) => (
                <NavyCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{c.calfTag}</span>
                      <Badge
                        style={{
                          backgroundColor: c.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                          color: c.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                        }}
                      >
                        {c.calfSex}
                      </Badge>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{c.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{c.birthWeight}</span>
                    {c.assistance !== "None" && (
                      <>
                        <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontSize: 11, color: "rgba(243,209,42,0.70)" }}>{c.assistance}</span>
                      </>
                    )}
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>{c.notes}</div>
                  )}
                </NavyCard>
              ))}
            </div>
          </CollapsibleSection>

          {/* Cow Work History */}
          <CollapsibleSection title="Cow Work History">
            <div className="space-y-2">
              {workHistory.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: 8 }}>No work records</div>
              )}
              {workHistory.map((w, i) => (
                <NavyCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{w.project}</span>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{w.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {w.weight && <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{w.weight} lbs</span>}
                    {w.preg && (
                      <>
                        <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontSize: 11, color: "#55BAAA" }}>{w.preg}</span>
                      </>
                    )}
                  </div>
                  {w.memo && (
                    <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>{w.memo}</div>
                  )}
                </NavyCard>
              ))}
            </div>
          </CollapsibleSection>

          {/* Weight History */}
          <CollapsibleSection title="Weight History">
            <div className="space-y-2">
              {weightHistory.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: 8 }}>No weight records</div>
              )}
              {weightHistory.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: i < weightHistory.length - 1 ? "1px solid rgba(212,212,208,0.40)" : "none",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{w.weight} lbs</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.55)" }}>{w.project}</div>
                    <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)" }}>{w.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ID History */}
          <CollapsibleSection title="ID History">
            <div className="space-y-2">
              {idHistory.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: 8 }}>No ID changes</div>
              )}
              {idHistory.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < idHistory.length - 1 ? "1px solid rgba(212,212,208,0.40)" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{h.field}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.50)" }}>{h.oldNew}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{h.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
