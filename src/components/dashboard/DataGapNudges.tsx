import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import { useOperation } from "@/contexts/OperationContext";
import { fetchNudges, type Nudge } from "@/lib/dashboard/nudge-checks";

const DISMISSED_KEY = "dashboard_nudges_dismissed";
const DISMISS_DAYS = 30;

interface DismissEntry {
  id: string;
  at: number;
}

function getDismissed(): DismissEntry[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isDismissed(id: string, entries: DismissEntry[]): boolean {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return false;
  return Date.now() - entry.at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

const DataGapNudges: React.FC = () => {
  const { operationId } = useOperation();
  const navigate = useNavigate();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissed, setDismissed] = useState<DismissEntry[]>(getDismissed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!operationId) return;
    fetchNudges(operationId).then((n) => {
      setNudges(n);
      setLoaded(true);
    });
  }, [operationId]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = [...prev.filter((e) => e.id !== id), { id, at: Date.now() }];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const visible = nudges.filter((n) => !isDismissed(n.id, dismissed));

  if (!loaded || visible.length === 0) return null;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        borderLeft: "3px solid #F3D12A",
        padding: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}>Attention Needed</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            background: "#55BAAA",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 6px",
          }}
        >
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Nudge items */}
      {visible.map((nudge, i) => (
        <div
          key={nudge.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            borderBottom: i < visible.length - 1 ? "1px solid #F0F0F0" : "none",
          }}
        >
          {nudge.icon === "alert" ? (
            <AlertTriangle size={16} color="#F39C12" style={{ flexShrink: 0 }} />
          ) : (
            <Info size={16} color="#55BAAA" style={{ flexShrink: 0 }} />
          )}

          <span style={{ flex: 1, fontSize: 13, color: "#1A1A1A", lineHeight: 1.4 }}>
            {nudge.message}
          </span>

          <button
            onClick={() => navigate(nudge.action.route)}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "#55BAAA",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {nudge.action.label}
          </button>

          <button
            onClick={() => handleDismiss(nudge.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              flexShrink: 0,
            }}
          >
            <X size={12} color="#BBB" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default DataGapNudges;
