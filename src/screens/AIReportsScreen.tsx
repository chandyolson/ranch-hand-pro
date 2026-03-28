import React, { useState, useRef, useEffect } from "react";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import TemplatePills from "@/components/ai-reports/TemplatePills";
import ChatMessageBubble, { ChatMessage } from "@/components/ai-reports/ChatMessageBubble";
import ChatInput from "@/components/ai-reports/ChatInput";
import LoadingDots from "@/components/ai-reports/LoadingDots";
import ReportBuilderModal from "@/components/ai-reports/ReportBuilderModal";

const EXAMPLE_QUESTIONS = [
  "How many cows are open?",
  "Compare calf weights by sire",
  "Show me treatments from last month",
  "Which bulls failed their BSE?",
];

const AIReportsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showWelcome = messages.length === 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsLoading(true);

    try {
      const history = updated.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("ai-report", {
        body: { question: text, operation_id: operationId, conversation_history: history },
      });

      if (error) throw error;

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data?.summary || data?.message || "No response received.",
        type: data?.type,
        chart_config: data?.chart_config,
        table_data: data?.table_data,
        export_available: !!(data?.chart_config || data?.table_data),
        follow_up_suggestions: data?.follow_up_suggestions,
        action_type: data?.action_type,
        risk_tier: data?.risk_tier,
        action_id: data?.action_id,
        preview_title: data?.preview_title,
        preview_detail: data?.preview_detail,
        preview_table: data?.preview_table,
        diff: data?.diff,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err?.message || "Something went wrong. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 60px)",
          marginTop: -20,
          marginLeft: -16,
          marginRight: -16,
        }}
      >
        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '8px 16px 0' }}>
          <button
            onClick={() => setReportModalOpen(true)}
            style={{
              border: '1.5px solid #fff',
              background: 'transparent',
              color: '#fff',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Build Report
          </button>
          <button
            onClick={() => setMessages([])}
            style={{
              border: '1.5px solid #55BAAA',
              background: 'transparent',
              color: '#55BAAA',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            New Chat
          </button>
        </div>

        {/* Template pills */}
        <TemplatePills onSelect={sendMessage} disabled={isLoading} />

        {/* Chat area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 8px",
            background: "linear-gradient(180deg, #E8EDF3 0%, #F5F5F0 35%, #F5F5F0 70%, #E8F0EE 100%)",
          }}
        >
          {showWelcome && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
              <div style={{ color: "#0E2646", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>AI Reports</div>
              <div style={{ color: "#888", fontSize: 14, maxWidth: 280, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
                Ask me anything about your operation's data. Tap a report button above or type a question below.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, width: "100%" }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: "#fff",
                      border: "1px solid #D4D4D0",
                      borderRadius: 12,
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 14,
                      cursor: "pointer",
                      color: "#1A1A1A",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessageBubble
              key={i}
              message={m}
              onFollowUp={sendMessage}
              onActionResult={(resultMsg) => setMessages((prev) => [...prev, resultMsg])}
            />
          ))}

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #D4D4D0",
                  borderRadius: "16px 16px 16px 4px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  padding: "10px 14px",
                }}
              >
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      <ReportBuilderModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </>
  );
};

export default AIReportsScreen;
