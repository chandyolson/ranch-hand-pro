import * as XLSX from "xlsx";

export interface ParsedFileContext {
  filename: string;
  headers: string[];
  row_count: number;
  sample_rows: Record<string, string | number | null>[];
  raw_data: Record<string, string | number | null>[];
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isSpreadsheetFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls");
}

export async function parseSpreadsheet(file: File): Promise<ParsedFileContext> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet, { defval: null });
        if (!json.length) { reject(new Error("File has no data rows")); return; }
        resolve({
          filename: file.name,
          headers: Object.keys(json[0]),
          row_count: json.length,
          sample_rows: json.slice(0, 10),
          raw_data: json,
        });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function imageToBase64(file: File, maxBytes = 3 * 1024 * 1024): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;
  let quality = 0.85;

  // Scale down large images
  const maxDim = 1600;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  // If still too large, reduce quality
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.15;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

export function detectImageContext(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("calving")) return "calving";
  if (lower.includes("treatment")) return "treatment";
  if (lower.includes("tally")) return "tally";
  if (lower.includes("receipt") || lower.includes("sale")) return "receipt";
  return "general";
}
