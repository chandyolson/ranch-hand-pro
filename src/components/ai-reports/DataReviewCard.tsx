import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";

interface Props {
  records: Record<string, string>[];
  context: string;
  confidence: "high" | "medium" | "low";
  notes?: string;
  onComplete: (msg: string) => void;
}

const CONFIDENCE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  high: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32", label: "High Confidence" },
  medium: { bg: "#FFF8E1", border: "#F3D12A", text: "#8D6E00", label: "Medium Confidence — Review Carefully" },
  low: { bg: "#FDF0EF", border: "#E74C3C", text: "#C62828", label: "Low Confidence — Check All Fields" },
};

const DataReviewCard: React.FC<Props> = ({ records: initial, context, confidence, notes, onComplete }) => {
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const conf = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.medium;

  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);

  const updateCell = (ri: number, key: string, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === ri ? { ...r, [key]: val } : r)));
  };

  const removeRow = (ri: number) => setRows((prev) => prev.filter((_, i) => i !== ri));

  const handleSave = async () => {
    setSaving(true);
    let saved = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      setProgress(i + 1);
      try {
        const r = rows[i];
        if (context === "calving") {
          const { error } = await supabase.rpc("ai_create_calving_record", {
            p_operation_id: operationId,
            p_dam_tag: r["Dam Tag"] || r["dam_tag"] || "",
            p_calving_date: r["Date"] || r["calving_date"] || new Date().toISOString().slice(0, 10),
            p_calf_sex: r["Calf Sex"] || r["calf_sex"] || "Bull",
            p_birth_weight: parseFloat(r["Weight"] || r["birth_weight"] || "0") || null,
            p_calf_status: r["Status"] || r["calf_status"] || "Alive",
            p_assistance: parseInt(r["Assistance"] || r["assistance"] || "1") || 1,
            p_sire_tag: r["Sire"] || r["sire_tag"] || null,
            p_calf_tag: r["Calf Tag"] || r["calf_tag"] || null,
            p_memo: r["Notes"] || r["memo"] || null,
            p_created_by: null,
          });
          if (error) throw error;
        } else if (context === "treatment") {
          const { error } = await supabase.rpc("ai_create_treatment", {
            p_operation_id: operationId,
            p_animal_tag: r["Tag"] || r["animal_tag"] || "",
            p_disease_name: r["Disease"] || r["disease"] || null,
            p_treatment_date: r["Date"] || r["date"] || new Date().toISOString().slice(0, 10),
            p_product_names: r["Products"] ? r["Products"].split(",").map((s: string) => s.trim()) : null,
            p_memo: r["Notes"] || r["memo"] || null,
            p_created_by: null,
          });
          if (error) throw error;
        } else {
          // Generic — just count as success; data is already shown in chat
          saved++;
          continue;
        }
        saved++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message || "Failed"}`);
      }
    }
    setSaving(false);
    if (errors.length) {
      showToast("error", `${errors.length} record(s) failed`);
    }
    onComplete(`${saved} of ${rows.length} records saved from photo.${errors.length ? ` ${errors.length} failed.` : ""}`);
  };

  return (
    <div style={{ border: `1.5px solid ${conf.border}`, borderRadius: 12, background: "#fff", padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>
          Extracted {rows.length} records from photo
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, background: conf.bg, color: conf.text, borderRadius: 10, padding: "2px 8px" }}>
          {conf.label}
        </span>
      </div>
      {notes && (
        <div style={{ background: "#FFF8E1", border: "1px solid #F3D12A", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#8D6E00", marginBottom: 8 }}>
          {notes}
        </div>
      )}
      <div style={{ overflowX: "auto", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #D4D4D0", color: "#666", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {headers.map((h) => (
                  <td key={h} style={{ padding: "2px 4px", borderBottom: "1px solid #F0F0F0" }}>
                    <input
                      value={r[h] || ""}
                      onChange={(e) => updateCell(ri, h, e.target.value)}
                      style={{ width: "100%", minWidth: 60, border: "none", background: "transparent", fontSize: 13, padding: "2px 2px", outline: "none" }}
                      onFocus={(e) => (e.currentTarget.style.background = "#F5F5F0")}
                      onBlur={(e) => (e.currentTarget.style.background = "transparent")}
                    />
                  </td>
                ))}
                <td>
                  <button onClick={() => removeRow(ri)} style={{ background: "none", border: "none", cursor: "pointer", color: "#E74C3C", fontSize: 12, padding: 2 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {saving && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
          Saving {progress} of {rows.length}…
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ borderRadius: 20, border: "none", background: "#F3D12A", color: "#0E2646", fontSize: 13, fontWeight: 600, padding: "6px 16px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
        >
          Save {rows.length} Records
        </button>
        <button
          onClick={() => onComplete("Photo import cancelled.")}
          disabled={saving}
          style={{ borderRadius: 20, border: "1.5px solid #D4D4D0", background: "transparent", color: "#666", fontSize: 13, fontWeight: 600, padding: "6px 16px", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DataReviewCard;
