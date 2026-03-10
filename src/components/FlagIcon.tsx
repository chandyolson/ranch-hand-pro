import React from "react";
import { FLAG_HEX_MAP, type FlagColor } from "@/lib/constants";

const sizeMap = {
  sm: { w: 18, h: 16, stroke: 1.6 },
  md: { w: 24, h: 20, stroke: 2 },
  lg: { w: 32, h: 26, stroke: 2.4 },
};

interface FlagIconProps {
  color: FlagColor;
  size?: "sm" | "md" | "lg";
}

const FlagIcon: React.FC<FlagIconProps> = ({ color, size = "md" }) => {
  const fill = FLAG_HEX_MAP[color];
  const { w, h, stroke } = sizeMap[size];

  return (
    <svg width={w} height={h} viewBox="0 0 32 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="2" x2="3" y2="26" stroke={fill} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M3 3H27L23 9.5L27 16H3V3Z" fill={fill} />
    </svg>
  );
};

export default FlagIcon;
