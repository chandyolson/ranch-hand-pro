import React from "react";
import { useNavigate } from "react-router-dom";
import type { Violation } from "@/lib/data-quality/checks";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#E74C3C",
  high: "#F39C12",
  medium: "#F3D12A",
  low: "#888888",
};

interface Props {
  violation: Violation;
  onDismiss: (id: string) => void;
}

const ViolationCard: React.FC<Props> = ({ violation, onDismiss }) => {
  const navigate = useNavigate();
  const color = SEVERITY_COLORS[violation.severity] || "#888";

  const handleFix = () => {
    if (violation.animal_id && violation.table_source === "animals") {
      navigate(`/animals/${violation.animal_id}`);
    } else if (violation.animal_id && violation.table_source === "calving_records") {
      navigate(`/calving/${violation.record_id || violation.animal_id}`);
    } else if (violation.animal_id) {
      navigate(`/animals/${violation.animal_id}`);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
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
          {violation.severity}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{violation.rule}</span>
      </div>

      {/* Message */}
      <div style={{ fontSize: 14, color: "#1A1A1A", marginBottom: 6 }}>
        Tag <strong>{violation.tag}</strong> — {violation.message}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888" }}>Source: {violation.table_source}</span>
        <div style={{ display: "flex", gap: 12 }}>
          {violation.animal_id && (
            <button
              onClick={handleFix}
              style={{ background: "none", border: "none", fontSize: 12, color: "#55BAAA", fontWeight: 600, cursor: "pointer" }}
            >
              Fix
            </button>
          )}
          <button
            onClick={() => onDismiss(violation.id)}
            style={{ background: "none", border: "none", fontSize: 12, color: "#888", cursor: "pointer" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViolationCard;
