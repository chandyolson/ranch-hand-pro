import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useGroups } from "@/hooks/useGroups";
import { useLocations } from "@/hooks/useLocations";
import { useChuteSideToast } from "@/components/ToastContext";
import FieldRow from "@/components/calving/FieldRow";
import CollapsibleQuickNotes from "@/components/CollapsibleQuickNotes";
import SegmentedToggle from "@/components/calving/SegmentedToggle";
import PillScore from "@/components/calving/PillScore";
import AnimalLookup from "@/components/AnimalLookup";
import { useOperationPreferences, generateCalfTag, incrementCalfTagSeq } from "@/hooks/useOperationPreferences";
import TraitPair from "@/components/calving/TraitPair";
import { TRAIT_LABELS, QUICK_NOTES, QUICK_NOTE_PILL_COLORS, DEATH_REASONS, GRAFT_REASONS } from "@/lib/constants";
import { TAG_COLOR_OPTIONS, TAG_COLOR_HEX } from "@/lib/constants";

// ── Input style constant ──
const IS: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 36,
  borderRadius: 8,
  border: "1px solid #D4D4D0",
  paddingLeft: 12,
  paddingRight: 12,
  fontFamily: "'Inter', sans-serif",
  fontSize: 16,
  fontWeight: 400,
  color: "#1A1A1A",
  outline: "none",
  backgroundColor: "#FFFFFF",
  boxSizing: "border-box" as const,
};

