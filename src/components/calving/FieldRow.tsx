import React from "react";

interface FieldRowProps {
  label: string;
  req?: boolean;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, req, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
    <span
      style={{
        width: 105,
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 600,
        color: "#1A1A1A",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {req && <span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>}
    </span>
    <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex" }}>{children}</div>
  </div>
);

export default FieldRow;
