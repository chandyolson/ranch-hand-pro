import React from "react";

interface CowWorkProjectCardProps {
  id: string;
  name: string;
  date: string;
  status: "pending" | "in-progress" | "completed";
  type: string;
  group: string;
  headCount: number;
  workedCount: number;
  onClick: () => void;
}

const statusConfig = {
  pending: { bg: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)", label: "PENDING" },
  "in-progress": { bg: "rgba(85,186,170,0.15)", color: "#55BAAA", label: "IN PROGRESS" },
  completed: { bg: "rgba(243,209,42,0.12)", color: "#F3D12A", label: "COMPLETED" },
};

const CowWorkProjectCard: React.FC<CowWorkProjectCardProps> = ({
  name, date, status, type, group, headCount, workedCount, onClick,
}) => {
  const s = statusConfig[status];
  const pct = headCount > 0 ? Math.round((workedCount / headCount) * 100) : 0;

  return (
    <div
      className="bg-[#0E2646] rounded-xl px-4 py-4 font-['Inter'] cursor-pointer active:scale-[0.98] transition-all duration-150"
      onClick={onClick}
    >
      {/* Row 1 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{name}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span
            className="rounded-full"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 9px", backgroundColor: s.bg, color: s.color }}
          >
            {s.label}
          </span>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-2 mt-1">
        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)" }}>{date}</span>
        <span className="shrink-0" style={{ width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <span
          className="rounded-full"
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.15)", color: "#F3D12A" }}
        >
          {type}
        </span>
        <span className="truncate" style={{ fontSize: 11, fontWeight: 500, color: "rgba(168,230,218,0.70)" }}>{group}</span>
      </div>

      {/* Row 3 — progress */}
      <div className="mt-3">
        <div className="w-full rounded-full" style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="rounded-full" style={{ height: 4, backgroundColor: "#55BAAA", width: `${pct}%`, transition: "width 300ms" }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,240,240,0.50)" }}>{workedCount} worked</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.30)" }}>{headCount} head</span>
        </div>
      </div>
    </div>
  );
};

export default CowWorkProjectCard;
