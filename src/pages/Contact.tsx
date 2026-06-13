import { SiteLayout } from "@/components/layout/SiteLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";
import { useContactSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10).max(2000),
});

const THROTTLE_MS = 60_000;
const THROTTLE_KEY = "shakkel_contact_last";

const Contact = () => {
  const { t, lang } = useI18n();
  const { contact } = useContactSettings();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || (lang === "ar" ? "بيانات غير صحيحة" : "Invalid input");
      return toast.error(msg);
    }
    // Basic anti-spam: too many links / URLs
    const linkCount = (parsed.data.message.match(/https?:\/\//gi) || []).length;
    if (linkCount > 2) {
      return toast.error(lang === "ar" ? "الرسالة تحتوي على روابط كثيرة" : "Message contains too many links");
    }
    // Client-side throttle
    try {
      const last = Number(localStorage.getItem(THROTTLE_KEY) || 0);
      if (Date.now() - last < THROTTLE_MS) {
        return toast.error(lang === "ar" ? "أرسلت رسالة للتو، حاول بعد دقيقة" : "You just sent a message — please wait a minute");
      }
    } catch { /* ignore */ }

    setBusy(true);
    const payload: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    };
    if (user) payload.user_id = user.id;
    const { error } = await supabase.from("contact_messages").insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch { /* ignore */ }
    toast.success(lang === "ar" ? "تم إرسال رسالتك" : "Message sent");
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <SiteLayout>
      <Seo
        title={lang === "ar" ? "تواصل معنا | Shakkel" : "Contact | Shakkel"}
        description={lang === "ar" ? "تواصل مع فريق المبيعات لطلب تسعيرة أو استفسار." : "Reach our B2B sales team for quotations or inquiries."}
        path="/contact"
      />
      <div className="container-page py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold">{t.nav.contact}</h1>
          <p className="mt-3 text-muted-foreground">{lang === "ar" ? "تواصل مع فريق المبيعات — نرد خلال ساعات قليلة." : "Reach our B2B sales team — we typically reply within a few hours."}</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { show: contact.show_email_contact, Icon: Mail, t: "Email", v: contact.email, href: `mailto:${contact.email}` },
            { show: contact.show_phone_contact, Icon: Phone, t: "Phone", v: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
            { show: contact.show_whatsapp_contact, Icon: MessageCircle, t: "WhatsApp", v: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` },
          ].filter((c) => c.show && c.v).map((c) => (
            <Card key={c.t} className="p-6 text-center">
              <div className="h-12 w-12 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <c.Icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-bold">{c.t}</h3>
              <a href={c.href} target={c.t === "WhatsApp" ? "_blank" : undefined} rel="noreferrer" className="text-sm text-muted-foreground mt-1 hover:text-accent block" dir="ltr">{c.v}</a>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-8 max-w-2xl mx-auto">
          <h2 className="font-bold text-lg mb-4">{lang === "ar" ? "أرسل لنا رسالة" : "Send us a message"}</h2>
          {user && (
            <p className="text-xs text-muted-foreground mb-3">
              {lang === "ar" ? "ستُربط هذه الرسالة بحسابك وتظهر في «رسائلي»." : "This message will be linked to your account and visible under My Messages."}
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t.auth.fullName} *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1.5" /></div>
              <div><Label>{t.auth.phone}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} className="mt-1.5" /></div>
            </div>
            <div><Label>{t.auth.email} *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1.5" /></div>
            <div><Label>{lang === "ar" ? "الموضوع" : "Subject"}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={150} className="mt-1.5" /></div>
            <div><Label>{lang === "ar" ? "الرسالة" : "Message"} *</Label><Textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} className="mt-1.5" /><p className="text-[11px] text-muted-foreground mt-1">{lang === "ar" ? "١٠ أحرف على الأقل" : "Minimum 10 characters"}</p></div>
            <Button type="submit" size="lg" disabled={busy} className="w-full bg-gradient-primary">
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {lang === "ar" ? "إرسال" : "Send Message"}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {lang === "ar" ? contact.address_ar : contact.address_en}
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
};

export default Contact;
