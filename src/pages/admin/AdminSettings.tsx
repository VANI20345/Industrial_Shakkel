import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useContactSettings, saveContactSettings, ContactSettings } from "@/hooks/useSiteSettings";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";

const AdminSettings = () => {
  const { lang } = useI18n();
  const { contact, loading, refresh } = useContactSettings();
  const [form, setForm] = useState<ContactSettings>(contact);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(contact); }, [contact]);

  const set = <K extends keyof ContactSettings>(k: K, v: ContactSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    const { error } = await saveContactSettings(form);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    refresh();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">
          {lang === "ar" ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar" ? "إدارة معلومات التواصل المعروضة في الموقع." : "Manage contact info shown across the site."}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
          <Card className="p-6">
            <h2 className="font-bold mb-4">{lang === "ar" ? "بيانات التواصل" : "Contact details"}</h2>
            <div className="space-y-4">
              <div>
                <Label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                <Input type="email" className="mt-1.5" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <Label>{lang === "ar" ? "رقم الجوال" : "Phone"}</Label>
                <Input className="mt-1.5" value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label>{lang === "ar" ? "رقم الواتساب" : "WhatsApp"}</Label>
                <Input className="mt-1.5" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{lang === "ar" ? "العنوان (عربي)" : "Address (AR)"}</Label>
                  <Input className="mt-1.5" value={form.address_ar} onChange={(e) => set("address_ar", e.target.value)} />
                </div>
                <div>
                  <Label>{lang === "ar" ? "العنوان (إنجليزي)" : "Address (EN)"}</Label>
                  <Input className="mt-1.5" value={form.address_en} onChange={(e) => set("address_en", e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold mb-4">{lang === "ar" ? "أماكن العرض" : "Where to show"}</h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "ar" ? "الشريط السفلي (Footer)" : "Footer"}
                </p>
                <div className="space-y-2.5">
                  <Toggle label={lang === "ar" ? "عرض البريد" : "Show email"} v={form.show_email_footer} onChange={(v) => set("show_email_footer", v)} />
                  <Toggle label={lang === "ar" ? "عرض الجوال" : "Show phone"} v={form.show_phone_footer} onChange={(v) => set("show_phone_footer", v)} />
                  <Toggle label={lang === "ar" ? "عرض الواتساب" : "Show WhatsApp"} v={form.show_whatsapp_footer} onChange={(v) => set("show_whatsapp_footer", v)} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "ar" ? "صفحة تواصل معنا" : "Contact page"}
                </p>
                <div className="space-y-2.5">
                  <Toggle label={lang === "ar" ? "عرض البريد" : "Show email"} v={form.show_email_contact} onChange={(v) => set("show_email_contact", v)} />
                  <Toggle label={lang === "ar" ? "عرض الجوال" : "Show phone"} v={form.show_phone_contact} onChange={(v) => set("show_phone_contact", v)} />
                  <Toggle label={lang === "ar" ? "عرض الواتساب" : "Show WhatsApp"} v={form.show_whatsapp_contact} onChange={(v) => set("show_whatsapp_contact", v)} />
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={save} disabled={busy} size="lg" className="gap-2 bg-gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {lang === "ar" ? "حفظ التغييرات" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Toggle = ({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Switch checked={v} onCheckedChange={onChange} />
  </div>
);

export default AdminSettings;
