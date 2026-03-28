import React from "react";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

/**
 * Centered empty-state block used when a list has no results.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => (
  <div className="py-12 text-center space-y-1.5">
    <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>{title}</div>
    {subtitle && (
      <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>{subtitle}</div>
    )}
  </div>
);

export default EmptyState;
