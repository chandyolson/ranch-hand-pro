import React, { useState } from "react";
import EditDeleteButtons from "./EditDeleteButtons";

interface ReferenceItemRowProps {
  label: string;
  sublabel?: string;
  badge?: { text: string; color: string; bg: string };
  onEdit: (newLabel: string, newSublabel?: string) => void;
  onDelete: () => void;
  editableSublabel?: boolean;
}

const ReferenceItemRow: React.FC<ReferenceItemRowProps> = ({ label, sublabel, badge, onEdit, onDelete, editableSublabel }) => {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editSublabel, setEditSublabel] = useState(sublabel || "");

  const handleStartEdit = () => {
    setEditLabel(label);
    setEditSublabel(sublabel || "");
    setEditing(true);
  };

  const handleSave = () => {
    if (!editLabel.trim()) return;
    onEdit(editLabel.trim(), editableSublabel ? editSublabel.trim() : undefined);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="py-2.5 border-b border-[rgba(26,26,26,0.06)] last:border-b-0 space-y-2">
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          style={{
            width: "100%", height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
            padding: "0 12px", fontSize: 16, color: "#1A1A1A", outline: "none",
            boxSizing: "border-box" as const, fontFamily: "'Inter', sans-serif",
          }}
        />
        {editableSublabel && (
          <input
            type="text"
            value={editSublabel}
            onChange={(e) => setEditSublabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            placeholder="Description (optional)"
            style={{
              width: "100%", height: 32, borderRadius: 8, border: "1px solid #D4D4D0",
              padding: "0 12px", fontSize: 14, color: "#1A1A1A", outline: "none",
              boxSizing: "border-box" as const, fontFamily: "'Inter', sans-serif",
            }}
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 rounded-full py-1.5 cursor-pointer active:scale-[0.95]"
            style={{ border: "1px solid #D4D4D0", backgroundColor: "white", fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-full py-1.5 cursor-pointer active:scale-[0.95]"
            style={{ border: "none", backgroundColor: "#0E2646", fontSize: 12, fontWeight: 700, color: "white" }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[rgba(26,26,26,0.06)] last:border-b-0 min-w-0">
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{label}</div>
        {sublabel && <div className="truncate" style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,26,26,0.45)", marginTop: 1 }}>{sublabel}</div>}
      </div>
      {badge && (
        <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: badge.bg, color: badge.color }}>
          {badge.text}
        </span>
      )}
      <EditDeleteButtons onEdit={handleStartEdit} onDelete={onDelete} />
    </div>
  );
};

export default ReferenceItemRow;