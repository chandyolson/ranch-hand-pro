import React, { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { MicState, isSpeechSupported, startRecognition, stopRecognition } from "@/lib/ai-reports/speech-recognition";
import { useChuteSideToast } from "@/components/ToastContext";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  onFileSelected?: (file: File) => void;
  placeholderOverride?: string;
}

const ChatInput: React.FC<Props> = ({ onSend, disabled, onFileSelected, placeholderOverride }) => {
  const [text, setText] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [interimText, setInterimText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useChuteSideToast();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setInterimText("");
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleMicTap = () => {
    if (micState === "listening") {
      stopRecognition();
      setMicState("idle");
      setInterimText("");
      return;
    }
    if (!isSpeechSupported()) {
      showToast("error", "Voice input not supported on this browser");
      return;
    }
    if (navigator.vibrate) navigator.vibrate(15);
    startRecognition({
      onInterim: (t) => setInterimText(t),
      onFinal: (t) => {
        setText((prev) => (prev ? prev + " " + t : t));
        setInterimText("");
        setTimeout(() => inputRef.current?.focus(), 50);
      },
      onError: (msg) => showToast("error", msg),
      onStateChange: setMicState,
    });
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) onFileSelected(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSend = text.trim().length > 0 && !disabled;
  const supported = isSpeechSupported();

  const micBg = micState === "listening" ? "#E74C3C" : micState === "processing" ? "#F3D12A" : "#fff";
  const micBorder = micState === "idle" ? "1.5px solid #D4D4D0" : "none";
  const micIconColor = micState === "listening" ? "#fff" : micState === "processing" ? "#0E2646" : "#BBB";

  return (
    <div style={{ flexShrink: 0, background: "#fff", borderTop: "1px solid #D4D4D0", padding: "10px 16px 14px", display: "flex", gap: 8, alignItems: "flex-end" }}>
      {/* Attachment button */}
      <button
        onClick={handleFileClick}
        disabled={disabled}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #D4D4D0", background: "#fff",
          cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
        title="Attach file or photo"
      >
        <Paperclip size={18} color="#BBB" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,image/jpeg,image/png,image/heic,image/webp"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Text input */}
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        disabled={disabled}
        placeholder={placeholderOverride || interimText || "Ask about your operation..."}
        style={{
          flex: 1, height: 40, borderRadius: 20, border: "1.5px solid #D4D4D0", background: "#F5F5F0",
          fontSize: 16, padding: "0 16px", outline: "none", color: interimText && !text ? "#999" : undefined,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#55BAAA")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#D4D4D0")}
      />

      {/* Mic button */}
      <button
        onClick={handleMicTap}
        disabled={!supported || disabled}
        title={supported ? "Voice input" : "Voice input not supported"}
        style={{
          width: 40, height: 40, borderRadius: "50%", border: micBorder, background: micBg,
          cursor: !supported || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, animation: micState === "listening" ? "mic-pulse 1s ease-in-out infinite" : undefined, opacity: !supported ? 0.5 : 1,
        }}
      >
        {micState === "processing" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={micIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={micIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="1" width="6" height="11" rx="3" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      {/* Send */}
      <button
        disabled={!canSend}
        onClick={handleSend}
        style={{
          width: 40, height: 40, borderRadius: "50%", border: "none",
          background: canSend ? "#F3D12A" : "#D4D4D0", color: canSend ? "#0E2646" : "#999",
          cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>

      <style>{`
        @keyframes mic-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ChatInput;
