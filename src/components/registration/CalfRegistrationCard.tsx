import React from "react";

export interface CalfRow {
  id: string;
  calfTag: string;
  calfSex: string;
  birthDate: string;
  birthWeight: string;
  breed: string;
  damTag: string;
  damRegName: string;
  damRegNumber: string;
  sireTag: string;
  sireRegName: string;
  sireRegNumber: string;
  ready: boolean;
}

interface Props {
  calf: CalfRow;
  selected: boolean;
  onToggle: (id: string) => void;
}

const CalfRegistrationCard: React.FC<Props> = ({ calf, selected, onToggle }) => {
  const statusColor = calf.ready ? "#55BAAA" : "#F3D12A";
  const statusLabel = calf.ready ? "Ready" : "Incomplete";

  return (
    <button
      onClick={() => onToggle(calf.id)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: 12,
        borderRadius: 8,
        border: selected ? "1.5px solid #55BAAA" : "1px solid #D4D4D0",
        background: selected ? "rgba(85,186,170,0.06)" : "#fff",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          flexShrink: 0,
          marginTop: 1,
          border: selected ? "none" : "1.5px solid #D4D4D0",
          background: selected ? "#55BAAA" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}>{calf.calfTag}</span>
          <span style={{ fontSize: 12, color: "#888" }}>{calf.calfSex}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}15`,
              borderRadius: 10,
              padding: "2px 8px",
              marginLeft: "auto",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
          <div>Born: {calf.birthDate}{calf.birthWeight ? ` · ${calf.birthWeight} lbs` : ""}{calf.breed ? ` · ${calf.breed}` : ""}</div>
          <div>Dam: {calf.damTag}{calf.damRegNumber ? ` — ${calf.damRegNumber}` : <span style={{ color: "#F3D12A" }}> (no reg #)</span>}</div>
          <div>Sire: {calf.sireTag || "Unknown"}{calf.sireRegNumber ? ` — ${calf.sireRegNumber}` : calf.sireTag ? <span style={{ color: "#F3D12A" }}> (no reg #)</span> : ""}</div>
        </div>
      </div>
    </button>
  );
};

export default CalfRegistrationCard;
