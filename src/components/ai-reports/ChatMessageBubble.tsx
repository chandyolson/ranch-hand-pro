import React from "react";
import ChatChart from "./ChatChart";
import ChatTable from "./ChatTable";
import { useChuteSideToast } from "@/components/ToastContext";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  chart_config?: any;
  table_data?: { headers: string[]; rows: (string | number)[][] };
  export_available?: boolean;
  follow_up_suggestions?: string[];
  isError?: boolean;
}

interface Props {
  message: ChatMessage;
  onFollowUp: (text: string) => void;
}

const ChatMessageBubble: React.FC<Props> = ({ message, onFollowUp }) => {
  const { showToast } = useChuteSideToast();
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "calc(100% - 48px)",
          ...(isUser ? { paddingLeft: 48 } : { paddingRight: 48 }),
        }}
      >
        <div
          style={{
            background: message.isError
              ? "#FDF0EF"
              : isUser
              ? "#0E2646"
              : "#fff",
            color: isUser ? "#F0F0F0" : "#1A1A1A",
            border: message.isError
              ? "1px solid #F5C6C2"
              : isUser
              ? "none"
              : "1px solid #D4D4D0",
            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
            padding: "10px 14px",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>

          {message.chart_config && <ChatChart config={message.chart_config} />}
          {message.table_data && <ChatTable data={message.table_data} />}

          {message.export_available && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {["Export PDF", "Export CSV"].map((label) => (
                <button
                  key={label}
                  onClick={() => showToast("info", "Export coming soon")}
                  style={{
                    borderRadius: 20,
                    border: "1.5px solid #55BAAA",
                    background: "transparent",
                    color: "#55BAAA",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "5px 14px",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {message.follow_up_suggestions && message.follow_up_suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {message.follow_up_suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(s)}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #D4D4D0",
                    background: "#F5F5F0",
                    fontSize: 12,
                    padding: "5px 12px",
                    cursor: "pointer",
                    color: "#1A1A1A",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
