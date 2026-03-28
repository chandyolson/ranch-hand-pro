import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useOperation } from "@/contexts/OperationContext";
import { runAllChecks, type Violation } from "@/lib/data-quality/checks";
import SeverityKPICards from "@/components/data-quality/SeverityKPICards";
import ViolationCard from "@/components/data-quality/ViolationCard";
import AutoFlagSuggestions from "@/components/data-quality/AutoFlagSuggestions";

type Severity = "critical" | "high" | "medium" | "low";
const DISMISSED_KEY = "dq_dismissed";
const PAGE_SIZE = 50;

const getDismissed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const DataQualityScreen: React.FC = () => {
  const { operationId } = useOperation();
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [loading, setLoading] = useState(true);
  const [activeSeverity, setActiveSeverity] = useState<Severity | null>(null);
  const [searchText, setSearchText] = useState("");
  const [dropdownSeverity, setDropdownSeverity] = useState<Severity | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!operationId) return;
    setLoading(true);
    runAllChecks(operationId).then((v) => {
      setAllViolations(v);
      setLoading(false);
    });
  }, [operationId]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Stable violation IDs based on rule+tag+record for cross-session dismiss
  const violations = useMemo(() => {
    return allViolations.filter((v) => !dismissed.has(v.id));
  }, [allViolations, dismissed]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const v of violations) c[v.severity]++;
    return c;
  }, [violations]);

  const filtered = useMemo(() => {
    let list = violations;
    const sev = activeSeverity || (dropdownSeverity !== "all" ? dropdownSeverity : null);
    if (sev) list = list.filter((v) => v.severity === sev);
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      list = list.filter((v) => v.tag.toLowerCase().includes(s) || v.message.toLowerCase().includes(s));
    }
    return list;
  }, [violations, activeSeverity, dropdownSeverity, searchText]);

  const visible = filtered.slice(0, visibleCount);

  const exportCSV = () => {
    const header = "Severity,Rule,Tag,Message,Source\n";
    const rows = filtered.map((v) =>
      [v.severity, v.rule, v.tag, `"${v.message.replace(/"/g, '""')}"`, v.table_source].join(",")
    );
    const blob = new Blob(["\uFEFF" + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DataQuality_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: "#F5F5F0", minHeight: "100vh", paddingBottom: 32 }}>
      {/* Auto-Flag Suggestions */}
      <AutoFlagSuggestions />

      {/* KPI Cards */}
      {loading ? (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 8, height: 72 }} className="animate-pulse" />
          ))}
        </div>
      ) : (
        <SeverityKPICards counts={counts} activeSeverity={activeSeverity} onSelect={setActiveSeverity} />
      )}

      {/* Filter bar */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={dropdownSeverity}
          onChange={(e) => {
            setDropdownSeverity(e.target.value as any);
            setActiveSeverity(null);
          }}
          style={{
            height: 40,
            borderRadius: 12,
            border: "1px solid #D4D4D0",
            padding: "0 12px",
            fontSize: 13,
            background: "#fff",
            color: "#1A1A1A",
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          type="text"
          placeholder="Search by tag..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1,
            minWidth: 120,
            height: 40,
            borderRadius: 12,
            border: "1px solid #D4D4D0",
            padding: "0 14px",
            fontSize: 16,
            background: "#fff",
            color: "#1A1A1A",
          }}
        />

        <button
          onClick={exportCSV}
          style={{
            borderRadius: 20,
            border: "1.5px solid #55BAAA",
            background: "transparent",
            color: "#55BAAA",
            fontSize: 12,
            fontWeight: 600,
            padding: "0 14px",
            height: 40,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Export
        </button>
      </div>

      {/* Count */}
      <div style={{ padding: "0 16px 8px", fontSize: 12, color: "#888" }}>
        {loading ? "Scanning..." : `Showing ${visible.length} of ${filtered.length} violations`}
      </div>

      {/* Violations list */}
      <div style={{ padding: "0 16px" }}>
        {loading
          ? [0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 8, height: 80, marginBottom: 8 }} className="animate-pulse" />
            ))
          : visible.map((v) => <ViolationCard key={v.id} violation={v} onDismiss={handleDismiss} />)}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#888", fontSize: 14 }}>
            {violations.length === 0 ? "No data quality issues found — your data looks great! 🎉" : "No violations match your filters."}
          </div>
        )}

        {visible.length < filtered.length && (
          <div style={{ textAlign: "center", padding: 16 }}>
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{
                borderRadius: 20,
                border: "1.5px solid #55BAAA",
                background: "transparent",
                color: "#55BAAA",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 24px",
                cursor: "pointer",
              }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityScreen;
