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
  const { data: animal, isLoading, isError } = useAnimal(id);
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

  const { data: resolvedFlags } = useQuery({
    queryKey: ["animal-flags-resolved", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animal_flags")
        .select("*")
        .eq("animal_id", id!)
        .eq("operation_id", operationId)
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false });
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

  // ── Pedigree query — resolve sire + dam from sire_id / dam_id ──
  const { data: pedigree } = useQuery({
    queryKey: ["animal-pedigree", id, animal?.sire_id, animal?.dam_id],
    queryFn: async () => {
      if (!animal) return null;
      const ids = [animal.sire_id, animal.dam_id].filter(Boolean) as string[];
      if (!ids.length) return null;
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, tag_color, year_born, type, sex, name, reg_name, reg_number, characteristics, lifetime_id")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, typeof data[0]> = {};
      (data || []).forEach(a => { map[a.id] = a; });
      return {
        sire: animal.sire_id ? map[animal.sire_id] || null : null,
        dam:  animal.dam_id  ? map[animal.dam_id]  || null : null,
      };
    },
    enabled: !!animal && !!(animal.sire_id || animal.dam_id),
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
    regName: "",
    regNumber: "",
  });
  const [memo, setMemo] = useState("");
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ── Flag management state ──
  const [resolvingFlagId, setResolvingFlagId] = useState<string | null>(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [showAddFlag, setShowAddFlag] = useState(false);
  const [newFlagTier, setNewFlagTier] = useState<"management" | "production" | "cull">("management");
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagNote, setNewFlagNote] = useState("");
  const [addFlagLoading, setAddFlagLoading] = useState(false);
  const [showResolvedFlags, setShowResolvedFlags] = useState(false);

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
        regName: animal.reg_name || "",
        regNumber: animal.reg_number || "",
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
          reg_name: fields.regName.trim() || null,
          reg_number: fields.regNumber.trim() || null,
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
  const tierToColor: Record<string, FlagColor> = { management: "teal", production: "gold", cull: "red" };
  const tierToHex: Record<string, string> = { management: "#55BAAA", production: "#F3D12A", cull: "#9B2335" };
  const tierLabel: Record<string, string> = { management: "Management", production: "Production", cull: "Cull" };
  const activeFlags = (flags || []).map((f: any) => ({
    id: f.id,
    color: tierToColor[f.flag_tier] || "teal" as FlagColor,
    hex: tierToHex[f.flag_tier] || "#55BAAA",
    name: f.flag_name || "",
    tier: f.flag_tier,
    note: f.flag_note || "",
    date: f.created_at ? fmtDate(f.created_at) : "",
  }));
  const resolvedFlagsList = (resolvedFlags || []).map((f: any) => ({
    id: f.id,
    color: tierToColor[f.flag_tier] || "teal" as FlagColor,
    hex: tierToHex[f.flag_tier] || "#55BAAA",
    name: f.flag_name || "",
    tier: f.flag_tier,
    note: f.flag_note || "",
    date: f.created_at ? fmtDate(f.created_at) : "",
    resolvedDate: f.resolved_at ? fmtDate(f.resolved_at) : "",
  }));
  // Keep legacy single-flag references for the header icon
  const flagColor = activeFlags.length > 0 ? activeFlags[0].color : null;
  const flagHex = activeFlags.length > 0 ? activeFlags[0].hex : null;

  const displayedNotes = selectedQuickNotes.slice(0, 3);
  const moreCount = selectedQuickNotes.length - 3;

  // ── Flag action handlers ──
  const handleResolveFlag = async (flagId: string) => {
    setResolvingLoading(true);
    try {
      const { error } = await supabase
        .from("animal_flags")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", flagId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["animal-flags", id] });
      queryClient.invalidateQueries({ queryKey: ["animal-flags-resolved", id] });
      showToast("success", "Flag resolved");
    } catch (err: any) {
      showToast("error", err.message || "Failed to resolve flag");
    } finally {
      setResolvingLoading(false);
      setResolvingFlagId(null);
    }
  };

  const handleAddFlag = async () => {
    if (!newFlagName.trim()) {
      showToast("error", "Flag name is required");
      return;
    }
    setAddFlagLoading(true);
    try {
      const { error } = await supabase.from("animal_flags").insert({
        animal_id: id,
        operation_id: operationId,
        flag_tier: newFlagTier,
        flag_name: newFlagName.trim(),
        flag_note: newFlagNote.trim() || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["animal-flags", id] });
      showToast("success", `Flag "${newFlagName.trim()}" added`);
      setNewFlagTier("management");
      setNewFlagName("");
      setNewFlagNote("");
      setShowAddFlag(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to add flag");
    } finally {
      setAddFlagLoading(false);
    }
  };

  // Known flag names per tier for the Add Flag picker
  const FLAG_NAME_OPTIONS: Record<string, string[]> = {
    cull: ["Cull", "Cull Candidate", "Aggressive"],
    production: ["Bad Bag", "Bad Feet", "Lame", "Lump Jaw", "Bad Disposition", "Bad Mother", "Old", "Poor Calf", "Poor Condition", "Poor Udder"],
    management: ["Needs Tag", "Needs Treated", "Check Feet", "DNA"],
  };

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

  // BSE history — only for bulls
  const bseHistory = (workRecords || [])
    .filter((w) => w.pass_fail)
    .map((w) => ({
      date: fmtDate(w.date),
      project: (w.project as any)?.name || "BSE",
      scrotal: w.scrotal ? `${w.scrotal} cm` : null,
      motility: w.motility != null ? `${w.motility}%` : null,
      morphology: w.morphology != null ? `${w.morphology}%` : null,
      passFail: w.pass_fail,
      quality: w.quality || null,
      defects: (w.semen_defects || []).join(", ") || null,
      physicalDefects: w.physical_defects ? (w.physical_defects as string[]).join(", ") : null,
      memo: w.bse_memo || w.memo || "",
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
  if (isLoading) {
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

  if (isError || !animal) {
    return (
      <div className="px-4 py-10 flex flex-col items-center justify-center gap-3">
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Animal not found</p>
        <p style={{ fontSize: 13, color: "rgba(26,26,26,0.45)" }}>This record may have been removed or the link is invalid.</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#55BAAA",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Go Back
        </button>
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
          {activeFlags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {activeFlags.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <FlagIcon color={f.color} size="sm" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: f.hex }}>{f.name}</span>
                </div>
              ))}
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
              <FieldRow label="Reg Name">
                <TextInput value={fields.regName} onChange={update("regName")} placeholder="—" />
              </FieldRow>
              <FieldRow label="Reg Number">
                <TextInput value={fields.regNumber} onChange={update("regNumber")} placeholder="—" />
              </FieldRow>
            </div>
            {/* Breed Association Lookup Link */}
            {fields.regNumber && fields.breed && (
              <div style={{ marginTop: 10 }}>
                {(fields.breed === "Angus" || fields.breed === "Commercial Angus") && (
                  <a
                    href={`https://www.angus.org/Animal/EpdPedResults?PageRequest=BeefRecords.Services.Models.PageRequest&sRegistrationNumber=${fields.regNumber}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      backgroundColor: "rgba(14,38,70,0.04)", borderRadius: 10, textDecoration: "none",
                      border: "1px solid rgba(14,38,70,0.08)",
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}>Look up on AAA</span>
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>EPDs & Pedigree</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto" }}><path d="M5 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V9M8 1h5v5M13 1L6 8" stroke="#0E2646" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                )}
                {(fields.breed === "Hereford" || fields.breed === "Commercial Hereford") && (
                  <a
                    href="https://myherd.org/web/USHF/AnimalSearch/List"
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      backgroundColor: "rgba(123,45,59,0.04)", borderRadius: 10, textDecoration: "none",
                      border: "1px solid rgba(123,45,59,0.08)",
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#7B2D3B" }}>Look up on AHA</span>
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>MyHerd · #{fields.regNumber}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto" }}><path d="M5 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V9M8 1h5v5M13 1L6 8" stroke="#7B2D3B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* ── Pedigree Section ── */}
          {(pedigree?.sire || pedigree?.dam || (animal as any)?.characteristics?.dam_pedigree) && (
            <CollapsibleSection title="Pedigree">
              {/* Sire */}
              {pedigree?.sire && (() => {
                const s = pedigree.sire;
                const regLink = (s.characteristics as any)?.reg_link;
                const label = s.reg_name || s.name || s.tag;
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,26,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Sire</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <button
                        onClick={() => navigate(`/animals/${s.id}`)}
                        style={{ flex: 1, textAlign: "left", background: "rgba(14,38,70,0.03)", border: "1px solid rgba(14,38,70,0.10)", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{label}</div>
                        <div style={{ fontSize: 11, color: "rgba(26,26,26,0.5)", marginTop: 2 }}>
                          {[s.tag !== label && `Tag ${s.tag}`, s.reg_number && `Reg# ${s.reg_number}`, s.year_born && String(s.year_born)].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                      {regLink && (
                        <a href={regLink} target="_blank" rel="noopener noreferrer"
                          style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", background: "rgba(14,38,70,0.04)", border: "1px solid rgba(14,38,70,0.10)", borderRadius: 10, textDecoration: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V9M8 1h5v5M13 1L6 8" stroke="#0E2646" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#0E2646" }}>AAA</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Dam */}
              {pedigree?.dam && (() => {
                const d = pedigree.dam;
                const regLink = (d.characteristics as any)?.reg_link;
                const label = d.reg_name || d.name || d.tag;
                const damPedText = (animal as any)?.characteristics?.dam_pedigree as string | undefined;
                const damSire = (animal as any)?.characteristics?.dam_sire as string | undefined;
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,26,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Dam</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <button
                        onClick={() => navigate(`/animals/${d.id}`)}
                        style={{ flex: 1, textAlign: "left", background: "rgba(85,186,170,0.05)", border: "1px solid rgba(85,186,170,0.20)", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{label}</div>
                        <div style={{ fontSize: 11, color: "rgba(26,26,26,0.5)", marginTop: 2 }}>
                          {[d.tag !== label && `Tag ${d.tag}`, d.reg_number && `Reg# ${d.reg_number}`, d.year_born && String(d.year_born)].filter(Boolean).join(" · ")}
                        </div>
                        {damSire && (
                          <div style={{ fontSize: 11, color: "rgba(26,26,26,0.45)", marginTop: 3 }}>Sire of dam: {damSire}</div>
                        )}
                      </button>
                      {regLink && (
                        <a href={regLink} target="_blank" rel="noopener noreferrer"
                          style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", background: "rgba(85,186,170,0.06)", border: "1px solid rgba(85,186,170,0.20)", borderRadius: 10, textDecoration: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V9M8 1h5v5M13 1L6 8" stroke="#55BAAA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#55BAAA" }}>AAA</span>
                        </a>
                      )}
                    </div>
                    {/* Dam pedigree text string */}
                    {damPedText && (
                      <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(26,26,26,0.03)", borderRadius: 8, border: "1px solid rgba(26,26,26,0.07)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Dam Pedigree</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 0" }}>
                          {damPedText.split(",").map((name, i) => (
                            <span key={i} style={{ fontSize: 11, color: "rgba(26,26,26,0.6)" }}>
                              {name.trim()}{i < damPedText.split(",").length - 1 && <span style={{ color: "rgba(26,26,26,0.25)", margin: "0 4px" }}>›</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Dam pedigree text only (no dam animal linked) */}
              {!pedigree?.dam && (animal as any)?.characteristics?.dam_pedigree && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,26,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Dam Pedigree</div>
                  {(animal as any)?.characteristics?.dam_sire && (
                    <div style={{ fontSize: 12, color: "#0E2646", fontWeight: 600, marginBottom: 4 }}>Sire of dam: {(animal as any).characteristics.dam_sire}</div>
                  )}
                  <div style={{ padding: "8px 12px", background: "rgba(26,26,26,0.03)", borderRadius: 8, border: "1px solid rgba(26,26,26,0.07)", display: "flex", flexWrap: "wrap", gap: "4px 0" }}>
                    {((animal as any).characteristics.dam_pedigree as string).split(",").map((name: string, i: number, arr: string[]) => (
                      <span key={i} style={{ fontSize: 11, color: "rgba(26,26,26,0.6)" }}>
                        {name.trim()}{i < arr.length - 1 && <span style={{ color: "rgba(26,26,26,0.25)", margin: "0 4px" }}>›</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

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

          {/* ═══ FLAGS SECTION ═══ */}
          <CollapsibleSection title={`Flags${activeFlags.length > 0 ? ` (${activeFlags.length})` : ""}`} defaultOpen={activeFlags.length > 0}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeFlags.length === 0 && !showAddFlag && (
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: 8 }}>No active flags</div>
              )}

              {/* Active flag cards */}
              {activeFlags.map((f) => (
                <div key={f.id}>
                  {/* Flag card */}
                  {resolvingFlagId !== f.id && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: 10,
                        borderRadius: 8,
                        border: `1px solid ${f.hex}33`,
                        backgroundColor: `${f.hex}0D`,
                      }}
                    >
                      <FlagIcon color={f.color} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{f.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: f.hex, textTransform: "uppercase" }}>{tierLabel[f.tier]}</span>
                        </div>
                        {f.note && (
                          <div style={{ fontSize: 11, color: "rgba(26,26,26,0.55)", marginTop: 3, lineHeight: 1.4 }}>{f.note}</div>
                        )}
                        <div style={{ fontSize: 10, color: "rgba(26,26,26,0.35)", marginTop: 3 }}>{f.date}</div>
                      </div>
                      <button
                        onClick={() => setResolvingFlagId(f.id)}
                        type="button"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 9999,
                          border: "1px solid #D4D4D0",
                          backgroundColor: "white",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "rgba(26,26,26,0.55)",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        Resolve
                      </button>
                    </div>
                  )}

                  {/* Inline resolve confirmation (red-bordered card) */}
                  {resolvingFlagId === f.id && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        border: "2px solid #9B2335",
                        backgroundColor: "rgba(155,35,53,0.05)",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B2335", marginBottom: 8 }}>
                        Resolve "{f.name}" flag? This cannot be undone.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setResolvingFlagId(null)}
                          type="button"
                          style={{
                            padding: "5px 14px",
                            borderRadius: 9999,
                            border: "1px solid #D4D4D0",
                            backgroundColor: "white",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "rgba(26,26,26,0.55)",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleResolveFlag(f.id)}
                          disabled={resolvingLoading}
                          type="button"
                          style={{
                            padding: "5px 14px",
                            borderRadius: 9999,
                            border: "none",
                            backgroundColor: "#9B2335",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "white",
                            cursor: resolvingLoading ? "not-allowed" : "pointer",
                            opacity: resolvingLoading ? 0.6 : 1,
                          }}
                        >
                          {resolvingLoading ? "Resolving…" : "Resolve"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Resolved flags — collapsed toggle */}
              {resolvedFlagsList.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowResolvedFlags(!showResolvedFlags)}
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      padding: "6px 0",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(26,26,26,0.40)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ transform: showResolvedFlags ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", display: "inline-block" }}>▸</span>
                    Resolved ({resolvedFlagsList.length})
                  </button>
                  {showResolvedFlags && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      {resolvedFlagsList.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: 8,
                            borderRadius: 8,
                            border: "1px solid #E5E5E0",
                            backgroundColor: "#F9F9F6",
                            opacity: 0.65,
                          }}
                        >
                          <FlagIcon color={f.color} size="sm" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", textDecoration: "line-through" }}>{f.name}</span>
                            </div>
                            {f.note && (
                              <div style={{ fontSize: 11, color: "rgba(26,26,26,0.45)", marginTop: 2, lineHeight: 1.3 }}>{f.note}</div>
                            )}
                            <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)", marginTop: 2 }}>Resolved {f.resolvedDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add Flag section */}
              {!showAddFlag ? (
                <button
                  onClick={() => setShowAddFlag(true)}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "1px dashed #D4D4D0",
                    backgroundColor: "transparent",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(26,26,26,0.45)",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  + Add Flag
                </button>
              ) : (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #F3D12A",
                    backgroundColor: "rgba(243,209,42,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A" }}>New Flag</div>

                  {/* Tier picker pills */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["management", "production", "cull"] as const).map((tier) => {
                      const sel = newFlagTier === tier;
                      const hex = tierToHex[tier];
                      return (
                        <button
                          key={tier}
                          onClick={() => { setNewFlagTier(tier); setNewFlagName(""); }}
                          type="button"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 10px",
                            borderRadius: 9999,
                            border: sel ? `2px solid ${hex}` : "1px solid #D4D4D0",
                            backgroundColor: sel ? `${hex}18` : "white",
                            fontSize: 11,
                            fontWeight: 600,
                            color: sel ? hex : "rgba(26,26,26,0.55)",
                            cursor: "pointer",
                          }}
                        >
                          <FlagIcon color={tierToColor[tier]} size="sm" />
                          {tierLabel[tier]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Flag name pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(FLAG_NAME_OPTIONS[newFlagTier] || []).map((name) => {
                      const sel = newFlagName === name;
                      const hex = tierToHex[newFlagTier];
                      return (
                        <button
                          key={name}
                          onClick={() => setNewFlagName(name)}
                          type="button"
                          style={{
                            padding: "5px 12px",
                            borderRadius: 9999,
                            border: sel ? `2px solid ${hex}` : "1px solid #D4D4D0",
                            backgroundColor: sel ? hex : "white",
                            fontSize: 11,
                            fontWeight: 600,
                            color: sel ? "white" : "rgba(26,26,26,0.55)",
                            cursor: "pointer",
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Note field */}
                  <textarea
                    value={newFlagNote}
                    onChange={(e) => setNewFlagNote(e.target.value)}
                    placeholder="Note (optional)"
                    style={{
                      width: "100%",
                      minHeight: 50,
                      resize: "none",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 16,
                      border: "1px solid #D4D4D0",
                      backgroundColor: "#FFFFFF",
                      outline: "none",
                      boxSizing: "border-box" as const,
                    }}
                    onFocus={focusGold}
                    onBlur={blurReset}
                  />

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => { setShowAddFlag(false); setNewFlagTier("management"); setNewFlagName(""); setNewFlagNote(""); }}
                      type="button"
                      style={{
                        padding: "6px 14px",
                        borderRadius: 9999,
                        border: "1px solid #D4D4D0",
                        backgroundColor: "white",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(26,26,26,0.55)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFlag}
                      disabled={addFlagLoading || !newFlagName.trim()}
                      type="button"
                      style={{
                        padding: "6px 14px",
                        borderRadius: 9999,
                        border: "none",
                        backgroundColor: !newFlagName.trim() ? "#D4D4D0" : "#0E2646",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "white",
                        cursor: addFlagLoading || !newFlagName.trim() ? "not-allowed" : "pointer",
                        opacity: addFlagLoading ? 0.6 : 1,
                      }}
                    >
                      {addFlagLoading ? "Saving…" : "Add Flag"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}
      {activeTab === "history" && (
        <div className="space-y-3" style={{ paddingTop: 10 }}>
          {/* Calving History — not shown for bulls */}
          {fields.animalType !== "Bull" && (
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
          )}

          {/* BSE History — bulls only, shown prominently */}
          {fields.animalType === "Bull" && bseHistory.length > 0 && (
          <CollapsibleSection title="BSE History" defaultOpen>
            <div className="space-y-2">
              {bseHistory.map((b, i) => {
                const pfColor: Record<string, { bg: string; color: string }> = {
                  Pass: { bg: "rgba(85,186,170,0.20)", color: "#55BAAA" },
                  Fail: { bg: "rgba(231,76,60,0.20)", color: "#E74C3C" },
                  Marginal: { bg: "rgba(243,209,42,0.25)", color: "#F3D12A" },
                  "Permanent Fail": { bg: "rgba(231,76,60,0.30)", color: "#E74C3C" },
                };
                const pfc = pfColor[b.passFail] || pfColor.Pass;
                return (
                  <NavyCard key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge style={{ backgroundColor: pfc.bg, color: pfc.color, fontWeight: 700 }}>{b.passFail}</Badge>
                        {b.quality && <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{b.quality}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{b.date}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                      {b.scrotal && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1 }}>{b.scrotal}</span>
                          <span style={{ fontSize: 8, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>SCROTAL</span>
                        </div>
                      )}
                      {b.motility && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1 }}>{b.motility}</span>
                          <span style={{ fontSize: 8, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>MOTILITY</span>
                        </div>
                      )}
                      {b.morphology && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1 }}>{b.morphology}</span>
                          <span style={{ fontSize: 8, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>MORPHOLOGY</span>
                        </div>
                      )}
                    </div>
                    {b.defects && (
                      <div style={{ fontSize: 10, color: "rgba(243,209,42,0.70)", marginTop: 6 }}>Defects: {b.defects}</div>
                    )}
                    {b.physicalDefects && (
                      <div style={{ fontSize: 10, color: "rgba(231,76,60,0.70)", marginTop: 2 }}>Physical: {b.physicalDefects}</div>
                    )}
                    {b.memo && (
                      <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>{b.memo}</div>
                    )}
                    <div style={{ fontSize: 9, color: "rgba(240,240,240,0.20)", marginTop: 4 }}>{b.project}</div>
                  </NavyCard>
                );
              })}
            </div>
          </CollapsibleSection>
          )}

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
