import React, { useState, useCallback } from "react";

// === TYPES ===
type WizardStep = "upload" | "confirm" | "analysis" | "questions" | "summary" | "export";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  rows: number;
  columns: string[];
  preview: Record<string, string>[];
}

interface ColumnFlag {
  column: string;
  issue: "empty" | "inconsistent" | "combined" | "unknown" | "format";
  description: string;
  suggestion: string;
  status: "pending" | "accepted" | "rejected";
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
  const [flags, setFlags] = useState<ColumnFlag[]>([]);
  const [cleanCount, setCleanCount] = useState(0);
  const [emptyCount, setEmptyCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  // Questions state
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // UX Rule 6b: Tags are strings
  const parseCSV = useCallback((text: string): { columns: string[]; rows: Record<string, string>[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { columns: [], rows: [] };
    const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1, 6).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      columns.forEach((col, i) => {
        row[col] = values[i] || "";
      });
      return row;
    });
    return { columns, rows };
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
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { columns, rows } = parseCSV(text);
      const allLines = text.trim().split("\n");
      setFileInfo({
        name: f.name,
        size: f.size,
        type: f.type || "text/csv",
        rows: allLines.length - 1,
        columns,
        preview: rows,
      });
    };
    reader.readAsText(f);
  };

  // Mock analysis — this is where Claude AI integration goes
  const runAnalysis = () => {
    if (!fileInfo) return;
    setAnalyzing(true);
    // Simulate AI analysis delay
    setTimeout(() => {
      const mockFlags: ColumnFlag[] = [];
      fileInfo.columns.forEach((col) => {
        const lower = col.toLowerCase();
        // Detect potential issues based on column names and values
        if (lower.includes("tag") || lower.includes("id")) {
          // Check if values look like they might have leading zeros stripped
          const values = fileInfo.preview.map((r) => r[col]).filter(Boolean);
          const hasNumericOnly = values.every((v) => /^\d+$/.test(v));
          if (hasNumericOnly) {
            mockFlags.push({
              column: col,
              issue: "format",
              description: `"${col}" contains numeric-only values. Tags sometimes have leading zeros or letters that may have been stripped.`,
              suggestion: "Verify these are correct or provide the original tag format.",
              status: "pending",
            });
          }
        }
        if (lower.includes("date") || lower.includes("born") || lower.includes("dob")) {
          const values = fileInfo.preview.map((r) => r[col]).filter(Boolean);
          const formats = new Set(values.map((v) => (v.includes("/") ? "slash" : v.includes("-") ? "dash" : "other")));
          if (formats.size > 1) {
            mockFlags.push({
              column: col,
              issue: "inconsistent",
              description: `"${col}" has mixed date formats (e.g. slashes and dashes).`,
              suggestion: "Standardize to YYYY-MM-DD format.",
              status: "pending",
            });
          }
        }
        // Detect potential combined data
        if (lower.includes("name") || lower.includes("sire") || lower.includes("dam")) {
          const values = fileInfo.preview.map((r) => r[col]).filter(Boolean);
          const hasMultipleParts = values.some((v) => v.includes(" - ") || v.includes(" / ") || v.includes(";"));
          if (hasMultipleParts) {
            mockFlags.push({
              column: col,
              issue: "combined",
              description: `"${col}" appears to contain combined data (multiple values separated by dashes or slashes).`,
              suggestion: "Split into separate columns for name and registration number.",
              status: "pending",
            });
          }
        }
      });

      // Check for empty columns
      fileInfo.columns.forEach((col) => {
        const values = fileInfo.preview.map((r) => r[col]).filter(Boolean);
        if (values.length === 0) {
          mockFlags.push({
            column: col,
            issue: "empty",
            description: `"${col}" appears to be completely empty in the preview rows.`,
            suggestion: "Remove this column or verify it has data in later rows.",
            status: "pending",
          });
        }
      });

      // Check for unknown columns that don't map to known cattle terms
      const knownTerms = [
        "tag", "eid", "breed", "sex", "status", "birth", "date", "born", "dob",
        "sire", "dam", "name", "reg", "color", "weight", "wt", "location",
        "group", "pasture", "lot", "pen", "calving", "preg", "ai", "bull",
        "brand", "ear", "tattoo", "hip", "lifetime", "official", "id",
        "origin", "type", "memo", "notes", "comment",
      ];
      fileInfo.columns.forEach((col) => {
        const lower = col.toLowerCase().replace(/[^a-z]/g, "");
        const isKnown = knownTerms.some((t) => lower.includes(t));
        if (!isKnown && !mockFlags.some((f) => f.column === col)) {
          mockFlags.push({
            column: col,
            issue: "unknown",
            description: `"${col}" doesn't match common cattle data fields.`,
            suggestion: "What kind of data is in this column?",
            status: "pending",
          });
        }
      });

      setFlags(mockFlags);
      setCleanCount(fileInfo.columns.length - mockFlags.length);
      setEmptyCount(mockFlags.filter((f) => f.issue === "empty").length);
      setQuestionCount(mockFlags.filter((f) => f.issue !== "empty").length);
      setAnalyzing(false);
      setStep("analysis");
    }, 1500);
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
        <GoldButton onClick={runAnalysis} style={{ flex: 2 }}>
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </GoldButton>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div style={{ padding: "0 16px" }}>
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

      {/* Flags list */}
      {flags.map((flag, i) => (
        <Card key={i}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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
                        : "rgba(85,186,170,0.12)",
                color:
                  flag.issue === "empty"
                    ? "rgba(26,26,26,0.45)"
                    : flag.issue === "combined"
                      ? "#9B2335"
                      : flag.issue === "format"
                        ? "#B8860B"
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
          </div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", marginBottom: 6, fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
            {flag.description}
          </div>
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

          <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            {flag.column}
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
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            Suggestion: {flag.suggestion}
          </div>

          {/* Accept / Reject */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                const updated = [...flags];
                const idx = flags.indexOf(flag);
                updated[idx] = { ...flag, status: "rejected" };
                setFlags(updated);
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
                updated[idx] = { ...flag, status: "accepted" };
                setFlags(updated);
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
          {fileInfo?.columns.map((col) => {
            const flag = flags.find((f) => f.column === col);
            const statusColor = !flag ? "#55BAAA" : flag.status === "accepted" ? "#55BAAA" : flag.issue === "empty" ? "rgba(26,26,26,0.25)" : "#F3D12A";
            const statusLabel = !flag ? "Clean" : flag.status === "accepted" ? "Fixed" : flag.issue === "empty" ? "Removed" : "Unchanged";
            return (
              <div
                key={col}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(212,212,208,0.30)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0E2646", fontFamily: "'Inter', sans-serif" }}>{col}</span>
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
