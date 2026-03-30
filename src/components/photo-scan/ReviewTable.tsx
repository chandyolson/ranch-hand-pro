import React from "react";
import { X, Plus } from "lucide-react";
import type { RecordContext } from "./CaptureStep";

const COLUMNS: Record<RecordContext, string[]> = {
  calving: ["Dam Tag", "Date", "Calf Sex", "Weight", "Status", "Assistance", "Sire", "Notes"],
  treatment: ["Tag", "Date", "Disease", "Products", "Notes"],
  tally: ["Tag", "EID", "Value", "Category", "Notes"],
  receipt: ["Tag", "Weight", "Price/lb", "Total", "Description"],
  general: [],
};

interface Props {
  context: RecordContext;
  rows: Record<string, string>[];
  dynamicHeaders?: string[];
  confidence: "high" | "medium" | "low";
  aiNotes?: string;
  onChange: (rowIdx: number, col: string, value: string) => void;
  onDeleteRow: (rowIdx: number) => void;
  onAddRow: () => void;
  onBack: () => void;
  onImport: () => void;
  importing: boolean;
}

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: "#DCFCE7", color: "#16A34A", label: "High Confidence" },
  medium: { bg: "#FFF9DB", color: "#B8860B", label: "Medium Confidence — Review Carefully" },
  low: { bg: "#FEE2E2", color: "#DC2626", label: "Low Confidence — Check All Fields" },
};

const ReviewTable: React.FC<Props> = ({
  context, rows, dynamicHeaders, confidence, aiNotes,
  onChange, onDeleteRow, onAddRow, onBack, onImport, importing,
}) => {
  const headers = context === "general" && dynamicHeaders?.length
    ? dynamicHeaders
    : COLUMNS[context];

  const cs = CONFIDENCE_STYLE[confidence] ?? CONFIDENCE_STYLE.medium;

  return (
    <div className="space-y-3">
      <p style={{ fontSize: 17, fontWeight: 700, color: "#0E2646" }}>Review Extracted Data</p>

      {/* Confidence badge */}
      <span style={{ display: "inline-block", borderRadius: 12, padding: "4px 12px", fontSize: 12, fontWeight: 600, background: cs.bg, color: cs.color }}>
        {cs.label}
      </span>

      {aiNotes && (
        <div style={{ borderLeft: "3px solid #F3D12A", background: "#FFFDF0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0E2646" }}>
          {aiNotes}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: headers.length * 110 }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", padding: "6px 6px", textAlign: "left", borderBottom: "1px solid #D4D4D0", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
              <th style={{ width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {headers.map((h) => (
                  <td key={h} style={{ padding: "4px 4px", borderBottom: "1px solid #EEE" }}>
                    <input
                      value={row[h] ?? ""}
                      onChange={(e) => onChange(ri, h, e.target.value)}
                      style={{
                        width: "100%",
                        fontSize: 14,
                        border: "1px solid transparent",
                        borderRadius: 6,
                        padding: "4px 6px",
                        background: "transparent",
                        outline: "none",
                        fontFamily: "'Inter', sans-serif",
                        minWidth: 80,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#F3D12A"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                    />
                  </td>
                ))}
                <td>
                  <button onClick={() => onDeleteRow(ri)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <X size={14} color="#E74C3C" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={onAddRow} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#55BAAA", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        <Plus size={14} /> Add Row
      </button>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 active:scale-[0.97]"
          style={{ height: 40, borderRadius: 20, border: "1.5px solid #D4D4D0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}
        >
          Back
        </button>
        <button
          onClick={onImport}
          disabled={importing || rows.length === 0}
          className="flex-1 active:scale-[0.97]"
          style={{ height: 40, borderRadius: 20, background: "#F3D12A", border: "none", fontSize: 13, fontWeight: 700, color: "#0E2646", cursor: importing ? "wait" : "pointer", opacity: importing ? 0.7 : 1 }}
        >
          {importing ? "Importing…" : `Import ${rows.length} Records`}
        </button>
      </div>
    </div>
  );
};

export default ReviewTable;
