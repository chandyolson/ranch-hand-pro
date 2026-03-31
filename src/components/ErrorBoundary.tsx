import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Future: send to error tracking service
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#F5F5F0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 32,
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
              border: "1px solid rgba(212,212,208,0.60)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: "rgba(212,24,61,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 22,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4183D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0E2646", marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.50)", marginBottom: 24, lineHeight: 1.5 }}>
              The app hit an unexpected error. Your data is safe — tap below to reload.
            </div>
            <button
              onClick={this.handleReload}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "none",
                background: "#0E2646",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Back to Dashboard
            </button>
            {this.state.error && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#F5F5F0",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "rgba(26,26,26,0.35)",
                  textAlign: "left",
                  wordBreak: "break-word",
                  maxHeight: 80,
                  overflow: "auto",
                }}
              >
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
