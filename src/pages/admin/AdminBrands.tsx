import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Plus, Pencil, Search, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALLOWED_LOGO, MAX_IMAGE_BYTES, slugify, uploadToBucket } from "@/lib/storage";

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const empty = { id: "", name: "", slug: "", description: "", logo_url: "", is_active: true, sort_order: 0 };

const AdminBrands = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const removeBrand = async () => {
    if (!toDelete) return;
    setDeleting(true);
    // unlink products first (no FK in schema)
    await supabase.from("products").update({ brand_id: null }).eq("brand_id", toDelete.id);
    const { error } = await supabase.from("brands").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
    setToDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("brands").select("*").order("sort_order").order("name");
    if (error) toast.error(error.message);
    setRows((data as Brand[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setFile(null); setOpen(true); };
  const openEdit = (b: Brand) => { setForm({ ...empty, ...b, description: b.description || "", logo_url: b.logo_url || "" }); setFile(null); setOpen(true); };

  const toggleActive = async (b: Brand) => {
    const { error } = await supabase.from("brands").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("OK");
    load();
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error(lang === "ar" ? "الاسم مطلوب" : "Name is required");
    if (file) {
      if (!ALLOWED_LOGO.includes(file.type)) return toast.error(lang === "ar" ? "الصيغة غير مدعومة (PNG/SVG/WEBP)" : "Logo must be PNG, SVG or WEBP");
      if (file.size > MAX_IMAGE_BYTES) return toast.error(lang === "ar" ? "الملف أكبر من 5MB" : "File exceeds 5MB");
    }
    setSaving(true);
    try {
      let logo_url: string | null = form.logo_url || null;
      if (file) logo_url = await uploadToBucket("brand-logos", file);
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || null,
        logo_url,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (form.id) {
        const { error } = await supabase.from("brands").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands").insert(payload);
        if (error) throw error;
      }
      toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.brands}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length}</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 me-1.5" /> {t.admin.addBrand}</Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="ps-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Logo</th>
                <th className="px-5 py-3">{t.admin.name}</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">{t.admin.status}</th>
                <th className="px-5 py-3 text-end">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-10 w-16 object-contain" />
                    ) : (
                      <div className="h-10 w-16 rounded bg-secondary flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-bold">{b.name}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-md truncate">{b.description}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={b.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted"}>
                      {b.is_active ? t.admin.active : t.admin.inactive}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2 items-center">
                      <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setToDelete(b)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No brands</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t.admin.edit : t.admin.addBrand}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.admin.name} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />
            </div>
            <div>
              <Label>Logo (PNG / SVG / WEBP, max 5MB)</Label>
              <Input type="file" accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {form.logo_url && !file && <img src={form.logo_url} alt="" className="mt-2 h-12 object-contain" />}
            </div>
            <div className="flex items-center justify-between">
              <Label>{t.admin.active}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.admin.cancel}</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-primary">
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.name}</strong> — {t.deleteDialog.brandWarn} {t.deleteDialog.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={removeBrand} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminBrands;
