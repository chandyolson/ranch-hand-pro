import React, { useState, useRef, useCallback } from "react";
import { getLockedFields, getOptionalFields, type FieldDef, type FieldVisibilityConfig } from "@/lib/field-config";

interface ConfigureFieldsSectionProps {
  workTypeCode: string;
  config: FieldVisibilityConfig;
  onChange: (config: FieldVisibilityConfig) => void;
}

export default function ConfigureFieldsSection({ workTypeCode, config, onChange }: ConfigureFieldsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const locked = getLockedFields(workTypeCode);
  const allOptional = getOptionalFields();
  const enabledKeys = config.optionalFields;
  const activeCount = locked.length + enabledKeys.length;

  // Build ordered optional list: enabled in order, then disabled
  const orderedOptional: (FieldDef & { enabled: boolean })[] = [
    ...enabledKeys
      .map(key => allOptional.find(f => f.key === key))
      .filter(Boolean)
      .map(f => ({ ...f!, enabled: true })),
    ...allOptional
      .filter(f => !enabledKeys.includes(f.key))
      .map(f => ({ ...f, enabled: false })),
  ];

  const toggleField = (key: string) => {
    const isOn = enabledKeys.includes(key);
    const next = isOn
      ? enabledKeys.filter(k => k !== key)
      : [...enabledKeys, key];
    onChange({ optionalFields: next });
  };

  // Drag handlers for reorder (enabled fields only)
  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    dragNode.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || idx === dragIdx) return;
    setOverIdx(idx);
  }, [dragIdx]);

  const handleDrop = useCallback((dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...enabledKeys];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    onChange({ optionalFields: reordered });
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, enabledKeys, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

  // Move up/down for touch (no native drag on mobile)
  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= enabledKeys.length) return;
    const reordered = [...enabledKeys];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    onChange({ optionalFields: reordered });
  };

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
      {/* Header */}
      <button
        className="flex items-center justify-between w-full px-3 py-3.5 cursor-pointer active:scale-[0.99]"
        style={{ background: "none", border: "none" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Configure Fields</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#55BAAA" }}>{activeCount} active</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsed preview: pill summary */}
      {!expanded && activeCount > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5" style={{ marginTop: -4 }}>
          {locked.map(f => (
            <span key={f.key} className="rounded-full" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA" }}>
              {f.label}
            </span>
          ))}
          {enabledKeys.map(key => {
            const f = allOptional.find(o => o.key === key);
            return f ? (
              <span key={f.key} className="rounded-full" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.06)", color: "#0E2646" }}>
                {f.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Expanded: full field list */}
      {expanded && (
        <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>

          {/* Work-type locked fields */}
          {locked.length > 0 && (
            <div className="mt-2 mb-3">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#55BAAA", textTransform: "uppercase", marginBottom: 8 }}>
                {workTypeCode} FIELDS
              </div>
              {locked.map(f => (
                <div
                  key={f.key}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: "1px solid rgba(26,26,26,0.04)" }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{f.label}</span>
                  <div className="flex items-center gap-2">
                    {/* Lock icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#55BAAA" strokeWidth="1.2" />
                      <path d="M5 6V4.5a2 2 0 014 0V6" stroke="#55BAAA" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    {/* Always-on toggle (disabled) */}
                    <div
                      className="relative shrink-0"
                      style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: "#55BAAA", opacity: 0.7 }}
                    >
                      <span style={{ position: "absolute", top: 2, left: 20, width: 18, height: 18, borderRadius: 9, backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional fields */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8, marginTop: locked.length > 0 ? 0 : 8 }}>
            OPTIONAL FIELDS
          </div>
          {orderedOptional.map((f, idx) => {
            const enabledIdx = enabledKeys.indexOf(f.key);
            const isEnabled = f.enabled;
            const isDragging = dragIdx !== null && enabledIdx === dragIdx;
            const isOver = overIdx !== null && enabledIdx === overIdx;

            return (
              <div
                key={f.key}
                draggable={isEnabled}
                onDragStart={isEnabled ? (e) => handleDragStart(enabledIdx, e) : undefined}
                onDragOver={isEnabled ? (e) => handleDragOver(enabledIdx, e) : undefined}
                onDrop={isEnabled ? () => handleDrop(enabledIdx) : undefined}
                onDragEnd={handleDragEnd}
                className="flex items-center justify-between py-2.5"
                style={{
                  borderBottom: "1px solid rgba(26,26,26,0.04)",
                  opacity: isEnabled ? 1 : 0.45,
                  backgroundColor: isDragging ? "rgba(243,209,42,0.08)" : isOver ? "rgba(85,186,170,0.06)" : "transparent",
                  borderTop: isOver ? "2px solid #F3D12A" : "none",
                  transition: "opacity 150ms, background-color 150ms",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Drag handle (only for enabled) */}
                  {isEnabled ? (
                    <div className="flex flex-col gap-[2px] cursor-grab active:cursor-grabbing shrink-0" style={{ width: 16, padding: "2px 0" }}>
                      <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
                      <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
                      <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
                    </div>
                  ) : (
                    <div style={{ width: 16 }} />
                  )}
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    color: isEnabled ? "#1A1A1A" : "rgba(26,26,26,0.40)",
                    textDecoration: isEnabled ? "none" : "line-through",
                  }}>
                    {f.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Move up/down buttons for touch — only when enabled and >1 enabled field */}
                  {isEnabled && enabledKeys.length > 1 && (
                    <>
                      <button
                        className="cursor-pointer active:scale-[0.9]"
                        style={{ background: "none", border: "none", padding: 2, opacity: enabledIdx === 0 ? 0.2 : 0.5 }}
                        disabled={enabledIdx === 0}
                        onClick={() => moveField(enabledIdx, -1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2L2 6.5H10L6 2Z" fill="#1A1A1A" />
                        </svg>
                      </button>
                      <button
                        className="cursor-pointer active:scale-[0.9]"
                        style={{ background: "none", border: "none", padding: 2, opacity: enabledIdx === enabledKeys.length - 1 ? 0.2 : 0.5 }}
                        disabled={enabledIdx === enabledKeys.length - 1}
                        onClick={() => moveField(enabledIdx, 1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 10L10 5.5H2L6 10Z" fill="#1A1A1A" />
                        </svg>
                      </button>
                    </>
                  )}
                  {/* Toggle */}
                  <button
                    onClick={() => toggleField(f.key)}
                    className="relative shrink-0 cursor-pointer"
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: "none",
                      backgroundColor: isEnabled ? "#55BAAA" : "#CBCED4",
                      transition: "background-color 200ms",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute", top: 2,
                        left: isEnabled ? 20 : 2,
                        width: 18, height: 18, borderRadius: 9,
                        backgroundColor: "#FFFFFF",
                        transition: "left 200ms",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
