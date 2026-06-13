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

const STATUS_BI: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  under_review: { ar: "قيد المراجعة", en: "Under review" },
  quotation_sent: { ar: "تم إرسال العرض", en: "Quotation sent" },
  waiting_customer_approval: { ar: "بانتظار موافقة العميل", en: "Waiting approval" },
  deal_completed: { ar: "تمت الصفقة", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * Opens a print-friendly bilingual (AR/EN) black & white invoice in a new window.
 * Uses the browser's native print → Save as PDF for perfect Arabic rendering.
 */
export function generateQuotePdf(q: QuotePdfInput, _opts?: { brandName?: string }) {
  const short = q.id.slice(0, 8).toUpperCase();
  const date = new Date(q.created_at);
  const dateStr = date.toLocaleDateString("en-GB");
  const status = STATUS_BI[q.status] || { ar: q.status, en: q.status };
  const totalQty = q.items.reduce((s, i) => s + i.requested_quantity, 0);

  const itemRows = q.items
    .map(
      (i, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td class="mono">${esc(i.product_code)}</td>
        <td>${esc(i.product_name)}</td>
        <td class="c">${i.requested_quantity}</td>
        <td class="c">${esc(i.unit)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Quote ${short}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  html, body { background: #fff; color: #000; font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", Tahoma, sans-serif; font-size: 11pt; margin: 0; }
  .ar { font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: 1px; }
  h2 { font-size: 11pt; margin: 0; font-weight: normal; letter-spacing: 3px; text-transform: uppercase; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 18px; }
  .head .ar { text-align: right; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 18px; font-size: 10pt; }
  .meta div { border-bottom: 1px dotted #000; padding: 4px 0; display: flex; justify-content: space-between; gap: 12px; }
  .meta b { font-weight: bold; }
  .section-title { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 18px 0 6px; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #000; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 9pt; letter-spacing: 1px; }
  td.c { text-align: center; }
  td.mono { font-family: "Courier New", monospace; font-size: 9pt; }
  tfoot td { font-weight: bold; background: #f0f0f0; }
  .notes { margin-top: 14px; border: 1px solid #000; padding: 8px 10px; font-size: 10pt; white-space: pre-line; min-height: 40px; }
  .foot { margin-top: 30px; padding-top: 10px; border-top: 1px solid #000; font-size: 8.5pt; display: flex; justify-content: space-between; }
  .stamp { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 9pt; }
  .stamp div { border-top: 1px solid #000; padding-top: 6px; }
  @media print { .noprint { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .noprint { position: fixed; top: 10px; right: 10px; }
  .noprint button { padding: 8px 18px; border: 1px solid #000; background: #000; color: #fff; cursor: pointer; font-size: 12px; }
</style>
</head>
<body>
  <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>

  <div class="head">
    <div>
      <h1>QUOTE</h1>
      <h2>Request for Quotation</h2>
    </div>
    <div class="ar" dir="rtl">
      <h1>عرض سعر</h1>
      <h2>طلب عرض سعر</h2>
    </div>
  </div>

  <div class="meta">
    <div><span>Quote No. / رقم العرض</span><b class="mono">#${short}</b></div>
    <div><span>Date / التاريخ</span><b>${dateStr}</b></div>
    <div><span>Status / الحالة</span><b>${esc(status.en)} — <span class="ar">${esc(status.ar)}</span></b></div>
    <div><span>Items / عدد الأصناف</span><b>${q.items.length}</b></div>
  </div>

  <div class="section-title"><span>Customer Information</span><span class="ar" dir="rtl">بيانات العميل</span></div>
  <div class="meta">
    <div><span>Name / الاسم</span><b>${esc(q.customer_name)}</b></div>
    <div><span>Company / الشركة</span><b>${esc(q.company_name) || "—"}</b></div>
    <div><span>Email / البريد</span><b>${esc(q.email)}</b></div>
    <div><span>Phone / الجوال</span><b>${esc(q.phone) || "—"}</b></div>
  </div>

  <div class="section-title"><span>Requested Items</span><span class="ar" dir="rtl">الأصناف المطلوبة</span></div>
  <table>
    <thead>
      <tr>
        <th style="width:6%">#</th>
        <th style="width:18%">Code / الرمز</th>
        <th>Product / المنتج</th>
        <th style="width:12%">Qty / الكمية</th>
        <th style="width:12%">Unit / الوحدة</th>
      </tr>
    </thead>
    <tbody>${itemRows || `<tr><td colspan="5" class="c">No items</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="3" class="c">Total Quantity / إجمالي الكمية</td><td class="c">${totalQty}</td><td></td></tr>
    </tfoot>
  </table>

  ${q.notes ? `
  <div class="section-title"><span>Notes</span><span class="ar" dir="rtl">ملاحظات</span></div>
  <div class="notes">${esc(q.notes)}</div>` : ""}

  <div class="stamp">
    <div><span>Customer Signature</span><br/><span class="ar" dir="rtl">توقيع العميل</span></div>
    <div><span>Authorized Signature</span><br/><span class="ar" dir="rtl">التوقيع المعتمد</span></div>
  </div>

  <div class="foot">
    <span>This document is a quotation request — prices not included.</span>
    <span class="ar" dir="rtl">هذه الوثيقة طلب عرض سعر — لا تتضمن الأسعار.</span>
  </div>

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function exportXlsx(filename: string, sheets: { name: string; rows: any[] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
