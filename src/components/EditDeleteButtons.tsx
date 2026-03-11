import React, { useState } from "react";

interface EditDeleteButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
}

const EditDeleteButtons: React.FC<EditDeleteButtonsProps> = ({ onEdit, onDelete }) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          className="rounded-full px-3 py-1 cursor-pointer active:scale-[0.95] transition-all"
          style={{ backgroundColor: "rgba(212,24,61,0.10)", border: "1px solid rgba(212,24,61,0.30)", fontSize: 11, fontWeight: 700, color: "#D4183D" }}
          onClick={() => { onDelete(); setConfirming(false); }}
        >
          Delete
        </button>
        <button
          className="rounded-full px-3 py-1 cursor-pointer active:scale-[0.95] transition-all"
          style={{ backgroundColor: "rgba(26,26,26,0.04)", border: "1px solid #D4D4D0", fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
        onClick={onEdit}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M13.5 1.5l3 3L6 15l-4 1 1-4L13.5 1.5z" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
        style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
        onClick={() => setConfirming(true)}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M3 5h12M6 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5m1.5 0v9.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V5" stroke="#D4183D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
};

export default EditDeleteButtons;
