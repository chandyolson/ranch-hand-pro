import React, { useState, useEffect } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

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
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useChuteSideToast();

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('operations')
        .update({
          name: operationName.trim(),
          operation_type: operationType,
          address: { street: address.trim(), city: city.trim(), state: state_, lifetime_prefix: lifetimePrefix.trim() },
        })
        .eq('id', operationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['operation'] });
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
        <div className="flex items-center gap-2"><span style={LABEL_STYLE}>Op Name</span><input type="text" value={operationName} onChange={e => setOperationName(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2"><span style={LABEL_STYLE}>Address</span><input type="text" value={address} onChange={e => setAddress(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2"><span style={LABEL_STYLE}>City</span><input type="text" value={city} onChange={e => setCity(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} /></div>
        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>State</span>
          <select value={state_} onChange={e => setState_(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            {usStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>ID Prefix</span>
          <input type="text" value={lifetimePrefix} onChange={e => setLifetimePrefix(e.target.value)} placeholder="e.g. SBR" className={INPUT_CLS} style={{ fontSize: 16 }} />
        </div>
        <div style={{ marginLeft: 104, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 2 }}>
          Lifetime IDs generate as {lifetimePrefix || "___"}25-3309 (e.g. {lifetimePrefix || "SBR"}25-3309)
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
