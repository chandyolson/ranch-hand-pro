import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useGroups } from "@/hooks/useGroups";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";

const ReferenceGroupsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useGroups();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const { showToast } = useChuteSideToast();

  const handleAdd = async () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    const { error } = await supabase.from("groups").insert({
      operation_id: operationId,
      name: newName.trim(),
      description: newMemo.trim() || null,
      cattle_type: "Cows",
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewMemo(""); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    showToast("success", name + " deleted");
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Groups</span>
        <button
          className="flex items-center justify-center cursor-pointer active:scale-[0.95]"
          style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}
          onClick={() => setAddOpen(true)}
        >+</button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span style={LABEL_STYLE}>Memo</span>
            <input type="text" value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="Optional note" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewMemo(""); }}>Cancel</button>
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
        <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
          {(groups || []).map(g => (
            <ReferenceItemRow
              key={g.id}
              label={g.name}
              sublabel={g.description || ""}
              onEdit={() => showToast("info", "Edit " + g.name)}
              onDelete={() => handleDelete(g.id, g.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferenceGroupsScreen;
