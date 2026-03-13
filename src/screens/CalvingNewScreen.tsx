import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useGroups } from "@/hooks/useGroups";
import { useLocations } from "@/hooks/useLocations";
import { useChuteSideToast } from "@/components/ToastContext";
import FieldRow from "@/components/calving/FieldRow";
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
  const [groupId, setGroupId] = useState("");
  const [locationId, setLocationId] = useState("");
  const { data: groups } = useGroups();
  const { data: locations } = useLocations();

  // Dam
  const [damTag, setDamTag] = useState("");
  const [selectedDamId, setSelectedDamId] = useState<string | null>(null);
  const [showDam, setShowDam] = useState(false);
  const [damFullHistory, setDamFullHistory] = useState(false);
  const [damHistoryTab, setDamHistoryTab] = useState("calving");

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
    enabled: showDam && !!selectedDamId,
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

  const { data: damWork } = useQuery({
    queryKey: ["dam-work", damLookup?.id],
    queryFn: async () => {
      if (!damLookup?.id) return [];
      const { data } = await supabase
        .from("cow_work")
        .select("*, project:projects(name)")
        .eq("animal_id", damLookup.id)
        .eq("operation_id", operationId)
        .order("date", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!damLookup?.id && damFullHistory,
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

  const renderNotes = (collapsed = false) => {
    const list = collapsed ? QUICK_NOTES.filter((n) => selectedNotes.includes(n.label)) : QUICK_NOTES;
    if (collapsed && list.length === 0) return <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>None</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: collapsed ? 4 : 0 }}>
        {list.map((n) => {
          const active = selectedNotes.includes(n.label);
          const c = QUICK_NOTE_PILL_COLORS[n.flag || "none"];
          return (
            <button
              key={n.label}
              onClick={collapsed ? undefined : () => toggleNote(n.label)}
              type="button"
              style={{
                borderRadius: 9999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: active ? 700 : 600,
                backgroundColor: active ? c.bgSel : c.bg,
                border: `${active ? 2 : 1}px solid ${active ? c.borderSel : c.border}`,
                color: c.text,
                cursor: collapsed ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                transition: "all 100ms",
              }}
            >
              {active && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke={c.text}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {n.label}
            </button>
          );
        })}
      </div>
    );
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

      // Step 2: Insert calving record
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

      // Step 4: Invalidate caches
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
              onNoMatch={(search) => { showToast("info", `Quick-Add Dam for "${search}" — coming soon`); }}
              placeholder="Type dam tag…"
              inputStyle={IS}
              sexFilter={["Cow", "Spayed Heifer"]}
            />
          </FieldRow>
          {selectedDamId && (
            <button
              onClick={() => setShowDam(!showDam)}
              type="button"
              style={{
                width: "100%",
                marginTop: 8,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                backgroundColor: showDam ? "rgba(85,186,170,0.12)" : "rgba(14,38,70,0.04)",
                fontSize: 12,
                fontWeight: 700,
                color: showDam ? "#55BAAA" : "rgba(14,38,70,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showDam ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms" }}>
                <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showDam ? "Hide Dam History" : "View Dam History"}
            </button>
          )}
        </div>

        {/* ═══ DAM HISTORY PANEL ═══ */}
        {showDam && (
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)",
            }}
          >
            {damTag ? (
              <>
                {/* ── Level 1: Summary ── */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ color: "white", fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{damTag}</div>
                      {damLookup ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 9999,
                              backgroundColor: TAG_HEX[damLookup.tag_color || "None"] || "#999",
                            }}
                          />
                          <span style={{ fontSize: 12, color: "rgba(240,240,240,0.45)" }}>
                            {damLookup.tag_color || "None"} · {damLookup.sex} · {damLookup.year_born || "—"}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>Looking up…</div>
                      )}
                    </div>
                  </div>

                  {/* Recent calvings — compact */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 10, paddingTop: 8 }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "rgba(240,240,240,0.25)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Last 3 Calvings
                    </div>
                    {(!damCalvings || damCalvings.length === 0) && (
                      <div style={{ fontSize: 11, color: "rgba(240,240,240,0.30)", padding: "4px 0" }}>
                        No calving records
                      </div>
                    )}
                    {(damCalvings || []).slice(0, 3).map((c, i) => {
                      const sexChar = c.calf_sex === "Bull" ? "B" : c.calf_sex === "Heifer" ? "H" : "?";
                      const assist = assistLabel(c.assistance);
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "white", width: 40 }}>
                            {c.calf_sex === "Bull" ? "B" : "H"}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              width: 14,
                              color: sexChar === "B" ? "#55BAAA" : "#E8A0BF",
                            }}
                          >
                            {sexChar}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(240,240,240,0.30)" }}>
                            {fmtShortDate(c.calving_date)}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(240,240,240,0.30)" }}>
                            {c.birth_weight || "—"}lb
                          </span>
                          {assist && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                borderRadius: 9999,
                                padding: "1px 5px",
                                backgroundColor: "rgba(243,209,42,0.15)",
                                color: "rgba(243,209,42,0.70)",
                              }}
                            >
                              {assist}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Level 2: Full History toggle ── */}
                <div style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                  <button
                    onClick={() => setDamFullHistory(!damFullHistory)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: "100%",
                      padding: "8px 16px",
                      cursor: "pointer",
                      backgroundColor: "transparent",
                      border: "none",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,240,240,0.40)" }}>
                      {damFullHistory ? "Hide" : "Full"} History
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{
                        transform: damFullHistory ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 200ms",
                      }}
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="rgba(240,240,240,0.35)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {damFullHistory && (
                    <div style={{ padding: "0 16px 14px" }}>
                      {/* Tab bar */}
                      <div
                        style={{
                          display: "flex",
                          gap: 0,
                          borderRadius: 6,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.10)",
                          marginBottom: 10,
                        }}
                      >
                        {[
                          { k: "calving", l: "Calving" },
                          { k: "work", l: "Work" },
                          { k: "treatments", l: "Treatments" },
                        ].map((t) => (
                          <button
                            key={t.k}
                            onClick={() => setDamHistoryTab(t.k)}
                            type="button"
                            style={{
                              flex: 1,
                              padding: "6px 0",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                              backgroundColor: damHistoryTab === t.k ? "rgba(255,255,255,0.12)" : "transparent",
                              color: damHistoryTab === t.k ? "#F3D12A" : "rgba(240,240,240,0.35)",
                              border: "none",
                              borderRight: t.k !== "treatments" ? "1px solid rgba(255,255,255,0.08)" : "none",
                            }}
                          >
                            {t.l}
                          </button>
                        ))}
                      </div>

                      {/* Calving tab */}
                      {damHistoryTab === "calving" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(!damCalvings || damCalvings.length === 0) && (
                            <div style={{ fontSize: 11, color: "rgba(240,240,240,0.30)", padding: 8 }}>
                              No calving records
                            </div>
                          )}
                          {(damCalvings || []).map((c) => (
                            <div
                              key={c.id}
                              style={{ borderRadius: 8, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 12px" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                                    {c.calf_sex || "Unknown"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      borderRadius: 9999,
                                      padding: "1px 6px",
                                      backgroundColor:
                                        c.calf_sex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                                      color: c.calf_sex === "Bull" ? "#55BAAA" : "#E8A0BF",
                                    }}
                                  >
                                    {c.calf_sex || "?"}
                                  </span>
                                </div>
                                <span style={{ fontSize: 10, color: "rgba(240,240,240,0.30)" }}>
                                  {fmtHistDate(c.calving_date)}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                {c.birth_weight && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      borderRadius: 9999,
                                      padding: "2px 6px",
                                      backgroundColor: "rgba(240,240,240,0.08)",
                                      color: "rgba(240,240,240,0.50)",
                                    }}
                                  >
                                    {c.birth_weight} lbs
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    borderRadius: 9999,
                                    padding: "2px 6px",
                                    backgroundColor: "rgba(240,240,240,0.08)",
                                    color: "rgba(240,240,240,0.50)",
                                  }}
                                >
                                  {!c.assistance || c.assistance === 1
                                    ? "No Assistance"
                                    : c.assistance === 2
                                      ? "Easy Pull"
                                      : "Hard Pull"}
                                </span>
                              </div>
                              {c.memo && (
                                <div style={{ fontSize: 11, color: "rgba(240,240,240,0.30)", marginTop: 4 }}>
                                  {c.memo}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Work tab */}
                      {damHistoryTab === "work" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(!damWork || damWork.length === 0) && (
                            <div style={{ fontSize: 11, color: "rgba(240,240,240,0.30)", padding: 8 }}>
                              No work records
                            </div>
                          )}
                          {(damWork || []).map((w) => (
                            <div
                              key={w.id}
                              style={{ borderRadius: 8, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 12px" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                                  {(w.project as any)?.name || "Work Record"}
                                </span>
                                <span style={{ fontSize: 10, color: "rgba(240,240,240,0.30)" }}>
                                  {fmtHistDate(w.date)}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                {w.weight && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      borderRadius: 9999,
                                      padding: "2px 6px",
                                      backgroundColor: "rgba(240,240,240,0.08)",
                                      color: "rgba(240,240,240,0.50)",
                                    }}
                                  >
                                    {w.weight} lbs
                                  </span>
                                )}
                                {w.preg_stage && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      borderRadius: 9999,
                                      padding: "2px 6px",
                                      backgroundColor: "rgba(85,186,170,0.15)",
                                      color: "#55BAAA",
                                    }}
                                  >
                                    {w.preg_stage}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Treatments tab */}
                      {damHistoryTab === "treatments" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            {
                              product: "Penicillin G",
                              date: "Nov 10, 2025",
                              dose: "10 mL",
                              route: "IM",
                              reason: "Respiratory",
                              withdrawal: "Dec 10, 2025",
                            },
                            {
                              product: "Banamine",
                              date: "Aug 5, 2025",
                              dose: "20 mL",
                              route: "IV",
                              reason: "Foot rot",
                              withdrawal: "Aug 9, 2025",
                            },
                          ].map((t) => (
                            <div
                              key={t.date}
                              style={{ borderRadius: 8, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 12px" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{t.product}</span>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    borderRadius: 9999,
                                    padding: "1px 6px",
                                    backgroundColor: "rgba(85,186,170,0.15)",
                                    color: "#55BAAA",
                                  }}
                                >
                                  {t.route}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: "rgba(240,240,240,0.30)", marginTop: 2 }}>
                                {t.date} · {t.dose}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(240,240,240,0.40)", marginTop: 2 }}>
                                {t.reason}
                              </div>
                              <div style={{ fontSize: 10, color: "rgba(243,209,42,0.60)", marginTop: 4 }}>
                                Withdrawal: {t.withdrawal}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 16px" }}>
                <span style={{ fontSize: 13, color: "rgba(240,240,240,0.40)" }}>Type a dam tag to load history</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ 3. CALF CARD ═══ */}
        <div
          style={{
            borderRadius: 10,
            overflow: "hidden",
            background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>Calf</span>
        </div>
        <div
          style={{
            borderRadius: 12,
            backgroundColor: "white",
            border: "1px solid rgba(212,212,208,0.60)",
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

        {/* ═══ 4. DETAILS — collapsible ═══ */}
        <div
          style={{
            borderRadius: 10,
            overflow: "hidden",
            background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>Calf Details</span>
        </div>
        <Collapsible
          title="Details"
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
                {selectedNotes.length > 0 && renderNotes(true)}
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E2646", marginBottom: 6 }}>Quick Notes</div>
              {renderNotes(false)}
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
        <div
          style={{
            borderRadius: 10,
            overflow: "hidden",
            background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>Cow Traits</span>
        </div>
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
