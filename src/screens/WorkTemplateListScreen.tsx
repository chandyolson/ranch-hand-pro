import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { SUB_LABEL } from "@/lib/styles";

export default function WorkTemplateListScreen() {
  const { operationId } = useOperation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["project-templates", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*, work_type:work_types(code, name)")
        .eq("operation_id", operationId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("project_templates").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      showToast("success", "Template deleted");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <div style={SUB_LABEL}>WORK TEMPLATES</div>
        <button
          className="rounded-full px-4 py-2 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          onClick={() => navigate("/reference/templates/new")}
        >
          + New Template
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8" style={{ fontSize: 14, color: "rgba(26,26,26,0.40)" }}>Loading...</div>
      ) : (templates || []).length === 0 ? (
        <div className="rounded-xl bg-white px-4 py-8 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
          <div style={{ fontSize: 14, color: "rgba(26,26,26,0.40)" }}>No work templates yet</div>
          <div style={{ fontSize: 12, color: "rgba(26,26,26,0.30)", marginTop: 4 }}>
            Templates pre-fill project settings so you can start faster.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(templates || []).map((t) => {
            const productCount = Array.isArray(t.default_products) ? (t.default_products as any[]).length : 0;
            return (
              <div
                key={t.id}
                className="rounded-xl bg-white px-3 py-3 flex items-center justify-between"
                style={{ border: "1px solid rgba(212,212,208,0.60)" }}
              >
                <button
                  className="flex-1 min-w-0 text-left cursor-pointer"
                  style={{ background: "none", border: "none", padding: 0 }}
                  onClick={() => navigate(`/reference/templates/edit?id=${t.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{t.name}</span>
                    {(t.work_type as any)?.code && (
                      <span
                        className="rounded-full shrink-0"
                        style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.15)", color: "#C4A600" }}
                      >
                        {(t.work_type as any).code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.default_cattle_type && (
                      <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>{t.default_cattle_type}</span>
                    )}
                    {productCount > 0 && (
                      <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                        {productCount} product{productCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  className="shrink-0 cursor-pointer active:scale-[0.95]"
                  style={{ fontSize: 18, color: "rgba(26,26,26,0.25)", background: "none", border: "none", padding: "0 4px" }}
                  disabled={deleting === t.id}
                  onClick={() => handleDelete(t.id, t.name)}
                >
                  {deleting === t.id ? "..." : "×"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
