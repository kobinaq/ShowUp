import Papa from "papaparse";
import jsPDF from "jspdf";

export class ExportService {
  reportsCsv(rows: unknown[]) {
    return Papa.unparse(rows);
  }

  scorecardPdf(title: string, rows: Array<[string, string | number]>) {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text(title, 14, 20);
    pdf.setFontSize(11);
    rows.forEach(([label, value], index) => pdf.text(`${label}: ${value}`, 14, 34 + index * 8));
    return Buffer.from(pdf.output("arraybuffer"));
  }
}

export const exportService = new ExportService();
