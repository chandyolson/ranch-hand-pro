import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useLocations } from "@/hooks/useLocations";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";

const ReferenceLocationsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { data: locations, isLoading } = useLocations();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const { showToast } = useChuteSideToast();

  const allLocations = locations || [];
  const topLevel = allLocations.filter(l => !l.parent_location_id);

  const handleAdd = async () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    const { error } = await supabase.from("locations").insert({
      operation_id: operationId,
      name: newName.trim(),
      location_type: "Pasture",
      is_active: true,
      parent_location_id: newParent || null,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewParent(""); setAddOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    showToast("success", name + " deleted");
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Locations</span>
        <button
          className="flex items-center justify-center cursor-pointer active:scale-[0.95]"
          style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}
          onClick={() => setAddOpen(true)}
        >+</button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Location name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Parent</span>
            <select value={newParent} onChange={e => setNewParent(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              <option value="">None (top level)</option>
              {topLevel.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewParent(""); }}>Cancel</button>
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
          {topLevel.map(tl => {
            const children = allLocations.filter(l => l.parent_location_id === tl.id);
            return (
              <React.Fragment key={tl.id}>
                <ReferenceItemRow
                  label={tl.name}
                  sublabel={tl.description || tl.location_type}
                  onEdit={() => showToast("info", "Edit " + tl.name)}
                  onDelete={() => handleDelete(tl.id, tl.name)}
                />
                {children.length > 0 && (
                  <div className="pl-4 ml-3" style={{ borderLeft: "1px solid rgba(26,26,26,0.08)" }}>
                    {children.map(ch => (
                      <ReferenceItemRow
                        key={ch.id}
                        label={ch.name}
                        sublabel={ch.description || "Sub-location"}
                        badge={{ text: tl.name, bg: "rgba(14,38,70,0.06)", color: "#0E2646" }}
                        onEdit={() => showToast("info", "Edit " + ch.name)}
                        onDelete={() => handleDelete(ch.id, ch.name)}
                      />
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReferenceLocationsScreen;
