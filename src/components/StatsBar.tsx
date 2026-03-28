import React from "react";

export interface StatItem {
  label: string;
  value: number | string | undefined;
}

interface StatsBarProps {
  stats: StatItem[];
  isLoading?: boolean;
}

/**
 * Gradient stats bar used at the top of list screens.
 * Renders a row of label/value pairs with dividers.
 */
const StatsBar: React.FC<StatsBarProps> = ({ stats, isLoading = false }) => (
  <div
    className="rounded-xl px-3 py-2.5 flex items-center justify-between"
    style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
  >
    {stats.map((stat, i) => (
      <div key={stat.label} className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>
            {isLoading ? "—" : (stat.value ?? "—")}
          </span>
          <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>
            {stat.label}
          </span>
        </div>
        {i < stats.length - 1 && (
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />
        )}
      </div>
    ))}
  </div>
);

export default StatsBar;
