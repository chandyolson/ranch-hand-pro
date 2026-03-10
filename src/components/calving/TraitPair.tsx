import React, { useState } from "react";
import PillScore from "./PillScore";
import DropScore from "./DropScore";

interface TraitPairProps {
  titleA: string;
  titleB: string;
  valueA: string;
  valueB: string;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
  labelsA: readonly string[];
  labelsB: readonly string[];
}

const TraitPair: React.FC<TraitPairProps> = ({
  titleA, titleB, valueA, valueB, onChangeA, onChangeB, labelsA, labelsB,
}) => {
  const [open, setOpen] = useState(false);
  const useDropdowns = labelsA.length > 7 && labelsB.length > 7;

  const summaryPills: { label: string; val: string }[] = [];
  if (valueA && labelsA[Number(valueA)]) summaryPills.push({ label: labelsA[Number(valueA)], val: valueA });
  if (valueB && labelsB[Number(valueB)]) summaryPills.push({ label: labelsB[Number(valueB)], val: valueB });

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid rgba(212,212,208,0.50)",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "10px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{titleA}</span>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.25)", margin: "0 6px" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{titleB}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!open && summaryPills.map((p) => (
            <span
              key={p.label}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#0E2646",
                backgroundColor: "rgba(14,38,70,0.08)",
                borderRadius: 9999,
                padding: "2px 8px",
              }}
            >
              {p.label}
            </span>
          ))}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
          >
            <path d="M4 6L8 10L12 6" stroke="rgba(26,26,26,0.35)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(212,212,208,0.40)", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 10 }} />
          {useDropdowns ? (
            <>
              <DropScore label={titleA} value={valueA} onChange={onChangeA} labels={labelsA} />
              <DropScore label={titleB} value={valueB} onChange={onChangeB} labels={labelsB} />
            </>
          ) : (
            <>
              <PillScore label={titleA} value={valueA} onChange={onChangeA} labels={labelsA} />
              <PillScore label={titleB} value={valueB} onChange={onChangeB} labels={labelsB} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TraitPair;
