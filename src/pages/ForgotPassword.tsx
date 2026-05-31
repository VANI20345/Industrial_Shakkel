import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ForgotPassword = () => {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) return toast.error(lang === "ar" ? "بريد غير صحيح" : "Invalid email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success(t.forgot.sent);
  };

  return (
    <SiteLayout>
      <div className="container-page py-16 flex justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="flex justify-center mb-5">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-center">{t.forgot.title}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{t.forgot.desc}</p>

          {sent ? (
            <div className="mt-7 text-center space-y-4">
              <p className="text-sm text-success font-medium">{t.forgot.sent}</p>
              <Button asChild variant="outline" className="w-full"><Link to="/login">{t.forgot.backToLogin}</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <Label htmlFor="e">{t.auth.email}</Label>
                <Input id="e" type="email" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-primary" disabled={loading}>
                {loading ? "…" : t.forgot.send}
              </Button>
              <p className="text-sm text-center">
                <Link to="/login" className="text-primary font-semibold hover:underline">{t.forgot.backToLogin}</Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
};

export default ForgotPassword;
