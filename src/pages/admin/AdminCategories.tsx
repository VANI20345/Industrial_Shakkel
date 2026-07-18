import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Plus, Pencil, Loader2, Trash2, ChevronLeft, FolderOpen, FolderTree } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify, uploadToBucket, ALLOWED_PRODUCT_IMAGE, MAX_IMAGE_BYTES } from "@/lib/storage";

type Category = { id: string; name: string; name_ar?: string | null; name_en?: string | null; slug: string; is_active: boolean; image_url: string | null; parent_id: string | null };
const empty = { id: "", name: "", name_ar: "", name_en: "", is_active: true, image_url: "" as string, parent_id: "" as string };

const AdminCategories = () => {
  const { t, lang, dir } = useI18n();
  const [params, setParams] = useSearchParams();
  const parentParam = params.get("parent") || "";
  const [rows, setRows] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const byId = useMemo(() => new Map(rows.map((c) => [c.id, c])), [rows]);
  const currentParent = parentParam ? byId.get(parentParam) || null : null;

  // Ancestor trail for breadcrumb
  const ancestors = useMemo(() => {
    const trail: Category[] = [];
    let cur = currentParent;
    let guard = 0;
    while (cur && guard++ < 20) {
      trail.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return trail;
  }, [currentParent, byId]);

  const visible = useMemo(
    () => rows.filter((c) => (c.parent_id || "") === parentParam),
    [rows, parentParam],
  );

  const goTo = (id: string | null) => {
    const next = new URLSearchParams();
    if (id) next.set("parent", id);
    setParams(next, { replace: false });
  };

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

  const openNew = () => {
    setForm({ ...empty, parent_id: parentParam || "" });
    setImgFile(null);
    setOpen(true);
  };

  // Auto-unique slug
  const ensureUniqueSlug = async (base: string, ignoreId: string) => {
    let candidate = base || "category";
    let n = 1;
    while (true) {
      const { data } = await supabase.from("categories").select("id").eq("slug", candidate).maybeSingle();
      if (!data || data.id === ignoreId) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
    }
  };

  const submit = async () => {
    const nameEn = (form.name_en || "").trim();
    const nameAr = (form.name_ar || "").trim();
    if (!nameEn && !nameAr) return toast.error(lang === "ar" ? "الاسم مطلوب" : "Name required");
    setSaving(true);
    try {
      let image_url: string | null = form.image_url || null;
      if (imgFile) {
        if (!ALLOWED_PRODUCT_IMAGE.includes(imgFile.type)) throw new Error(lang === "ar" ? "صورة غير مدعومة" : "Image format not supported");
        if (imgFile.size > MAX_IMAGE_BYTES) throw new Error(lang === "ar" ? "الصورة أكبر من 5MB" : "Image > 5MB");
        image_url = await uploadToBucket("brand-logos", imgFile, "categories");
      }
      const displayName = nameEn || nameAr;
      const baseSlug = slugify(nameEn || displayName) || `cat-${Date.now()}`;
      const slug = await ensureUniqueSlug(baseSlug, form.id);
      const payload: any = {
        name: displayName,
        name_en: nameEn || null,
        name_ar: nameAr || null,
        slug,
        is_active: form.is_active,
        image_url,
        parent_id: form.parent_id || null,
      };
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

  const isRoot = !parentParam;
  const addLabel = isRoot
    ? (lang === "ar" ? "إضافة تصنيف رئيسي" : "Add Main Category")
    : (lang === "ar" ? "إضافة تصنيف فرعي" : "Add Subcategory");

  return (
    <AdminLayout>
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {parentParam ? (
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => goTo(null)}>{t.admin.categories}</button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{t.admin.categories}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {ancestors.map((a, i) => {
              const isLast = i === ancestors.length - 1;
              const label = (lang === "ar" ? a.name_ar : a.name_en) || a.name;
              return (
                <span key={a.id} className="contents">
                  <BreadcrumbSeparator className={dir === "rtl" ? "rotate-180" : ""} />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={() => goTo(a.id)}>{label}</button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold inline-flex items-center gap-2">
            {currentParent ? <FolderOpen className="h-7 w-7 text-primary" /> : <FolderTree className="h-7 w-7 text-primary" />}
            {currentParent ? ((lang === "ar" ? currentParent.name_ar : currentParent.name_en) || currentParent.name) : t.admin.categories}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {visible.length} {lang === "ar" ? (isRoot ? "تصنيف رئيسي" : "تصنيف فرعي") : (isRoot ? "main" : "subcategories")}
          </p>
        </div>
        <div className="flex gap-2">
          {parentParam && (
            <Button variant="outline" onClick={() => goTo(currentParent?.parent_id || null)}>
              <ChevronLeft className={`h-4 w-4 me-1.5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {lang === "ar" ? "رجوع" : "Back"}
            </Button>
          )}
          <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 me-1.5" /> {addLabel}</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {isRoot
            ? (lang === "ar" ? "لا توجد تصنيفات رئيسية. اضغط زر إضافة تصنيف رئيسي للبدء." : "No main categories yet. Click Add Main Category to begin.")
            : (lang === "ar" ? "لا توجد تصنيفات فرعية. اضغط إضافة تصنيف فرعي." : "No subcategories. Click Add Subcategory.")}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((c) => {
            const childCount = rows.filter((x) => x.parent_id === c.id).length;
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => goTo(c.id)} className="flex items-start gap-3 text-start flex-1 hover:opacity-90">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" loading="lazy" className="h-14 w-14 rounded-md object-cover border border-border" />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                        {childCount > 0 ? <FolderTree className="h-6 w-6" /> : <FolderOpen className="h-6 w-6" />}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg hover:text-primary transition-colors">
                        {(lang === "ar" ? c.name_ar : c.name_en) || c.name}
                      </h3>
                      {(c.name_ar && c.name_en) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? c.name_en : c.name_ar}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {childCount > 0 && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {childCount} {lang === "ar" ? "فرعي" : "subcategories"}
                          </Badge>
                        )}
                        <Badge variant="outline">{counts[c.id] || 0} {lang === "ar" ? "منتج" : "products"}</Badge>
                        <Badge variant="outline" className={c.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted"}>
                          {c.is_active ? t.admin.active : t.admin.inactive}
                        </Badge>
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 items-center">
                    <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setForm({ id: c.id, name: c.name, name_ar: c.name_ar || "", name_en: c.name_en || "", is_active: c.is_active, image_url: c.image_url || "", parent_id: c.parent_id || "" }); setImgFile(null); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setToDelete(c); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? (lang === "ar" ? "تعديل التصنيف" : "Edit category")
                : (form.parent_id
                    ? (lang === "ar" ? "إضافة تصنيف فرعي" : "Add Subcategory")
                    : (lang === "ar" ? "إضافة تصنيف رئيسي" : "Add Main Category"))}
            </DialogTitle>
          </DialogHeader>
          {form.parent_id && !form.id && (
            <p className="text-xs text-muted-foreground -mt-2">
              {lang === "ar" ? "سيُضاف داخل: " : "Will be added inside: "}
              <strong>{(lang === "ar" ? byId.get(form.parent_id)?.name_ar : byId.get(form.parent_id)?.name_en) || byId.get(form.parent_id)?.name}</strong>
            </p>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{lang === "ar" ? "الاسم بالعربي" : "Arabic name"} *</Label>
                <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={80} placeholder="مثل: لاصق صناعي" />
              </div>
              <div>
                <Label>{lang === "ar" ? "الاسم بالإنجليزي" : "English name"} *</Label>
                <Input dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} maxLength={80} placeholder="e.g. Industrial Adhesive" />
              </div>
            </div>
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
