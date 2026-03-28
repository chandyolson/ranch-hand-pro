import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors from lazy-loaded routes and shows a reload prompt
 * instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100vh", gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}>
            Something went wrong
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              backgroundColor: "#0E2646", color: "white",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
