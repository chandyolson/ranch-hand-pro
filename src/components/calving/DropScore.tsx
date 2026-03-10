import React from "react";
import FieldRow from "./FieldRow";

interface DropScoreProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labels: readonly string[];
}

const DropScore: React.FC<DropScoreProps> = ({ label, value, onChange, labels }) => (
  <FieldRow label={label}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        minWidth: 0,
        height: 40,
        borderRadius: 8,
        border: "1px solid #D4D4D0",
        fontSize: 16,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: "#FFFFFF",
        color: "#1A1A1A",
        outline: "none",
        appearance: "auto" as const,
      }}
    >
      <option value="">Select…</option>
      {labels.slice(1).map((lbl, i) => (
        <option key={i + 1} value={String(i + 1)}>
          {lbl}
        </option>
      ))}
    </select>
  </FieldRow>
);

export default DropScore;
