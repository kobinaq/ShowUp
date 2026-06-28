import Papa from "papaparse";

export class ExportService {
  reportsCsv(rows: unknown[]) {
    return Papa.unparse(rows);
  }

  scorecardPdf(title: string, rows: Array<[string, string | number]>) {
    const lines = [title, "", ...rows.map(([label, value]) => `${label}: ${value}`)];
    return minimalPdf(lines);
  }
}

export const exportService = new ExportService();

function minimalPdf(lines: string[]) {
  const escaped = lines.map((line) => line.replace(/[()\\]/g, "\\$&"));
  const text = escaped.map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 18} Td (${line}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body);
}
