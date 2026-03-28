import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { runAutoFlagRules, type FlagSuggestion } from "@/lib/data-quality/auto-flag-rules";

const SKIPPED_KEY = "dq_autoflag_skipped";
const TIER_COLORS: Record<string, string> = {
  cull: "#9B2335",
  production: "#F3D12A",
  management: "#55BAAA",
};
const TIER_LABELS: Record<string, string> = {
  cull: "Cull",
  production: "Production",
  management: "Management",
};

const getSkipped = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SKIPPED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const AutoFlagSuggestions: React.FC = () => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const [suggestions, setSuggestions] = useState<FlagSuggestion[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(getSkipped);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState<string | null>(null);

  useEffect(() => {
    if (!operationId) return;
    setLoading(true);
    runAutoFlagRules(operationId).then((s) => {
      setSuggestions(s);
      setLoading(false);
    });
  }, [operationId]);

  const visible = suggestions.filter((s) => !skipped.has(`${s.animal_id}|${s.flag_tier}|${s.flag_name}`));
  const count = visible.length;

  const handleSkip = (s: FlagSuggestion) => {
    const key = `${s.animal_id}|${s.flag_tier}|${s.flag_name}`;
    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem(SKIPPED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const handleFlag = async (s: FlagSuggestion) => {
    setFlagging(s.id);
    try {
      const { error } = await supabase.from("animal_flags").insert({
        animal_id: s.animal_id,
        operation_id: operationId,
        flag_tier: s.flag_tier,
        flag_name: s.flag_name,
        flag_note: s.flag_note,
      });
      if (error) throw error;
      if (navigator.vibrate) navigator.vibrate(15);
      showToast("success", `Flagged ${s.tag} as ${TIER_LABELS[s.flag_tier] || s.flag_tier} — ${s.flag_name}`);
      // Remove from list
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create flag.");
    } finally {
      setFlagging(null);
    }
  };

  if (loading && !expanded) {
    return (
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChevronRight size={16} color="#55BAAA" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}>Auto-Flag Suggestions</span>
          <span style={{ fontSize: 11, color: "#888" }}>scanning...</span>
        </div>
      </div>
    );
  }

  if (count === 0 && !loading) return null;

  return (
    <div style={{ margin: "16px 16px 0" }}>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          borderRadius: expanded ? "8px 8px 0 0" : 8,
          padding: "12px 14px",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {expanded ? <ChevronDown size={16} color="#55BAAA" /> : <ChevronRight size={16} color="#55BAAA" />}
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", flex: 1 }}>Auto-Flag Suggestions</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            background: "#55BAAA",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 6px",
          }}
        >
          {count}
        </span>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div style={{ background: "#F5F5F0", borderRadius: "0 0 8px 8px", padding: "8px 0 4px" }}>
          {visible.map((s) => {
            const color = TIER_COLORS[s.flag_tier] || "#888";
            const isFlagging = flagging === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  margin: "0 0 8px",
                  borderLeft: `3px solid ${color}`,
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>{s.tag}</span>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 10,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#fff",
                      background: color,
                    }}
                  >
                    {TIER_LABELS[s.flag_tier] || s.flag_tier}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{s.flag_name}</span>
                </div>

                {/* Reason */}
                <div style={{ fontSize: 13, color: "#666", marginBottom: 8, lineHeight: 1.4 }}>{s.reason}</div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={() => handleSkip(s)}
                    disabled={isFlagging}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 12,
                      color: "#888",
                      cursor: "pointer",
                    }}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleFlag(s)}
                    disabled={isFlagging}
                    style={{
                      borderRadius: 20,
                      border: "none",
                      background: "#55BAAA",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 16px",
                      cursor: isFlagging ? "not-allowed" : "pointer",
                      opacity: isFlagging ? 0.5 : 1,
                    }}
                  >
                    {isFlagging ? "Flagging..." : "Flag"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutoFlagSuggestions;
