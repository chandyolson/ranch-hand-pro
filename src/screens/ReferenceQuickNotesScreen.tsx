import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  management: { label: "Management", color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  cull:       { label: "Cull",       color: "#9B2335", bg: "rgba(155,35,53,0.12)" },
  health:     { label: "Health",     color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
};

const ReferenceQuickNotesScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useQuickNotes();
  const [addOpen, setAddOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("management");
  const { showToast } = useChuteSideToast();

  const handleAdd = async () => {
    if (!newText.trim()) { showToast("error", "Note text is required"); return; }
    const { error } = await supabase.from("quick_notes").insert({
      operation_id: operationId,
      note: newText.trim(),
      note_type: newCategory,
      is_active: true,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
    showToast("success", newText.trim() + " added");
    setNewText(""); setNewCategory("management"); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("quick_notes").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
    showToast("success", name + " deleted");
  };

  const allNotes = notes || [];

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Quick Notes</span>
        <button
          className="flex items-center justify-center cursor-pointer active:scale-[0.95]"
          style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}
          onClick={() => setAddOpen(true)}
        >+</button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Note</span>
            <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Note text" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Category</span>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              <option value="management">Management</option>
              <option value="cull">Cull</option>
              <option value="health">Health</option>
            </select>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewText(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
            {allNotes.map(n => {
              const cat = categoryConfig[n.note_type];
              return (
                <ReferenceItemRow
                  key={n.id}
                  label={n.note}
                  badge={cat ? { text: cat.label, bg: cat.bg, color: cat.color } : undefined}
                  onEdit={() => showToast("info", "Edit " + n.note)}
                  onDelete={() => handleDelete(n.id, n.note)}
                />
              );
            })}
          </div>

          <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>
              PREVIEW — how these appear in entry screens
            </div>
            <div className="flex flex-wrap gap-2">
              {allNotes.map(n => (
                <span
                  key={n.id}
                  className="rounded-full px-3 py-1.5 border"
                  style={{ fontSize: 13, fontWeight: 600, backgroundColor: "white", borderColor: "#D4D4D0", color: "#1A1A1A" }}
                >
                  {n.note}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReferenceQuickNotesScreen;
