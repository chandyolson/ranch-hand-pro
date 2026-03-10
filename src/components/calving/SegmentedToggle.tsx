import React from "react";

interface SegmentedToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors?: Record<string, { bg: string; text: string }>;
}

const SegmentedToggle: React.FC<SegmentedToggleProps> = ({ options, value, onChange, colors }) => (
  <div
    style={{
      display: "flex",
      gap: 0,
      flex: 1,
      minWidth: 0,
      border: "1px solid #D4D4D0",
      borderRadius: 8,
      overflow: "hidden",
      height: 40,
    }}
  >
    {options.map((opt, i) => {
      const active = value === opt.value;
      const colorSet = colors?.[opt.value];
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 0,
            border: "none",
            borderRight: i < options.length - 1 ? "1px solid #D4D4D0" : "none",
            backgroundColor: active ? (colorSet?.bg ?? "#0E2646") : "#FFFFFF",
            color: active ? (colorSet?.text ?? "#FFFFFF") : "rgba(26,26,26,0.40)",
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default SegmentedToggle;
