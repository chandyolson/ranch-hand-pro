import jsPDF from "jspdf";

type Color = [number, number, number];
const NAVY: Color = [14, 38, 70];
const TEAL: Color = [85, 186, 170];
const WHITE: Color = [255, 255, 255];
const BODY: Color = [26, 26, 26];
const BORDER: Color = [212, 212, 208];

export interface RegCalfData {
  calfTag: string;
  calfSex: string;
  birthDate: string;
  birthWeight: string;
  breed: string;
  damTag: string;
  damRegName: string;
  damRegNumber: string;
  sireTag: string;
  sireRegName: string;
  sireRegNumber: string;
}

export interface RegOperationInfo {
  name: string;
  ownerName: string;
  address: string;
}

export function generateRegistrationPDF(
  association: string,
  calves: RegCalfData[],
  operation: RegOperationInfo,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const assocLabel =
    association === "angus" ? "American Angus Association (AAA)" : "American Hereford Association (AHA)";

  const drawField = (label: string, value: string, x: number, y: number, w: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text(label, x, y);
    doc.setFontSize(11);
    doc.setTextColor(...BODY);
    doc.text(value || "—", x, y + 5);
    doc.setDrawColor(...BORDER);
    doc.line(x, y + 7, x + w, y + 7);
  };

  calves.forEach((calf, idx) => {
    if (idx > 0) doc.addPage();

    let y = 0;

    // Navy header bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text("ChuteSide Solutions", marginL, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(operation.name, marginL, 17);
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(today, pageW - marginR, 10, { align: "right" });

    // Teal line
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(marginL, 25, pageW - marginR, 25);
    y = 32;

    // Form title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text("Registration Form", marginL, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...TEAL);
    doc.text(assocLabel, marginL, y);
    y += 12;

    // Calf section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text("Calf Information", marginL, y);
    y += 8;

    const halfW = (contentW - 10) / 2;
    drawField("Tag", calf.calfTag, marginL, y, halfW);
    drawField("Sex", calf.calfSex, marginL + halfW + 10, y, halfW);
    y += 16;
    drawField("Birth Date", calf.birthDate, marginL, y, halfW);
    drawField("Birth Weight", calf.birthWeight ? `${calf.birthWeight} lbs` : "—", marginL + halfW + 10, y, halfW);
    y += 16;
    drawField("Breed", calf.breed, marginL, y, contentW);
    y += 20;

    // Dam section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text("Dam Information", marginL, y);
    y += 8;

    drawField("Tag", calf.damTag, marginL, y, halfW);
    drawField("Registration #", calf.damRegNumber, marginL + halfW + 10, y, halfW);
    y += 16;
    drawField("Registered Name", calf.damRegName, marginL, y, contentW);
    y += 20;

    // Sire section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text("Sire Information", marginL, y);
    y += 8;

    drawField("Tag", calf.sireTag, marginL, y, halfW);
    drawField("Registration #", calf.sireRegNumber, marginL + halfW + 10, y, halfW);
    y += 16;
    drawField("Registered Name", calf.sireRegName, marginL, y, contentW);
    y += 20;

    // Owner section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text("Owner / Breeder", marginL, y);
    y += 8;

    drawField("Operation", operation.name, marginL, y, halfW);
    drawField("Owner", operation.ownerName, marginL + halfW + 10, y, halfW);
    y += 16;
    drawField("Address", operation.address, marginL, y, contentW);
    y += 24;

    // Signature line
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(marginL, y + 8, marginL + 80, y + 8);
    doc.setFontSize(9);
    doc.setTextColor(...BODY);
    doc.text("Signature", marginL, y + 13);

    doc.line(marginL + 100, y + 8, marginL + contentW, y + 8);
    doc.text("Date", marginL + 100, y + 13);
  });

  // Footers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.line(marginL, 287, pageW - marginR, 287);
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text("Generated by ChuteSide — Registration Assistant", marginL, 292);
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginR, 292, { align: "right" });
  }

  return doc;
}
