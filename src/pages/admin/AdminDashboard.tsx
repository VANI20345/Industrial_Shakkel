import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { Building2, FileSpreadsheet, Package, AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Recent = { id: string; customer_name: string; status: string; created_at: string; quote_request_items: { id: string }[] };
type Low = { id: string; name: string; code: string; stock_qty: number; low_stock_threshold: number };

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
  const [stats, setStats] = useState({ products: 0, brands: 0, newQuotes: 0, low: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [lowStock, setLowStock] = useState<Low[]>([]);

  useEffect(() => {
    (async () => {
      const [p, b, q, lowAll, recentR] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("products").select("id,name,code,stock_qty,low_stock_threshold").eq("is_active", true).order("stock_qty").limit(200),
        supabase.from("quote_requests").select("id,customer_name,status,created_at,quote_request_items(id)").order("created_at", { ascending: false }).limit(8),
      ]);
      const lowFiltered = ((lowAll.data as Low[]) || []).filter((x) => x.stock_qty <= (x.low_stock_threshold ?? 10)).slice(0, 10);
      setStats({ products: p.count || 0, brands: b.count || 0, newQuotes: q.count || 0, low: lowFiltered.length });
      setLowStock(lowFiltered);
      setRecent((recentR.data as Recent[]) || []);
      setLoading(false);
    })();
  }, []);

  const items = [
    { Icon: Package, label: t.admin.totalProducts, value: stats.products, color: "text-primary bg-primary/10" },
    { Icon: Building2, label: t.admin.totalBrands, value: stats.brands, color: "text-accent bg-accent/10" },
    { Icon: FileSpreadsheet, label: t.admin.newQuotes, value: stats.newQuotes, color: "text-success bg-success/10" },
    { Icon: AlertTriangle, label: t.admin.lowStock, value: stats.low, color: "text-warning-foreground bg-warning/15" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.overview}</h1>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {items.map((s) => (
              <Card key={s.label} className="p-5">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", s.color)}><s.Icon className="h-5 w-5" /></div>
                <div className="text-3xl font-extrabold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold">{t.admin.recentQuotes}</h2>
                <Link to="/admin/quotes" className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  {isAr ? "عرض الكل" : "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border"><th className="pb-3">{t.admin.customer}</th><th className="pb-3">{t.admin.items}</th><th className="pb-3">{t.admin.status}</th><th className="pb-3">{t.admin.date}</th></tr></thead>
                <tbody>
                  {recent.map((q) => {
                    const k = statusKey[q.status] || "new";
                    return (
                      <tr key={q.id} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{q.customer_name}</td>
                        <td className="py-3">{q.quote_request_items?.length || 0}</td>
                        <td className="py-3"><Badge variant="outline" className={cn("border", statusColor[k])}>{(t.status as any)[k]}</Badge></td>
                        <td className="py-3 text-muted-foreground text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {recent.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">{isAr ? "لا توجد طلبات بعد" : "No quotes yet"}</td></tr>}
                </tbody>
              </table>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold inline-flex items-center gap-2 mb-5"><AlertTriangle className="h-4 w-4 text-warning-foreground" /> {t.admin.lowStockAlert}</h2>
              <div className="space-y-3">
                {lowStock.map((p) => (
                  <Link key={p.id} to={`/admin/stock`} className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-md hover:bg-secondary/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                    </div>
                    <Badge variant="outline" className={cn("border text-xs", p.stock_qty === 0 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/15 text-warning-foreground border-warning/40")}>{p.stock_qty}</Badge>
                  </Link>
                ))}
                {lowStock.length === 0 && <p className="text-sm text-muted-foreground">{isAr ? "كل مستويات المخزون جيدة." : "All stock levels healthy."}</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
