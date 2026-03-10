import React from "react";
import { LABEL_STYLE, INPUT_BASE } from "@/lib/styles";

interface ScoreSelectorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labels: readonly string[];
}

const PILL_THRESHOLD = 6;

const ScoreSelector: React.FC<ScoreSelectorProps> = ({ label, value, onChange, labels }) => {
  const optionCount = labels.length - 1; // index 0 is empty
  const usePills = optionCount <= PILL_THRESHOLD;

  return (
    <div className="flex items-start gap-2">
      <span style={{ ...LABEL_STYLE, paddingTop: usePills ? 6 : 10 }}>{label}</span>
      <div className="flex-1 min-w-0">
        {usePills ? (
          <div className="flex flex-wrap gap-1.5">
            {labels.slice(1).map((lbl, i) => {
              const scoreVal = String(i + 1);
              const selected = value === scoreVal;
              return (
                <button
                  key={scoreVal}
                  type="button"
                  onClick={() => onChange(selected ? "" : scoreVal)}
                  className="rounded-full px-3 py-1.5 font-['Inter'] cursor-pointer transition-all active:scale-[0.96]"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${selected ? "#0E2646" : "#D4D4D0"}`,
                    backgroundColor: selected ? "#0E2646" : "#FFFFFF",
                    color: selected ? "#FFFFFF" : "rgba(26,26,26,0.50)",
                  }}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        ) : (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
            style={{ ...INPUT_BASE, flex: undefined, width: "100%", fontSize: 16 }}
          >
            <option value="">Select…</option>
            {labels.slice(1).map((lbl, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {lbl}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default ScoreSelector;
