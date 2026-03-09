import React from "react";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline";
}

const sizeStyles = {
  sm: { fontSize: 12, fontWeight: 600, padding: "6px 16px" },
  md: { fontSize: 14, fontWeight: 700, padding: "10px 24px" },
  lg: { fontSize: 16, fontWeight: 700, padding: "13px 32px" },
};

const PillButton: React.FC<PillButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  disabled,
  className = "",
  style,
  ...props
}) => {
  const s = sizeStyles[size];

  const baseStyle: React.CSSProperties = {
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    padding: s.padding,
    borderRadius: 9999,
    fontFamily: "'Inter', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 150ms",
    cursor: disabled ? "not-allowed" : "pointer",
    ...style,
  };

  if (variant === "primary") {
    Object.assign(baseStyle, {
      backgroundColor: disabled ? "#F3D12A80" : "#F3D12A",
      color: "#1A1A1A",
      border: "none",
      boxShadow: disabled ? "none" : "0 2px 10px rgba(243,209,42,0.35)",
      opacity: disabled ? 0.4 : 1,
    });
  } else {
    Object.assign(baseStyle, {
      backgroundColor: "transparent",
      border: "2px solid #F3D12A",
      color: "#1A1A1A",
    });
  }

  return (
    <button
      className={`active:scale-[0.97] ${className}`}
      style={baseStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default PillButton;
