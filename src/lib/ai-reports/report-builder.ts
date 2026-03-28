import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { REPORT_SECTIONS, ReportConfig } from './section-prompts';

export interface SectionResult {
  sectionId: string;
  label: string;
  summary: string;
  chart_config?: any;
  table_data?: { headers?: string[]; columns?: string[]; rows: (string | number | null)[][] } | null;
  error?: string;
}

export async function generateSectionData(
  sectionId: string,
  config: ReportConfig,
  onProgress: (sectionId: string, status: 'loading' | 'done' | 'error') => void,
): Promise<SectionResult> {
  const section = REPORT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return { sectionId, label: sectionId, summary: '', error: 'Unknown section' };

  onProgress(sectionId, 'loading');
  try {
    const prompt = section.promptBuilder(config);
    const { data, error } = await supabase.functions.invoke('ai-report', {
      body: { question: prompt, operation_id: config.operationId, conversation_history: [] },
    });
    if (error) throw error;
    onProgress(sectionId, 'done');
    return {
      sectionId,
      label: section.label,
      summary: data?.summary || data?.message || '',
      chart_config: data?.chart_config || null,
      table_data: data?.table_data || null,
    };
  } catch (err: any) {
    onProgress(sectionId, 'error');
    return { sectionId, label: section.label, summary: '', error: err?.message || 'Failed' };
  }
}

export function assembleReportPDF(
  config: ReportConfig,
  sections: SectionResult[],
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ─── COVER PAGE ───
  doc.setFillColor('#0E2646');
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor('#FFFFFF');
  doc.text('ChuteSide Solutions', pageW / 2, 90, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor('#55BAAA');
  doc.text(config.operationName, pageW / 2, 110, { align: 'center' });

  // teal line
  doc.setDrawColor('#55BAAA');
  doc.setLineWidth(0.5);
  doc.line(60, 120, 150, 120);

  doc.setFontSize(16);
  doc.setTextColor('#FFFFFF');
  doc.text(config.title, pageW / 2, 135, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor('#55BAAA');
  doc.text(`${config.dateStart}  —  ${config.dateEnd}`, pageW / 2, 150, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor('#888888');
  doc.text(`Generated ${today}`, pageW / 2, 270, { align: 'center' });

  // ─── CONTENT PAGES ───
  for (const section of sections) {
    if (section.error) continue;

    doc.addPage();
    let y = 0;

    // Navy header bar
    doc.setFillColor('#0E2646');
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#FFFFFF');
    doc.text('ChuteSide Solutions', marginL, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#55BAAA');
    doc.text(config.operationName, marginL, 17);
    doc.setFontSize(9);
    doc.setTextColor('#FFFFFF');
    doc.text(today, pageW - marginR, 10, { align: 'right' });

    doc.setDrawColor('#55BAAA');
    doc.setLineWidth(0.5);
    doc.line(marginL, 25, pageW - marginR, 25);
    y = 32;

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#0E2646');
    doc.text(section.label, marginL, y);
    y += 10;

    // Summary text
    if (section.summary) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor('#1A1A1A');
      const lines = doc.splitTextToSize(section.summary, contentW);
      for (const line of lines) {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.text(line, marginL, y);
        y += 5.5;
      }
      y += 8;
    }

    // Table
    if (config.includeTables && section.table_data && section.table_data.rows.length > 0) {
      const columns = section.table_data.columns || section.table_data.headers || [];
      const colCount = columns.length;
      const colW = Math.min(contentW / colCount, 50);
      const rowH = 7;
      const fontSize = 8;

      const drawHeaderRow = () => {
        doc.setFillColor('#0E2646');
        doc.rect(marginL, y, colW * colCount, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor('#FFFFFF');
        columns.forEach((col, i) => {
          doc.text(String(col), marginL + i * colW + 3, y + 5);
        });
        y += rowH;
      };

      if (y + 40 > 275) { doc.addPage(); y = 15; }
      drawHeaderRow();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);

      for (let r = 0; r < section.table_data.rows.length; r++) {
        if (y + rowH > 282) {
          doc.addPage();
          y = 15;
          drawHeaderRow();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(fontSize);
        }
        const bg = r % 2 === 0 ? '#FFFFFF' : '#F7F7F5';
        doc.setFillColor(bg);
        doc.rect(marginL, y, colW * colCount, rowH, 'F');
        doc.setTextColor('#1A1A1A');
        section.table_data.rows[r].forEach((cell, i) => {
          doc.text(String(cell ?? ''), marginL + i * colW + 3, y + 5);
        });
        y += rowH;
      }
      y += 8;
    }
  }

  // ─── FOOTERS ───
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor('#D4D4D0');
    doc.line(marginL, 287, pageW - marginR, 287);
    doc.setFontSize(7);
    doc.setTextColor('#888888');
    doc.text('Generated by ChuteSide AI Reports', marginL, 292);
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginR, 292, { align: 'right' });
  }

  return doc;
}
