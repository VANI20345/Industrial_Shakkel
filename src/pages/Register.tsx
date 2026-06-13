import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useCities } from "@/hooks/useCities";
import { validatePassword, passwordHint } from "@/lib/passwordPolicy";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  company_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(30),
  city: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

const Register = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { cities } = useCities();
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [cityChoice, setCityChoice] = useState<string>("");
  const [otherCity, setOtherCity] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCity = cityChoice === "__other__" ? otherCity.trim() : cityChoice;
    const payload = { ...form, city: finalCity };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || (lang === "ar" ? "بيانات غير صحيحة" : "Invalid input"));
      return;
    }
    const pw = validatePassword(parsed.data.password, lang);
    if (!pw.ok) { toast.error(pw.message!); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.full_name,
          company_name: parsed.data.company_name,
          phone: parsed.data.phone,
          city: parsed.data.city,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "ar" ? "تم إنشاء الحساب!" : "Account created!");
    navigate("/");
  };

  return (
    <SiteLayout>
      <div className="container-page py-16 flex justify-center">
        <Card className="w-full max-w-xl p-8">
          <div className="flex justify-center mb-5">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-center">{t.auth.registerTitle}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{t.auth.registerSubtitle}</p>
          <form onSubmit={submit} className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>{t.auth.fullName}</Label><Input required className="mt-1.5" value={form.full_name} onChange={set("full_name")} /></div>
            <div><Label>{t.auth.company}</Label><Input required className="mt-1.5" value={form.company_name} onChange={set("company_name")} /></div>
            <div className="sm:col-span-2"><Label>{t.auth.email}</Label><Input type="email" required className="mt-1.5" value={form.email} onChange={set("email")} /></div>
            <div><Label>{t.auth.phone}</Label><Input required className="mt-1.5" value={form.phone} onChange={set("phone")} /></div>
            <div>
              <Label>{t.auth.city}</Label>
              <Select value={cityChoice} onValueChange={setCityChoice}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={lang === "ar" ? "اختر المدينة" : "Select city"} />
                </SelectTrigger>
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
                <Input
                  className="mt-2"
                  placeholder={lang === "ar" ? "اكتب اسم المدينة" : "Enter city name"}
                  value={otherCity}
                  onChange={(e) => setOtherCity(e.target.value)}
                  maxLength={80}
                  required
                />
              )}
            </div>
            <div><Label>{t.auth.password}</Label><Input type="password" required className="mt-1.5" value={form.password} onChange={set("password")} /><p className="text-[11px] text-muted-foreground mt-1">{passwordHint(lang)}</p></div>
            <div><Label>{t.auth.confirmPassword}</Label><Input type="password" required className="mt-1.5" value={form.confirm} onChange={set("confirm")} /></div>
            <Button type="submit" size="lg" className="sm:col-span-2 w-full bg-gradient-primary" disabled={loading}>
              {loading ? "…" : t.auth.register}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            {t.auth.hasAccount} <Link to="/login" className="text-primary font-semibold hover:underline">{t.auth.signIn}</Link>
          </p>
        </Card>
      </div>
    </SiteLayout>
  );
};

export default Register;