// ── Collapsible section (local, not exported) ──
function Collapsible({
  title,
  badge,
  defaultOpen,
  collapsedContent,
  children,
}: {
  title: string;
  badge?: string | null;
  defaultOpen?: boolean;
  collapsedContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "9px 14px",
          cursor: "pointer",
          background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
          border: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>{title}</span>
          {badge != null && <span style={{ fontSize: 11, fontWeight: 700, color: "#F3D12A" }}>{badge}</span>}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="rgba(255,255,255,0.50)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {!open && collapsedContent && (
        <div style={{ padding: "8px 12px 10px", backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)", borderTop: "none", borderRadius: "0 0 12px 12px" }}>{collapsedContent}</div>
      )}
      {open && (
        <div style={{ padding: "8px 12px 12px", backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)", borderTop: "none", borderRadius: "0 0 12px 12px" }}>{children}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Main Screen ──
// ══════════════════════════════════════════════

export default function CalvingNewScreen() {
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Preferences
  const { data: prefs } = useOperationPreferences();

  // Context
  const [contextOpen, setContextOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [groupId, setGroupId] = useState(localStorage.getItem("cs_last_calving_group") || "");
  const [locationId, setLocationId] = useState(localStorage.getItem("cs_last_calving_location") || "");
  const { data: groups } = useGroups();
  const { data: locations } = useLocations();

  // Dam
  const [damTag, setDamTag] = useState("");
  const [selectedDamId, setSelectedDamId] = useState<string | null>(null);
  const [showDam, setShowDam] = useState(false);
  const [damFullHistory, setDamFullHistory] = useState(false);
  const [damHistoryTab, setDamHistoryTab] = useState("info");

  // Quick-Add Dam
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTag, setQuickAddTag] = useState("");
  const [quickAddColor, setQuickAddColor] = useState("None");
  const [quickAddYear, setQuickAddYear] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Calf
  const [calfTag, setCalfTag] = useState("");
  const [calfStatus, setCalfStatus] = useState("Alive");
  const [calfSex, setCalfSex] = useState("");
  const [calfColor, setCalfColor] = useState("Yellow");
  const [birthWeight, setBirthWeight] = useState("");
  const [calfSize, setCalfSize] = useState("3");

  // Sire
  const [sireTag, setSireTag] = useState("");
  const [selectedSireId, setSelectedSireId] = useState<string | null>(null);

  // Twin
  const [isTwin, setIsTwin] = useState(false);
  const [twin, setTwin] = useState({ tag: "", sex: "", weight: "", size: "3" });

  // Graft
  const [isGraft, setIsGraft] = useState(false);
  const [graftDam, setGraftDam] = useState("");
  const [graftReason, setGraftReason] = useState("");

  // Death
  const [deathReason, setDeathReason] = useState("");
  const [deathNotes, setDeathNotes] = useState("");

  // Details
  const [vigor, setVigor] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Cow traits
  const [cowTraits, setCowTraits] = useState({
    assistance: "1",
    disposition: "",
    udder: "",
    teat: "",
    claw: "",
    foot: "",
    mothering: "",
  });
  const [showUdderTeat] = useState(true);
  const [showClawFoot] = useState(true);

  // ── Dam lookup queries ──
  const { data: damLookup } = useQuery({
    queryKey: ["dam-lookup", selectedDamId, operationId],
    queryFn: async () => {
      if (!selectedDamId) return null;
      const { data } = await supabase
        .from("animals")
        .select("*")
        .eq("operation_id", operationId)
        .eq("id", selectedDamId)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedDamId,
  });

  const { data: damCalvings } = useQuery({
    queryKey: ["dam-calvings", damLookup?.id],
    queryFn: async () => {
      if (!damLookup?.id) return [];
      const { data } = await supabase
        .from("calving_records")
        .select("*")
        .eq("dam_id", damLookup.id)
        .eq("operation_id", operationId)
        .order("calving_date", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!damLookup?.id,
  });

  const { data: damFlags } = useQuery({
    queryKey: ["dam-flags", damLookup?.id, operationId],
    queryFn: async () => {
      if (!damLookup?.id) return [];
      const { data } = await supabase
        .from("animal_flags")
        .select("*")
        .eq("animal_id", damLookup.id)
        .eq("operation_id", operationId)
        .is("resolved_at", null);
      return data || [];
    },
    enabled: !!damLookup?.id,
  });

  const { data: damWork } = useQuery({
    queryKey: ["dam-work", damLookup?.id],
    queryFn: async () => {
      if (!damLookup?.id) return [];
      // Step 1: fetch cow_work records
      const { data: cwRows } = await supabase
        .from("cow_work")
        .select("*")
        .eq("animal_id", damLookup.id)
        .eq("operation_id", operationId)
        .order("date", { ascending: false })
        .limit(20);
      if (!cwRows || cwRows.length === 0) return [];
      // Step 2: fetch projects to get work type code
      const projectIds = [...new Set(cwRows.filter(r => r.project_id).map(r => r.project_id!))];
      let projectMap = new Map<string, any>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, date, primary_work_type_id, work_types:project_work_types(work_type:work_types(code))")
          .in("id", projectIds);
        (projects || []).forEach(p => projectMap.set(p.id, p));
      }
      // Step 3: fetch sire tags for breeding_sire_id
      const sireIds = [...new Set(cwRows.filter(r => r.breeding_sire_id).map(r => r.breeding_sire_id!))];
      let sireMap = new Map<string, string>();
      if (sireIds.length > 0) {
        const { data: sires } = await supabase
          .from("animals")
          .select("id, tag")
          .in("id", sireIds);
        (sires || []).forEach(s => sireMap.set(s.id, s.tag));
      }
      return cwRows.map(cw => {
        const proj = cw.project_id ? projectMap.get(cw.project_id) : null;
        const wtArr = (proj?.work_types || []) as any[];
        const typeCode = wtArr[0]?.work_type?.code || "";
        const flex = (cw.flex_data || {}) as Record<string, any>;
        return {
          ...cw,
          ...flex,
          _typeCode: typeCode,
          _projectName: proj?.name || "",
          _projectDate: proj?.date || cw.date,
          _sireTag: cw.breeding_sire_id ? sireMap.get(cw.breeding_sire_id) || "" : "",
        };
      });
    },
    enabled: !!damLookup?.id && damHistoryTab === "work",
  });

  const TAG_HEX: Record<string, string> = {
    Red: "#D4606E",
    Yellow: "#F3D12A",
    Green: "#55BAAA",
    White: "#E0E0E0",
    Orange: "#E8863A",
    Blue: "#5B8DEF",
    Purple: "#A77BCA",
    Pink: "#E8A0BF",
    None: "#999",
  };

  const fmtHistDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtShortDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const assistLabel = (v: number | null) => (!v || v === 1 ? "" : v === 2 ? "Pull" : v === 3 ? "Hard Pull" : "C-Sec");

  // ── Helpers ──
  const toggleNote = (label: string) => {
    const note = QUICK_NOTES.find((n) => n.label === label);
    if (!note) return;
    const isSel = selectedNotes.includes(label);
    if (isSel) {
      const remaining = selectedNotes.filter((n) => n !== label);
      if (note.flag) {
        const others = remaining.some((n) => QUICK_NOTES.find((q) => q.label === n)?.flag === note.flag);
        if (!others)
          showToast(
            "info",
            `${note.flag === "red" ? "Cull" : note.flag === "gold" ? "Production" : "Management"} flag removed`,
          );
      }
      setSelectedNotes(remaining);
    } else {
      setSelectedNotes([...selectedNotes, label]);
      if (note.flag)
        showToast(
          "info",
          `Flag: ${note.flag === "red" ? "Cull" : note.flag === "gold" ? "Production" : "Management"} applied`,
        );
      if (label === "Twin" && !isTwin) setIsTwin(true);
    }
  };

  const cowTraitCount = Object.values(cowTraits).filter((v) => v).length;
  const fmtDate = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  const detailBits: string[] = [];
  if (vigor) detailBits.push(`Vigor: ${TRAIT_LABELS.calfVigor[parseInt(vigor)]}`);
  if (selectedNotes.length > 0) detailBits.push(`${selectedNotes.length} note${selectedNotes.length > 1 ? "s" : ""}`);
  if (isTwin) detailBits.push("Twin");
  if (isGraft) detailBits.push("Graft");
  if (notes) detailBits.push("Memo");

  const handleReset = () => {
    setDamTag("");
    setSelectedDamId(null);
    setSireTag("");
    setSelectedSireId(null);
    setCalfStatus("Alive");
    setCalfSex("");
    setCalfTag("");
    setCalfColor("Yellow");
    setBirthWeight("");
    setCalfSize("3");
    setIsTwin(false);
    setTwin({ tag: "", sex: "", weight: "", size: "3" });
    setIsGraft(false);
    setGraftDam("");
    setGraftReason("");
    setDeathReason("");
    setDeathNotes("");
    setVigor("");
    setSelectedNotes([]);
    setCowTraits({ assistance: "1", disposition: "", udder: "", teat: "", claw: "", foot: "", mothering: "" });
    setNotes("");
    setShowDam(false);
  };

  const handleSave = async () => {
    if (!damTag.trim() || !selectedDamId) {
      showToast("error", "Select a dam from the search results");
      return;
    }
    if (!calfSex && calfStatus !== "Dead") {
      showToast("error", "Calf sex required");
      return;
    }
    setSaving(true);
    try {
      // Dam already selected via AnimalLookup — use selectedDamId directly

      // Step 1: If calf is alive and tagged, create calf animal record
      let calfId: string | null = null;
      if (calfStatus === "Alive" && calfTag.trim()) {
        const { data: calfAnimal, error: calfErr } = await supabase
          .from("animals")
          .insert({
            operation_id: operationId,
            tag: calfTag.trim(),
            calf_tag: calfTag.trim(),
            tag_color: calfColor === "None" ? null : calfColor,
            sex: calfSex === "Bull" ? "Bull" : "Cow",
            type: "Calf",
            status: "Active",
            year_born: date ? new Date(date).getFullYear() : new Date().getFullYear(),
            birth_date: date || new Date().toISOString().split("T")[0],
            dam_id: selectedDamId,
            breed: null,
          })
          .select("id")
          .single();
        if (calfErr) throw calfErr;
        calfId = calfAnimal.id;
      }

      // Step 1b: If steer quick notes selected, update calf sex to Steer
      const STEER_TRIGGERS = ["Castrated", "Banded", "Steer"];
      const hasSteerNote = selectedNotes.some((n) => STEER_TRIGGERS.includes(n));
      if (hasSteerNote && calfId) {
        await supabase
          .from("animals")
          .update({ sex: "Steer", type: "Feeder" })
          .eq("id", calfId);
      }

      const { error: calvErr } = await supabase.from("calving_records").insert({
        operation_id: operationId,
        dam_id: selectedDamId,
        sire_id: selectedSireId || null,
        calf_id: calfId,
        calf_tag: calfTag.trim() || null,
        calf_tag_color: calfColor === "None" ? null : calfColor,
        calving_date: date || new Date().toISOString().split("T")[0],
        calf_sex: calfSex || null,
        birth_weight: birthWeight ? parseFloat(birthWeight) : null,
        calf_status: calfStatus,
        death_explanation: calfStatus === "Dead" ? deathReason || null : null,
        calf_size: calfSize ? parseInt(calfSize) : 3,
        calf_vigor: vigor ? parseInt(vigor) : null,
        assistance: cowTraits.assistance ? parseInt(cowTraits.assistance) : 1,
        disposition: cowTraits.disposition ? parseInt(cowTraits.disposition) : null,
        mothering: cowTraits.mothering ? parseInt(cowTraits.mothering) : null,
        udder: cowTraits.udder ? parseInt(cowTraits.udder) : null,
        teat: cowTraits.teat ? parseInt(cowTraits.teat) : null,
        claw: cowTraits.claw ? parseInt(cowTraits.claw) : null,
        foot: cowTraits.foot ? parseInt(cowTraits.foot) : null,
        group_id: groupId || null,
        location_id: locationId || null,
        memo: notes.trim() || null,
        quick_notes: selectedNotes.length > 0 ? selectedNotes : [],
      });
      if (calvErr) throw calvErr;

      // Persist last-used location and group for next entry
      if (locationId) localStorage.setItem("cs_last_calving_location", locationId);
      if (groupId) localStorage.setItem("cs_last_calving_group", groupId);

      queryClient.invalidateQueries({ queryKey: ["calving-list"] });
      queryClient.invalidateQueries({ queryKey: ["calving-counts"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["animal-counts"] });

      // Step 5: Increment calf tag sequence if using auto-tagging
      if (prefs && prefs.calf_tag_system !== "manual") {
        const calvingYear = date ? new Date(date).getFullYear() : new Date().getFullYear();
        await incrementCalfTagSeq(operationId, calvingYear, prefs);
        queryClient.invalidateQueries({ queryKey: ["operation-preferences"] });
      }

      // Step 6: Toast + reset (keep date/group/location)
      if (calfStatus === "Dead") {
        showToast("success", `Calving recorded — calf marked Dead`);
      } else {
        showToast("success", `Calving recorded — calf ${calfTag.trim() || "untagged"} added`);
      }

      setDamTag("");
      setSelectedDamId(null);
      setSireTag("");
      setSelectedSireId(null);
      setCalfTag("");
      setCalfStatus("Alive");
      setCalfSex("");
      setCalfColor("Yellow");
      setBirthWeight("");
      setCalfSize("3");
      setVigor("");
      setSelectedNotes([]);
      setNotes("");
      setIsTwin(false);
      setIsGraft(false);
      setCowTraits({ assistance: "1", disposition: "", udder: "", teat: "", claw: "", foot: "", mothering: "" });
      setShowDam(false);
      setDamFullHistory(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ padding: "10px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* ═══ 1. CONTEXT BAR ═══ */}
        {!contextOpen ? (
          <button
            onClick={() => setContextOpen(true)}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "10px 14px",
              cursor: "pointer",
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>{fmtDate}</span>
              <span style={{ width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(240,240,240,0.60)" }}>{groups?.find(g => g.id === groupId)?.name || "—"}</span>
              <span style={{ width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(240,240,240,0.60)" }}>{locations?.find(l => l.id === locationId)?.name || "—"}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 3L9 7L5 11"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div
            style={{
              borderRadius: 10,
              backgroundColor: "white",
              border: "1px solid rgba(212,212,208,0.50)",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  color: "rgba(26,26,26,0.35)",
                  textTransform: "uppercase",
                }}
              >
                Calving Info
              </span>
              <button
                onClick={() => setContextOpen(false)}
                type="button"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#55BAAA",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldRow label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={IS} />
              </FieldRow>
              <FieldRow label="Group">
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  style={{ ...IS, appearance: "auto" as const, color: groupId ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}
                >
                  <option value="">Select group…</option>
                  {(groups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Location">
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  style={{ ...IS, appearance: "auto" as const, color: locationId ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}
                >
                  <option value="">Select location…</option>
                  {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </FieldRow>
            </div>
            <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)", fontStyle: "italic", marginTop: 6 }}>
              Carries forward between entries
            </div>
          </div>
        )}

        {/* ═══ 2. DAM TAG ═══ */}
        <div
          style={{
            borderRadius: 12,
            backgroundColor: "white",
            border: "1px solid rgba(212,212,208,0.60)",
            padding: "12px",
          }}
        >
          <FieldRow label="Dam Tag">
            <AnimalLookup
              value={damTag}
              onChange={(v) => { setDamTag(v); if (!v) setSelectedDamId(null); }}
              onSelect={(animal) => {
                setSelectedDamId(animal.id);
                // Auto-fill calf tag based on operation preferences
                const calvingYear = date ? new Date(date).getFullYear() : new Date().getFullYear();
                const suggested = generateCalfTag(prefs || null, animal.tag, calvingYear);
                if (suggested) {
                  setCalfTag(suggested);
                  if (prefs?.calf_tag_default_color) setCalfColor(prefs.calf_tag_default_color);
                }
              }}
              onNoMatch={(search) => { setQuickAddTag(search); setQuickAddOpen(true); setQuickAddYear(String(new Date().getFullYear() - 3)); }}
              placeholder="Type dam tag…"
              inputStyle={IS}
              sexFilter={["Cow", "Spayed Heifer"]}
            />
          </FieldRow>

          {/* Quick-Add Dam dialog */}
          {quickAddOpen && !selectedDamId && (
            <div style={{ background: "#fff", border: "2px solid #F3D12A", borderRadius: 10, padding: 12, marginTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 8 }}>Quick-Add Dam: {quickAddTag}</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", width: 75, flexShrink: 0 }}>Tag</span>
                  <input type="text" value={quickAddTag} onChange={e => setQuickAddTag(e.target.value)} style={{ ...IS, flex: 1 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", width: 75, flexShrink: 0 }}>Tag Color</span>
                  <select value={quickAddColor} onChange={e => setQuickAddColor(e.target.value)} style={{ ...IS, flex: 1 }}>
                    {["None", "Yellow", "Orange", "Red", "Green", "Blue", "Purple", "Pink", "White"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", width: 75, flexShrink: 0 }}>Year Born</span>
                  <input type="number" value={quickAddYear} onChange={e => setQuickAddYear(e.target.value)} placeholder="e.g. 2021" style={{ ...IS, flex: 1 }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(26,26,26,0.4)", fontStyle: "italic" }}>Minimum 2 years old to be a dam</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => { setQuickAddOpen(false); setQuickAddTag(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 20, border: "1px solid #D4D4D0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}>Cancel</button>
                  <button
                    disabled={quickAddSaving}
                    onClick={async () => {
                      if (!quickAddTag.trim()) { showToast("error", "Tag is required"); return; }
                      const yr = parseInt(quickAddYear);
                      if (yr && yr > new Date().getFullYear() - 2) { showToast("error", "Dam must be at least 2 years old"); return; }
                      setQuickAddSaving(true);
                      try {
                        const { data, error } = await supabase.from("animals").insert({
                          operation_id: operationId,
                          tag: quickAddTag.trim(),
                          tag_color: quickAddColor,
                          sex: "Cow",
                          type: "Cow",
                          year_born: yr || null,
                          status: "Active",
                        }).select().single();
                        if (error) throw error;
                        setSelectedDamId(data.id);
                        setDamTag(quickAddTag.trim());
                        setQuickAddOpen(false);
                        showToast("success", `Dam ${quickAddTag.trim()} created`);
                        queryClient.invalidateQueries({ queryKey: ["animals"] });
                      } catch (err: any) {
                        showToast("error", err.message || "Failed to create dam");
                      } finally { setQuickAddSaving(false); }
                    }}
                    style={{ flex: 2, padding: "8px 0", borderRadius: 20, border: "none", background: "#F3D12A", fontSize: 12, fontWeight: 700, color: "#1A1A1A", cursor: "pointer", opacity: quickAddSaving ? 0.5 : 1 }}
                  >{quickAddSaving ? "Creating..." : "Create Dam"}</button>
                </div>
              </div>
            </div>
          )}

          {selectedDamId && damLookup && (() => {
            // Compute stat chips from damCalvings
            const calvings = damCalvings || [];
            const calvingCount = calvings.length;
            const lastRecord = calvings[0];
            const lastWt = lastRecord?.birth_weight ? `${Math.round(Number(lastRecord.birth_weight))} lb` : "—";
            const avgWt = (() => {
              const wts = calvings.filter(c => c.birth_weight).map(c => Number(c.birth_weight));
              return wts.length > 0 ? `${Math.round(wts.reduce((a, b) => a + b, 0) / wts.length)} lb` : "—";
            })();
            const lastAsst = lastRecord?.assistance
              ? (TRAIT_LABELS.assistance[lastRecord.assistance] || "—")
              : "—";
            const flags = damFlags || [];
            const flagColor = (tier: string) => {
              if (tier === "cull") return { bg: "rgba(155,35,53,0.12)", color: "#9B2335" };
              if (tier === "production") return { bg: "rgba(243,209,42,0.15)", color: "#B8860B" };
              return { bg: "rgba(85,186,170,0.12)", color: "#0F6E56" };
            };

            return (
              <>
                {/* ═══ DAM COLLAPSED CARD ═══ */}
                <div
                  onClick={() => setShowDam(!showDam)}
                  style={{
                    marginTop: 8,
                    background: "#FFFFFF",
                    border: "1px solid #D4D4D0",
                    borderRadius: 12,
                    padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  {/* Row 1 — Tag + meta + chevron */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>{damLookup.tag}</span>
                      <span style={{ fontSize: 12, color: "rgba(26,26,26,0.45)" }}>
                        {damLookup.type || "—"} · {damLookup.breed || "—"} · {damLookup.year_born || "—"}
                      </span>
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ transform: showDam ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms", flexShrink: 0 }}
                    >
                      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Row 2 — Stat chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {[
                      { label: "Calvings", value: String(calvingCount) },
                      { label: "Last Wt", value: lastWt },
                      { label: "Avg Wt", value: avgWt },
                      { label: "Last Asst", value: lastAsst },
                    ].map(chip => (
                      <div key={chip.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(26,26,26,0.04)", borderRadius: 6, padding: "4px 8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{chip.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0E2646" }}>{chip.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Row 3 — Flag pills */}
                  {flags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {flags.map(f => {
                        const fc = flagColor(f.flag_tier);
                        return (
                          <span key={f.id} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10, backgroundColor: fc.bg, color: fc.color }}>
                            {f.flag_name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Toggle link */}
                <div style={{ textAlign: "center", marginTop: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDam(!showDam); }}
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#55BAAA" }}
                  >
                    {showDam ? "▴ Hide Dam History" : "▾ Show Dam History"}
                  </button>
                </div>

                {showDam && (
                  <div style={{ background: "#FFFFFF", border: "1px solid #D4D4D0", borderRadius: 12, overflow: "hidden" }}>
                    {/* Header — same as collapsed card */}
                    <div style={{ padding: "12px 14px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>{damLookup.tag}</span>
                          <span style={{ fontSize: 12, color: "rgba(26,26,26,0.45)" }}>
                            {damLookup.type || "—"} · {damLookup.breed || "—"} · {damLookup.year_born || "—"}
                          </span>
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 14 14" fill="none"
                          style={{ transform: "rotate(180deg)", transition: "transform 200ms", flexShrink: 0, cursor: "pointer" }}
                          onClick={() => setShowDam(false)}
                        >
                          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {flags.length > 0 && (
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          {flags.map(f => {
                            const fc = flagColor(f.flag_tier);
                            return (
                              <span key={f.id} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10, backgroundColor: fc.bg, color: fc.color }}>
                                {f.flag_name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sub-tabs bar */}
                    <div style={{ display: "flex", margin: "12px 14px 0", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
                      {[
                        { k: "info", l: "Info" },
                        { k: "calving", l: "Calving" },
                        { k: "work", l: "Work" },
                      ].map((t) => (
                        <button
                          key={t.k}
                          onClick={() => { setDamHistoryTab(t.k); if (t.k === "work") setDamFullHistory(true); }}
                          type="button"
                          style={{
                            flex: 1, textAlign: "center", padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            background: "none", border: "none",
                            color: damHistoryTab === t.k ? "#0E2646" : "rgba(26,26,26,0.35)",
                            borderBottom: damHistoryTab === t.k ? "2px solid #F3D12A" : "2px solid transparent",
                          }}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ padding: "10px 14px 14px" }}>
                      {/* Info tab */}
                      {damHistoryTab === "info" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                          {[
                            { label: "Type", value: damLookup.type || "—" },
                            { label: "Breed", value: damLookup.breed || "—" },
                            { label: "Year Born", value: damLookup.year_born ? String(damLookup.year_born) : "—" },
                            { label: "Sex", value: damLookup.sex || "—" },
                            { label: "Tag Color", value: damLookup.tag_color || "—" },
                            { label: "Status", value: damLookup.status || "—" },
                            { label: "EID", value: damLookup.eid || "—" },
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", marginTop: 1 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Calving tab */}
                      {damHistoryTab === "calving" && (
                        <div>
                          {calvingCount === 0 && (
                            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", padding: "20px 0", textAlign: "center" }}>No calving history</div>
                          )}
                          {calvings.map((c) => {
                            const isDead = c.calf_status === "Dead";
                            const isProblem = (c.assistance != null && c.assistance >= 3) || isDead;
                            const assistText = c.assistance ? (TRAIT_LABELS.assistance[c.assistance] || "") : "";
                            const vigorText = c.calf_vigor ? (TRAIT_LABELS.calfVigor[c.calf_vigor] || "") : "";
                            const alertParts: string[] = [];
                            if (isDead) alertParts.push("Dead");
                            if (c.assistance && c.assistance >= 3) alertParts.push(assistText);

                            return (
                              <div
                                key={c.id}
                                style={{
                                  background: "rgba(26,26,26,0.03)",
                                  border: "1px solid rgba(26,26,26,0.06)",
                                  borderRadius: 8,
                                  padding: "10px 12px",
                                  marginBottom: 6,
                                  borderLeft: isDead ? "3px solid #9B2335" : isProblem ? "3px solid #D4606E" : "1px solid rgba(26,26,26,0.06)",
                                }}
                              >
                                {/* Row 1 — Sex + calf tag + date */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <div style={{ display: "flex", alignItems: "center" }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em",
                                      backgroundColor: c.calf_sex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.2)",
                                      color: c.calf_sex === "Bull" ? "#0F6E56" : "#993556",
                                    }}>
                                      {c.calf_sex || "Unknown"}
                                    </span>
                                    <span style={{ color: "rgba(26,26,26,0.25)", fontSize: 11, margin: "0 3px" }}>→</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: isDead ? "rgba(26,26,26,0.3)" : "#0E2646" }}>
                                      {isDead ? "—" : (c.calf_tag || "—")}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{fmtHistDate(c.calving_date)}</span>
                                </div>

                                {/* Row 2 — Details */}
                                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.5)", marginTop: 5, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                  {c.birth_weight && (
                                    <>
                                      <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{c.birth_weight} lb</span>
                                      {(assistText || vigorText) && <span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span>}
                                    </>
                                  )}
                                  {assistText && (
                                    <>
                                      <span>{assistText}</span>
                                      {vigorText && <span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span>}
                                    </>
                                  )}
                                  {vigorText && <span>{vigorText}</span>}
                                </div>

                                {/* Alert badge */}
                                {isProblem && alertParts.length > 0 && (
                                  <div style={{
                                    fontSize: 10, fontWeight: 600, color: "#9B2335",
                                    background: "rgba(155,35,53,0.08)",
                                    padding: "2px 8px", borderRadius: 8,
                                    marginTop: 5, display: "inline-flex", alignItems: "center", gap: 3,
                                  }}>
                                    {isDead && !c.assistance ? alertParts.join(" · ") : `⚠ ${alertParts.join(" · ")}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Work tab */}
                      {damHistoryTab === "work" && (() => {
                        const allWork = damWork || [];
                        const pregRecords = allWork.filter(w => w._typeCode === "PREG");
                        const breedRecords = allWork.filter(w => w._typeCode === "BREED" || w._typeCode === "AI" || w._typeCode === "ET");
                        const otherRecords = allWork.filter(w => !["PREG", "BREED", "AI", "ET"].includes(w._typeCode));

                        const fmtBredDue = (checkDate: string, daysGest: number) => {
                          const check = new Date(checkDate + "T12:00:00");
                          const bred = new Date(check.getTime() - daysGest * 86400000);
                          const due = new Date(bred.getTime() + 283 * 86400000);
                          const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          return `Bred ~${fmt(bred)} · Due ~${fmt(due)}`;
                        };

                        if (allWork.length === 0) {
                          return <div style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", padding: "20px 0", textAlign: "center" }}>No work history</div>;
                        }

                        return (
                          <div>
                            {/* PREG cards */}
                            {pregRecords.map(w => (
                              <div key={w.id} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: "rgba(85,186,170,0.12)", color: "#0F6E56" }}>PREG</span>
                                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{fmtHistDate(w._projectDate)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                  {w.preg_stage && <><span style={{ fontWeight: 600, color: "#1A1A1A" }}>{w.preg_stage}</span><span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span></>}
                                  {w.days_of_gestation && <><span>{w.days_of_gestation} days</span><span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span></>}
                                  {w.fetal_sex && <><span>{w.fetal_sex}</span><span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span></>}
                                  {w.weight && <span>{w.weight} lb</span>}
                                </div>
                                {w._sireTag && (
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#0F6E56", background: "rgba(85,186,170,0.1)", padding: "2px 8px", borderRadius: 8, display: "inline-block", marginTop: 4 }}>
                                    Sire: {w._sireTag}{w.estrus_status ? ` (${w.estrus_status})` : ""}
                                  </div>
                                )}
                                {w.days_of_gestation && w.days_of_gestation > 0 && (
                                  <div style={{ fontSize: 10, color: "rgba(26,26,26,0.35)", fontStyle: "italic", marginTop: 4 }}>
                                    {fmtBredDue(w._projectDate, w.days_of_gestation)}
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* BREED cards */}
                            {breedRecords.map(w => (
                              <div key={w.id} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: "rgba(232,160,191,0.12)", color: "#993556" }}>{w._typeCode}</span>
                                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{fmtHistDate(w._projectDate)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                  {w._sireTag && <><span style={{ fontWeight: 600, color: "#1A1A1A" }}>{w._sireTag}</span><span style={{ margin: "0 6px", color: "rgba(26,26,26,0.2)" }}>·</span></>}
                                  {w.estrus_status && <span>Estrus: {w.estrus_status}</span>}
                                </div>
                              </div>
                            ))}

                            {/* Divider + remaining work cards */}
                            {otherRecords.length > 0 && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "10px 0 6px", textAlign: "center" }}>
                                TREATMENTS &amp; PROCESSING
                              </div>
                            )}

                            {/* VAX cards */}
                            {otherRecords.filter(w => w._typeCode === "VAX" || w._typeCode === "TREAT").map(w => (
                              <div key={w.id} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: "rgba(243,209,42,0.12)", color: "#B8860B" }}>VAX</span>
                                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{fmtHistDate(w._projectDate)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4 }}>
                                  {w._projectName || "Treatment"}
                                </div>
                              </div>
                            ))}

                            {/* All other work types */}
                            {otherRecords.filter(w => w._typeCode !== "VAX" && w._typeCode !== "TREAT").map(w => (
                              <div key={w.id} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: "rgba(26,26,26,0.06)", color: "rgba(26,26,26,0.45)" }}>{w._typeCode || "WORK"}</span>
                                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{fmtHistDate(w._projectDate)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4 }}>
                                  {w._projectName || "Work"}{w.weight ? ` · ${w.weight} lb` : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ═══ 3. CALF CARD ═══ */}
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
              padding: "9px 14px",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>Calf</span>
          </div>
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(212,212,208,0.60)",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "12px",
            }}
          >

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Calf Tag */}
            <FieldRow label="Calf Tag">
              <input
                type="text"
                value={calfTag}
                onChange={(e) => setCalfTag(e.target.value)}
                placeholder="Tag number"
                style={IS}
              />
            </FieldRow>

            {/* Status */}
            <FieldRow label="Status">
              <SegmentedToggle
                value={calfStatus}
                onChange={setCalfStatus}
                options={[
                  { value: "Alive", label: "Alive" },
                  { value: "Dead", label: "Dead" },
                ]}
                colors={{ Alive: { bg: "#55BAAA", text: "white" }, Dead: { bg: "#9B2335", text: "white" } }}
              />
            </FieldRow>

            {/* Death details */}
            {calfStatus === "Dead" && (
              <div
                style={{
                  backgroundColor: "rgba(155,35,53,0.06)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  border: "1px solid rgba(155,35,53,0.15)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9B2335",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Death Details
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <FieldRow label="Cause">
                    <select
                      value={deathReason}
                      onChange={(e) => setDeathReason(e.target.value)}
                      style={{
                        ...IS,
                        appearance: "auto" as const,
                        fontSize: 16,
                        color: deathReason ? "#1A1A1A" : "rgba(26,26,26,0.35)",
                      }}
                    >
                      <option value="">Select cause…</option>
                      {DEATH_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </FieldRow>
                  <FieldRow label="Notes">
                    <input
                      type="text"
                      value={deathNotes}
                      onChange={(e) => setDeathNotes(e.target.value)}
                      placeholder="Optional…"
                      style={{ ...IS, fontSize: 16 }}
                    />
                  </FieldRow>
                </div>
              </div>
            )}

            {/* Sex */}
            <FieldRow label="Sex" req>
              <SegmentedToggle
                value={calfSex}
                onChange={setCalfSex}
                options={[
                  { value: "Bull", label: "Bull" },
                  { value: "Heifer", label: "Heifer" },
                ]}
                colors={{ Bull: { bg: "#55BAAA", text: "white" }, Heifer: { bg: "#E8A0BF", text: "white" } }}
              />
            </FieldRow>

            {/* Tag Color */}
            <FieldRow label="Tag Color">
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    backgroundColor: TAG_COLOR_HEX[calfColor] || "#999",
                    zIndex: 1,
                  }}
                />
                <select
                  value={calfColor}
                  onChange={(e) => setCalfColor(e.target.value)}
                  style={{ ...IS, width: "100%", paddingLeft: 30, appearance: "auto" as const }}
                >
                  {TAG_COLOR_OPTIONS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </FieldRow>

            {/* Sire */}
            <FieldRow label="Sire">
              <AnimalLookup
                value={sireTag}
                onChange={(v) => { setSireTag(v); if (!v) setSelectedSireId(null); }}
                onSelect={(animal) => { setSelectedSireId(animal.id); }}
                placeholder="Bull tag (optional)"
                inputStyle={IS}
                sexFilter={["Bull"]}
              />
            </FieldRow>

            {/* Wt / Size */}
            <FieldRow label="Wt / Size">
              <div style={{ display: "flex", gap: 0, minWidth: 0, flex: 1 }}>
                <input
                  type="number"
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value)}
                  placeholder="lbs"
                  style={{ ...IS, flex: "0 0 56px", minWidth: 0, borderRadius: "8px 0 0 8px", borderRight: "none" }}
                />
                <select
                  value={calfSize}
                  onChange={(e) => setCalfSize(e.target.value)}
                  style={{
                    ...IS,
                    flex: 1,
                    minWidth: 80,
                    appearance: "auto" as const,
                    borderRadius: "0 8px 8px 0",
                    color: "#1A1A1A",
                  }}
                >
                  {TRAIT_LABELS.calfSize.slice(1).map((l, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </FieldRow>
          </div>
          </div>
        </div>

        {/* ═══ 4. DETAILS — collapsible ═══ */}
        <Collapsible
          title="Calf Details"
          badge={detailBits.length > 0 ? detailBits.length.toString() : null}
          collapsedContent={
            detailBits.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {detailBits.map((b) => (
                    <span
                      key={b}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 9999,
                        backgroundColor: "rgba(14,38,70,0.08)",
                        color: "#0E2646",
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
                {selectedNotes.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 4 }}>
                    {selectedNotes.map(label => {
                      const n = QUICK_NOTES.find(q => q.label === label);
                      const tier = n?.flag || "none";
                      const colors: Record<string, { bg: string; border: string }> = {
                        red: { bg: "#9B2335", border: "#9B2335" },
                        gold: { bg: "#B8860B", border: "#B8860B" },
                        teal: { bg: "#55BAAA", border: "#3D9A8B" },
                        none: { bg: "#717182", border: "#5A5A6A" },
                      };
                      const s = colors[tier];
                      return (
                        <span key={label} style={{
                          borderRadius: 9999, padding: "3px 9px", fontSize: 10, fontWeight: 700,
                          backgroundColor: s.bg, border: `1.5px solid ${s.border}`, color: "#FFFFFF",
                          display: "flex", alignItems: "center", gap: 3,
                        }}>
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>Vigor, notes, twin, graft</span>
            )
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
            <PillScore label="Calf Vigor" value={vigor} onChange={setVigor} labels={TRAIT_LABELS.calfVigor} />
            <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)" }} />
            <div>
              <CollapsibleQuickNotes
                selectedNotes={selectedNotes}
                onToggle={toggleNote}
                context="calving"
              />
            </div>
            <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)" }} />
            <div>
              <FieldRow label="Twin">
                <SegmentedToggle
                  value={isTwin ? "yes" : "no"}
                  onChange={(v) => setIsTwin(v === "yes")}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                />
              </FieldRow>
              {isTwin && (
                <div
                  style={{
                    backgroundColor: "rgba(85,186,170,0.06)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginTop: 8,
                    border: "1px solid rgba(85,186,170,0.15)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#55BAAA",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Twin Calf
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <FieldRow label="Sex">
                      <SegmentedToggle
                        value={twin.sex}
                        onChange={(v) => setTwin((p) => ({ ...p, sex: v }))}
                        options={[
                          { value: "Bull", label: "Bull" },
                          { value: "Heifer", label: "Heifer" },
                        ]}
                        colors={{ Bull: { bg: "#55BAAA", text: "white" }, Heifer: { bg: "#E8A0BF", text: "white" } }}
                      />
                    </FieldRow>
                    <FieldRow label="Tag">
                      <input
                        type="text"
                        value={twin.tag}
                        onChange={(e) => setTwin((p) => ({ ...p, tag: e.target.value }))}
                        placeholder="Twin tag"
                        style={IS}
                      />
                    </FieldRow>
                    <FieldRow label="Wt / Size">
                      <div style={{ display: "flex", gap: 0, minWidth: 0, flex: 1 }}>
                        <input
                          type="number"
                          value={twin.weight}
                          onChange={(e) => setTwin((p) => ({ ...p, weight: e.target.value }))}
                          placeholder="lbs"
                          style={{ ...IS, flex: "0 0 56px", minWidth: 0, borderRadius: "8px 0 0 8px", borderRight: "none" }}
                        />
                        <select
                          value={twin.size}
                          onChange={(e) => setTwin((p) => ({ ...p, size: e.target.value }))}
                          style={{
                            ...IS,
                            flex: 1,
                            minWidth: 80,
                            appearance: "auto" as const,
                            borderRadius: "0 8px 8px 0",
                            color: "#1A1A1A",
                          }}
                        >
                          {TRAIT_LABELS.calfSize.slice(1).map((l, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FieldRow>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)", fontStyle: "italic", marginTop: 6 }}>
                    Saves as second calving record
                  </div>
                </div>
              )}
            </div>
            <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)" }} />
            <div>
              <FieldRow label="Graft">
                <SegmentedToggle
                  value={isGraft ? "yes" : "no"}
                  onChange={(v) => setIsGraft(v === "yes")}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                />
              </FieldRow>
              {isGraft && (
                <div
                  style={{
                    backgroundColor: "rgba(243,209,42,0.06)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginTop: 8,
                    border: "1px solid rgba(243,209,42,0.15)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#B8860B",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Graft
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <FieldRow label="Foster Dam">
                      <input
                        type="text"
                        value={graftDam}
                        onChange={(e) => setGraftDam(e.target.value)}
                        placeholder="Foster dam tag"
                        style={IS}
                      />
                    </FieldRow>
                    <FieldRow label="Reason">
                      <select
                        value={graftReason}
                        onChange={(e) => setGraftReason(e.target.value)}
                        style={{
                          ...IS,
                          appearance: "auto" as const,
                          color: graftReason ? "#1A1A1A" : "rgba(26,26,26,0.35)",
                        }}
                      >
                        <option value="">Select…</option>
                        {GRAFT_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </FieldRow>
                  </div>
                </div>
              )}
            </div>
            <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)" }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E2646", marginBottom: 6 }}>Notes</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes…"
                style={{
                  width: "100%",
                  minHeight: 56,
                  resize: "none",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 16,
                  border: "1px solid #D4D4D0",
                  backgroundColor: "#F5F5F0",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </Collapsible>

        {/* ═══ 5. COW TRAITS ═══ */}
        <Collapsible
          title="Cow Traits"
          badge={cowTraitCount > 0 ? `${cowTraitCount}/7` : null}
          collapsedContent={
            cowTraitCount > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 4 }}>
                {Object.entries(cowTraits)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 9999,
                        backgroundColor: "rgba(14,38,70,0.08)",
                        color: "#0E2646",
                      }}
                    >
                      {k.charAt(0).toUpperCase() + k.slice(1)}:{" "}
                      {TRAIT_LABELS[k as keyof typeof TRAIT_LABELS]?.[parseInt(v)] || v}
                    </span>
                  ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4, paddingTop: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 9999,
                    backgroundColor: "rgba(14,38,70,0.08)",
                    color: "#0E2646",
                  }}
                >
                  Assistance: No Assistance
                </span>
              </div>
            )
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            <PillScore
              label="Assistance"
              value={cowTraits.assistance}
              onChange={(v) => setCowTraits((p) => ({ ...p, assistance: v }))}
              labels={TRAIT_LABELS.assistance}
            />
            <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)" }} />
            <TraitPair
              titleA="Disposition"
              titleB="Mothering"
              valueA={cowTraits.disposition}
              valueB={cowTraits.mothering}
              onChangeA={(v) => setCowTraits((p) => ({ ...p, disposition: v }))}
              onChangeB={(v) => setCowTraits((p) => ({ ...p, mothering: v }))}
              labelsA={TRAIT_LABELS.disposition}
              labelsB={TRAIT_LABELS.mothering}
            />
            {showUdderTeat && (
              <TraitPair
                titleA="Udder"
                titleB="Teat"
                valueA={cowTraits.udder}
                valueB={cowTraits.teat}
                onChangeA={(v) => setCowTraits((p) => ({ ...p, udder: v }))}
                onChangeB={(v) => setCowTraits((p) => ({ ...p, teat: v }))}
                labelsA={TRAIT_LABELS.udder}
                labelsB={TRAIT_LABELS.teat}
              />
            )}
            {showClawFoot && (
              <TraitPair
                titleA="Claw"
                titleB="Foot"
                valueA={cowTraits.claw}
                valueB={cowTraits.foot}
                onChangeA={(v) => setCowTraits((p) => ({ ...p, claw: v }))}
                onChangeB={(v) => setCowTraits((p) => ({ ...p, foot: v }))}
                labelsA={TRAIT_LABELS.claw}
                labelsB={TRAIT_LABELS.foot}
              />
            )}
            {(!showUdderTeat || !showClawFoot) && (
              <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)", fontStyle: "italic" }}>
                {!showUdderTeat && "Udder/Teat disabled. "}
                {!showClawFoot && "Claw/Foot disabled. "}Reference → Settings
              </div>
            )}
          </div>
        </Collapsible>

        {/* ═══ 6. ACTIONS ═══ */}
        <div style={{ display: "flex", gap: 12, paddingTop: 2 }}>
          <button
            onClick={handleReset}
            type="button"
            style={{
              flex: 1,
              padding: "10px 24px",
              borderRadius: 9999,
              border: "2px solid #F3D12A",
              backgroundColor: "transparent",
              fontSize: 14,
              fontWeight: 700,
              color: "#1A1A1A",
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            style={{
              flex: 2,
              padding: "10px 24px",
              borderRadius: 9999,
              border: "none",
              backgroundColor: saving ? "rgba(243,209,42,0.60)" : "#F3D12A",
              fontSize: 14,
              fontWeight: 700,
              color: "#1A1A1A",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 10px rgba(243,209,42,0.35)",
              transition: "all 150ms",
            }}
          >
            {saving ? "Saving…" : "Save & Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
