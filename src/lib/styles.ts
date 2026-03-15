import { COLORS } from "./constants";

export const LABEL_STYLE: React.CSSProperties = {
  width: 105,
  flexShrink: 0,
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.textOnLight,
  fontFamily: "'Inter', sans-serif",
  lineHeight: 1.3,
};

export const INPUT_BASE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 44,
  borderRadius: 8,
  border: "1px solid #D4D4D0",
  paddingLeft: 12,
  paddingRight: 12,
  fontFamily: "'Inter', sans-serif",
  fontSize: 16,
  fontWeight: 400,
  color: "#1A1A1A",
  outline: "none",
  backgroundColor: "#FFFFFF",
  boxSizing: "border-box" as const,
};

export const INPUT_READONLY: React.CSSProperties = {
  ...INPUT_BASE,
  backgroundColor: "#F3F3F5",
  cursor: "default",
};

export const SUB_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.10em",
  color: "rgba(26,26,26,0.35)",
  textTransform: "uppercase" as const,
  marginBottom: 4,
  fontFamily: "'Inter', sans-serif",
};

export const INPUT_CLS =
  "flex-1 h-11 min-w-0 rounded-lg border border-[#D4D4D0] bg-white px-3 text-base outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

// Focus ring handler (use ONLY when Tailwind focus: classes aren't available)
export const focusGold = (e: React.FocusEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = "#F3D12A";
  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
};

export const blurReset = (e: React.FocusEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = "#D4D4D0";
  (e.currentTarget as HTMLElement).style.boxShadow = "none";
};
