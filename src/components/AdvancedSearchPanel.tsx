import React, { useState, useRef, useEffect } from "react";
import type { FilterFieldConfig, ActiveFilter, FilterPreset } from "@/lib/filter-types";
import { buildFilterLabel } from "@/lib/filter-utils";

interface AdvancedSearchPanelProps {
  fields: FilterFieldConfig[];
  filters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  presets: FilterPreset[];
  onAddPreset: (name: string, filters: ActiveFilter[]) => void;
  onDeletePreset: (id: string) => void;
  onClearAll: () => void;
}

export default function AdvancedSearchPanel({
  fields,
  filters,
  onFiltersChange,
  presets,
  onAddPreset,
  onDeletePreset,
  onClearAll,
}: AdvancedSearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [addingField, setAddingField] = useState<FilterFieldConfig | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempValues, setTempValues] = useState<string[]>([]);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [tempBool, setTempBool] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = filters.length;
  const groups = [...new Set(fields.map((f) => f.group || "Other"))];

  // Close field picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFieldPickerOpen(false);
        setAddingField(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetAddState = () => {
    setAddingField(null);
    setFieldPickerOpen(false);
    setTempValue("");
    setTempValues([]);
    setTempMin("");
    setTempMax("");
    setTempBool(false);
  };

  const startAddFilter = (field: FilterFieldConfig) => {
    setAddingField(field);
    setFieldPickerOpen(false);
    setTempValue("");
    setTempValues([]);
    setTempMin("");
    setTempMax("");
    setTempBool(false);
  };

  const commitFilter = () => {
    if (!addingField) return;
    let value: ActiveFilter["value"];
    let label: string;

    switch (addingField.type) {
      case "text":
        if (!tempValue.trim()) return;
        value = tempValue.trim();
        break;
      case "select":
        if (!tempValue) return;
        value = tempValue;
        break;
      case "multi-select":
        if (tempValues.length === 0) return;
        value = [...tempValues];
        break;
      case "range":
        if (!tempMin && !tempMax) return;
        value = [tempMin, tempMax] as [string, string];
        break;
      case "date-range":
        if (!tempMin && !tempMax) return;
        value = [tempMin, tempMax] as [string, string];
        break;
      case "boolean":
        value = true;
        break;
      default:
        return;
    }

    label = buildFilterLabel(addingField, value);
    const newFilter: ActiveFilter = { key: addingField.key, type: addingField.type, value, label };
    onFiltersChange([...filters, newFilter]);
    setActivePresetId(null); // modifying filters deactivates preset
    resetAddState();
  };

  const removeFilter = (idx: number) => {
    const next = filters.filter((_, i) => i !== idx);
    onFiltersChange(next);
    setActivePresetId(null);
  };

  const handleClearAll = () => {
    onClearAll();
    setActivePresetId(null);
    resetAddState();
  };

  const loadPreset = (preset: FilterPreset) => {
    if (activePresetId === preset.id) {
      // Toggle off
      onClearAll();
      setActivePresetId(null);
    } else {
      onFiltersChange([...preset.filters]);
      setActivePresetId(preset.id);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    onAddPreset(presetName.trim(), filters);
    setPresetName("");
    setSavingPreset(false);
    setPresetsExpanded(true);
  };

  const toggleMultiSelect = (option: string) => {
    setTempValues((prev) =>
      prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]
    );
  };

  // ── Styles ──
  const chipStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 4, padding: "4px 8px 4px 10px",
    borderRadius: 9999, backgroundColor: "rgba(14,38,70,0.06)", fontSize: 11, fontWeight: 600, color: "#0E2646",
  };
  const chipX: React.CSSProperties = {
    width: 16, height: 16, borderRadius: 9999, border: "none", cursor: "pointer",
    backgroundColor: "rgba(26,26,26,0.08)", color: "rgba(26,26,26,0.40)", fontSize: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
    padding: "0 12px", fontSize: 16, color: "#1A1A1A", outline: "none", boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div ref={panelRef}>
      {/* ── FILTER BUTTON ── */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (isOpen) resetAddState(); }}
        style={{
          height: 36, paddingLeft: 10, paddingRight: 10, borderRadius: 9999, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          backgroundColor: activeCount > 0 ? "#0E2646" : "white",
          border: `1px solid ${activeCount > 0 ? "#0E2646" : "#D4D4D0"}`,
          color: activeCount > 0 ? "white" : "rgba(26,26,26,0.50)",
          fontSize: 12, fontWeight: 600,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Filter
        {activeCount > 0 && (
          <span style={{
            width: 18, height: 18, borderRadius: 9999, backgroundColor: "#F3D12A",
            color: "#1A1A1A", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {/* ── FILTER PANEL ── */}
      {isOpen && (
        <div style={{
          backgroundColor: "white", borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
          padding: 12, marginTop: 8,
        }}>

          {/* ── SAVED PRESETS SECTION ── */}
          {presets.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <button
                onClick={() => setPresetsExpanded(!presetsExpanded)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  padding: 0, background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ transform: presetsExpanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms" }}>
                    <path d="M4 2.5L8 6L4 9.5" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0E2646" }}>Saved Filters</span>
                  <span style={{
                    width: 18, height: 18, borderRadius: 9999, backgroundColor: "rgba(85,186,170,0.12)",
                    color: "#55BAAA", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {presets.length}
                  </span>
                </div>
              </button>

              {presetsExpanded && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 8 }}>
                  {presets.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <div key={preset.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <button
                          onClick={() => loadPreset(preset)}
                          style={{
                            padding: "5px 10px", borderRadius: "9999px 0 0 9999px", cursor: "pointer",
                            fontSize: 11, fontWeight: 600, border: "none",
                            backgroundColor: isActive ? "#0E2646" : "rgba(85,186,170,0.10)",
                            color: isActive ? "white" : "#55BAAA",
                          }}
                        >
                          {preset.name}
                        </button>
                        <button
                          onClick={() => onDeletePreset(preset.id)}
                          style={{
                            padding: "5px 6px", borderRadius: "0 9999px 9999px 0", cursor: "pointer",
                            fontSize: 10, border: "none",
                            backgroundColor: isActive ? "rgba(14,38,70,0.80)" : "rgba(85,186,170,0.06)",
                            color: isActive ? "rgba(255,255,255,0.50)" : "rgba(85,186,170,0.40)",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ height: 1, backgroundColor: "rgba(26,26,26,0.06)", marginTop: 10 }} />
            </div>
          )}

          {/* ── ACTIVE FILTER CHIPS ── */}
          {filters.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {filters.map((f, i) => (
                <div key={i} style={chipStyle}>
                  {f.label}
                  <button onClick={() => removeFilter(i)} style={chipX}>×</button>
                </div>
              ))}
              {filters.length >= 2 && (
                <button onClick={handleClearAll} style={{
                  background: "none", border: "none", fontSize: 11, fontWeight: 600,
                  color: "#55BAAA", cursor: "pointer", padding: "4px 6px",
                }}>
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* ── FIELD PICKER ── */}
          {fieldPickerOpen && !addingField && (
            <div style={{ marginBottom: 10, maxHeight: 280, overflowY: "auto" }}>
              {groups.map((group) => (
                <div key={group}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)",
                    textTransform: "uppercase" as const, padding: "8px 0 4px",
                  }}>
                    {group}
                  </div>
                  {fields
                    .filter((f) => (f.group || "Other") === group)
                    .map((field) => {
                      const alreadyActive = filters.some((f) => f.key === field.key);
                      return (
                        <button
                          key={field.key}
                          onClick={() => !alreadyActive && startAddFilter(field)}
                          style={{
                            display: "block", width: "100%", textAlign: "left" as const, padding: "8px 0",
                            border: "none", borderBottom: "1px solid rgba(26,26,26,0.06)",
                            backgroundColor: "transparent", fontSize: 13, fontWeight: 400,
                            color: alreadyActive ? "rgba(26,26,26,0.25)" : "#1A1A1A",
                            cursor: alreadyActive ? "default" : "pointer",
                          }}
                        >
                          {field.label}
                          {alreadyActive && (
                            <span style={{ fontSize: 10, color: "#55BAAA", marginLeft: 8 }}>active</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          )}

          {/* ── VALUE INPUT ── */}
          {addingField && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E2646", marginBottom: 6 }}>
                {addingField.label}
              </div>

              {addingField.type === "text" && (
                <input
                  type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)}
                  placeholder="Contains..." autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") commitFilter(); }}
                  style={inputStyle}
                />
              )}

              {addingField.type === "select" && (
                <select
                  value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus
                  style={{ ...inputStyle, appearance: "auto" as const, color: tempValue ? "#1A1A1A" : "rgba(26,26,26,0.40)" }}
                >
                  <option value="">Select...</option>
                  {(addingField.options || []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              )}

              {addingField.type === "multi-select" && (
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #D4D4D0", borderRadius: 8, padding: 8 }}>
                  {(addingField.options || []).map((o) => {
                    const checked = tempValues.includes(o);
                    return (
                      <label
                        key={o}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 4px",
                          fontSize: 14, color: "#1A1A1A", cursor: "pointer",
                          borderBottom: "1px solid rgba(26,26,26,0.04)",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                          border: checked ? "none" : "1.5px solid #D4D4D0",
                          backgroundColor: checked ? "#55BAAA" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox" checked={checked} onChange={() => toggleMultiSelect(o)}
                          style={{ display: "none" }}
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              )}

              {addingField.type === "range" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number" value={tempMin} onChange={(e) => setTempMin(e.target.value)}
                    placeholder="Min" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") commitFilter(); }}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  <span style={{ color: "rgba(26,26,26,0.30)", fontSize: 14, flexShrink: 0 }}>&ndash;</span>
                  <input
                    type="number" value={tempMax} onChange={(e) => setTempMax(e.target.value)}
                    placeholder="Max"
                    onKeyDown={(e) => { if (e.key === "Enter") commitFilter(); }}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                </div>
              )}

              {addingField.type === "date-range" && (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)", width: 40, flexShrink: 0 }}>From</span>
                    <input type="date" value={tempMin} onChange={(e) => setTempMin(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)", width: 40, flexShrink: 0 }}>To</span>
                    <input type="date" value={tempMax} onChange={(e) => setTempMax(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                  </div>
                </div>
              )}

              {addingField.type === "boolean" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ fontSize: 14, color: "#1A1A1A" }}>Only show matching</span>
                  <button
                    onClick={() => { setTempBool(true); }}
                    style={{
                      position: "relative" as const, width: 44, height: 24, borderRadius: 9999, border: "none", cursor: "pointer",
                      backgroundColor: tempBool ? "#55BAAA" : "rgba(26,26,26,0.15)",
                    }}
                  >
                    <span style={{
                      position: "absolute" as const, width: 16, height: 16, borderRadius: 9999,
                      backgroundColor: "white", top: 4, left: tempBool ? 24 : 4, transition: "left 150ms",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={resetAddState}
                  style={{
                    flex: 1, height: 32, borderRadius: 9999, border: "1px solid #D4D4D0",
                    backgroundColor: "white", fontSize: 12, fontWeight: 600, color: "#0E2646", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={commitFilter}
                  style={{
                    flex: 1, height: 32, borderRadius: 9999, border: "none",
                    backgroundColor: "#0E2646", fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* ── ADD FILTER BUTTON ── */}
          {!fieldPickerOpen && !addingField && (
            <button
              onClick={() => setFieldPickerOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%",
                height: 34, borderRadius: 9999, border: "1px dashed rgba(212,212,208,0.80)",
                backgroundColor: "transparent", fontSize: 12, fontWeight: 600,
                color: "rgba(26,26,26,0.40)", cursor: "pointer",
              }}
            >
              + Add Filter
            </button>
          )}

          {/* ── BOTTOM ACTIONS ── */}
          {filters.length > 0 && !fieldPickerOpen && !addingField && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 10 }}>
              {/* Save as Preset */}
              {!savingPreset ? (
                <button
                  onClick={() => setSavingPreset(true)}
                  style={{
                    background: "none", border: "none", fontSize: 11, fontWeight: 600,
                    color: "#55BAAA", cursor: "pointer", padding: 0, textAlign: "left" as const,
                  }}
                >
                  Save as Preset
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..." autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") setSavingPreset(false); }}
                    style={{ ...inputStyle, height: 30, fontSize: 13, flex: 1 }}
                  />
                  <button
                    onClick={handleSavePreset}
                    style={{
                      height: 30, paddingLeft: 12, paddingRight: 12, borderRadius: 9999, border: "none",
                      backgroundColor: "#55BAAA", fontSize: 11, fontWeight: 700, color: "white", cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setSavingPreset(false); setPresetName(""); }}
                    style={{
                      height: 30, paddingLeft: 8, paddingRight: 8, borderRadius: 9999,
                      border: "1px solid #D4D4D0", backgroundColor: "white",
                      fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.50)", cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: "100%", height: 36, borderRadius: 9999, border: "none",
                  backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700,
                  color: "#1A1A1A", cursor: "pointer",
                }}
              >
                Apply {filters.length} Filter{filters.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
