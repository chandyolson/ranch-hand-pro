import React, { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  logId: string;
}

const ChatFeedback: React.FC<Props> = ({ logId }) => {
  const [status, setStatus] = useState<"idle" | "up" | "down" | "done">("idle");
  const [note, setNote] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const showConfirm = (text: string) => {
    setConfirmText(text);
    setTimeout(() => setConfirmText(""), 2000);
  };

  const handleUp = async () => {
    setStatus("up");
    await supabase.from("ai_interaction_logs" as any).update({ feedback: "thumbs_up" }).eq("id", logId);
    showConfirm("Thanks!");
    setTimeout(() => setStatus("done"), 2200);
  };

  const handleDownSubmit = async () => {
    await supabase.from("ai_interaction_logs" as any).update({ feedback: "thumbs_down", feedback_note: note }).eq("id", logId);
    showConfirm("Got it — we'll improve this.");
    setTimeout(() => setStatus("done"), 2200);
  };

  if (status === "done" && !confirmText) return null;

  return (
    <div style={{ marginTop: 6 }}>
      {confirmText && (
        <span style={{ fontSize: 12, color: "#888", transition: "opacity 0.3s" }}>{confirmText}</span>
      )}

      {!confirmText && status === "idle" && (
        <div style={{ display: "flex", gap: 8, height: 28, alignItems: "center" }}>
          <button
            onClick={handleUp}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
            title="Helpful"
          >
            <ThumbsUp size={16} color="#BBB" className="hover-green" />
          </button>
          <button
            onClick={() => setStatus("down")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
            title="Not helpful"
          >
            <ThumbsDown size={16} color="#BBB" className="hover-red" />
          </button>
        </div>
      )}

      {!confirmText && status === "up" && (
        <div style={{ display: "flex", height: 28, alignItems: "center" }}>
          <ThumbsUp size={16} color="#22C55E" />
        </div>
      )}

      {!confirmText && status === "down" && (
        <div>
          <div style={{ display: "flex", height: 28, alignItems: "center", marginBottom: 6 }}>
            <ThumbsDown size={16} color="#E74C3C" />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="What went wrong?"
              maxLength={200}
              style={{
                fontSize: 14,
                border: "1px solid #D4D4D0",
                borderRadius: 12,
                padding: "5px 10px",
                width: 200,
                outline: "none",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              onClick={handleDownSubmit}
              style={{
                borderRadius: 20,
                border: "1.5px solid #55BAAA",
                background: "transparent",
                color: "#55BAAA",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatFeedback;
