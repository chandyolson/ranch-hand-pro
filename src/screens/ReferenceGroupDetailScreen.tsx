import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import EditDeleteButtons from "@/components/EditDeleteButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import FormFieldRow from "@/components/FormFieldRow";

const CATTLE_TYPES = ["Cows", "Bulls", "Calves", "Heifers", "Mixed", "All"];

const ReferenceGroupDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cattleType, setCattleType] = useState("Cows");
  const [isActive, setIsActive] = useState(true);

  const { data: group, isLoading } = useQuery({
    queryKey: ["group-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Count of animals isn't directly linked, but we can count projects using this group
  const { data: projectCount } = useQuery({
    queryKey: ["group-projects-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("group_id", id!);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: calvingCount } = useQuery({
    queryKey: ["group-calving-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("calving_records")
        .select("id", { count: "exact", head: true })
        .eq("group_id", id!);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setCattleType(group.cattle_type);
      setIsActive(group.is_active);
    }
  }, [group]);

  const handleSave = async () => {
    if (!name.trim()) { showToast("error", "Name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          cattle_type: cattleType,
          is_active: isActive,
        })
        .eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-detail", id] });
      showToast("success", "Group updated");
      setEditing(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("groups").delete().eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      showToast("success", "Group deleted");
      navigate("/reference/groups");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete");
    }
  };

  const handleCancel = () => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setCattleType(group.cattle_type);
      setIsActive(group.is_active);
    }
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-10 space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
        <Skeleton className="h-[160px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-4 pt-4 pb-10">
        <div className="py-12 text-center space-y-2">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Group not found</div>
          <button
            className="rounded-full px-5 py-2 cursor-pointer active:scale-[0.97]"
            style={{ backgroundColor: "#0E2646", color: "white", fontSize: 13, fontWeight: 600, border: "none" }}
            onClick={() => navigate("/reference/groups")}
          >
            ← Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const createdDate = new Date(group.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95]"
          style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
          onClick={() => navigate("/reference/groups")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>GROUP</span>
        </div>
        {!editing && (
          <EditDeleteButtons onEdit={() => setEditing(true)} onDelete={handleDelete} />
        )}
      </div>

      {/* Main card */}
      <div className="rounded-xl px-3 py-3.5 space-y-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {editing ? (
          <>
            <FormFieldRow label="Name" required>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} />
            </FormFieldRow>
            <FormFieldRow label="Type">
              <select value={cattleType} onChange={e => setCattleType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                {CATTLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormFieldRow>
            <FormFieldRow label="Memo">
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" className={INPUT_CLS} style={{ fontSize: 16 }} />
            </FormFieldRow>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 pb-2" style={{ borderBottom: "1px solid rgba(212,212,208,0.30)" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2" style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3 }}>
                  <span>{group.name}</span>
                  <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em", backgroundColor: "rgba(85,186,170,0.15)", color: "#55BAAA" }}>
                    {group.cattle_type}
                  </span>
                </div>
              </div>
              <span
                className="rounded-full shrink-0"
                style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em",
                  backgroundColor: group.is_active ? "rgba(85,186,170,0.15)" : "rgba(155,35,53,0.15)",
                  color: group.is_active ? "#55BAAA" : "#9B2335",
                }}
              >
                {group.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            {group.description && (
              <div style={{ fontSize: 14, fontWeight: 400, color: "rgba(26,26,26,0.60)", lineHeight: 1.5 }}>
                {group.description}
              </div>
            )}

            {!group.description && (
              <div style={{ fontSize: 14, fontWeight: 400, color: "rgba(26,26,26,0.25)", fontStyle: "italic" }}>
                No description
              </div>
            )}

            <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(212,212,208,0.30)" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>
                Created {createdDate}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Active toggle (edit mode) */}
      {editing && (
        <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Active</div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Inactive groups are hidden from dropdowns</div>
            </div>
            <button
              className="relative cursor-pointer transition-all rounded-full"
              style={{
                width: 44, height: 24,
                backgroundColor: isActive ? "#55BAAA" : "rgba(26,26,26,0.15)",
                border: "none",
              }}
              onClick={() => setIsActive(!isActive)}
            >
              <span
                className="absolute rounded-full bg-white shadow transition-all"
                style={{ width: 16, height: 16, top: 4, left: isActive ? 24 : 4 }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Usage stats card */}
      {!editing && (
        <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>USAGE</div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center" style={{ minWidth: 70 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#0E2646" }}>{projectCount ?? "—"}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Projects</span>
            </div>
            <div style={{ width: 1, backgroundColor: "rgba(212,212,208,0.40)" }} />
            <div className="flex flex-col items-center" style={{ minWidth: 70 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#0E2646" }}>{calvingCount ?? "—"}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Calving Records</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons (edit mode) */}
      {editing && (
        <div className="flex gap-3 pt-1">
          <button
            className="flex-1 rounded-full py-3.5 border cursor-pointer active:scale-[0.97]"
            style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 14, fontWeight: 600, color: "#0E2646" }}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-full py-3.5 cursor-pointer active:scale-[0.97]"
            style={{ flex: 2, backgroundColor: "#F3D12A", fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", boxShadow: "0 2px 8px rgba(243,209,42,0.30)", opacity: saving ? 0.5 : 1 }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReferenceGroupDetailScreen;
