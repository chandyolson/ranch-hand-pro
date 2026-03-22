import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChuteSideToast } from "@/components/ToastContext";
import { useOperation } from "@/contexts/OperationContext";
import { ALL_TEMPLATES, type BreedTemplate } from "@/lib/breed-templates";
import * as XLSX from "xlsx";

// === TYPES ===
type WizardStep = "upload" | "confirm" | "analysis" | "questions" | "summary" | "export";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  rows: number;
  columns: string[];
  preview: Record<string, string>[];
  allData: Record<string, string>[];
}

interface ColumnFlag {
  column: string;
  issue: "clean" | "empty" | "inconsistent" | "combined" | "unknown" | "format";
  description: string;
  suggestion: string;
  confidence: "high" | "medium" | "low";
  likelyMapsTo: string | null;
  status: "pending" | "accepted" | "rejected";
  userNote: string;
}

type Purpose =
  | "merge_herd"
  | "new_animals"
  | "breed_association"
  | "clean_export"
  | "custom";

const PURPOSE_OPTIONS: { value: Purpose; label: string; description: string }[] = [
  { value: "merge_herd", label: "Merge with Existing Herd", description: "Update or add to animals already in the system" },
  { value: "new_animals", label: "Set Up New Animals", description: "Import a fresh set of animals into ChuteSide" },
  { value: "breed_association", label: "Prep for Breed Association", description: "Map data to Angus, Hereford, or other templates" },
  { value: "clean_export", label: "Clean & Export", description: "Standardize data and download a cleaned file" },
  { value: "custom", label: "Something Else", description: "Describe what you need" },
];

// === STEP INDICATOR ===
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "confirm", label: "Confirm" },
  { key: "analysis", label: "Analysis" },
  { key: "questions", label: "Questions" },
  { key: "summary", label: "Summary" },
  { key: "export", label: "Export" },
];

const StepIndicator: React.FC<{ current: WizardStep }> = ({ current }) => {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 16px", marginBottom: 16 }}>
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: isDone ? "#55BAAA" : isActive ? "#F3D12A" : "rgba(14,38,70,0.08)",
                  color: isDone || isActive ? "#FFFFFF" : "rgba(26,26,26,0.35)",
                  border: isActive ? "2px solid #F3D12A" : isDone ? "2px solid #55BAAA" : "1px solid #D4D4D0",
                  transition: "all 0.2s ease",
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#0E2646" : "rgba(26,26,26,0.40)",
                  marginTop: 4,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: i < currentIdx ? "#55BAAA" : "#D4D4D0",
                  marginBottom: 16,
                  transition: "background-color 0.2s ease",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// === CARD WRAPPER ===
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #D4D4D0",
      padding: 16,
      marginBottom: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

// === GOLD BUTTON ===
const GoldButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}> = ({ children, onClick, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="active:scale-[0.97]"
    style={{
      width: "100%",
      height: 48,
      borderRadius: 9999,
      border: "none",
      backgroundColor: disabled ? "rgba(243,209,42,0.4)" : "#F3D12A",
      color: "#0E2646",
      fontSize: 16,
      fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s ease",
      ...style,
    }}
  >
    {children}
  </button>
);

// === SECONDARY BUTTON ===
const SecondaryButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}> = ({ children, onClick, style }) => (
  <button
    onClick={onClick}
    className="active:scale-[0.97]"
    style={{
      width: "100%",
      height: 44,
      borderRadius: 9999,
      border: "1px solid #D4D4D0",
      backgroundColor: "#FFFFFF",
      color: "#0E2646",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "'Inter', sans-serif",
      cursor: "pointer",
      transition: "all 0.15s ease",
      ...style,
    }}
  >
    {children}
  </button>
);

