import React from "react";

const categoryConfig = {
  "invoice":     { label: "Invoice / Receipt", color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  "cattle-note": { label: "Cattle Note",       color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  "document":    { label: "Document",          color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  "repairs":     { label: "Repairs",           color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
};

interface RedBookCardProps {
  id: string;
  title: string;
  body?: string;
  category: "invoice" | "cattle-note" | "document" | "repairs";
  date: string;
  authorInitials: string;
  isPinned: boolean;
  hasAction: boolean;
  attachmentCount: number;
  onClick: () => void;
}

const RedBookCard: React.FC<RedBookCardProps> = ({
  title, body, category, date, authorInitials, isPinned, hasAction, attachmentCount, onClick,
}) => {
  const cat = categoryConfig[category];

  return (
    <div
      className="bg-[#0E2646] rounded-xl px-4 py-4 font-['Inter'] cursor-pointer active:scale-[0.98] transition-all duration-150"
      onClick={onClick}
    >
      {/* Row 1 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center" style={{ fontSize: 15, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
            {isPinned && (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="#F3D12A" className="shrink-0 mr-1">
                <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1-.707.708l-.89-.89-3.535 3.535.708 4.244a.5.5 0 0 1-.848.39L6.354 10.3l-4.243 4.243a.5.5 0 1 1-.707-.707L5.646 9.594 2.141 6.088a.5.5 0 0 1 .39-.848l4.244.708L10.31 2.413l-.89-.89a.5.5 0 0 1 .407-.8z" />
              </svg>
            )}
            <span className="truncate">{title}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {hasAction && (
            <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.20)", color: "#D4606E" }}>
              ACTION
            </span>
          )}
          <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: cat.bg, color: cat.color }}>
            {cat.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Row 2 — body */}
      {body && (
        <div
          className="mt-1.5 overflow-hidden"
          style={{
            fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.45)", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}
        >
          {body}
        </div>
      )}

      {/* Row 3 — meta */}
      <div className="flex items-center gap-2 mt-2.5">
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{ width: 22, height: 22, backgroundColor: "rgba(255,255,255,0.10)", fontSize: 9, fontWeight: 700, color: "rgba(240,240,240,0.70)" }}
        >
          {authorInitials}
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)" }}>{date}</span>
        <span className="flex-1" />
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(240,240,240,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)" }}>{attachmentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedBookCard;
