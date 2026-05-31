import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { Download, Mail, Phone, Loader2, MapPin } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";
import { exportXlsx } from "@/lib/reports";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = { id: string; full_name: string | null; company_name: string | null; email: string | null; phone: string | null; city: string | null };
type QRow = { id: string; status: string; created_at: string };

const AdminCustomers = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Profile | null>(null);
  const [viewQuotes, setViewQuotes] = useState<QRow[]>([]);
  const [vLoading, setVLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, q] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("quote_requests").select("customer_id"),
    ]);
    if (p.error) toast.error(p.error.message);
    setRows((p.data as Profile[]) || []);
    const m: Record<string, number> = {};
    (q.data || []).forEach((r: any) => { if (r.customer_id) m[r.customer_id] = (m[r.customer_id] || 0) + 1; });
    setCounts(m);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openView = async (c: Profile) => {
    setView(c);
    setVLoading(true);
    const { data } = await supabase.from("quote_requests").select("id,status,created_at").eq("customer_id", c.id).order("created_at", { ascending: false });
    setViewQuotes((data as QRow[]) || []);
    setVLoading(false);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.customers}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => {
            const headers = ["full_name", "company_name", "email", "phone", "city", "quotes_count"];
            const data = rows.map((c) => [c.full_name || "", c.company_name || "", c.email || "", c.phone || "", c.city || "", counts[c.id] || 0]);
            downloadCsv(`customers-${Date.now()}.csv`, toCsv(headers, data));
          }}><Download className="h-4 w-4 me-1.5" /> CSV</Button>
          <Button variant="outline" onClick={() => exportXlsx(`customers-${Date.now()}.xlsx`, [{
            name: "Customers",
            rows: rows.map((c) => ({
              full_name: c.full_name || "", company_name: c.company_name || "",
              email: c.email || "", phone: c.phone || "", city: c.city || "",
              quotes_count: counts[c.id] || 0,
            })),
          }])}><Download className="h-4 w-4 me-1.5" /> Excel</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  {(c.full_name || c.email || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold truncate">{c.full_name || "—"}</h3>
                  <p className="text-xs text-muted-foreground truncate">{c.company_name || "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> <span className="truncate">{c.email}</span></div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>}
                {c.city && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {c.city}</div>}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <Badge variant="outline">{counts[c.id] || 0} quotes</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => openView(c)}>{t.admin.view}</Button>
            </Card>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No customers yet</p>}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{view?.full_name || view?.email}</DialogTitle></DialogHeader>
          {vLoading ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Quote requests ({viewQuotes.length})</h4>
              {viewQuotes.map((q) => (
                <div key={q.id} className="flex justify-between text-sm border-b border-border py-2">
                  <span className="font-mono text-xs">{q.id.slice(0, 8)}</span>
                  <Badge variant="outline">{q.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
              ))}
              {viewQuotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomers;
