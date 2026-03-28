import React, { useRef, useState } from "react";
import { Bookmark } from "lucide-react";
import ChatChart from "./ChatChart";
import ChatTable from "./ChatTable";
import ActionPreviewCard from "./ActionPreviewCard";
import SaveQuestionPopover from "./SaveQuestionPopover";
import { useChuteSideToast } from "@/components/ToastContext";
import { useOperation } from "@/contexts/OperationContext";
import { exportPDF, exportCSV, generateReportFilename } from "@/lib/ai-reports/export-utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  type?: string;
  chart_config?: any;
  table_data?: { headers: string[]; rows: (string | number)[][] };
  export_available?: boolean;
  follow_up_suggestions?: string[];
  isError?: boolean;
  log_id?: string;
  // Action preview fields
  action_type?: string;
  risk_tier?: 1 | 2 | 3;
  action_id?: string;
  preview_title?: string;
  preview_detail?: Record<string, string> | null;
  preview_table?: { headers: string[]; rows: (string | number | null)[][] } | null;
  diff?: { field: string; old_value: string; new_value: string }[] | null;
}

interface Props {
  message: ChatMessage;
  onFollowUp: (text: string) => void;
  onActionResult?: (resultMessage: { role: "assistant"; content: string; isError?: boolean }) => void;
}

const ChatMessageBubble: React.FC<Props> = ({ message, onFollowUp, onActionResult }) => {
  const { showToast } = useChuteSideToast();
  const { operationName } = useOperation();
  const isUser = message.role === "user";
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [showSavePopover, setShowSavePopover] = useState(false);

  // Render action preview card for write confirmations
  if (message.type === "action_preview" && onActionResult) {
    return <ActionPreviewCard message={message as any} onResult={onActionResult} />;
  }

  const showExports = message.export_available !== false && !isUser && !message.isError;

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "calc(100% - 48px)",
          ...(isUser ? { paddingLeft: 48 } : { paddingRight: 48 }),
          position: "relative",
        }}
      >
        {isUser && (
          <div style={{ position: "relative", display: "inline-block", float: "right", marginLeft: 6, marginTop: 2 }}>
            <button
              onClick={() => setShowSavePopover((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                opacity: 0.5,
              }}
              title="Save question"
            >
              <Bookmark size={14} color="#F0F0F0" />
            </button>
            {showSavePopover && (
              <SaveQuestionPopover
                prompt={message.content}
                onClose={() => setShowSavePopover(false)}
                onSaved={() => {
                  showToast("success", "Question saved");
                  window.dispatchEvent(new Event("saved-questions-updated"));
                }}
                onMaxReached={() => showToast("error", "Maximum saved questions reached")}
              />
            )}
          </div>
        )}
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

          {message.chart_config && (
            <div ref={chartRef}>
              <ChatChart config={message.chart_config} />
            </div>
          )}
          {message.table_data && <ChatTable data={message.table_data} />}

          {showExports && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                disabled={!!exporting}
                onClick={async () => {
                  setExporting("pdf");
                  try {
                    await exportPDF({
                      operationName: operationName || "ChuteSide Operation",
                      summary: message.content || "",
                      table_data: message.table_data || null,
                      chartRef: chartRef.current,
                      filename: generateReportFilename(message.content || "", "pdf"),
                    });
                    if (navigator.vibrate) navigator.vibrate(15);
                    showToast("success", "PDF exported — check your downloads folder.");
                  } catch {
                    showToast("error", "Export failed. Try again or contact support.");
                  } finally {
                    setExporting(null);
                  }
                }}
                style={{
                  borderRadius: 20,
                  border: "1.5px solid #55BAAA",
                  background: "transparent",
                  color: "#55BAAA",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 14px",
                  cursor: exporting ? "not-allowed" : "pointer",
                  opacity: exporting ? 0.5 : 1,
                }}
              >
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>

              {message.table_data && (
                <button
                  disabled={!!exporting}
                  onClick={() => {
                    if (!message.table_data) return;
                    setExporting("csv");
                    try {
                      exportCSV(
                        message.table_data,
                        generateReportFilename(message.content || "", "csv")
                      );
                      if (navigator.vibrate) navigator.vibrate(15);
                      showToast("success", "CSV exported — check your downloads folder.");
                    } catch {
                      showToast("error", "Export failed. Try again or contact support.");
                    } finally {
                      setExporting(null);
                    }
                  }}
                  style={{
                    borderRadius: 20,
                    border: "1.5px solid #55BAAA",
                    background: "transparent",
                    color: "#55BAAA",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "5px 14px",
                    cursor: exporting ? "not-allowed" : "pointer",
                    opacity: exporting ? 0.5 : 1,
                  }}
                >
                  {exporting === "csv" ? "Exporting..." : "Export CSV"}
                </button>
              )}
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
