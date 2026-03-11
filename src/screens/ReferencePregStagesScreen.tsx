import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

const ReferencePregStagesScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIsCull, setNewIsCull] = useState(false);
  const { showToast } = useChuteSideToast();

  const { data: stages, isLoading } = useQuery({
    queryKey: ['preg-stages', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preg_stages')
        .select('*')
        .eq('operation_id', operationId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    if (!newLabel.trim()) { showToast("error", "Stage name is required"); return; }
    const nextOrder = (stages || []).length + 1;
    const { error } = await supabase.from('preg_stages').insert({
      operation_id: operationId,
      stage_name: newLabel.trim(),
      sort_order: nextOrder,
      is_active: true,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['preg-stages'] });
    showToast("success", newLabel.trim() + " added");
    setNewLabel(""); setNewIsCull(false); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('preg_stages').delete().eq('id', id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['preg-stages'] });
    showToast("success", name + " deleted");
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Preg Stages</span>
        <button className="flex items-center justify-center cursor-pointer active:scale-[0.95]" style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }} onClick={() => setAddOpen(true)}>+</button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Stage</span>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Stage name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Marks as cull candidate</span>
            <button
              className="relative cursor-pointer transition-all rounded-full"
              style={{ width: 44, height: 24, backgroundColor: newIsCull ? "#9B2335" : "rgba(26,26,26,0.15)", border: "none" }}
              onClick={() => setNewIsCull(!newIsCull)}
            >
              <span className="absolute rounded-full bg-white shadow transition-all" style={{ width: 16, height: 16, top: 4, left: newIsCull ? 24 : 4 }} />
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewLabel(""); setNewIsCull(false); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {isLoading ? (
          <div className="py-6 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>Loading…</div>
        ) : (stages || []).length === 0 ? (
          <div className="py-6 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>No preg stages yet</div>
        ) : (
          (stages || []).map(s => (
            <ReferenceItemRow
              key={s.id}
              label={s.stage_name}
              sublabel={"Order: " + (s.sort_order ?? '—')}
              onEdit={() => showToast("info", "Edit " + s.stage_name)}
              onDelete={() => handleDelete(s.id, s.stage_name)}
            />
          ))
        )}
        <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontStyle: "italic", paddingTop: 8, paddingBottom: 4 }}>
          These labels populate the Preg Stage dropdown in PREG projects.
        </div>
      </div>
    </div>
  );
};

export default ReferencePregStagesScreen;
