import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword, passwordHint } from "@/lib/passwordPolicy";

const ResetPassword = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase recovery links land here with #error= or set a recovery session.
    const hash = window.location.hash;
    if (hash.includes("error")) {
      setValidLink(false);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setValidLink(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Give the recovery event a brief moment, then decide
      setTimeout(() => setValidLink((v) => (v === null ? !!session : v)), 600);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = validatePassword(password, lang);
    if (!pw.ok) return toast.error(pw.message!);
    if (password !== confirm) return toast.error(t.forgot.mismatch);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t.forgot.updated);
    await supabase.auth.signOut();
    navigate("/login");
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
          <h1 className="text-2xl font-extrabold text-center">{t.forgot.newPassword}</h1>

          {validLink === false ? (
            <div className="mt-7 text-center space-y-4">
              <p className="text-sm text-destructive">{t.forgot.invalidLink}</p>
              <Button asChild variant="outline" className="w-full"><Link to="/forgot-password">{t.forgot.title}</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <Label>{t.forgot.newPassword}</Label>
                <Input type="password" required className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">{passwordHint(lang)}</p>
              </div>
              <div>
                <Label>{t.forgot.confirmNew}</Label>
                <Input type="password" required className="mt-1.5" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-primary" disabled={loading || validLink === null}>
                {loading ? "…" : t.forgot.updateBtn}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
};

export default ResetPassword;
