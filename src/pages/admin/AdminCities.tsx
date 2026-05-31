import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";

type City = { id: string; name_ar: string; name_en: string; is_active: boolean; sort_order: number };

const AdminCities = () => {
  const { lang } = useI18n();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [n_ar, setNAr] = useState("");
  const [n_en, setNEn] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cities" as any)
      .select("*")
      .order("sort_order");
    if (error) {
      setTableMissing(true);
    } else {
      setCities((data as any[]) as City[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!n_ar.trim() || !n_en.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("cities" as any).insert({
      name_ar: n_ar.trim(), name_en: n_en.trim(), is_active: true, sort_order: 999,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNAr(""); setNEn("");
    toast.success(lang === "ar" ? "تمت الإضافة" : "Added");
    load();
  };

  const toggle = async (c: City) => {
    await supabase.from("cities" as any).update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const remove = async (c: City) => {
    if (!confirm(lang === "ar" ? "حذف المدينة؟" : "Delete city?")) return;
    await supabase.from("cities" as any).delete().eq("id", c.id);
    load();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{lang === "ar" ? "المدن" : "Cities"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar" ? "تظهر هذه المدن في صفحة إنشاء الحساب." : "These cities appear in the registration form."}
        </p>
      </div>

      {tableMissing && (
        <Card className="p-6 mb-6 border-warning/50 bg-warning/5">
          <p className="font-semibold mb-2">{lang === "ar" ? "إعداد مطلوب" : "Setup required"}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {lang === "ar"
              ? "Error SQL"
              : "Error SQL"}
          </p>
        </Card>
      )}

      {!tableMissing && (
        <>
          <Card className="p-5 mb-6">
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs font-medium">{lang === "ar" ? "الاسم بالعربي" : "Name (AR)"}</label>
                <Input value={n_ar} onChange={(e) => setNAr(e.target.value)} className="mt-1" maxLength={80} />
              </div>
              <div>
                <label className="text-xs font-medium">{lang === "ar" ? "Name (EN)" : "Name (EN)"}</label>
                <Input value={n_en} onChange={(e) => setNEn(e.target.value)} className="mt-1" maxLength={80} />
              </div>
              <Button onClick={add} disabled={busy || !n_ar.trim() || !n_en.trim()} className="bg-gradient-primary gap-2">
                <Plus className="h-4 w-4" /> {lang === "ar" ? "إضافة" : "Add"}
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">{lang === "ar" ? "بالعربي" : "Arabic"}</th>
                    <th className="px-4 py-3">{lang === "ar" ? "بالإنجليزي" : "English"}</th>
                    <th className="px-4 py-3">{lang === "ar" ? "نشطة" : "Active"}</th>
                    <th className="px-4 py-3 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{c.name_ar}</td>
                      <td className="px-4 py-2.5">{c.name_en}</td>
                      <td className="px-4 py-2.5"><Switch checked={c.is_active} onCheckedChange={() => toggle(c)} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {cities.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{lang === "ar" ? "لا توجد مدن بعد" : "No cities yet"}</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default AdminCities;
