import React from "react";
import { useChuteSideToast } from "@/components/ToastContext";

interface ReferenceItemRowProps {
  label: string;
  sublabel?: string;
  badge?: { text: string; color: string; bg: string };
  onEdit: () => void;
  onDelete: () => void;
  isDestructive?: boolean;
}

const ReferenceItemRow: React.FC<ReferenceItemRowProps> = ({ label, sublabel, badge, onEdit, onDelete }) => (
  <div className="flex items-center gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] font-['Inter'] last:border-b-0">
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
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
        onClick={onEdit}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
        onClick={onDelete}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4183d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  </div>
);

export default ReferenceItemRow;
