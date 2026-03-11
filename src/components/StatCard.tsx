import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  gradientAngle?: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, gradientAngle = 145, onClick }) => {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col font-inter"
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)`,
        minHeight: 72,
        cursor: onClick ? "pointer" : undefined,
        transition: "transform 100ms",
      }}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...(onClick ? { className: "rounded-xl px-3 py-2.5 flex flex-col font-inter cursor-pointer active:scale-[0.97] transition-transform duration-100" } : {})}
    >
      <span style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
        {label}
      </span>
      <div className="flex-1" />
      <span style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </span>
      <span style={{ color: "#A8E6DA", fontSize: 11, fontWeight: 500, lineHeight: 1.3, marginTop: 6 }}>
        {subtitle}
      </span>
    </div>
  );
};

export default StatCard;
