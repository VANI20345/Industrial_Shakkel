import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify, uploadToBucket, ALLOWED_PRODUCT_IMAGE, MAX_IMAGE_BYTES } from "@/lib/storage";

type Category = { id: string; name: string; slug: string; is_active: boolean; image_url: string | null };
const empty = { id: "", name: "", slug: "", is_active: true, image_url: "" as string };

const AdminCategories = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggle = async (c: Category) => {
    const { error } = await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeCat = async () => {
    if (!toDelete) return;
    setDeleting(true);
    await supabase.from("products").update({ category_id: null }).eq("category_id", toDelete.id);
    const { error } = await supabase.from("categories").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
    setToDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("category_id"),
    ]);
    setRows((c.data as Category[]) || []);
    const map: Record<string, number> = {};
    (p.data || []).forEach((r: any) => { if (r.category_id) map[r.category_id] = (map[r.category_id] || 0) + 1; });
    setCounts(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return toast.error(lang === "ar" ? "الاسم مطلوب" : "Name required");
    setSaving(true);
    try {
      let image_url: string | null = form.image_url || null;
      if (imgFile) {
        if (!ALLOWED_PRODUCT_IMAGE.includes(imgFile.type)) throw new Error(lang === "ar" ? "صورة غير مدعومة" : "Image format not supported");
        if (imgFile.size > MAX_IMAGE_BYTES) throw new Error(lang === "ar" ? "الصورة أكبر من 5MB" : "Image > 5MB");
        image_url = await uploadToBucket("brand-logos", imgFile, "categories");
      }
      const payload = { name: form.name.trim(), slug: form.slug.trim() || slugify(form.name), is_active: form.is_active, image_url };
      const { error } = form.id
        ? await supabase.from("categories").update(payload).eq("id", form.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
      toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.categories}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length}</p>
        </div>
        <Button onClick={() => { setForm(empty); setImgFile(null); setOpen(true); }} className="bg-gradient-primary"><Plus className="h-4 w-4 me-1.5" /> {t.admin.addNew}</Button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" loading="lazy" className="h-14 w-14 rounded-md object-cover border border-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs">—</div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{c.name}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{counts[c.id] || 0} products</Badge>
                      <Badge variant="outline" className={c.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted"}>
                        {c.is_active ? t.admin.active : t.admin.inactive}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ id: c.id, name: c.name, slug: c.slug, is_active: c.is_active, image_url: c.image_url || "" }); setImgFile(null); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setToDelete(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? t.admin.edit : t.admin.addNew}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t.admin.name} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
            <div>
              <Label>{lang === "ar" ? "صورة التصنيف (اختياري)" : "Category image (optional)"}</Label>
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif" onChange={(e) => setImgFile(e.target.files?.[0] || null)} className="mt-1.5" />
              {form.image_url && !imgFile && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.image_url} alt="" className="h-12 w-12 rounded object-cover border border-border" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>
                    {lang === "ar" ? "إزالة" : "Remove"}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between"><Label>{t.admin.active}</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.admin.cancel}</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.name}</strong> — {t.deleteDialog.categoryWarn} {t.deleteDialog.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={removeCat} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCategories;
