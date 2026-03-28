import React, { useState } from "react";
import ChatTable from "./ChatTable";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";

export interface ActionPreviewData {
  type: "action_preview";
  action_type: string;
  risk_tier: 1 | 2 | 3;
  action_id: string;
  preview_title: string;
  preview_detail: Record<string, string> | null;
  preview_table: { headers: string[]; rows: (string | number | null)[][] } | null;
  diff: { field: string; old_value: string; new_value: string }[] | null;
}

interface Props {
  message: ActionPreviewData & { role: string; content: string };
  onResult: (resultMessage: { role: "assistant"; content: string; isError?: boolean }) => void;
}

type CardState = "pending" | "loading" | "confirmed" | "cancelled";

const ActionPreviewCard: React.FC<Props> = ({ message, onResult }) => {
  const { operationId } = useOperation();
  const [state, setState] = useState<CardState>("pending");
  const tier = message.risk_tier;
  const isHighRisk = tier === 3;

  const borderColor = isHighRisk ? "#E74C3C" : "#F3D12A";
  const headerBg = isHighRisk ? "#FDF0EF" : "#FFF8E1";

  const confirmLabel =
    isHighRisk ? "I'm Sure — Update" : tier === 2 ? "Save Record" : "Confirm";

  if (state === "confirmed") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
        <div style={{ maxWidth: "calc(100% - 48px)", paddingRight: 48 }}>
          <div style={{
            background: "#fff", border: "1px solid #D4D4D0", borderRadius: "16px 16px 16px 4px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
          }}>
            <span style={{ color: "#22C55E", marginRight: 6 }}>✓</span>
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (state === "cancelled") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
        <div style={{ maxWidth: "calc(100% - 48px)", paddingRight: 48 }}>
          <div style={{
            background: "#fff", border: "1px solid #D4D4D0", borderRadius: "16px 16px 16px 4px",
            padding: "10px 14px", fontSize: 14, fontStyle: "italic", color: "#888",
          }}>
            Cancelled — no changes made.
          </div>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("ai-action", {
        body: { mode: "execute", action_id: message.action_id, operation_id: operationId },
      });
      if (error) throw error;
      if (navigator.vibrate) navigator.vibrate(15);
      onResult({
        role: "assistant",
        content: data?.message || message.content || "Action completed successfully.",
      });
      setState("confirmed");
    } catch (err: any) {
      onResult({
        role: "assistant",
        content: err?.message || "Action failed. Please try again.",
        isError: true,
      });
      setState("pending");
    }
  };

  const handleCancel = () => {
    setState("cancelled");
  };

  const isDisabled = state === "loading";

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div style={{ maxWidth: "calc(100% - 48px)", paddingRight: 48 }}>
        <div style={{
          border: `2px solid ${borderColor}`, borderRadius: 12, background: "#fff",
          overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {/* Header */}
          <div style={{
            background: headerBg, padding: "10px 14px",
            fontWeight: 700, fontSize: 14, color: "#0E2646",
          }}>
            {message.preview_title}
          </div>

          {/* High risk warning */}
          {isHighRisk && (
            <div style={{ padding: "6px 14px 0", fontSize: 12, fontStyle: "italic", color: "#E74C3C" }}>
              This modifies historical data.
            </div>
          )}

          {/* Diff section (tier 3) */}
          {message.diff && message.diff.length > 0 && (
            <div style={{ padding: "8px 14px", fontSize: 13 }}>
              {message.diff.map((d, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{d.field}: </span>
                  <span style={{ textDecoration: "line-through", color: "#888" }}>{d.old_value}</span>
                  <span> → </span>
                  <span style={{ fontWeight: 700 }}>{d.new_value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Detail section (tier 2) */}
          {message.preview_detail && (
            <div style={{ padding: "8px 14px", fontSize: 13, lineHeight: 1.7 }}>
              {Object.entries(message.preview_detail).map(([label, value]) => (
                <div key={label}>
                  <span style={{ fontWeight: 600 }}>{label}: </span>
                  <span style={{ fontWeight: 400 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview table */}
          {message.preview_table && (
            <div style={{ padding: "4px 14px 8px" }}>
              <ChatTable data={message.preview_table} />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, padding: "10px 14px 14px" }}>
            <button
              disabled={isDisabled}
              onClick={handleCancel}
              style={{
                flex: 1, height: 40, borderRadius: 20,
                border: "1.5px solid #D4D4D0", background: "transparent",
                color: "#0E2646", fontSize: 13, fontWeight: 600,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              disabled={isDisabled}
              onClick={handleConfirm}
              style={{
                flex: 1, height: 40, borderRadius: 20, border: "none",
                background: isHighRisk ? "#E74C3C" : "#F3D12A",
                color: isHighRisk ? "#fff" : "#0E2646",
                fontSize: 13, fontWeight: 700,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              {isDisabled ? "Working..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPreviewCard;
