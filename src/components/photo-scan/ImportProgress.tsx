import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  total: number;
  completed: number;
  errors: { row: number; message: string }[];
  done: boolean;
  onScanAnother: () => void;
  onViewRecords?: () => void;
}

const ImportProgress: React.FC<Props> = ({ total, completed, errors, done, onScanAnother, onViewRecords }) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <p style={{ fontSize: 17, fontWeight: 700, color: "#0E2646" }}>
        {done ? "Import Complete" : "Importing Records…"}
      </p>

      {/* Progress bar */}
      <div style={{ background: "#E8E8E3", borderRadius: 6, height: 8 }}>
        <div
          style={{
            background: errors.length > 0 ? "#F3D12A" : "#55BAAA",
            borderRadius: 6,
            height: 8,
            width: `${pct}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p style={{ fontSize: 13, color: "#888" }}>{completed} of {total} records saved</p>

      {done && errors.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#DCFCE7", borderRadius: 10, padding: "12px 14px" }}>
          <CheckCircle size={20} color="#16A34A" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}>
            {completed} records created from photo
          </span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "#FEE2E2", borderRadius: 8, padding: "8px 10px" }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#DC2626" }}>Row {e.row + 1}: {e.message}</span>
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={onScanAnother}
            className="flex-1 active:scale-[0.97]"
            style={{ height: 40, borderRadius: 20, background: "#F3D12A", border: "none", fontSize: 13, fontWeight: 700, color: "#0E2646", cursor: "pointer" }}
          >
            Scan Another
          </button>
          {onViewRecords && (
            <button
              onClick={onViewRecords}
              className="flex-1 active:scale-[0.97]"
              style={{ height: 40, borderRadius: 20, border: "1.5px solid #0E2646", background: "transparent", fontSize: 13, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}
            >
              View Records
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
