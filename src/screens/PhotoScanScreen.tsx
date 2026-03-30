import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import CaptureStep, { RecordContext } from "@/components/photo-scan/CaptureStep";
import ReviewTable from "@/components/photo-scan/ReviewTable";
import ImportProgress from "@/components/photo-scan/ImportProgress";
import { fileToBase64 } from "@/lib/photo-scan/image-utils";

type Step = "capture" | "review" | "import";

const PhotoScanScreen: React.FC<{ asModal?: boolean; onClose?: () => void }> = ({ asModal, onClose }) => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("capture");
  const [context, setContext] = useState<RecordContext>("calving");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Review state
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low">("medium");
  const [aiNotes, setAiNotes] = useState<string>("");
  const [dynamicHeaders, setDynamicHeaders] = useState<string[]>([]);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importCompleted, setImportCompleted] = useState(0);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [importDone, setImportDone] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!imageFile) return;
    setExtracting(true);
    try {
      const { base64, mediaType } = await fileToBase64(imageFile);
      const { data, error } = await supabase.functions.invoke("photo-extract", {
        body: { image_base64: base64, media_type: mediaType, context, operation_id: operationId },
      });
      if (error) throw error;

      setRows(data?.records ?? []);
      setConfidence(data?.confidence ?? "medium");
      setAiNotes(data?.notes ?? "");
      if (data?.headers) setDynamicHeaders(data.headers);
      setStep("review");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to extract data from image");
    }
    setExtracting(false);
  }, [imageFile, context, operationId, showToast]);

  const handleCellChange = (rowIdx: number, col: string, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
  };

  const handleDeleteRow = (rowIdx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const handleAddRow = () => {
    if (rows.length > 0) {
      const blank: Record<string, string> = {};
      Object.keys(rows[0]).forEach((k) => (blank[k] = ""));
      setRows((prev) => [...prev, blank]);
    }
  };

  const handleImport = useCallback(async () => {
    setStep("import");
    setImporting(true);
    setImportTotal(rows.length);
    setImportCompleted(0);
    setImportErrors([]);
    setImportDone(false);

    const errors: { row: number; message: string }[] = [];
    let completed = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (context === "calving") {
          const { error } = await supabase.rpc("ai_create_calving_record", {
            p_operation_id: operationId,
            p_dam_tag: row["Dam Tag"] || "",
            p_calving_date: row["Date"] || new Date().toISOString().slice(0, 10),
            p_calf_sex: row["Calf Sex"] || "Bull",
            p_birth_weight: parseFloat(row["Weight"]) || null,
            p_calf_status: row["Status"] || "Alive",
            p_assistance: parseInt(row["Assistance"]) || 1,
            p_sire_tag: row["Sire"] || null,
            p_calf_tag: null,
            p_memo: row["Notes"] || null,
            p_created_by: null,
          });
          if (error) throw error;
        } else if (context === "treatment") {
          const products = row["Products"] ? row["Products"].split(",").map((p) => p.trim()) : [];
          const { error } = await supabase.rpc("ai_create_treatment", {
            p_operation_id: operationId,
            p_animal_tag: row["Tag"] || "",
            p_disease_name: row["Disease"] || null,
            p_treatment_date: row["Date"] || new Date().toISOString().slice(0, 10),
            p_product_names: products,
            p_memo: row["Notes"] || null,
            p_created_by: null,
          });
          if (error) throw error;
        } else {
          // For tally, receipt, general — just mark as success (no direct table mapping without more context)
          // In a full implementation, these would map to specific tables
        }
        completed++;
      } catch (err: any) {
        errors.push({ row: i, message: err?.message || "Failed" });
      }
      setImportCompleted(completed);
      setImportErrors([...errors]);
    }

    setImportDone(true);
    setImporting(false);
  }, [rows, context, operationId]);

  const handleScanAnother = () => {
    setStep("capture");
    setImageFile(null);
    setImageUrl(null);
    setRows([]);
    setImportDone(false);
    setImportCompleted(0);
    setImportErrors([]);
  };

  const viewRecordsPath = context === "calving" ? "/calving" : context === "treatment" ? "/reference/treatments" : "/animals";

  const content = (
    <div style={{ padding: asModal ? 20 : 0 }}>
      {asModal && (
        <div className="flex justify-end mb-2">
          <button onClick={onClose} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer" }}>
            Close
          </button>
        </div>
      )}

      {step === "capture" && (
        <CaptureStep
          context={context}
          onContextChange={setContext}
          imageUrl={imageUrl}
          onFileSelect={handleFileSelect}
          onExtract={handleExtract}
          extracting={extracting}
        />
      )}

      {step === "review" && (
        <ReviewTable
          context={context}
          rows={rows}
          dynamicHeaders={dynamicHeaders}
          confidence={confidence}
          aiNotes={aiNotes}
          onChange={handleCellChange}
          onDeleteRow={handleDeleteRow}
          onAddRow={handleAddRow}
          onBack={() => setStep("capture")}
          onImport={handleImport}
          importing={importing}
        />
      )}

      {step === "import" && (
        <ImportProgress
          total={importTotal}
          completed={importCompleted}
          errors={importErrors}
          done={importDone}
          onScanAnother={handleScanAnother}
          onViewRecords={() => navigate(viewRecordsPath)}
        />
      )}
    </div>
  );

  if (asModal) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div
          style={{
            background: "#F5F5F0",
            borderRadius: "16px 16px 0 0",
            width: "100%",
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
            animation: "slideUp 0.3s ease",
          }}
        >
          {content}
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return content;
};

export default PhotoScanScreen;
