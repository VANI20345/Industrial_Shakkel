import { SiteLayout } from "@/components/layout/SiteLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type QuoteRow = {
  id: string;
  status: string;
  preferred_contact_method: string;
  notes: string | null;
  created_at: string;
  quote_request_items: { product_code: string; product_name: string; requested_quantity: number; unit: string }[];
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  under_review: "secondary",
  quotation_sent: "secondary",
  waiting_customer_approval: "secondary",
  deal_completed: "default",
  cancelled: "destructive",
  rejected: "destructive",
};

const MyQuotes = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quote_requests")
      .select("id,status,preferred_contact_method,notes,created_at,quote_request_items(product_code,product_name,requested_quantity,unit)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as QuoteRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      new: t.status.new,
      under_review: t.status.review,
      quotation_sent: t.status.sent,
      waiting_customer_approval: t.status.waiting,
      deal_completed: t.status.completed,
      cancelled: t.status.cancelled,
      rejected: t.status.rejected,
    };
    return map[s] || s;
  };

  return (
    <SiteLayout>
      <div className="container-page py-12">
        <h1 className="text-3xl font-extrabold mb-2">{t.nav.myQuotes}</h1>
        <p className="text-muted-foreground mb-8">{lang === "ar" ? "تابع حالة طلبات التسعيرة الخاصة بك." : "Track your quotation requests."}</p>

        {loading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {!loading && rows.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            {lang === "ar" ? "لا توجد طلبات بعد." : "No quote requests yet."}
          </Card>
        )}
        <div className="space-y-4">
          {rows.map((q) => (
            <Card key={q.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">#{q.id.slice(0, 8)}</div>
                  <div className="text-sm mt-1">
                    {new Date(q.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[q.status] || "outline"}>{statusLabel(q.status)}</Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/my-quotes/${q.id}`}>{t.quoteDetail.open} <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" /></Link>
                  </Button>
                </div>
              </div>
              <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                {q.quote_request_items.slice(0, 3).map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-foreground truncate">{it.product_name} <span className="text-muted-foreground">({it.product_code})</span></span>
                    <span className="font-semibold whitespace-nowrap ms-3">{it.requested_quantity} {it.unit}</span>
                  </div>
                ))}
                {q.quote_request_items.length > 3 && (
                  <p className="text-xs text-muted-foreground pt-1">+{q.quote_request_items.length - 3}…</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
};

export default MyQuotes;
