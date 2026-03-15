import React, { useState } from "react";
import { QUICK_NOTES, QUICK_NOTE_PILL_COLORS } from "@/lib/constants";

const SOLID_ACTIVE: Record<string, { bg: string; border: string; text: string }> = {
  red: { bg: "#9B2335", border: "#9B2335", text: "#FFFFFF" },
  gold: { bg: "#B8860B", border: "#B8860B", text: "#FFFFFF" },
  teal: { bg: "#55BAAA", border: "#3D9A8B", text: "#FFFFFF" },
  none: { bg: "#717182", border: "#5A5A6A", text: "#FFFFFF" },
};

interface CollapsibleQuickNotesProps {
  selectedNotes: string[];
  onToggle: (label: string) => void;
  /** Filter context: "all" for cow work/animal, "calving" includes calving-only notes */
  context?: "all" | "calving";
  /** Start expanded? Default false */
  defaultOpen?: boolean;
}

export default function CollapsibleQuickNotes({
  selectedNotes,
  onToggle,
  context = "all",
  defaultOpen = false,
}: CollapsibleQuickNotesProps) {
  const [open, setOpen] = useState(defaultOpen);

  const notes = QUICK_NOTES.filter(n =>
    context === "calving" ? true : n.context === "all"
  );

  return (
    <div>
      {/* Header — tap to toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0E2646" }}>Quick Notes</span>
          {selectedNotes.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#55BAAA" }}>{selectedNotes.length}</span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsed: selected pills only */}
      {!open && selectedNotes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {selectedNotes.map(label => {
            const n = QUICK_NOTES.find(q => q.label === label);
            const tier = n?.flag || "none";
            const s = SOLID_ACTIVE[tier];
            return (
              <span key={label} style={{
                borderRadius: 9999, padding: "3px 9px", fontSize: 10, fontWeight: 700,
                backgroundColor: s.bg, border: `1.5px solid ${s.border}`, color: s.text,
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
              </span>
            );
          })}
        </div>
      )}
      {!open && selectedNotes.length === 0 && (
        <div style={{ fontSize: 11, color: "rgba(26,26,26,0.30)", marginTop: 4 }}>None selected</div>
      )}

      {/* Expanded: all pills for toggling */}
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {notes.map(n => {
            const active = selectedNotes.includes(n.label);
            const c = QUICK_NOTE_PILL_COLORS[n.flag || "none"];
            const tier = n.flag || "none";
            const s = active ? SOLID_ACTIVE[tier] : null;
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => onToggle(n.label)}
                style={{
                  borderRadius: 9999, padding: "4px 10px", fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  backgroundColor: active ? s!.bg : c.bg,
                  border: `${active ? 2 : 1}px solid ${active ? s!.border : c.border}`,
                  color: active ? s!.text : c.text,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                  transition: "all 100ms",
                }}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {n.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
