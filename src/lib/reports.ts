import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type QuotePdfInput = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  company_name?: string | null;
  email: string;
  phone?: string | null;
  notes?: string | null;
  items: { product_code: string; product_name: string; requested_quantity: number; unit: string }[];
};

export function generateQuotePdf(q: QuotePdfInput, opts?: { brandName?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const brand = opts?.brandName || "Shakkel";
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(brand, 40, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Quote Sheet / Request for Quotation", 40, 52);

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Quote meta
  let y = 100;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Quote #${q.id.slice(0, 8).toUpperCase()}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(q.created_at).toLocaleDateString()}`, pageW - 200, y);
  y += 16;
  doc.text(`Status: ${q.status.replace(/_/g, " ")}`, 40, y);

  // Customer
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Customer", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(`Name: ${q.customer_name}`, 40, y); y += 14;
  if (q.company_name) { doc.text(`Company: ${q.company_name}`, 40, y); y += 14; }
  doc.text(`Email: ${q.email}`, 40, y); y += 14;
  if (q.phone) { doc.text(`Phone: ${q.phone}`, 40, y); y += 14; }

  // Items table
  y += 10;
  autoTable(doc, {
    startY: y,
    head: [["#", "Code", "Product", "Qty", "Unit"]],
    body: q.items.map((i, idx) => [String(idx + 1), i.product_code, i.product_name, String(i.requested_quantity), i.unit]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: { 0: { cellWidth: 30 }, 3: { halign: "center" }, 4: { halign: "center" } },
  });

  // Notes
  // @ts-expect-error lastAutoTable is attached by autoTable
  let afterY = (doc.lastAutoTable?.finalY || y) + 20;
  if (q.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Customer notes", 40, afterY);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(q.notes, pageW - 80);
    doc.text(wrapped, 40, afterY + 14);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(40, pageH - 50, pageW - 40, pageH - 50);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`${brand} — Generated on ${new Date().toLocaleString()}`, 40, pageH - 32);
  doc.text("This document is a quotation request, prices are not included.", 40, pageH - 18);

  doc.save(`quote-${q.id.slice(0, 8)}.pdf`);
}

export function exportXlsx(filename: string, sheets: { name: string; rows: any[] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
