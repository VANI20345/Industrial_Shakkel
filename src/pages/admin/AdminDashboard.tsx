import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { Building2, FileSpreadsheet, Package, AlertTriangle, ArrowUpRight, Loader2, MessageCircle, Users, TrendingUp, Plus, Upload, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Recent = { id: string; customer_name: string; status: string; created_at: string; quote_request_items: { id: string }[] };
type Low = { id: string; name: string; code: string; stock_qty: number; low_stock_threshold: number };
type Msg = { id: string; name: string; subject: string | null; created_at: string; status: string };

const statusKey: Record<string, string> = {
  new: "new", under_review: "review", quotation_sent: "sent", waiting_customer_approval: "waiting",
  deal_completed: "completed", cancelled: "cancelled", rejected: "rejected",
};
const statusColor: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/30",
  review: "bg-warning/15 text-warning-foreground border-warning/40",
  sent: "bg-accent/10 text-accent border-accent/30",
  waiting: "bg-secondary text-secondary-foreground border-border",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const AdminDashboard = () => {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0, brands: 0, newQuotes: 0, low: 0,
    totalQuotes: 0, completedQuotes: 0, customers: 0, newMessages: 0,
    weekQuotes: 0,
  });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [lowStock, setLowStock] = useState<Low[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [p, b, q, lowAll, recentR, totalQ, doneQ, weekQ, custQ, msgQ, recentMsgs] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("products").select("id,name,code,stock_qty,low_stock_threshold").eq("is_active", true).order("stock_qty").limit(200),
        supabase.from("quote_requests").select("id,customer_name,status,created_at,quote_request_items(id)").order("created_at", { ascending: false }).limit(6),
        supabase.from("quote_requests").select("id", { count: "exact", head: true }),
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "deal_completed"),
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("contact_messages").select("id,name,subject,created_at,status").order("created_at", { ascending: false }).limit(5),
      ]);
      const lowFiltered = ((lowAll.data as Low[]) || []).filter((x) => x.stock_qty <= (x.low_stock_threshold ?? 10)).slice(0, 6);
      setStats({
        products: p.count || 0, brands: b.count || 0,
        newQuotes: q.count || 0, low: lowFiltered.length,
        totalQuotes: totalQ.count || 0, completedQuotes: doneQ.count || 0,
        weekQuotes: weekQ.count || 0,
        customers: custQ.count || 0, newMessages: msgQ.count || 0,
      });
      setLowStock(lowFiltered);
      setRecent((recentR.data as Recent[]) || []);
      setMessages((recentMsgs.data as Msg[]) || []);
      setLoading(false);
    })();
  }, []);

  const conversion = stats.totalQuotes > 0 ? Math.round((stats.completedQuotes / stats.totalQuotes) * 100) : 0;

  const kpis = [
    { Icon: Package, label: isAr ? "المنتجات" : "Products", value: stats.products, accent: "from-primary/20 to-primary/5", iconColor: "text-primary", to: "/admin/products" },
    { Icon: FileSpreadsheet, label: isAr ? "طلبات جديدة" : "New RFQs", value: stats.newQuotes, accent: "from-warning/20 to-warning/5", iconColor: "text-warning-foreground", to: "/admin/quotes", highlight: stats.newQuotes > 0 },
    { Icon: MessageCircle, label: isAr ? "رسائل جديدة" : "New Messages", value: stats.newMessages, accent: "from-accent/20 to-accent/5", iconColor: "text-accent", to: "/admin/messages", highlight: stats.newMessages > 0 },
    { Icon: AlertTriangle, label: isAr ? "مخزون منخفض" : "Low Stock", value: stats.low, accent: "from-destructive/20 to-destructive/5", iconColor: "text-destructive", to: "/admin/stock", highlight: stats.low > 0 },
    { Icon: Users, label: isAr ? "العملاء" : "Customers", value: stats.customers, accent: "from-success/20 to-success/5", iconColor: "text-success", to: "/admin/customers" },
    { Icon: Building2, label: isAr ? "العلامات" : "Brands", value: stats.brands, accent: "from-muted to-secondary", iconColor: "text-foreground", to: "/admin/brands" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t.admin.overview}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isAr ? "نظرة عامة على نشاط المتجر اليوم" : "Today's store activity overview"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-none"><Link to="/admin/products"><Plus className="h-4 w-4 me-1.5" />{isAr ? "منتج جديد" : "New Product"}</Link></Button>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-none"><Link to="/admin/quotes"><FileSpreadsheet className="h-4 w-4 me-1.5" />{isAr ? "إدارة الطلبات" : "Manage RFQs"}</Link></Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {kpis.map((s) => (
              <Link key={s.label} to={s.to} className="group">
                <Card className={cn("p-5 h-full bg-gradient-to-br border transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden", s.accent, s.highlight && "ring-1 ring-primary/40")}>
                  {s.highlight && <span className="absolute top-3 end-3 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  <div className={cn("h-10 w-10 rounded-md flex items-center justify-center bg-card mb-3 shadow-sm", s.iconColor)}><s.Icon className="h-5 w-5" /></div>
                  <div className="text-3xl font-black tabular-nums">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">{s.label}</div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Performance band */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-[#14171C] text-white border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary font-black">{isAr ? "هذا الأسبوع" : "This Week"}</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-4xl font-black">{stats.weekQuotes}</div>
              <p className="text-xs text-white/60 mt-1">{isAr ? "طلب تسعير خلال 7 أيام" : "RFQs in last 7 days"}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{isAr ? "إجمالي الطلبات" : "Total RFQs"}</span>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-4xl font-black">{stats.totalQuotes}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.completedQuotes} {isAr ? "مكتملة" : "completed"}</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary font-black">{isAr ? "معدّل التحويل" : "Conversion"}</span>
                <span className="text-xs font-black text-primary">{conversion}%</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${conversion}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{isAr ? "من الطلبات إلى صفقات مكتملة" : "RFQs to completed deals"}</p>
            </Card>
          </div>

          {/* Detail grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold uppercase tracking-wide text-sm">{t.admin.recentQuotes}</h2>
                <Link to="/admin/quotes" className="text-xs text-primary font-bold uppercase tracking-widest hover:underline inline-flex items-center gap-1">
                  {isAr ? "عرض الكل" : "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-start text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border"><th className="pb-3 text-start">{t.admin.customer}</th><th className="pb-3 text-start">{t.admin.items}</th><th className="pb-3 text-start">{t.admin.status}</th><th className="pb-3 text-start">{t.admin.date}</th></tr></thead>
                <tbody>
                  {recent.map((q) => {
                    const k = statusKey[q.status] || "new";
                    return (
                      <tr key={q.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                        <td className="py-3 font-medium">
                          <Link to={`/admin/quotes`} className="hover:text-primary">{q.customer_name}</Link>
                        </td>
                        <td className="py-3 tabular-nums">{q.quote_request_items?.length || 0}</td>
                        <td className="py-3"><Badge variant="outline" className={cn("border text-[10px] uppercase font-bold", statusColor[k])}>{(t.status as any)[k]}</Badge></td>
                        <td className="py-3 text-muted-foreground text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {recent.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">{isAr ? "لا توجد طلبات بعد" : "No quotes yet"}</td></tr>}
                </tbody>
              </table>
            </Card>

            <Card className="p-6 border-warning/20">
              <h2 className="font-bold inline-flex items-center gap-2 mb-5 uppercase tracking-wide text-sm"><AlertTriangle className="h-4 w-4 text-warning-foreground" /> {t.admin.lowStockAlert}</h2>
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <Link key={p.id} to={`/admin/stock`} className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-md hover:bg-secondary/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{p.code}</p>
                    </div>
                    <Badge variant="outline" className={cn("border text-xs font-black tabular-nums", p.stock_qty === 0 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/15 text-warning-foreground border-warning/40")}>{p.stock_qty}</Badge>
                  </Link>
                ))}
                {lowStock.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{isAr ? "كل مستويات المخزون جيدة ✓" : "All stock levels healthy ✓"}</p>}
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold uppercase tracking-wide text-sm inline-flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> {isAr ? "آخر الرسائل" : "Recent Messages"}</h2>
                <Link to="/admin/messages" className="text-xs text-primary font-bold uppercase tracking-widest hover:underline inline-flex items-center gap-1">
                  {isAr ? "عرض الكل" : "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {messages.map((m) => (
                  <Link key={m.id} to="/admin/messages" className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:border-primary hover:bg-secondary/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{m.name}</p>
                        {m.status === "new" && <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 h-4">{isAr ? "جديد" : "NEW"}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.subject || (isAr ? "بدون عنوان" : "No subject")}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</span>
                  </Link>
                ))}
                {messages.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{isAr ? "لا توجد رسائل" : "No messages"}</p>}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/5 to-card">
              <h2 className="font-bold uppercase tracking-wide text-sm mb-5">{isAr ? "إجراءات سريعة" : "Quick Actions"}</h2>
              <div className="space-y-2">
                {[
                  { Icon: Plus, label: isAr ? "إضافة منتج" : "Add Product", to: "/admin/products" },
                  { Icon: Building2, label: isAr ? "إضافة علامة" : "Add Brand", to: "/admin/brands" },
                  { Icon: Upload, label: isAr ? "استيراد CSV" : "Import CSV", to: "/admin/import" },
                  { Icon: Users, label: isAr ? "إدارة الصلاحيات" : "Manage Roles", to: "/admin/roles" },
                  { Icon: TrendingUp, label: isAr ? "التحليلات" : "Analytics", to: "/admin/analytics" },
                ].map((a) => (
                  <Link key={a.label} to={a.to} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/60 border border-transparent hover:border-border text-sm font-medium">
                    <a.Icon className="h-4 w-4 text-primary" /> {a.label}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
