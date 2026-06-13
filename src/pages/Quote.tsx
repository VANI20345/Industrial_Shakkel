import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuote } from "@/contexts/QuoteContext";
import { useI18n } from "@/i18n/I18nProvider";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Mail, MessageCircle, Globe, ShoppingCart, Minus, Plus, CheckCircle2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DBProduct, productPrimaryImage } from "@/hooks/useCatalog";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  company_name: z.string().trim().max(150).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional(),
});

const Quote = () => {
  const { t, lang } = useI18n();
  const { items, update, remove, clear } = useQuote();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState<"whatsapp" | "email" | "website">("email");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Record<string, DBProduct>>({});
  const [form, setForm] = useState({ customer_name: "", company_name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.productId);
    supabase
      .from("products")
      .select("*, product_images(image_url,sort_order)")
      .in("id", ids)
      .then(({ data }) => {
        const map: Record<string, DBProduct> = {};
        (((data as any[]) || []) as DBProduct[]).forEach((p) => { map[p.id] = p; });
        setProducts(map);
      });
  }, [items]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) setForm((f) => ({
          ...f,
          customer_name: data.full_name || f.customer_name,
          company_name: data.company_name || f.company_name,
          email: data.email || user.email || f.email,
          phone: data.phone || f.phone,
        }));
      });
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(lang === "ar" ? "سجّل الدخول لإرسال طلب التسعيرة" : "Please sign in to submit a quote request");
      navigate("/login", { state: { from: "/quote" } });
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    setSubmitting(true);
    const itemsPayload = items
      .map((it) => {
        const p = products[it.productId];
        if (!p) return null;
        return {
          product_id: p.id,
          product_code: p.code,
          product_name: p.name,
          requested_quantity: it.quantity,
          unit: p.unit,
        };
      })
      .filter(Boolean);
    if (itemsPayload.length === 0) {
      setSubmitting(false);
      toast.error(lang === "ar" ? "لا توجد بنود صالحة" : "No valid items");
      return;
    }
    const { data: quoteId, error } = await supabase.rpc("create_quote_with_items" as never, {
      _quote: {
        customer_name: parsed.data.customer_name,
        company_name: parsed.data.company_name || "",
        email: parsed.data.email,
        phone: parsed.data.phone || "",
        preferred_contact_method: contact,
        notes: form.notes || "",
      },
      _items: itemsPayload,
    } as never);
    setSubmitting(false);
    if (error || !quoteId) {
      toast.error(error?.message || (lang === "ar" ? "فشل الإرسال" : "Failed"));
      return;
    }
    setSubmitted(true);
    toast.success(t.quote.success, { description: t.quote.successDesc });
    supabase.functions.invoke("send-quote-email", {
      body: { type: "new_quote", quoteId, lang },
    }).catch((err) => console.warn("email notification failed", err));
    setTimeout(() => clear(), 1000);
  };

  if (submitted) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <Card className="max-w-xl mx-auto p-10 text-center">
            <div className="h-16 w-16 rounded-full bg-success/15 mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h1 className="text-2xl font-extrabold">{t.quote.success}</h1>
            <p className="mt-3 text-muted-foreground">{t.quote.successDesc}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button asChild className="bg-gradient-primary"><Link to="/products">{t.quote.browseProducts}</Link></Button>
              <Button asChild variant="outline"><Link to="/my-quotes">{t.nav.myQuotes}</Link></Button>
            </div>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <Card className="max-w-xl mx-auto p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{t.quote.title}</h1>
            <p className="mt-2 text-muted-foreground">{t.quote.empty}</p>
            <Button asChild className="mt-6 bg-gradient-primary"><Link to="/products">{t.quote.browseProducts}</Link></Button>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-page py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{t.quote.title}</h1>
        <p className="text-muted-foreground mb-8">{t.quote.total}: {items.length}</p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-3">
            {items.map((item) => {
              const p = products[item.productId];
              if (!p) return (
                <Card key={item.productId} className="p-4 text-sm text-muted-foreground">{t.common.loading}</Card>
              );
              const max = p.stock_qty;
              const img = productPrimaryImage(p);
              return (
                <Card key={item.productId} className="p-4 flex gap-4 items-center">
                  <Link to={`/products/${p.id}`} className="shrink-0 h-24 w-24 rounded-md bg-secondary flex items-center justify-center overflow-hidden">
                    {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/40" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                    <Link to={`/products/${p.id}`}><h3 className="font-semibold truncate hover:text-primary transition-base">{p.name}</h3></Link>
                    <p className="text-xs text-muted-foreground mt-1">{p.unit}</p>
                  </div>
                  <div className="flex items-center border border-border rounded-md">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => update(item.productId, Math.max(1, item.quantity - 1))}><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="w-12 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => {
                      if (item.quantity + 1 > max) { toast.error(t.products.maxStockError); return; }
                      update(item.productId, item.quantity + 1);
                    }}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className="p-6 lg:sticky lg:top-20 self-start">
            <form onSubmit={submit} className="space-y-4">
              <h2 className="font-bold text-lg">{t.quote.yourInfo}</h2>
              <div className="space-y-3">
                <div><Label>{t.quote.fullName}</Label><Input required className="mt-1.5" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>{t.quote.company}</Label><Input className="mt-1.5" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
                <div><Label>{t.auth.email}</Label><Input type="email" required className="mt-1.5" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>{t.quote.phone}</Label><Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>

              <div>
                <Label className="block mb-2">{t.quote.contactMethod}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "whatsapp" as const, Icon: MessageCircle, label: t.quote.whatsapp },
                    { id: "email" as const, Icon: Mail, label: t.quote.email },
                    { id: "website" as const, Icon: Globe, label: t.quote.portal },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setContact(m.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-md border-2 transition-base text-xs font-semibold",
                        contact === m.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <m.Icon className="h-5 w-5" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">{t.quote.notes}</Label>
                <Textarea id="notes" rows={3} className="mt-1.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <Button type="submit" size="lg" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-95">
                {submitting ? "…" : t.quote.submit}
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  {lang === "ar" ? "يلزم تسجيل الدخول لإتمام الإرسال." : "Sign in required to submit."}
                </p>
              )}
            </form>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Quote;
