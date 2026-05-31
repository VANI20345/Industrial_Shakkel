import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(100),
});

const Login = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(lang === "ar" ? "بيانات غير صحيحة" : "Invalid input");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(lang === "ar" ? "فشل تسجيل الدخول: " + error.message : error.message);
      return;
    }
    toast.success(lang === "ar" ? "مرحبًا بعودتك" : "Welcome back");
    navigate(loc.state?.from || "/");
  };

  return (
    <SiteLayout>
      <div className="container-page py-16 flex justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="flex justify-center mb-5">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-center">{t.auth.loginTitle}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{t.auth.loginSubtitle}</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="e">{t.auth.email}</Label>
              <Input id="e" type="email" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="p">{t.auth.password}</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t.auth.forgot}</Link>
              </div>
              <Input id="p" type="password" required className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" size="lg" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? "…" : t.auth.login}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            {t.auth.noAccount} <Link to="/register" className="text-primary font-semibold hover:underline">{t.auth.signUp}</Link>
          </p>
        </Card>
      </div>
    </SiteLayout>
  );
};

export default Login;
