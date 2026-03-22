import React, { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SaleDayStatusPickerProps {
  saleDayId: string;
  currentStatus: string;
  showToast: (variant: string, message: string) => void;
  variant?: "light" | "dark";
  /** Override the badge label (e.g. "UPCOMING" instead of "SCHEDULED") */
  displayLabel?: string;
}

const STATUS_CONFIG: Record<string, { dot: string; badgeBg: string; badgeText: string }> = {
  scheduled: { dot: "#64748B", badgeBg: "rgba(100,116,139,0.15)", badgeText: "#64748B" },
  active: { dot: "#55BAAA", badgeBg: "rgba(85,186,170,0.15)", badgeText: "#55BAAA" },
  completed: { dot: "#F3D12A", badgeBg: "rgba(243,209,42,0.12)", badgeText: "#F3D12A" },
};

const STATUSES = ["scheduled", "active", "completed"] as const;

const SaleDayStatusPicker: React.FC<SaleDayStatusPickerProps> = ({
  saleDayId,
  currentStatus,
  showToast,
  variant = "light",
  displayLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmComplete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (status: string) => {
    if (status === currentStatus) {
      setOpen(false);
      return;
    }
    if (status === "completed") {
      setConfirmComplete(true);
      return;
    }
    await doUpdate(status);
  };

  const doUpdate = async (status: string) => {
    const { error } = await (supabase.from("sale_days" as any)
      .update({ status } as any)
      .eq("id", saleDayId) as any);
    if (error) {
      showToast("error", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["sale_day"] });
    queryClient.invalidateQueries({ queryKey: ["sale_days"] });
    showToast("success", `Sale day status updated to ${status}`);
    setOpen(false);
    setConfirmComplete(false);
  };

  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.scheduled;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Tappable badge */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setConfirmComplete(false); }}
        className="active:scale-[0.97]"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          borderRadius: 9999, padding: "3px 8px",
          background: cfg.badgeBg, color: cfg.badgeText,
          textTransform: "uppercase", border: "none", cursor: "pointer",
        }}
      >
        {displayLabel || currentStatus.toUpperCase()}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown picker */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
            background: "#FFFFFF", borderRadius: 12,
            border: "1px solid rgba(212,212,208,0.60)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            padding: 8, minWidth: 200,
          }}
        >
          {STATUSES.map((status, i) => {
            const sc = STATUS_CONFIG[status];
            const isSelected = status === currentStatus;
            return (
              <React.Fragment key={status}>
                {i > 0 && (
                  <div style={{ height: 1, background: "rgba(212,212,208,0.30)", margin: "0 4px" }} />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(status); }}
                  className="active:bg-[rgba(14,38,70,0.04)]"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "none", background: "none", cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: sc.dot, flexShrink: 0,
                  }} />
                  {/* Label */}
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 500, color: "#1A1A1A",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  {/* Checkmark if selected */}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke={sc.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          {/* Completion confirmation */}
          {confirmComplete && (
            <div style={{
              marginTop: 8, padding: "10px 12px", borderRadius: 8,
              background: "rgba(243,209,42,0.06)", border: "1px solid rgba(243,209,42,0.20)",
            }}>
              <div style={{ fontSize: 12, color: "#717182", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
                Mark this sale day as completed? Work orders can still be edited.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmComplete(false); }}
                  style={{
                    flex: 1, height: 32, borderRadius: 9999,
                    border: "1px solid #D4D4D0", background: "transparent",
                    fontSize: 12, fontWeight: 600, color: "#717182", cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >Cancel</button>
                <button
                  onClick={(e) => { e.stopPropagation(); doUpdate("completed"); }}
                  className="active:scale-[0.97]"
                  style={{
                    flex: 1, height: 32, borderRadius: 9999,
                    border: "none", background: "#F3D12A",
                    fontSize: 12, fontWeight: 700, color: "#1A1A1A", cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >Complete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SaleDayStatusPicker;
