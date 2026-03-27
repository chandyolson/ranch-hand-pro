import React, { useState } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#fff",
        borderTop: "1px solid #D4D4D0",
        padding: "10px 16px 14px",
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {/* Mic placeholder */}
      <button
        disabled
        title="Voice input coming soon"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1.5px solid #D4D4D0",
          background: "#fff",
          cursor: "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="11" rx="3" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      {/* Text input */}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={disabled}
        placeholder="Ask about your operation..."
        style={{
          flex: 1,
          height: 40,
          borderRadius: 20,
          border: "1.5px solid #D4D4D0",
          background: "#F5F5F0",
          fontSize: 16,
          padding: "0 16px",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#55BAAA")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#D4D4D0")}
      />

      {/* Send */}
      <button
        disabled={!canSend}
        onClick={handleSend}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: canSend ? "#F3D12A" : "#D4D4D0",
          color: canSend ? "#0E2646" : "#999",
          cursor: canSend ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
};

export default ChatInput;
