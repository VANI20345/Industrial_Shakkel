import { SiteLayout } from "@/components/layout/SiteLayout";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Mail, MessageCircle, Globe } from "lucide-react";

type Item = { id: string; product_code: string; product_name: string; requested_quantity: number; unit: string };
type Quote = {
  id: string;
  status: string;
  preferred_contact_method: string;
  notes: string | null;
  email: string;
  phone: string | null;
  customer_name: string;
  company_name: string | null;
  created_at: string;
  quote_request_items: Item[];
};

const MyQuoteDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang, dir } = useI18n();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("quote_requests")
      .select("*, quote_request_items(id,product_code,product_name,requested_quantity,unit)")
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setQuote(data as Quote | null);
        setLoading(false);
      });
  }, [id, user]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      new: t.status.new, under_review: t.status.review, quotation_sent: t.status.sent,
      waiting_customer_approval: t.status.waiting, deal_completed: t.status.completed,
      cancelled: t.status.cancelled, rejected: t.status.rejected,
    };
    return map[s] || s;
  };
  const contactLabel = (c: string) => ({ email: t.quote.email, whatsapp: t.quote.whatsapp, website: t.quote.portal } as any)[c] || c;
  const ContactIcon = ({ c }: { c: string }) => c === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : c === "email" ? <Mail className="h-4 w-4" /> : <Globe className="h-4 w-4" />;

  if (loading) return <SiteLayout><div className="container-page py-20 text-center">{t.common.loading}</div></SiteLayout>;
  if (!quote) return <SiteLayout><div className="container-page py-20 text-center">{lang === "ar" ? "الطلب غير موجود." : "Quote not found."}</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="container-page py-10 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/my-quotes")} className="mb-6">
          <ChevronLeft className={`h-4 w-4 me-1 ${dir === "rtl" ? "rotate-180" : ""}`} /> {t.quoteDetail.backToList}
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{t.quoteDetail.title}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{t.quoteDetail.number}: #{quote.id.slice(0, 8)}</p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">{statusLabel(quote.status)}</Badge>
        </div>

        <Card className="p-5 mb-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.quote.fullName}</p>
              <p className="font-semibold mt-1">{quote.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.quote.company}</p>
              <p className="font-semibold mt-1">{quote.company_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.auth.email}</p>
              <p className="font-semibold mt-1">{quote.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.quote.phone}</p>
              <p className="font-semibold mt-1">{quote.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.quoteDetail.contactMethod}</p>
              <p className="font-semibold mt-1 inline-flex items-center gap-2"><ContactIcon c={quote.preferred_contact_method} /> {contactLabel(quote.preferred_contact_method)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.quoteDetail.submittedOn}</p>
              <p className="font-semibold mt-1">{new Date(quote.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="font-bold mb-4">{t.quoteDetail.itemsTitle} ({quote.quote_request_items.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b">
                  <th className="text-start py-2">{t.products.code}</th>
                  <th className="text-start py-2">{t.quote.product}</th>
                  <th className="text-end py-2">{t.quote.qty}</th>
                  <th className="text-end py-2">{t.products.unit}</th>
                </tr>
              </thead>
              <tbody>
                {quote.quote_request_items.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-mono text-xs">{i.product_code}</td>
                    <td className="py-3">{i.product_name}</td>
                    <td className="py-3 text-end font-bold">{i.requested_quantity}</td>
                    <td className="py-3 text-end text-muted-foreground">{i.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {quote.notes && (
          <Card className="p-5">
            <h2 className="font-bold mb-2 text-sm">{t.quoteDetail.notes}</h2>
            <p className="text-sm text-foreground/80 whitespace-pre-line">{quote.notes}</p>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
};

export default MyQuoteDetail;
