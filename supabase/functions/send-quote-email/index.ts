// Quote email notifications via Resend
// Public function: invoked from the client. Validates payload and sends emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Item = { product_code: string; product_name: string; requested_quantity: number; unit: string };

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function statusLabel(status: string, lang: "ar" | "en") {
  const map: Record<string, { ar: string; en: string }> = {
    new: { ar: "جديد", en: "New" },
    under_review: { ar: "قيد المراجعة", en: "Under Review" },
    quotation_sent: { ar: "تم إرسال التسعيرة", en: "Quotation Sent" },
    waiting_customer_approval: { ar: "بانتظار موافقة العميل", en: "Waiting Customer Approval" },
    deal_completed: { ar: "اكتملت الصفقة", en: "Deal Completed" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    rejected: { ar: "مرفوض", en: "Rejected" },
  };
  return map[status]?.[lang] || status;
}

function itemsTable(items: Item[], lang: "ar" | "en") {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const headers = lang === "ar"
    ? ["الكود", "المنتج", "الكمية", "الوحدة"]
    : ["Code", "Product", "Quantity", "Unit"];
  const rows = (items || []).map((i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px">${escapeHtml(i.product_code)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(i.product_name)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:600">${i.requested_quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;color:#666">${escapeHtml(i.unit || "pcs")}</td>
    </tr>`).join("");
  return `
    <table dir="${dir}" style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #eee">
      <thead style="background:#f7f7f7"><tr>
        <th style="padding:10px;text-align:start;font-size:12px;text-transform:uppercase;color:#555">${headers[0]}</th>
        <th style="padding:10px;text-align:start;font-size:12px;text-transform:uppercase;color:#555">${headers[1]}</th>
        <th style="padding:10px;text-align:center;font-size:12px;text-transform:uppercase;color:#555">${headers[2]}</th>
        <th style="padding:10px;text-align:center;font-size:12px;text-transform:uppercase;color:#555">${headers[3]}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function shell(opts: { lang: "ar" | "en"; title: string; body: string }) {
  const dir = opts.lang === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html dir="${dir}" lang="${opts.lang}"><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title></head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1f2937">
    <table width="100%" style="background:#f3f4f6;padding:24px 0"><tr><td align="center">
      <table width="600" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 24px;color:#fff">
          <h1 style="margin:0;font-size:18px;letter-spacing:.5px">Shakkel</h1>
        </td></tr>
        <tr><td style="padding:24px">${opts.body}</td></tr>
        <tr><td style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center">© ${new Date().getFullYear()} Shakkel</td></tr>
      </table>
    </td></tr></table></body></html>`;
}

function customerNewQuoteHtml(p: { lang: "ar" | "en"; quoteId: string; name: string; company?: string | null; items: Item[]; notes?: string | null }) {
  const isAr = p.lang === "ar";
  const body = `
    <h2 style="margin:0 0 8px">${isAr ? "تم استلام طلب التسعيرة" : "Your quote request has been received"}</h2>
    <p style="margin:0 0 12px;color:#374151">${isAr ? `مرحبًا ${escapeHtml(p.name)}،` : `Hello ${escapeHtml(p.name)},`}</p>
    <p style="margin:0 0 14px;color:#374151">${isAr
      ? "شكرًا لتقديم طلب تسعيرة. سيقوم فريقنا بمراجعته والرد عليك قريبًا."
      : "Thanks for submitting a quote request. Our team will review it and get back to you shortly."}</p>
    <p style="margin:0 0 4px"><strong>${isAr ? "رقم الطلب" : "Quote ref"}:</strong> #${p.quoteId.slice(0, 8)}</p>
    ${p.company ? `<p style="margin:0 0 4px"><strong>${isAr ? "الشركة" : "Company"}:</strong> ${escapeHtml(p.company)}</p>` : ""}
    <h3 style="margin:18px 0 6px;font-size:14px">${isAr ? "المنتجات المطلوبة" : "Requested items"}</h3>
    ${itemsTable(p.items, p.lang)}
    ${p.notes ? `<p style="margin:12px 0;background:#f9fafb;padding:10px 12px;border-radius:6px;font-size:13px;color:#4b5563"><strong>${isAr ? "ملاحظات" : "Notes"}:</strong> ${escapeHtml(p.notes)}</p>` : ""}`;
  return shell({ lang: p.lang, title: isAr ? "استلام طلب التسعيرة" : "Quote received", body });
}

function adminNewQuoteHtml(p: { quoteId: string; name: string; company?: string | null; email: string; phone?: string | null; items: Item[]; notes?: string | null }) {
  const body = `
    <h2 style="margin:0 0 12px">New quote request</h2>
    <p style="margin:0 0 4px"><strong>Ref:</strong> #${p.quoteId.slice(0, 8)}</p>
    <p style="margin:0 0 4px"><strong>Customer:</strong> ${escapeHtml(p.name)}${p.company ? ` — ${escapeHtml(p.company)}` : ""}</p>
    <p style="margin:0 0 4px"><strong>Email:</strong> ${escapeHtml(p.email)}</p>
    ${p.phone ? `<p style="margin:0 0 4px"><strong>Phone:</strong> ${escapeHtml(p.phone)}</p>` : ""}
    <h3 style="margin:14px 0 6px;font-size:14px">Items</h3>
    ${itemsTable(p.items, "en")}
    ${p.notes ? `<p style="margin:12px 0;background:#f9fafb;padding:10px 12px;border-radius:6px;font-size:13px;color:#4b5563"><strong>Notes:</strong> ${escapeHtml(p.notes)}</p>` : ""}`;
  return shell({ lang: "en", title: "New quote request", body });
}

function statusChangeHtml(p: { lang: "ar" | "en"; quoteId: string; name: string; status: string; items: Item[] }) {
  const isAr = p.lang === "ar";
  const lbl = statusLabel(p.status, p.lang);
  const body = `
    <h2 style="margin:0 0 8px">${isAr ? "تحديث حالة طلب التسعيرة" : "Quote status update"}</h2>
    <p style="margin:0 0 12px;color:#374151">${isAr ? `مرحبًا ${escapeHtml(p.name)}،` : `Hello ${escapeHtml(p.name)},`}</p>
    <p style="margin:0 0 14px;color:#374151">${isAr ? "تم تحديث حالة طلبك إلى:" : "Your quote status has been updated to:"}</p>
    <p style="margin:0 0 14px;font-size:18px"><strong style="background:#eef2ff;color:#4338ca;padding:6px 12px;border-radius:6px">${escapeHtml(lbl)}</strong></p>
    <p style="margin:0 0 4px"><strong>${isAr ? "رقم الطلب" : "Quote ref"}:</strong> #${p.quoteId.slice(0, 8)}</p>
    <h3 style="margin:18px 0 6px;font-size:14px">${isAr ? "المنتجات" : "Items"}</h3>
    ${itemsTable(p.items, p.lang)}`;
  return shell({ lang: p.lang, title: isAr ? "تحديث الحالة" : "Status update", body });
}

async function logEmail(supabase: any, row: { to_email: string; subject: string; template: string; related_id?: string; status: string; error?: string | null }) {
  try { await supabase.from("email_log").insert(row); } catch (_) { /* best-effort */ }
}

async function sendResend(opts: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Resend ${r.status}: ${txt}`);
  }
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { type, quoteId, lang = "en" } = body as { type: string; quoteId: string; lang?: "ar" | "en" };
    if (!type || !quoteId) return new Response(JSON.stringify({ error: "type and quoteId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: q, error } = await supabase
      .from("quote_requests")
      .select("*, quote_request_items(product_code,product_name,requested_quantity,unit)")
      .eq("id", quoteId)
      .maybeSingle();
    if (error || !q) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const items = (q.quote_request_items || []) as Item[];
    const results: any[] = [];

    if (type === "new_quote") {
      // customer
      try {
        const html = customerNewQuoteHtml({ lang, quoteId: q.id, name: q.customer_name, company: q.company_name, items, notes: q.notes });
        const subj = lang === "ar" ? `تأكيد استلام طلب التسعيرة #${q.id.slice(0,8)}` : `Quote received #${q.id.slice(0,8)}`;
        await sendResend({ to: q.email, subject: subj, html });
        await logEmail(supabase, { to_email: q.email, subject: subj, template: "customer_new_quote", related_id: q.id, status: "sent" });
        results.push({ to: q.email, ok: true });
      } catch (e: any) {
        await logEmail(supabase, { to_email: q.email, subject: "customer_new_quote", template: "customer_new_quote", related_id: q.id, status: "failed", error: String(e?.message || e) });
        results.push({ to: q.email, ok: false, error: String(e?.message || e) });
      }
      // admin
      if (ADMIN_EMAIL) {
        try {
          const html = adminNewQuoteHtml({ quoteId: q.id, name: q.customer_name, company: q.company_name, email: q.email, phone: q.phone, items, notes: q.notes });
          const subj = `New quote #${q.id.slice(0,8)} — ${q.customer_name}`;
          await sendResend({ to: ADMIN_EMAIL, subject: subj, html });
          await logEmail(supabase, { to_email: ADMIN_EMAIL, subject: subj, template: "admin_new_quote", related_id: q.id, status: "sent" });
          results.push({ to: ADMIN_EMAIL, ok: true });
        } catch (e: any) {
          await logEmail(supabase, { to_email: ADMIN_EMAIL, subject: "admin_new_quote", template: "admin_new_quote", related_id: q.id, status: "failed", error: String(e?.message || e) });
          results.push({ to: ADMIN_EMAIL, ok: false, error: String(e?.message || e) });
        }
      }
    } else if (type === "status_change") {
      try {
        const html = statusChangeHtml({ lang, quoteId: q.id, name: q.customer_name, status: q.status, items });
        const subj = lang === "ar"
          ? `تحديث حالة الطلب #${q.id.slice(0,8)} — ${statusLabel(q.status, "ar")}`
          : `Quote #${q.id.slice(0,8)} — ${statusLabel(q.status, "en")}`;
        await sendResend({ to: q.email, subject: subj, html });
        await logEmail(supabase, { to_email: q.email, subject: subj, template: `status_${q.status}`, related_id: q.id, status: "sent" });
        results.push({ to: q.email, ok: true });
      } catch (e: any) {
        await logEmail(supabase, { to_email: q.email, subject: "status_change", template: `status_${q.status}`, related_id: q.id, status: "failed", error: String(e?.message || e) });
        results.push({ to: q.email, ok: false, error: String(e?.message || e) });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
