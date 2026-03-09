import React from "react";
import { useNavigate } from "react-router-dom";
import PillButton from "./PillButton";

interface PlaceholderScreenProps {
  title: string;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title }) => {
  const navigate = useNavigate();
  const initials = title.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 60, height: 60, backgroundColor: "#0E2646", color: "#FFFFFF", fontSize: 20, fontWeight: 700 }}
      >
        {initials}
      </div>
      <div style={{ color: "#0E2646", fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ color: "rgba(26,26,26,0.40)", fontSize: 14 }}>This screen is coming soon</div>
      <PillButton onClick={() => navigate(-1)}>← Go Back</PillButton>
    </div>
  );
};

export default PlaceholderScreen;
