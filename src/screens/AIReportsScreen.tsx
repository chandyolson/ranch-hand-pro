import React, { useState, useRef, useEffect } from "react";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import { useChuteSideToast } from "@/components/ToastContext";
import TemplatePills from "@/components/ai-reports/TemplatePills";
import ChatMessageBubble, { ChatMessage } from "@/components/ai-reports/ChatMessageBubble";
import ChatInput from "@/components/ai-reports/ChatInput";
import FilePreviewBar from "@/components/ai-reports/FilePreviewBar";
import LoadingDots from "@/components/ai-reports/LoadingDots";
import ReportBuilderModal from "@/components/ai-reports/ReportBuilderModal";
import PhotoScanScreen from "@/screens/PhotoScanScreen";
import { isImageFile, isSpreadsheetFile, parseSpreadsheet, imageToBase64, detectImageContext, ParsedFileContext } from "@/lib/ai-reports/file-handler";

const CURRENT_YEAR = new Date().getFullYear();

const EXAMPLE_QUESTIONS = [
  `How many cows are open this year?`,
  `Compare calf weights by sire for ${CURRENT_YEAR}`,
  `Show me treatments from the last 12 months`,
  `Which bulls failed their BSE this year?`,
];

const AIReportsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [photoScanOpen, setPhotoScanOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFileContext | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const showWelcome = messages.length === 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFileSelected = async (file: File) => {
    if (isSpreadsheetFile(file)) {
      try {
        const parsed = await parseSpreadsheet(file);
        setAttachedFile(file);
        setParsedFile(parsed);
        setImagePreview(null);
      } catch (e: any) {
        showToast("error", e.message || "Could not parse file");
      }
    } else if (isImageFile(file)) {
      setAttachedFile(file);
      setParsedFile(null);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      showToast("error", "Unsupported file type");
    }
  };

  const clearAttachment = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAttachedFile(null);
    setParsedFile(null);
    setImagePreview(null);
  };

  const sendMessage = async (text: string) => {
    const hasFile = !!attachedFile;
    const fileIsImage = hasFile && isImageFile(attachedFile!);
    const fileIsSpreadsheet = hasFile && isSpreadsheetFile(attachedFile!);

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      file_name: attachedFile?.name,
      file_row_count: parsedFile?.row_count,
      file_is_image: fileIsImage,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsLoading(true);

    try {
      if (fileIsImage) {
        // Route to photo-extract
        const { base64, mediaType } = await imageToBase64(attachedFile!);
        const context = detectImageContext(text);
        const { data, error } = await supabase.functions.invoke("photo-extract", {
          body: { image_base64: base64, media_type: mediaType, context, operation_id: operationId },
        });
        if (error) throw error;
        clearAttachment();

        const records = data?.records || [];
        const confidence = data?.confidence || "medium";
        const notes = data?.notes || null;

        if (records.length > 0) {
          const reviewMsg: ChatMessage = {
            role: "assistant",
            content: `Extracted ${records.length} ${context} records from your photo.`,
            type: "data_review",
            data_review: { records, context, confidence, notes },
          };
          setMessages((prev) => [...prev, reviewMsg]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data?.summary || "Could not extract records from that image. Try a clearer photo." }]);
        }
      } else if (fileIsSpreadsheet && parsedFile) {
        // Route to ai-report with file_context
        const history = updated.slice(-8).map((m) => ({ role: m.role, content: m.content }));
        const { data, error } = await supabase.functions.invoke("ai-report", {
          body: {
            question: text,
            operation_id: operationId,
            conversation_history: history,
            file_context: {
              filename: parsedFile.filename,
              headers: parsedFile.headers,
              row_count: parsedFile.row_count,
              sample_rows: parsedFile.sample_rows,
            },
          },
        });
        if (error) throw error;
        // Don't clear file — keep it available for follow-ups

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
          log_id: data?.log_id,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        // Normal text message
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
          log_id: data?.log_id,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: err?.message || "Something went wrong. Please try again.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    clearAttachment();
  };

  const placeholderHint = parsedFile
    ? "Ask me to compare, import, or create a group from this file..."
    : imagePreview
    ? "What kind of records is this? (calving, treatment, tally, receipt)"
    : undefined;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", marginTop: -20, marginLeft: -16, marginRight: -16 }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #D4D4D0", padding: "10px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <button onClick={() => setReportModalOpen(true)} style={{ border: "1.5px solid #0E2646", background: "transparent", color: "#0E2646", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Build Report
            </button>
            <button onClick={handleNewChat} style={{ border: "1.5px solid #55BAAA", background: "transparent", color: "#55BAAA", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              New Chat
            </button>
          </div>
          <TemplatePills onSelect={sendMessage} disabled={isLoading} onScanPhoto={() => setPhotoScanOpen(true)} />
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", background: "linear-gradient(180deg, #E8EDF3 0%, #F5F5F0 35%, #F5F5F0 70%, #E8F0EE 100%)" }}>
          {showWelcome && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
              <div style={{ color: "#0E2646", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>AI Reports</div>
              <div style={{ color: "#888", fontSize: 14, maxWidth: 280, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
                Ask me anything about your operation's data. Tap a report button above or type a question below.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, width: "100%" }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 12, padding: "10px 16px", textAlign: "left", fontSize: 14, cursor: "pointer", color: "#1A1A1A" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessageBubble key={i} message={m} onFollowUp={sendMessage} onActionResult={(resultMsg) => setMessages((prev) => [...prev, resultMsg])} />
          ))}

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: "16px 16px 16px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "10px 14px" }}>
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* File preview bar */}
        {attachedFile && (
          <FilePreviewBar
            filename={attachedFile.name}
            rowCount={parsedFile?.row_count}
            isImage={isImageFile(attachedFile)}
            thumbnailUrl={imagePreview || undefined}
            onRemove={clearAttachment}
          />
        )}

        {/* Input bar */}
        <ChatInput onSend={sendMessage} disabled={isLoading} onFileSelected={handleFileSelected} placeholderOverride={placeholderHint} />
      </div>

      <ReportBuilderModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      {photoScanOpen && <PhotoScanScreen asModal onClose={() => setPhotoScanOpen(false)} />}
    </>
  );
};

export default AIReportsScreen;
