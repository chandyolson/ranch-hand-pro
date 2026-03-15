import React, { useState, useCallback } from "react";
import { ALL_FIELDS, getRecommendedFields, getOtherFields, type FieldDef, type FieldVisibilityConfig } from "@/lib/field-config";

interface ConfigureFieldsSectionProps {
  workTypeCode: string;
  config: FieldVisibilityConfig;
  onChange: (config: FieldVisibilityConfig) => void;
}

export default function ConfigureFieldsSection({ workTypeCode, config, onChange }: ConfigureFieldsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const recommended = getRecommendedFields(workTypeCode);
  const other = getOtherFields(workTypeCode);
  const enabledKeys = config.enabledFields || [];
  const activeCount = enabledKeys.length;

  const isOn = (key: string) => enabledKeys.includes(key);

  const toggleField = (key: string) => {
    const next = isOn(key)
      ? enabledKeys.filter(k => k !== key)
      : [...enabledKeys, key];
    onChange({ enabledFields: next });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= enabledKeys.length) return;
    const reordered = [...enabledKeys];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    onChange({ enabledFields: reordered });
  };

  const renderFieldRow = (f: FieldDef, section: "recommended" | "other") => {
    const enabled = isOn(f.key);
    const idx = enabledKeys.indexOf(f.key);
    return (
      <div
        key={f.key}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", borderBottom: "1px solid rgba(26,26,26,0.04)",
          opacity: enabled ? 1 : 0.45, transition: "opacity 150ms",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {enabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 16, cursor: "grab", flexShrink: 0 }}>
              <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
              <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
              <div style={{ width: 10, height: 2, backgroundColor: "rgba(26,26,26,0.20)", borderRadius: 1 }} />
            </div>
          ) : (
            <div style={{ width: 16 }} />
          )}
          <span style={{
            fontSize: 14, fontWeight: 500,
            color: enabled ? "#1A1A1A" : "rgba(26,26,26,0.40)",
          }}>
            {f.label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {enabled && enabledKeys.length > 1 && (
            <>
              <button
                type="button"
                style={{ background: "none", border: "none", padding: 2, cursor: "pointer", opacity: idx === 0 ? 0.2 : 0.5 }}
                disabled={idx === 0}
                onClick={() => moveField(idx, -1)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2L2 6.5H10L6 2Z" fill="#1A1A1A" />
                </svg>
              </button>
              <button
                type="button"
                style={{ background: "none", border: "none", padding: 2, cursor: "pointer", opacity: idx === enabledKeys.length - 1 ? 0.2 : 0.5 }}
                disabled={idx === enabledKeys.length - 1}
                onClick={() => moveField(idx, 1)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10L10 5.5H2L6 10Z" fill="#1A1A1A" />
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => toggleField(f.key)}
            style={{
              position: "relative", width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
              backgroundColor: enabled ? "#55BAAA" : "#CBCED4", transition: "background-color 200ms",
            }}
          >
            <span style={{
              position: "absolute", top: 2, left: enabled ? 20 : 2,
              width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF",
              transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ borderRadius: 12, backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)", overflow: "hidden" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Configure Fields</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#55BAAA" }}>{activeCount} active</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsed: pill summary */}
      {!expanded && activeCount > 0 && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexWrap: "wrap", gap: 4, marginTop: -4 }}>
          {enabledKeys.map(key => {
            const f = ALL_FIELDS.find(fd => fd.key === key);
            if (!f) return null;
            const isRecommended = f.recommendedFor.includes(workTypeCode);
            return (
              <span key={key} style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
                backgroundColor: isRecommended ? "rgba(85,186,170,0.12)" : "rgba(14,38,70,0.06)",
                color: isRecommended ? "#55BAAA" : "#0E2646",
              }}>
                {f.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded: full field list */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(212,212,208,0.40)" }}>
          {/* Recommended fields for this work type */}
          {recommended.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#55BAAA", textTransform: "uppercase", marginBottom: 4 }}>
                RECOMMENDED
              </div>
              {recommended.map(f => renderFieldRow(f, "recommended"))}
            </div>
          )}

          {/* Other fields */}
          <div style={{ marginTop: recommended.length > 0 ? 10 : 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>
              OTHER FIELDS
            </div>
            {other.map(f => renderFieldRow(f, "other"))}
          </div>
        </div>
      )}
    </div>
  );
}
