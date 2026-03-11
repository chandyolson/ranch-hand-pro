import React, { ReactNode } from "react";

interface DataCardProps {
  title: string;
  values: string[];
  trailing?: ReactNode;
  subtitle?: string[];
  badge?: { label: string; bg: string; text: string };
}

const DataCard: React.FC<DataCardProps> = ({ title, values, trailing, subtitle, badge }) => {
  return (
    <div
      className="rounded-xl px-4 font-inter flex items-start justify-between gap-3"
      style={{ backgroundColor: "#0E2646", padding: "14px 16px" }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate" style={{ color: "#F0F0F0", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </div>
        <div className="truncate" style={{ color: "rgba(240,240,240,0.65)", fontSize: 13, fontWeight: 400 }}>
          {values.join(" · ")}
        </div>
        {subtitle && subtitle.length > 0 && (
          <div className="truncate" style={{ color: "rgba(240,240,240,0.45)", fontSize: 12, fontWeight: 400 }}>
            {subtitle.join(" · ")}
          </div>
        )}
      </div>
      {badge && (
        <div
          className="shrink-0 rounded-md px-2 py-0.5"
          style={{ backgroundColor: badge.bg, color: badge.text, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" }}
        >
          {badge.label}
        </div>
      )}
      {trailing && <div className="shrink-0 pt-0.5">{trailing}</div>}
    </div>
  );
};

export default DataCard;