// === MAIN SCREEN ===
const CowCleanerScreen: React.FC = () => {
  const [step, setStep] = useState<WizardStep>("upload");
  const [mode, setMode] = useState<"guided" | "advanced">("guided");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [flags, setFlags] = useState<ColumnFlag[]>([]);
  const [overallNotes, setOverallNotes] = useState("");
  const [cleanCount, setCleanCount] = useState(0);
  const [emptyCount, setEmptyCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  // Questions state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentNote, setCurrentNote] = useState("");

  // Export state
  const [exporting, setExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BreedTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const { showToast } = useChuteSideToast();
  const { operationId } = useOperation();

  // === EXPORT HANDLERS ===

  // Build cleaned data from original file + accepted fixes
  const buildCleanedData = useCallback((): Record<string, string>[] => {
    if (!fileInfo) return [];
    const removedColumns = flags.filter((f) => f.issue === "empty" && f.status !== "rejected").map((f) => f.column);

    return fileInfo.allData.map((row) => {
      const cleaned: Record<string, string> = {};
      Object.entries(row).forEach(([col, val]) => {
        if (removedColumns.includes(col)) return;
        cleaned[col] = val;
      });
      return cleaned;
    });
  }, [fileInfo, flags]);

  const handleDownloadCleaned = useCallback(() => {
    if (!fileInfo) return;
    setExporting(true);
    try {
      const data = buildCleanedData();
      if (data.length === 0) {
        showToast("error", "No data to export.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cleaned Data");
      const baseName = fileInfo.name.replace(/\.[^.]+$/, "");
      XLSX.writeFile(wb, `${baseName}_cleaned.xlsx`);
      showToast("success", "Cleaned file downloaded.");
    } catch (err) {
      console.error("Download error:", err);
      showToast("error", "Download failed. Try again.");
    } finally {
      setExporting(false);
    }
  }, [fileInfo, buildCleanedData, showToast]);

  const handleImportToChuteSide = useCallback(async () => {
    if (!fileInfo) return;
    setExporting(true);
    try {
      const data = buildCleanedData();
      if (data.length === 0) {
        showToast("error", "No data to import.");
        return;
      }

      // Build column mapping from AI analysis: source column → ChuteSide field
      const columnMap: Record<string, string> = {};
      flags.forEach((f) => {
        if (f.likelyMapsTo && f.issue !== "empty") {
          columnMap[f.column] = f.likelyMapsTo;
        }
      });

      // Check we have the minimum required fields: tag and sex
      const hasTag = Object.values(columnMap).includes("tag");
      const hasSex = Object.values(columnMap).includes("sex");

      if (!hasTag) {
        showToast("error", "Can't import — no column maps to 'tag'. Go back and verify the analysis.");
        setExporting(false);
        return;
      }
      if (!hasSex) {
        showToast("error", "Can't import — no column maps to 'sex'. Go back and verify the analysis.");
        setExporting(false);
        return;
      }

      // Map each row to an animals insert record
      const animals = data.map((row) => {
        const record: Record<string, unknown> = {
          operation_id: operationId,
          status: "Active",
        };
        Object.entries(row).forEach(([col, val]) => {
          const field = columnMap[col];
          if (field && val) {
            if (field === "year_born") {
              const num = parseInt(val, 10);
              if (!isNaN(num)) record[field] = num;
            } else if (field === "registered") {
              record[field] = ["yes", "true", "y", "1"].includes(val.toLowerCase());
            } else {
              record[field] = val;
            }
          }
        });
        return record;
      });

      // Filter out rows without a tag
      const validAnimals = animals.filter((a) => a.tag);

      if (validAnimals.length === 0) {
        showToast("error", "No valid rows found — every row needs at least a tag value.");
        setExporting(false);
        return;
      }

      const { error } = await supabase.from("animals").insert(validAnimals as any);

      if (error) {
        console.error("Import error:", error);
        showToast("error", `Import failed: ${error.message}`);
      } else {
        showToast("success", `${validAnimals.length} animals imported to ChuteSide.`);
      }
    } catch (err) {
      console.error("Import error:", err);
      showToast("error", "Import failed. Try again.");
    } finally {
      setExporting(false);
    }
  }, [fileInfo, flags, operationId, buildCleanedData, showToast]);

  const handleBreedAssociation = useCallback(() => {
    setShowTemplateSelector(true);
  }, []);

  const handleExportToTemplate = useCallback((template: BreedTemplate) => {
    if (!fileInfo) return;
    setExporting(true);
    try {
      const data = buildCleanedData();
      if (data.length === 0) {
        showToast("error", "No data to export.");
        setExporting(false);
        return;
      }

      // Build column mapping from AI analysis: source column → ChuteSide field
      const columnMap: Record<string, string> = {};
      flags.forEach((f) => {
        if (f.likelyMapsTo && f.issue !== "empty") {
          columnMap[f.column] = f.likelyMapsTo;
        }
      });

      // Map ChuteSide field names to common Angus template header patterns
      const fieldToTemplateMap: Record<string, string[]> = {
        tag: ["CALF TAG", "DAM TAG", "COW TAG", "TAG", "TAG *"],
        eid: ["ELEC ID", "840 EID"],
        breed: ["CALF ASSN", "DAM ASSN", "COW ASSN", "ASSN"],
        sex: ["CALF SEX", "SEX", "SEX *"],
        birth_date: ["BIRTH DATE", "DAM BIRTH DATE", "COW BIRTH DATE", "BIRTH DATE *", "CALF BIRTH DATE"],
        reg_number: ["CALF ASSN NUM", "DAM ASSN NUM", "DAM ASSN NUMBER", "COW ASSN NUMBER", "ASSN NUM", "ASSN NUM *", "SIRE REG", "DAM REG"],
        reg_name: ["ANGUS NAME"],
        sire_id: ["SIRE ASSN NUM", "SIRE REG"],
        dam_id: ["DAM ASSN NUM", "DAM REG"],
        official_id: ["TATTOO/BRAND", "TATTOO/ BRAND", "TATTOO /BRAND", "TATT"],
        calf_tag: ["CALF TAG"],
        memo: ["COMMENT", "FS COMMENT", "COW FOOT SCORE COMMENT", "FOOT SCORE COMMENT"],
      };

      // For each template column, find the best source column
      const templateHeaders = template.columns.map((c) => c.name);
      const rows: Record<string, string>[] = data.map((row) => {
        const mapped: Record<string, string> = {};
        templateHeaders.forEach((header) => {
          // Direct match: source column name matches template header (case-insensitive)
          const directMatch = Object.keys(row).find(
            (col) => col.toUpperCase().trim() === header.toUpperCase().trim()
          );
          if (directMatch && row[directMatch]) {
            mapped[header] = row[directMatch];
            return;
          }

          // Indirect match via AI mapping: source → chuteside field → template header
          for (const [sourceCol, chuteSideField] of Object.entries(columnMap)) {
            const possibleHeaders = fieldToTemplateMap[chuteSideField] || [];
            if (possibleHeaders.some((h) => h.toUpperCase() === header.toUpperCase()) && row[sourceCol]) {
              mapped[header] = row[sourceCol];
              return;
            }
          }

          mapped[header] = "";
        });
        return mapped;
      });

      // Build the Excel file with template structure
      const ws = XLSX.utils.json_to_sheet(rows, { header: templateHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, template.name);

      const baseName = fileInfo.name.replace(/\.[^.]+$/, "");
      XLSX.writeFile(wb, `${baseName}_${template.id}.xlsx`);
      showToast("success", `Exported to ${template.name} template.`);
      setShowTemplateSelector(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error("Template export error:", err);
      showToast("error", "Template export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }, [fileInfo, flags, buildCleanedData, showToast]);

  // UX Rule 6b: Tags are strings — all values read as text, never numbers
  const parseCSV = useCallback((text: string): { columns: string[]; preview: Record<string, string>[]; allData: Record<string, string>[]; totalRows: number } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { columns: [], preview: [], allData: [], totalRows: 0 };
    const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const allData = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      columns.forEach((col, i) => {
        row[col] = values[i] || "";
      });
      return row;
    });
    return { columns, preview: allData.slice(0, 10), allData, totalRows: allData.length };
  }, []);

  const parseExcel = useCallback((buffer: ArrayBuffer): { columns: string[]; preview: Record<string, string>[]; allData: Record<string, string>[]; totalRows: number } => {
    const workbook = XLSX.read(buffer, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false });
    if (jsonData.length === 0) return { columns: [], preview: [], allData: [], totalRows: 0 };
    const columns = Object.keys(jsonData[0]);
    const allData = jsonData.map((row) => {
      const mapped: Record<string, string> = {};
      columns.forEach((col) => {
        mapped[col] = String(row[col] ?? "");
      });
      return mapped;
    });
    return { columns, preview: allData.slice(0, 10), allData, totalRows: allData.length };
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) processFile(droppedFile);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) processFile(selectedFile);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const processFile = (f: File) => {
    setFile(f);
    const ext = f.name.toLowerCase().split(".").pop() || "";
    const isExcel = ["xlsx", "xls", "xlsm"].includes(ext);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let columns: string[];
        let preview: Record<string, string>[];
        let allData: Record<string, string>[];
        let totalRows: number;

        if (isExcel) {
          const buffer = e.target?.result as ArrayBuffer;
          ({ columns, preview, allData, totalRows } = parseExcel(buffer));
        } else {
          const text = e.target?.result as string;
          ({ columns, preview, allData, totalRows } = parseCSV(text));
        }

        setFileInfo({
          name: f.name,
          size: f.size,
          type: isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : f.type || "text/csv",
          rows: totalRows,
          columns,
          preview,
          allData,
        });
      } catch (err) {
        console.error("File parse error:", err);
        setAnalysisError("Couldn't read that file. Make sure it's a valid CSV or Excel file.");
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(f);
    } else {
      reader.readAsText(f);
    }
  };

  // Real AI analysis via Supabase Edge Function → Claude API
  const runAnalysis = async () => {
    if (!fileInfo || !purpose) return;
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke("cow-cleaner-analyze", {
        body: {
          columns: fileInfo.columns,
          sampleRows: fileInfo.preview,
          totalRows: fileInfo.rows,
          purpose,
          purposeDescription: purpose === "custom" ? customDescription : undefined,
        },
      });

      if (error) throw new Error(error.message || "Analysis request failed");
      if (data?.error) throw new Error(data.error);

      // Map API response to ColumnFlag format
      const apiColumns = data.columns || [];
      const mappedFlags: ColumnFlag[] = apiColumns.map(
        (col: {
          name: string;
          status: string;
          description: string;
          suggestion: string;
          confidence: string;
          likelyMapsTo: string | null;
        }) => ({
          column: col.name,
          issue: col.status as ColumnFlag["issue"],
          description: col.description,
          suggestion: col.suggestion,
          confidence: (col.confidence || "medium") as ColumnFlag["confidence"],
          likelyMapsTo: col.likelyMapsTo || null,
          status: col.status === "clean" ? "accepted" : "pending",
          userNote: "",
        })
      );

      setFlags(mappedFlags);
      setOverallNotes(data.overallNotes || "");
      setCleanCount(mappedFlags.filter((f) => f.issue === "clean").length);
      setEmptyCount(mappedFlags.filter((f) => f.issue === "empty").length);
      setQuestionCount(mappedFlags.filter((f) => f.issue !== "clean" && f.issue !== "empty").length);
      setStep("analysis");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong during analysis";
      console.error("Cow Cleaner analysis error:", err);
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const pendingFlags = flags.filter((f) => f.status === "pending" && f.issue !== "empty");
  const resolvedFlags = flags.filter((f) => f.status !== "pending");

  // === RENDER STEPS ===

  const renderUpload = () => (
    <div style={{ padding: "0 16px" }}>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["guided", "advanced"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="active:scale-[0.97]"
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: mode === m ? "2px solid #0E2646" : "1px solid #D4D4D0",
              backgroundColor: mode === m ? "#0E2646" : "#FFFFFF",
              color: mode === m ? "#FFFFFF" : "rgba(26,26,26,0.50)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {m === "guided" ? "Guided Mode" : "Advanced Mode"}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          style={{
            border: `2px dashed ${dragOver ? "#F3D12A" : "#D4D4D0"}`,
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            backgroundColor: dragOver ? "rgba(243,209,42,0.06)" : "#FAFAF8",
            transition: "all 0.2s ease",
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("cow-cleaner-file-input")?.click()}
        >
          <input
            id="cow-cleaner-file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto 12px" }}>
            <path d="M20 5V25M20 5L14 11M20 5L26 11" stroke={dragOver ? "#F3D12A" : "#55BAAA"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 25V31C6 33.2 7.8 35 10 35H30C32.2 35 34 33.2 34 31V25" stroke={dragOver ? "#F3D12A" : "#55BAAA"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {file ? (
            <div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                {file.name}
              </span>
              <br />
              <span style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>
                {(file.size / 1024).toFixed(1)} KB
                {fileInfo && ` · ${fileInfo.rows} rows · ${fileInfo.columns.length} columns`}
              </span>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Drop your file here
              </span>
              <br />
              <span style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>
                CSV, Excel, or TSV
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* File preview */}
      {fileInfo && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Detected Columns
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {fileInfo.columns.map((col) => (
              <span
                key={col}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 9999,
                  backgroundColor: "rgba(14,38,70,0.08)",
                  color: "#0E2646",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {col}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Purpose selection */}
      {fileInfo && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
            What do you want to do with this data?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPurpose(opt.value)}
                className="active:scale-[0.98]"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: purpose === opt.value ? "2px solid #F3D12A" : "1px solid #D4D4D0",
                  backgroundColor: purpose === opt.value ? "rgba(243,209,42,0.06)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
          {purpose === "custom" && (
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe what you're trying to do..."
              style={{
                width: "100%",
                marginTop: 10,
                height: 80,
                borderRadius: 8,
                border: "1px solid #D4D4D0",
                padding: 12,
                fontSize: 16,
                fontFamily: "'Inter', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#F3D12A";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#D4D4D0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          )}
        </Card>
      )}

      {/* Next button */}
      {fileInfo && purpose && (
        <GoldButton
          onClick={() => setStep("confirm")}
          disabled={purpose === "custom" && !customDescription.trim()}
        >
          Continue
        </GoldButton>
      )}
    </div>
  );

  const renderConfirm = () => (
    <div style={{ padding: "0 16px" }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
          Review Before Analysis
        </div>

        {/* File summary */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", fontFamily: "'Inter', sans-serif" }}>File</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>{fileInfo?.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", fontFamily: "'Inter', sans-serif" }}>Rows</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>{fileInfo?.rows}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", fontFamily: "'Inter', sans-serif" }}>Columns</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>{fileInfo?.columns.length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 0 }}>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", fontFamily: "'Inter', sans-serif" }}>Goal</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
            {PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label || customDescription}
          </span>
        </div>
      </Card>

      {/* Data preview */}
      {fileInfo && fileInfo.preview.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Data Preview (first {fileInfo.preview.length} rows)
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr>
                  {fileInfo.columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontWeight: 700,
                        color: "#0E2646",
                        borderBottom: "2px solid #D4D4D0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileInfo.preview.map((row, i) => (
                  <tr key={i}>
                    {fileInfo.columns.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: "5px 8px",
                          color: "#1A1A1A",
                          borderBottom: "1px solid rgba(212,212,208,0.50)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row[col] || <span style={{ color: "rgba(26,26,26,0.20)" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <SecondaryButton onClick={() => setStep("upload")} style={{ flex: 1 }}>
          Back
        </SecondaryButton>
        <GoldButton onClick={runAnalysis} disabled={analyzing} style={{ flex: 2 }}>
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </GoldButton>
      </div>

      {analyzing && (
        <Card style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", fontFamily: "'Inter', sans-serif" }}>
            AI is reading your data and looking for patterns...
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: "#D4D4D0", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: "60%",
                backgroundColor: "#55BAAA",
                borderRadius: 2,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </Card>
      )}

      {analysisError && (
        <Card style={{ marginTop: 12, border: "1px solid rgba(155,35,53,0.30)", backgroundColor: "rgba(155,35,53,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#9B2335", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
            Analysis Failed
          </div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
            {analysisError}
          </div>
          <button
            onClick={runAnalysis}
            className="active:scale-[0.97]"
            style={{
              marginTop: 10,
              padding: "8px 16px",
              borderRadius: 9999,
              border: "1px solid #D4D4D0",
              backgroundColor: "#FFFFFF",
              color: "#0E2646",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </Card>
      )}
    </div>
  );

  const renderAnalysis = () => (
    <div style={{ padding: "0 16px" }}>
      {/* AI overall notes */}
      {overallNotes && (
        <Card style={{ marginBottom: 12, border: "1px solid rgba(85,186,170,0.25)", backgroundColor: "rgba(85,186,170,0.04)" }}>
          <div style={{ fontSize: 13, color: "#0E2646", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
            {overallNotes}
          </div>
        </Card>
      )}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Card style={{ flex: 1, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#55BAAA", fontFamily: "'Inter', sans-serif" }}>{cleanCount}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Clean</div>
        </Card>
        <Card style={{ flex: 1, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "rgba(26,26,26,0.25)", fontFamily: "'Inter', sans-serif" }}>{emptyCount}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Empty</div>
        </Card>
        <Card style={{ flex: 1, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F3D12A", fontFamily: "'Inter', sans-serif" }}>{questionCount}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Questions</div>
        </Card>
      </div>

      {/* Flags list — skip clean columns, show issues only */}
      {flags.filter((f) => f.issue !== "clean").map((flag, i) => (
        <Card key={i}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                backgroundColor:
                  flag.issue === "empty"
                    ? "rgba(26,26,26,0.08)"
                    : flag.issue === "combined"
                      ? "rgba(155,35,53,0.12)"
                      : flag.issue === "format"
                        ? "rgba(243,209,42,0.15)"
                        : flag.issue === "unknown"
                          ? "rgba(155,35,53,0.08)"
                          : "rgba(85,186,170,0.12)",
                color:
                  flag.issue === "empty"
                    ? "rgba(26,26,26,0.45)"
                    : flag.issue === "combined"
                      ? "#9B2335"
                      : flag.issue === "format"
                        ? "#B8860B"
                        : flag.issue === "unknown"
                          ? "#9B2335"
                          : "#55BAAA",
                textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {flag.issue}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
              {flag.column}
            </span>
            {/* Confidence badge */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 9999,
                backgroundColor: flag.confidence === "high" ? "rgba(85,186,170,0.12)" : flag.confidence === "medium" ? "rgba(243,209,42,0.12)" : "rgba(155,35,53,0.08)",
                color: flag.confidence === "high" ? "#55BAAA" : flag.confidence === "medium" ? "#B8860B" : "#9B2335",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Inter', sans-serif",
                marginLeft: "auto",
              }}
            >
              {flag.confidence}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", marginBottom: 6, fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
            {flag.description}
          </div>
          {/* Field mapping pill */}
          {flag.likelyMapsTo && (
            <div style={{ marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  backgroundColor: "rgba(14,38,70,0.06)",
                  color: "#0E2646",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Maps to: {flag.likelyMapsTo}
              </span>
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              color: "#55BAAA",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              padding: "6px 10px",
              backgroundColor: "rgba(85,186,170,0.08)",
              borderRadius: 8,
            }}
          >
            Suggestion: {flag.suggestion}
          </div>
        </Card>
      ))}

      {/* Clean columns summary */}
      {cleanCount > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Clean Columns ({cleanCount})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {flags.filter((f) => f.issue === "clean").map((flag) => (
              <div key={flag.column} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    backgroundColor: "rgba(85,186,170,0.10)",
                    color: "#55BAAA",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {flag.column}
                  {flag.likelyMapsTo && (
                    <span style={{ color: "rgba(85,186,170,0.60)", marginLeft: 4, fontSize: 10 }}>
                      → {flag.likelyMapsTo}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <SecondaryButton onClick={() => setStep("confirm")} style={{ flex: 1 }}>
          Back
        </SecondaryButton>
        <GoldButton
          onClick={() => {
            setCurrentQuestion(0);
            setStep(pendingFlags.length > 0 ? "questions" : "summary");
          }}
          style={{ flex: 2 }}
        >
          {pendingFlags.length > 0 ? `Answer ${pendingFlags.length} Questions` : "Continue to Summary"}
        </GoldButton>
      </div>
    </div>
  );

  const renderQuestions = () => {
    const flag = pendingFlags[currentQuestion];
    if (!flag) {
      setStep("summary");
      return null;
    }
    return (
      <div style={{ padding: "0 16px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>
              Question {currentQuestion + 1} of {pendingFlags.length}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                backgroundColor: "rgba(243,209,42,0.15)",
                color: "#B8860B",
                textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {flag.issue}
            </span>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
            {flag.column}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {flag.likelyMapsTo && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, backgroundColor: "rgba(14,38,70,0.06)", color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Maps to: {flag.likelyMapsTo}
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 9999, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Inter', sans-serif",
              backgroundColor: flag.confidence === "high" ? "rgba(85,186,170,0.12)" : flag.confidence === "medium" ? "rgba(243,209,42,0.12)" : "rgba(155,35,53,0.08)",
              color: flag.confidence === "high" ? "#55BAAA" : flag.confidence === "medium" ? "#B8860B" : "#9B2335",
            }}>
              {flag.confidence} confidence
            </span>
          </div>
          <div style={{ fontSize: 14, color: "rgba(26,26,26,0.65)", marginBottom: 12, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
            {flag.description}
          </div>

          {/* Preview of this column's data */}
          {fileInfo && (
            <div
              style={{
                backgroundColor: "#FAFAF8",
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
                border: "1px solid rgba(212,212,208,0.50)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.40)", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
                SAMPLE VALUES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {fileInfo.preview.map((row, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 6,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D4D4D0",
                      color: "#0E2646",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {row[flag.column] || <span style={{ color: "rgba(26,26,26,0.20)" }}>empty</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion */}
          <div
            style={{
              fontSize: 13,
              color: "#55BAAA",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              padding: "10px 12px",
              backgroundColor: "rgba(85,186,170,0.08)",
              borderRadius: 8,
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            Suggestion: {flag.suggestion}
          </div>

          {/* User comment */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.45)", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
              YOUR NOTES (optional)
            </div>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Explain what this column is, add corrections, or tell us what to do with it..."
              style={{
                width: "100%",
                height: 72,
                borderRadius: 8,
                border: "1px solid #D4D4D0",
                padding: 10,
                fontSize: 16,
                fontFamily: "'Inter', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                backgroundColor: "#FFFFFF",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#F3D12A";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#D4D4D0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Accept / Reject */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                const updated = [...flags];
                const idx = flags.indexOf(flag);
                updated[idx] = { ...flag, status: "rejected", userNote: currentNote };
                setFlags(updated);
                setCurrentNote("");
                if (currentQuestion < pendingFlags.length - 1) {
                  setCurrentQuestion(currentQuestion + 1);
                } else {
                  setStep("summary");
                }
              }}
              className="active:scale-[0.97]"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 9999,
                border: "1px solid #D4D4D0",
                backgroundColor: "#FFFFFF",
                color: "rgba(26,26,26,0.55)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
              }}
            >
              Skip
            </button>
            <button
              onClick={() => {
                const updated = [...flags];
                const idx = flags.indexOf(flag);
                updated[idx] = { ...flag, status: "accepted", userNote: currentNote };
                setFlags(updated);
                setCurrentNote("");
                if (currentQuestion < pendingFlags.length - 1) {
                  setCurrentQuestion(currentQuestion + 1);
                } else {
                  setStep("summary");
                }
              }}
              className="active:scale-[0.97]"
              style={{
                flex: 2,
                height: 44,
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#55BAAA",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
              }}
            >
              Accept Fix
            </button>
          </div>
        </Card>

        {/* Progress bar */}
        <div style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: "#D4D4D0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${((currentQuestion + 1) / pendingFlags.length) * 100}%`,
              backgroundColor: "#55BAAA",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const accepted = flags.filter((f) => f.status === "accepted").length;
    const rejected = flags.filter((f) => f.status === "rejected").length;
    const empty = flags.filter((f) => f.issue === "empty").length;

    return (
      <div style={{ padding: "0 16px" }}>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
            Cleaning Summary
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10, backgroundColor: "rgba(85,186,170,0.08)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#55BAAA", fontFamily: "'Inter', sans-serif" }}>{accepted}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Fixes Applied</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10, backgroundColor: "rgba(26,26,26,0.04)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(26,26,26,0.30)", fontFamily: "'Inter', sans-serif" }}>{rejected}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Skipped</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10, backgroundColor: "rgba(26,26,26,0.04)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(26,26,26,0.30)", fontFamily: "'Inter', sans-serif" }}>{empty}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.45)", fontFamily: "'Inter', sans-serif" }}>Empty Removed</div>
            </div>
          </div>

          {/* Column status list */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Column Status
          </div>
          {flags.map((flag) => {
            const statusColor = flag.issue === "clean" ? "#55BAAA" : flag.status === "accepted" ? "#55BAAA" : flag.issue === "empty" ? "rgba(26,26,26,0.25)" : "#F3D12A";
            const statusLabel = flag.issue === "clean" ? "Clean" : flag.status === "accepted" ? "Fixed" : flag.issue === "empty" ? "Removed" : "Unchanged";
            return (
              <div
                key={flag.column}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(212,212,208,0.30)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>{flag.column}</span>
                  {flag.likelyMapsTo && (
                    <span style={{ fontSize: 10, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>
                      → {flag.likelyMapsTo}
                    </span>
                  )}
                  {flag.userNote && (
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif", fontStyle: "italic", lineHeight: 1.3 }}>
                      "{flag.userNote}"
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, fontFamily: "'Inter', sans-serif" }}>{statusLabel}</span>
              </div>
            );
          })}
        </Card>

        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryButton onClick={() => setStep("analysis")} style={{ flex: 1 }}>
            Back
          </SecondaryButton>
          <GoldButton onClick={() => setStep("export")} style={{ flex: 2 }}>
            Continue to Export
          </GoldButton>
        </div>
      </div>
    );
  };

  const renderExport = () => (
    <div style={{ padding: "0 16px" }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
          Where should this data go?
        </div>
        <div style={{ fontSize: 13, color: "rgba(26,26,26,0.50)", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
          Your cleaned data is ready. Choose a destination.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Import to ChuteSide */}
          <button
            onClick={handleImportToChuteSide}
            disabled={exporting}
            className="active:scale-[0.98]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #D4D4D0",
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "#0E2646",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="#F3D12A" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Import to ChuteSide
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif" }}>
                Add or merge animals directly into your herd
              </div>
            </div>
          </button>

          {/* Export to breed association template */}
          <button
            onClick={handleBreedAssociation}
            disabled={exporting}
            className="active:scale-[0.98]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #D4D4D0",
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "rgba(85,186,170,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V16H16V14" stroke="#55BAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 4V12M10 12L7 9M10 12L13 9" stroke="#55BAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Breed Association Template
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif" }}>
                Map to Angus, Hereford, or other association formats
              </div>
            </div>
          </button>

          {/* Download cleaned file */}
          <button
            onClick={handleDownloadCleaned}
            disabled={exporting}
            className="active:scale-[0.98]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #D4D4D0",
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "rgba(243,209,42,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 3H14C15.1 3 16 3.9 16 5V15C16 16.1 15.1 17 14 17H6C4.9 17 4 16.1 4 15V5C4 3.9 4.9 3 6 3Z" stroke="#B8860B" strokeWidth="1.5" />
                <path d="M8 8H12M8 11H12" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Download Cleaned File
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif" }}>
                Get a standardized CSV or Excel file
              </div>
            </div>
          </button>
        </div>
      </Card>

      <SecondaryButton onClick={() => setStep("summary")}>
        Back to Summary
      </SecondaryButton>

      {/* Template selector overlay */}
      {showTemplateSelector && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowTemplateSelector(false)}
          />
          <div
            style={{
              position: "relative",
              backgroundColor: "#F5F5F0",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "75vh",
              overflowY: "auto",
              padding: 16,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                Select Template
              </div>
              <button
                onClick={() => setShowTemplateSelector(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.50)", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
              American Angus Association templates
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleExportToTemplate(template)}
                  disabled={exporting}
                  className="active:scale-[0.98]"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #D4D4D0",
                    backgroundColor: "#FFFFFF",
                    cursor: exporting ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    opacity: exporting ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
                    {template.name}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                    {template.description}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif", marginTop: 4 }}>
                    {template.columns.length} columns
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <StepIndicator current={step} />
      {step === "upload" && renderUpload()}
      {step === "confirm" && renderConfirm()}
      {step === "analysis" && renderAnalysis()}
      {step === "questions" && renderQuestions()}
      {step === "summary" && renderSummary()}
      {step === "export" && renderExport()}
    </div>
  );
};

export default CowCleanerScreen;
