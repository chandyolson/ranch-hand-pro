import React, { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsedContent?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  collapsedContent,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-white overflow-hidden font-inter" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
      <button
        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer bg-white active:bg-page-bg transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span style={{ color: "#1A1A1A", fontSize: 15, fontWeight: 600 }}>{title}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms",
          }}
        >
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!open && collapsedContent && (
        <div className="px-4 pb-3" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
          {collapsedContent}
        </div>
      )}

      <div
        style={{
          maxHeight: open ? 600 : 0,
          opacity: open ? 1 : 0,
          transition: "all 250ms ease-in-out",
          overflow: "hidden",
        }}
      >
        <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
