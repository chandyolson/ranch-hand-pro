import React from "react";

const TEMPLATES = [
  {
    label: "Preg Check Summary",
    prompt:
      "Generate a pregnancy check summary for the most recent preg check project. Include total head count, count and percentage for each preg stage (Bull Bred, AI, Open, Embryo), and list all Open animals with tag, tag color, and year born.",
  },
  {
    label: "Calving Report",
    prompt:
      "Generate a calving season report for the current year. Include total calves born, live vs dead count with death rate percentage, average birth weight, average birth weight by sire, and calving ease breakdown by assistance score.",
  },
  {
    label: "Herd Inventory",
    prompt:
      "Generate a herd inventory showing total active head count broken down by animal type, sex, breed, and status.",
  },
  {
    label: "Cull List",
    prompt:
      "Generate a cull list showing all animals with active cull flags. Include tag, tag color, breed, year born, flag name, flag note, and when the flag was created.",
  },
  {
    label: "Herd Scan",
    prompt:
      "Run a comprehensive herd health scan for this operation. Analyze reproductive health (open rates from most recent preg check), calving performance (current year vs prior year), sire evaluation (birth weights and calving ease by sire), treatment patterns (last 12 months), herd age profile, and active flags. Only report findings that are actionable — skip areas with no concerns.",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}

const TemplatePills: React.FC<Props> = ({ onSelect, disabled }) => (
  <div
    style={{
      background: "#fff",
      borderBottom: "1px solid #D4D4D0",
      padding: "10px 16px",
      display: "flex",
      gap: 8,
      overflowX: "auto",
    }}
  >
    {TEMPLATES.map((t) => (
      <button
        key={t.label}
        disabled={disabled}
        onClick={() => onSelect(t.prompt)}
        style={{
          borderRadius: 20,
          border: "1.5px solid #0E2646",
          background: "#fff",
          color: "#0E2646",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          padding: "6px 14px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export default TemplatePills;
