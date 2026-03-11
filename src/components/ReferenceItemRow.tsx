import React from "react";

interface ReferenceItemRowProps {
  label: string;
  sublabel?: string;
  badge?: { text: string; color: string; bg: string };
  onEdit: () => void;
  onDelete: () => void;
  isDestructive?: boolean;
}

const ReferenceItemRow: React.FC<ReferenceItemRowProps> = ({ label, sublabel, badge, onEdit, onDelete }) => (
  <div className="flex items-center gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] last:border-b-0">
    <div className="flex-1 min-w-0">
      <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{label}</div>
      {sublabel && <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,26,26,0.45)", marginTop: 2 }}>{sublabel}</div>}
    </div>
    {badge && (
      <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: badge.bg, color: badge.color }}>
        {badge.text}
      </span>
    )}
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
        onClick={onEdit}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M13.5 1.5l3 3L6 15l-4 1 1-4L13.5 1.5z" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
        onClick={onDelete}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M3 5h12M6 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5m1.5 0v9.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V5" stroke="#D4183D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  </div>
);

export default ReferenceItemRow;