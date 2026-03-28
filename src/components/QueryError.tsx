import React from "react";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

const QueryError: React.FC<QueryErrorProps> = ({
  message = "Couldn't load data",
  onRetry,
}) => (
  <div className="py-12 text-center space-y-3">
    <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
      {message}
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          padding: "7px 18px", borderRadius: 10, border: "none",
          backgroundColor: "#0E2646", color: "white",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        Retry
      </button>
    )}
  </div>
);

export default QueryError;
