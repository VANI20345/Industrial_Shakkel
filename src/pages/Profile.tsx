import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCities } from "@/hooks/useCities";
import { UserCog, Loader2 } from "lucide-react";
import { z } from "zod";
import { Seo } from "@/components/Seo";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  company_name: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(30),
  city: z.string().trim().min(2).max(80),
});

const Profile = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { cities } = useCities();
  const [form, setForm] = useState({ full_name: "", company_name: "", phone: "", city: "" });
  const [cityChoice, setCityChoice] = useState<string>("");
  const [otherCity, setOtherCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const f = {
          full_name: data.full_name || "",
          company_name: data.company_name || "",
          phone: data.phone || "",
          city: data.city || "",
        };
        setForm(f);
        // Match the city against the dropdown
        const match = cities.find((c) => c.name_ar === f.city || c.name_en === f.city);
        if (match) {
          setCityChoice(lang === "ar" ? match.name_ar : match.name_en);
        } else if (f.city) {
          setCityChoice("__other__");
          setOtherCity(f.city);
        }
      }
      setLoading(false);
    });
  }, [user, cities, lang]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const finalCity = cityChoice === "__other__" ? otherCity.trim() : cityChoice;
    const parsed = schema.safeParse({ ...form, city: finalCity });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || (lang === "ar" ? "بيانات غير صحيحة" : "Invalid input"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        company_name: parsed.data.company_name,
        phone: parsed.data.phone,
        city: parsed.data.city,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? "تم حفظ البيانات" : "Profile saved");
  };

  return (
    <SiteLayout>
      <Seo title={lang === "ar" ? "حسابي — شَكَّل" : "My Account — Shakkel"} />
      <div className="container-page py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-11 w-11 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <UserCog className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{lang === "ar" ? "حسابي" : "My Account"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Card className="p-6 md:p-8">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{lang === "ar" ? "الاسم الكامل" : "Full name"}</Label>
                <Input className="mt-1.5" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>{lang === "ar" ? "اسم الشركة" : "Company"}</Label>
                <Input className="mt-1.5" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div>
                <Label>{lang === "ar" ? "رقم الجوال" : "Phone"}</Label>
                <Input className="mt-1.5" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>{lang === "ar" ? "المدينة" : "City"}</Label>
                <Select value={cityChoice} onValueChange={setCityChoice}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder={lang === "ar" ? "اختر المدينة" : "Select city"} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectGroup>
                      <SelectLabel>{lang === "ar" ? "مدن المملكة" : "Saudi cities"}</SelectLabel>
                      {cities.map((c) => (
                        <SelectItem key={c.name_en} value={lang === "ar" ? c.name_ar : c.name_en}>
                          {lang === "ar" ? c.name_ar : c.name_en}
                        </SelectItem>
                      ))}
                      <SelectItem value="__other__">{lang === "ar" ? "أخرى…" : "Other…"}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {cityChoice === "__other__" && (
                  <Input className="mt-2" placeholder={lang === "ar" ? "اكتب اسم المدينة" : "Enter city name"} value={otherCity} onChange={(e) => setOtherCity(e.target.value)} maxLength={80} required />
                )}
              </div>
              <div className="sm:col-span-2 mt-2">
                <Button type="submit" size="lg" className="bg-gradient-primary" disabled={saving}>
                  {saving ? (lang === "ar" ? "جارٍ الحفظ…" : "Saving…") : (lang === "ar" ? "حفظ التغييرات" : "Save changes")}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          {lang === "ar"
            ? "لتغيير البريد الإلكتروني أو كلمة المرور، تواصل مع الدعم."
            : "To change your email or password, please contact support."}
        </p>
      </div>
    </SiteLayout>
  );
};

export default Profile;
