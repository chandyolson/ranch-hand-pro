import React from "react";

interface PillScoreProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labels: readonly string[];
}

const PillScore: React.FC<PillScoreProps> = ({ label, value, onChange, labels }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
    <span
      style={{
        width: 85,
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 600,
        color: "#1A1A1A",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        paddingTop: 6,
      }}
    >
      {label}
    </span>
    <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 5, minWidth: 0 }}>
      {labels.slice(1).map((lbl, i) => {
        const scoreVal = String(i + 1);
        const active = value === scoreVal;
        return (
          <button
            key={scoreVal}
            type="button"
            onClick={() => onChange(active ? "" : scoreVal)}
            style={{
              borderRadius: 9999,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              border: active ? "2px solid #0E2646" : "1px solid #D4D4D0",
              backgroundColor: active ? "#0E2646" : "#FFFFFF",
              color: active ? "#FFFFFF" : "rgba(26,26,26,0.55)",
              cursor: "pointer",
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  </div>
);

export default PillScore;
