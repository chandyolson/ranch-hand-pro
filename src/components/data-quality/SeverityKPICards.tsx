import React from "react";

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#E74C3C" },
  high: { label: "High", color: "#F39C12" },
  medium: { label: "Medium", color: "#F3D12A" },
  low: { label: "Low", color: "#888888" },
};

interface Props {
  counts: Record<Severity, number>;
  activeSeverity: Severity | null;
  onSelect: (severity: Severity | null) => void;
}

const SeverityKPICards: React.FC<Props> = ({ counts, activeSeverity, onSelect }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px 16px 0" }}>
      {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => {
        const { label, color } = SEVERITY_CONFIG[sev];
        const isActive = activeSeverity === sev;
        return (
          <button
            key={sev}
            onClick={() => onSelect(isActive ? null : sev)}
            style={{
              background: isActive ? `${color}15` : "#fff",
              borderRadius: 8,
              padding: 12,
              border: isActive ? `1px solid ${color}` : "1px solid transparent",
              borderLeft: `3px solid ${color}`,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A" }}>{counts[sev]}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
          </button>
        );
      })}
    </div>
  );
};

export default SeverityKPICards;
