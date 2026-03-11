import React from "react";
import EditDeleteButtons from "./EditDeleteButtons";

interface ReferenceItemRowProps {
  label: string;
  sublabel?: string;
  badge?: { text: string; color: string; bg: string };
  onEdit: () => void;
  onDelete: () => void;
}

const ReferenceItemRow: React.FC<ReferenceItemRowProps> = ({ label, sublabel, badge, onEdit, onDelete }) => (
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
    <EditDeleteButtons onEdit={onEdit} onDelete={onDelete} />
  </div>
);

export default ReferenceItemRow;