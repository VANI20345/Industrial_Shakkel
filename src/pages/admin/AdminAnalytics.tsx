import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, FileSpreadsheet, Users, Package, AlertTriangle, CheckCircle2, XCircle, Inbox, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

type QuoteRow = {
  id: string; customer_id: string | null; customer_name: string; status: string; created_at: string;
  quote_request_items: { product_code: string; product_name: string; requested_quantity: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(var(--primary))",
  under_review: "hsl(var(--warning))",
  quotation_sent: "hsl(var(--accent))",
  waiting_customer_approval: "hsl(215 20% 60%)",
  deal_completed: "hsl(var(--success))",
  cancelled: "hsl(215 15% 50%)",
  rejected: "hsl(var(--destructive))",
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string, isAr: boolean) => {
  const [y, m] = key.split("-");
  const months = isAr
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

const statusName = (k: string, isAr: boolean) => {
  const map: Record<string, [string, string]> = {
    new: ["New", "جديد"],
    under_review: ["Under Review", "قيد المراجعة"],
    quotation_sent: ["Sent", "تم الإرسال"],
    waiting_customer_approval: ["Waiting", "بانتظار العميل"],
    deal_completed: ["Completed", "مكتمل"],
    cancelled: ["Cancelled", "ملغي"],
    rejected: ["Rejected", "مرفوض"],
  };
  return map[k]?.[isAr ? 1 : 0] || k;
};

const AdminAnalytics = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuotes: 0, newQuotes: 0, completed: 0, cancelled: 0,
    customers: 0, products: 0, lowStock: 0,
  });
  const [byStatus, setByStatus] = useState<{ name: string; value: number; key: string }[]>([]);
  const [byMonth, setByMonth] = useState<{ month: string; count: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [quotesRes, custRes, prodRes, lowRes] = await Promise.all([
        supabase.from("quote_requests").select("id,customer_id,customer_name,status,created_at,quote_request_items(product_code,product_name,requested_quantity)").order("created_at", { ascending: false }).limit(2000),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id,stock_qty,low_stock_threshold").eq("is_active", true).limit(1000),
      ]);

      const quotes = (quotesRes.data as QuoteRow[]) || [];
      const newQuotes = quotes.filter((q) => q.status === "new").length;
      const completed = quotes.filter((q) => q.status === "deal_completed").length;
      const cancelled = quotes.filter((q) => q.status === "cancelled" || q.status === "rejected").length;
      const lowAll = (lowRes.data as { stock_qty: number; low_stock_threshold: number }[]) || [];
      const lowStock = lowAll.filter((x) => x.stock_qty <= (x.low_stock_threshold ?? 10)).length;

      setStats({
        totalQuotes: quotes.length, newQuotes, completed, cancelled,
        customers: custRes.count || 0, products: prodRes.count || 0, lowStock,
      });

      const sMap = new Map<string, number>();
      quotes.forEach((q) => sMap.set(q.status, (sMap.get(q.status) || 0) + 1));
      setByStatus(Array.from(sMap.entries()).map(([k, v]) => ({ key: k, name: statusName(k, isAr), value: v })));

      const mMap = new Map<string, number>();
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        mMap.set(monthKey(d), 0);
      }
      quotes.forEach((q) => {
        const k = monthKey(new Date(q.created_at));
        if (mMap.has(k)) mMap.set(k, (mMap.get(k) || 0) + 1);
      });
      setByMonth(Array.from(mMap.entries()).map(([month, count]) => ({ month: monthLabel(month, isAr), count })));

      const pMap = new Map<string, { name: string; qty: number }>();
      quotes.forEach((q) => {
        (q.quote_request_items || []).forEach((i) => {
          const key = i.product_code || i.product_name;
          const prev = pMap.get(key) || { name: i.product_name, qty: 0 };
          prev.qty += i.requested_quantity || 0;
          pMap.set(key, prev);
        });
      });
      setTopProducts(Array.from(pMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 6));

      const cMap = new Map<string, { name: string; count: number }>();
      quotes.forEach((q) => {
        const k = q.customer_id || q.customer_name;
        const prev = cMap.get(k) || { name: q.customer_name, count: 0 };
        prev.count += 1;
        cMap.set(k, prev);
      });
      setTopCustomers(Array.from(cMap.values()).sort((a, b) => b.count - a.count).slice(0, 6));

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primary KPIs (4 large cards) + secondary KPIs (3 compact)
  const primaryKpis = [
    { Icon: FileSpreadsheet, label: isAr ? "إجمالي الطلبات" : "Total Quotes", value: stats.totalQuotes, accent: "primary" },
    { Icon: Inbox, label: isAr ? "طلبات جديدة" : "New Quotes", value: stats.newQuotes, accent: "warning" },
    { Icon: CheckCircle2, label: isAr ? "صفقات مكتملة" : "Completed Deals", value: stats.completed, accent: "success" },
    { Icon: XCircle, label: isAr ? "ملغاة/مرفوضة" : "Cancelled / Rejected", value: stats.cancelled, accent: "destructive" },
  ] as const;

  const secondaryKpis = [
    { Icon: Users, label: isAr ? "العملاء المسجّلون" : "Registered Customers", value: stats.customers },
    { Icon: Package, label: isAr ? "إجمالي المنتجات" : "Products in catalog", value: stats.products },
    { Icon: AlertTriangle, label: isAr ? "منتجات بمخزون منخفض" : "Low-stock products", value: stats.lowStock, warn: true },
  ];

  const conversionRate = stats.totalQuotes > 0 ? Math.round((stats.completed / stats.totalQuotes) * 100) : 0;

  const accentClass = (a: string) => ({
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }[a] || "bg-primary/10 text-primary");

  return (
    <AdminLayout>
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-extrabold">{isAr ? "التحليلات" : "Analytics"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "نظرة شاملة على أداء المنصة — بيانات حية من قاعدة البيانات" : "Full overview of platform activity — live data from the database"}
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {primaryKpis.map((k) => (
              <Card key={k.label} className="p-5 hover:shadow-md transition-base">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accentClass(k.accent)}`}>
                    <k.Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold leading-none">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-2 font-medium">{k.label}</div>
              </Card>
            ))}
          </div>

          {/* Conversion bar + Secondary KPIs */}
          <div className="grid lg:grid-cols-[1.4fr_2fr] gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{isAr ? "معدّل تحويل الصفقات" : "Quote → deal conversion"}</h3>
                  <p className="text-[11px] text-muted-foreground">{isAr ? "نسبة الطلبات التي اكتملت" : "Share of quotes that became deals"}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold">{conversionRate}%</span>
                <span className="text-xs text-muted-foreground">
                  ({stats.completed} / {stats.totalQuotes})
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all" style={{ width: `${conversionRate}%` }} />
              </div>
            </Card>

            <div className="grid sm:grid-cols-3 gap-4">
              {secondaryKpis.map((k) => (
                <Card key={k.label} className="p-5">
                  <k.Icon className={`h-5 w-5 mb-2 ${k.warn ? "text-warning-foreground" : "text-muted-foreground"}`} />
                  <div className="text-2xl font-extrabold">{k.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{k.label}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Trend chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div>
                <h2 className="font-bold">{isAr ? "اتجاه الطلبات" : "Quotes trend"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "آخر 12 شهر" : "Last 12 months"}</p>
              </div>
            </div>
            {stats.totalQuotes === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">{isAr ? "لا توجد بيانات بعد" : "No data yet"}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={byMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Status + Top products */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h2 className="font-bold mb-1">{isAr ? "توزيع حالات الطلبات" : "Quote status breakdown"}</h2>
              <p className="text-xs text-muted-foreground mb-4">{isAr ? "إجمالي حسب الحالة الحالية" : "Totals by current status"}</p>
              {byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground py-16 text-center">{isAr ? "لا توجد بيانات" : "No data"}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="hsl(var(--card))" strokeWidth={2}>
                      {byStatus.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key] || "hsl(215 15% 50%)"} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-bold mb-1">{isAr ? "أكثر المنتجات طلبًا" : "Most requested products"}</h2>
              <p className="text-xs text-muted-foreground mb-4">{isAr ? "حسب إجمالي الكميات المطلوبة" : "By total requested quantity"}</p>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-16 text-center">{isAr ? "لا توجد بيانات" : "No data"}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Top customers */}
          <Card className="p-6">
            <h2 className="font-bold mb-1">{isAr ? "أكثر العملاء نشاطًا" : "Most active customers"}</h2>
            <p className="text-xs text-muted-foreground mb-4">{isAr ? "بعدد طلبات التسعير" : "By number of quote requests"}</p>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">{isAr ? "لا توجد بيانات" : "No data"}</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, topCustomers.length * 44)}>
                <BarChart data={topCustomers} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalytics;
