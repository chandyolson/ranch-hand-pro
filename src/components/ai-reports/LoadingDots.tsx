import React from "react";

const LoadingDots: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#55BAAA",
          display: "inline-block",
          animation: `aiDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
    <style>{`
      @keyframes aiDotPulse {
        0%, 100% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </div>
);

export default LoadingDots;
