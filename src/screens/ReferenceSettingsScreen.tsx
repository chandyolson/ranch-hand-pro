import React, { useState, useEffect } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { useOperationPreferences } from '@/hooks/useOperationPreferences';

const usStates = ["SD", "ND", "NE", "MN", "WY", "MT", "CO", "KS", "IA", "MO", "TX", "OK", "AR", "ID", "OR", "WA", "CA", "NV", "UT", "AZ", "NM"];

const ReferenceSettingsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const [operationName, setOperationName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state_, setState_] = useState("SD");
  const [operationType, setOperationType] = useState("Commercial");
  const [useYearTag, setUseYearTag] = useState(true);
  const [lifetimePrefix, setLifetimePrefix] = useState("");
  const [calfTagSystem, setCalfTagSystem] = useState("manual");
  const [calfTagPattern, setCalfTagPattern] = useState("{seq}{yearletter}");
  const [calfTagPadding, setCalfTagPadding] = useState(0);
  const [calfDefaultColor, setCalfDefaultColor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useChuteSideToast();
  const { data: prefs } = useOperationPreferences();

  const { data: operation, isLoading } = useQuery({
    queryKey: ['operation', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('id', operationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (operation) {
      setOperationName(operation.name || '');
      const addr = operation.address as any || {};
      setAddress(addr.street || '');
      setCity(addr.city || '');
      setState_(addr.state || 'SD');
      setOperationType(operation.operation_type || 'Commercial');
      setLifetimePrefix(addr.lifetime_prefix || '');
    }
  }, [operation]);

  useEffect(() => {
    if (prefs) {
      setUseYearTag(prefs.use_year_tag_system ?? false);
      setLifetimePrefix(prefs.lifetime_id_prefix || '');
      setCalfTagSystem(prefs.calf_tag_system || 'manual');
      setCalfTagPattern(prefs.calf_tag_pattern || '{seq}{yearletter}');
      setCalfTagPadding(prefs.calf_tag_seq_padding ?? 0);
      setCalfDefaultColor(prefs.calf_tag_default_color || '');
    }
  }, [prefs]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save operation info
      const { error } = await supabase
        .from('operations')
        .update({
          name: operationName.trim(),
          operation_type: operationType,
          address: { street: address.trim(), city: city.trim(), state: state_ },
        })
        .eq('id', operationId);
      if (error) throw error;

      // Upsert operation preferences
      const { error: prefErr } = await supabase
        .from('operation_preferences')
        .upsert({
          operation_id: operationId,
          use_year_tag_system: useYearTag,
          lifetime_id_prefix: lifetimePrefix.trim() || null,
          calf_tag_system: calfTagSystem,
          calf_tag_pattern: calfTagPattern || null,
          calf_tag_seq_padding: calfTagPadding,
          calf_tag_default_color: calfDefaultColor.trim() || null,
        }, { onConflict: 'operation_id' });
      if (prefErr) throw prefErr;

      queryClient.invalidateQueries({ queryKey: ['operation'] });
      queryClient.invalidateQueries({ queryKey: ['operation-preferences'] });
      showToast("success", "Settings saved");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="px-4 pt-4"><span style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>Loading…</span></div>;
  }

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Operation Settings</span>

      {/* Operation Info */}
      <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>OPERATION INFO</div>
        <div className="flex items-center gap-2 min-w-0"><span style={LABEL_STYLE}>Op Name</span><input type="text" value={operationName} onChange={e => setOperationName(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2 min-w-0"><span style={LABEL_STYLE}>Address</span><input type="text" value={address} onChange={e => setAddress(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2 min-w-0"><span style={LABEL_STYLE}>City</span><input type="text" value={city} onChange={e => setCity(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2 min-w-0">
          <span style={LABEL_STYLE}>State</span>
          <select value={state_} onChange={e => setState_(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            {usStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span style={LABEL_STYLE}>Type</span>
          <select value={operationType} onChange={e => setOperationType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            {["Commercial", "Cow-Calf", "Stocker", "Feedlot", "Dairy", "Mixed"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Tag System */}
      <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>TAG SYSTEM</div>

        <div className="flex items-center justify-between py-1">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Year-Tag System</div>
            <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Auto-links tag number to birth year</div>
          </div>
          <button
            className="relative cursor-pointer transition-all rounded-full"
            style={{ width: 44, height: 24, backgroundColor: useYearTag ? "#55BAAA" : "rgba(26,26,26,0.15)", border: "none" }}
            onClick={() => setUseYearTag(!useYearTag)}
          >
            <span className="absolute rounded-full bg-white shadow transition-all" style={{ width: 16, height: 16, top: 4, left: useYearTag ? 24 : 4 }} />
          </button>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span style={LABEL_STYLE}>ID Prefix</span>
          <input type="text" value={lifetimePrefix} onChange={e => setLifetimePrefix(e.target.value)} placeholder="e.g. SBR" className={INPUT_CLS} style={{ fontSize: 16 }} />
        </div>
        <div style={{ marginLeft: 93, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 2 }}>
          Lifetime IDs generate as {lifetimePrefix || "___"}25-3309 (e.g. {lifetimePrefix || "SBR"}25-3309)
        </div>
      </div>

      {/* Calf Tagging */}
      <div className="rounded-xl px-3 py-3.5 space-y-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>CALF TAGGING</div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>When a calf is born, auto-fill the tag as:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {([
              { value: "manual", label: "Manual", desc: "I'll type the tag myself" },
              { value: "same_as_dam", label: "Same as Dam", desc: "Calf gets the dam's tag number" },
              { value: "year_prefix_seq", label: "Year + Number", desc: "Last digit of year + sequence (e.g., 6001 for 2026)" },
              { value: "year_letter_seq", label: "Year Letter + Number", desc: "Letter for birth year + sequence (e.g., 105R for 2026)" },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCalfTagSystem(opt.value)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                  borderRadius: 10, border: `1.5px solid ${calfTagSystem === opt.value ? "#0E2646" : "rgba(212,212,208,0.60)"}`,
                  backgroundColor: calfTagSystem === opt.value ? "rgba(14,38,70,0.04)" : "transparent",
                  cursor: "pointer", textAlign: "left" as const, width: "100%",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 9999, flexShrink: 0, marginTop: 1,
                  border: calfTagSystem === opt.value ? "none" : "2px solid #D4D4D0",
                  backgroundColor: calfTagSystem === opt.value ? "#0E2646" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {calfTagSystem === opt.value && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sequence padding — shown for year_prefix_seq and year_letter_seq */}
        {(calfTagSystem === "year_prefix_seq" || calfTagSystem === "year_letter_seq") && (
          <div>
            <div className="flex items-center gap-2 min-w-0">
              <span style={LABEL_STYLE}>Padding</span>
              <select value={calfTagPadding} onChange={e => setCalfTagPadding(Number(e.target.value))} className={INPUT_CLS} style={{ fontSize: 16 }}>
                <option value={0}>None (1, 2, 10)</option>
                <option value={2}>2 digits (01, 02, 10)</option>
                <option value={3}>3 digits (001, 002, 010)</option>
                <option value={4}>4 digits (0001, 0002)</option>
              </select>
            </div>
          </div>
        )}

        {/* Pattern — shown for year_letter_seq */}
        {calfTagSystem === "year_letter_seq" && (
          <div>
            <div className="flex items-center gap-2 min-w-0">
              <span style={LABEL_STYLE}>Pattern</span>
              <select value={calfTagPattern} onChange={e => setCalfTagPattern(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                <option value="{seq}{yearletter}">Number + Letter (105R)</option>
                <option value="{yearletter}{seq}">Letter + Number (R105)</option>
                <option value="{damtag}{yearletter}">Dam Tag + Letter (3309R)</option>
              </select>
            </div>
            <div style={{ marginLeft: 93, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 4 }}>
              Preview for 2026: {(() => {
                const letter = "R";
                const seq = calfTagPadding > 0 ? "1".padStart(calfTagPadding, "0") : "1";
                return calfTagPattern
                  .replace("{seq}", seq)
                  .replace("{yearletter}", letter)
                  .replace("{damtag}", "3309");
              })()}
            </div>
          </div>
        )}

        {/* Year-prefix preview */}
        {calfTagSystem === "year_prefix_seq" && (
          <div style={{ marginLeft: 93, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic" }}>
            Preview for 2026: 6{calfTagPadding > 0 ? "1".padStart(calfTagPadding, "0") : "1"}
          </div>
        )}

        {/* Default calf tag color */}
        <div className="flex items-center gap-2 min-w-0">
          <span style={LABEL_STYLE}>Calf Color</span>
          <select value={calfDefaultColor} onChange={e => setCalfDefaultColor(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            <option value="">No default</option>
            {["Red", "Yellow", "Green", "White", "Orange", "Blue", "Purple", "Pink"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 93, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic" }}>
          Auto-selects this color for new calves
        </div>
      </div>

      {/* Save */}
      <button
        className="w-full rounded-full py-3.5 cursor-pointer active:scale-[0.97] mt-2"
        style={{ backgroundColor: "#0E2646", fontSize: 14, fontWeight: 700, color: "white", border: "none", opacity: isSaving ? 0.7 : 1 }}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
};

export default ReferenceSettingsScreen;
