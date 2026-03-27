import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export function generateReportFilename(summary: string, extension: "pdf" | "csv"): string {
  const today = new Date().toISOString().split("T")[0];
  let reportType = "Report";
  const lower = summary.toLowerCase();
  if (lower.includes("pregnancy check") || lower.includes("preg check")) reportType = "PregCheckSummary";
  else if (lower.includes("calving season") || lower.includes("calving report")) reportType = "CalvingReport";
  else if (lower.includes("herd inventory") || lower.includes("inventory")) reportType = "HerdInventory";
  else if (lower.includes("cull list") || lower.includes("cull flag")) reportType = "CullList";
  else if (lower.includes("treatment") || lower.includes("doctored")) reportType = "TreatmentReport";
  else if (lower.includes("bse") || lower.includes("soundness")) reportType = "BSEReport";
  else if (lower.includes("sire") || lower.includes("birth weight by")) reportType = "SireReport";
  else if (lower.includes("herd scan")) reportType = "HerdScan";
  return "ChuteSide_" + reportType + "_" + today + "." + extension;
}

export function exportCSV(
  table_data: { headers?: string[]; columns?: string[]; rows: (string | number | null)[][] },
  filename?: string
): void {
  const columns = table_data.columns || table_data.headers || [];
  const escapeCell = (val: string | number | null): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  let csv = "\uFEFF";
  csv += columns.map(escapeCell).join(",") + "\n";
  for (const row of table_data.rows) {
    csv += row.map(escapeCell).join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || generateReportFilename("Report", "csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPDF(params: {
  operationName: string;
  summary: string;
  table_data: { headers?: string[]; columns?: string[]; rows: (string | number | null)[][] } | null;
  chartRef: HTMLElement | null;
  filename?: string;
}): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > 282) {
      doc.addPage();
      y = 15;
    }
  };

  // HEADER BAR
  doc.setFillColor("#0E2646");
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#FFFFFF");
  doc.text("ChuteSide Solutions", marginL, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#55BAAA");
  doc.text(params.operationName, marginL, 17);

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  doc.setFontSize(9);
  doc.setTextColor("#FFFFFF");
  doc.text(today, pageW - marginR, 10, { align: "right" });
  doc.setTextColor("#55BAAA");
  doc.text("AI Report", pageW - marginR, 17, { align: "right" });

  // TEAL ACCENT LINE
  doc.setDrawColor("#55BAAA");
  doc.setLineWidth(0.5);
  doc.line(marginL, 25, pageW - marginR, 25);
  y = 32;

  // SUMMARY TEXT
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#1A1A1A");
  const lines = doc.splitTextToSize(params.summary, contentW);
  for (const line of lines) {
    ensureSpace(6);
    doc.text(line, marginL, y);
    y += 5.5;
  }
  y += 8;

  // CHART IMAGE
  if (params.chartRef) {
    try {
      const canvas = await html2canvas(params.chartRef, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const ratio = canvas.height / canvas.width;
      let imgW = contentW;
      let imgH = imgW * ratio;
      if (imgH > 100) {
        imgH = 100;
        imgW = imgH / ratio;
      }
      ensureSpace(imgH + 8);
      doc.addImage(imgData, "PNG", marginL, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      // skip chart if capture fails
    }
  }

  // TABLE
  if (params.table_data && params.table_data.rows.length > 0) {
    const columns = params.table_data.columns || params.table_data.headers || [];
    const colCount = columns.length;
    const colW = Math.min(contentW / colCount, 50);
    const rowH = 7;
    const fontSize = 8;

    const drawHeaderRow = () => {
      doc.setFillColor("#0E2646");
      doc.rect(marginL, y, colW * colCount, rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor("#FFFFFF");
      columns.forEach((col, i) => {
        doc.text(String(col), marginL + i * colW + 3, y + 5);
      });
      y += rowH;
    };

    ensureSpace(40);
    drawHeaderRow();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    for (let r = 0; r < params.table_data.rows.length; r++) {
      if (y + rowH > 282) {
        doc.addPage();
        y = 15;
        drawHeaderRow();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
      }
      const bg = r % 2 === 0 ? "#FFFFFF" : "#F7F7F5";
      doc.setFillColor(bg);
      doc.rect(marginL, y, colW * colCount, rowH, "F");
      doc.setTextColor("#1A1A1A");
      params.table_data.rows[r].forEach((cell, i) => {
        doc.text(String(cell ?? ""), marginL + i * colW + 3, y + 5);
      });
      y += rowH;
    }

    // table border
    const tableH = y - (y - rowH * params.table_data.rows.length - rowH);
    doc.setDrawColor("#D4D4D0");
    doc.setLineWidth(0.3);
    y += 8;
  }

  // FOOTER on every page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor("#D4D4D0");
    doc.line(marginL, 287, pageW - marginR, 287);
    doc.setFontSize(7);
    doc.setTextColor("#888888");
    doc.text("Generated by ChuteSide AI Reports", marginL, 292);
    doc.text("Page " + i + " of " + pageCount, pageW - marginR, 292, { align: "right" });
  }

  doc.save(params.filename || generateReportFilename(params.summary, "pdf"));
}
