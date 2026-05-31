import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Download, Eye, Loader2, MessageCircle, Mail, Globe, FileText, FileSpreadsheet } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";
import { generateQuotePdf, exportXlsx } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Quote = {
  id: string; customer_name: string; company_name: string | null; email: string; phone: string | null;
  preferred_contact_method: string; status: string; notes: string | null;
  stock_deducted: boolean; created_at: string;
  quote_request_items: { id: string; product_code: string; product_name: string; requested_quantity: number; unit: string }[];
};

const STATUSES = ["new", "under_review", "quotation_sent", "waiting_customer_approval", "deal_completed", "cancelled", "rejected"] as const;
type QStatus = typeof STATUSES[number];

const statusKey: Record<string, keyof typeof statusColor> = {
  new: "new", under_review: "review", quotation_sent: "sent", waiting_customer_approval: "waiting",
  deal_completed: "completed", cancelled: "cancelled", rejected: "rejected",
};
const statusColor = {
  new: "bg-primary/10 text-primary border-primary/30",
  review: "bg-warning/15 text-warning-foreground border-warning/40",
  sent: "bg-accent/10 text-accent border-accent/30",
  waiting: "bg-secondary text-secondary-foreground border-border",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const AdminQuotes = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<Quote | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("quote_requests")
      .select("*, quote_request_items(id,product_code,product_name,requested_quantity,unit)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Quote[]) || []);
    if (!silent) setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-quotes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_requests" }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);


  const changeStatus = async (q: Quote, newStatus: string) => {
    if (newStatus === q.status) return;
    if (newStatus === "deal_completed" && q.stock_deducted) {
      return toast.error(lang === "ar" ? "تم خصم المخزون مسبقًا لهذا الطلب" : "Stock already deducted for this quote");
    }
    setBusy(q.id);
    const { error } = await supabase.from("quote_requests").update({ status: newStatus as QStatus }).eq("id", q.id);
    setBusy(null);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("Insufficient stock")) toast.error(lang === "ar" ? "المخزون غير كافٍ — لم يتم تغيير الحالة" : msg);
      else toast.error(msg);
      return;
    }
    toast.success(newStatus === "deal_completed" ? (lang === "ar" ? "تمت الصفقة وخُصم المخزون" : "Deal completed — stock deducted") : (lang === "ar" ? "تم التحديث" : "Updated"));
    // Audit + email
    supabase.rpc("log_audit", {
      _action: "status_change",
      _table: "quote_requests",
      _record_id: q.id,
      _old: { status: q.status } as any,
      _new: { status: newStatus } as any,
    }).then(() => {});
    supabase.functions.invoke("send-quote-email", {
      body: { type: "status_change", quoteId: q.id, lang },
    }).catch((err) => console.warn("email notification failed", err));
    load(true);
  };


  const buildWhatsAppLink = (q: Quote) => {
    const digits = (q.phone || "").replace(/\D/g, "");
    if (!digits) return null;
    const isAr = lang === "ar";
    const lines: string[] = [];
    lines.push(`${t.whatsapp.greeting} ${q.customer_name},`);
    if (q.company_name) lines.push(`(${q.company_name})`);
    lines.push("");
    lines.push(`${t.whatsapp.quoteRef} #${q.id.slice(0, 8)}`);
    lines.push(`${isAr ? "البريد" : "Email"}: ${q.email}`);
    if (q.phone) lines.push(`${isAr ? "الهاتف" : "Phone"}: ${q.phone}`);
    lines.push(`${isAr ? "طريقة التواصل" : "Contact via"}: ${q.preferred_contact_method}`);
    lines.push("");
    lines.push(`${isAr ? "المنتجات" : "Items"}:`);
    (q.quote_request_items || []).forEach((i) => {
      lines.push(`• ${i.product_name} [${i.product_code}] — ${i.requested_quantity} ${i.unit}`);
    });
    if (q.notes) {
      lines.push("");
      lines.push(`${isAr ? "ملاحظات" : "Notes"}: ${q.notes}`);
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.quotes}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => {
            const headers = ["id", "customer", "company", "email", "phone", "status", "items", "total_qty", "notes", "created_at"];
            const data = rows.map((q) => [
              q.id, q.customer_name, q.company_name || "", q.email, q.phone || "", q.status,
              (q.quote_request_items || []).map((i) => `${i.product_code} x${i.requested_quantity}`).join(" | "),
              (q.quote_request_items || []).reduce((s, i) => s + i.requested_quantity, 0),
              q.notes || "", q.created_at,
            ]);
            downloadCsv(`quotes-${Date.now()}.csv`, toCsv(headers, data));
          }}><Download className="h-4 w-4 me-1.5" /> CSV</Button>
          <Button variant="outline" onClick={() => {
            exportXlsx(`quotes-${Date.now()}.xlsx`, [{
              name: "Quotes",
              rows: rows.map((q) => ({
                id: q.id, customer: q.customer_name, company: q.company_name || "", email: q.email,
                phone: q.phone || "", status: q.status,
                items: (q.quote_request_items || []).map((i) => `${i.product_code} x${i.requested_quantity}`).join(" | "),
                total_qty: (q.quote_request_items || []).reduce((s, i) => s + i.requested_quantity, 0),
                notes: q.notes || "", created_at: q.created_at,
              })),
            }]);
          }}><FileSpreadsheet className="h-4 w-4 me-1.5" /> Excel</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">{t.admin.customer}</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">{t.admin.items}</th>
                  <th className="px-5 py-3">Total Qty</th>
                  <th className="px-5 py-3">{t.admin.status}</th>
                  <th className="px-5 py-3">{t.admin.date}</th>
                  <th className="px-5 py-3 text-end">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const totalQty = (q.quote_request_items || []).reduce((s, i) => s + i.requested_quantity, 0);
                  const k = statusKey[q.status] || "new";
                  return (
                    <tr key={q.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        <div className="font-semibold">{q.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{q.company_name}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{q.email}</td>
                      <td className="px-5 py-3">{q.quote_request_items?.length || 0}</td>
                      <td className="px-5 py-3 font-semibold">{totalQty}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("border", statusColor[k])}>{(t.status as any)[k]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(q.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2 items-center">
                          <Select value={q.status} onValueChange={(v) => changeStatus(q, v)} disabled={busy === q.id}>
                            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{(t.status as any)[statusKey[s]]}</SelectItem>)}</SelectContent>
                          </Select>
                          {(() => {
                            const method = q.preferred_contact_method || "email";
                            const isAr = lang === "ar";
                            const subject = `${isAr ? "طلب عرض سعر" : "Quote request"} #${q.id.slice(0, 8)}`;
                            const bodyLines = [
                              `${t.whatsapp.greeting} ${q.customer_name},`,
                              q.company_name ? `(${q.company_name})` : "",
                              "",
                              `${t.whatsapp.quoteRef} #${q.id.slice(0, 8)}`,
                              `${isAr ? "المنتجات" : "Items"}:`,
                              ...(q.quote_request_items || []).map((i) => `• ${i.product_name} [${i.product_code}] — ${i.requested_quantity} ${i.unit}`),
                              q.notes ? `\n${isAr ? "ملاحظات" : "Notes"}: ${q.notes}` : "",
                            ].filter(Boolean).join("\n");

                            let href: string | null = null;
                            let Icon = MessageCircle;
                            let colorCls = "text-success border-success/40 hover:bg-success/10";
                            let title = isAr ? "تواصل" : "Contact";

                            if (method === "whatsapp") {
                              href = buildWhatsAppLink(q);
                              Icon = MessageCircle;
                              title = isAr ? "تواصل عبر واتساب" : "Contact via WhatsApp";
                            } else if (method === "email") {
                              href = `mailto:${q.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
                              Icon = Mail;
                              colorCls = "text-primary border-primary/40 hover:bg-primary/10";
                              title = isAr ? "إرسال بريد" : "Send email";
                            } else {
                              // website / portal — keep customer informed in-app; open detail view
                              Icon = Globe;
                              colorCls = "text-accent border-accent/40 hover:bg-accent/10";
                              title = isAr ? "العميل يفضل التواصل عبر المنصة" : "Customer prefers contact via portal";
                            }

                            const onClick = href ? undefined : () => setView(q);
                            return (
                              <Button
                                asChild={!!href}
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", colorCls)}
                                title={title}
                                onClick={onClick}
                              >
                                {href ? (
                                  <a href={href} target={method === "whatsapp" ? "_blank" : undefined} rel="noreferrer"><Icon className="h-4 w-4" /></a>
                                ) : (
                                  <span><Icon className="h-4 w-4" /></span>
                                )}
                              </Button>
                            );
                          })()}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView(q)}><Eye className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No quotes</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>{lang === "ar" ? "تفاصيل الطلب" : "Quote details"}</span>
              {view && (
                <Button size="sm" variant="outline" onClick={() => generateQuotePdf({
                  id: view.id, created_at: view.created_at, status: view.status,
                  customer_name: view.customer_name, company_name: view.company_name,
                  email: view.email, phone: view.phone, notes: view.notes,
                  items: view.quote_request_items || [],
                }, { brandName: "Shakkel" })}>
                  <FileText className="h-4 w-4 me-1.5" /> PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{t.admin.customer}:</span> <strong>{view.customer_name}</strong></div>
                <div><span className="text-muted-foreground">Company:</span> {view.company_name || "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {view.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {view.phone || "—"}</div>
                <div><span className="text-muted-foreground">Contact:</span> {view.preferred_contact_method}</div>
                <div><span className="text-muted-foreground">Stock deducted:</span> {view.stock_deducted ? "✓" : "—"}</div>
              </div>
              {view.notes && <p className="text-sm bg-secondary/40 p-3 rounded">{view.notes}</p>}
              <table className="w-full text-sm">
                <thead><tr className="text-xs uppercase text-muted-foreground"><th className="text-left py-2">Code</th><th className="text-left">Product</th><th>Qty</th><th>Unit</th></tr></thead>
                <tbody>
                  {view.quote_request_items?.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{i.product_code}</td>
                      <td>{i.product_name}</td>
                      <td className="text-center font-bold">{i.requested_quantity}</td>
                      <td className="text-center text-muted-foreground">{i.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminQuotes;
