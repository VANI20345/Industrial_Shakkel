import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Plus, Pencil, Search, Loader2, Image as ImageIcon, FileText, Trash2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToBucket } from "@/lib/storage";
import { ProductImagesEditor, PendingImagesPicker } from "@/components/admin/ProductImagesEditor";
import { ProductDocumentsEditor, PendingDocumentsPicker, stripExt } from "@/components/admin/ProductDocumentsEditor";
import { HighlightsEditor, SpecsEditor, type Spec } from "@/components/admin/ProductDetailsEditor";
import { downloadCsv, toCsv } from "@/lib/csv";
import { exportXlsx } from "@/lib/reports";

type Brand = { id: string; name: string };
type Cat = { id: string; name: string };
type Product = {
  id: string; code: string;
  name: string; name_ar: string | null; name_en: string | null;
  description: string | null; description_ar: string | null; description_en: string | null;
  long_description: string | null; long_description_ar: string | null; long_description_en: string | null;
  highlights: string[]; specs: any; specs_ar: any; specs_en: any;
  shakkel_ref: string | null;
  brand_id: string | null; category_id: string | null;
  unit: string; min_order_qty: number; stock_qty: number;
  is_active: boolean; status: "active" | "inactive";
  datasheet_url: string | null;
  low_stock_threshold: number;
  brands?: { name: string } | null;
  product_images?: { image_url: string; sort_order: number }[];
  product_documents?: { file_url: string; file_name: string; sort_order: number }[];
};

const emptyForm = {
  id: "", code: "",
  name_ar: "", name_en: "",
  description_ar: "", description_en: "",
  long_description_ar: "", long_description_en: "",
  brand_id: "", category_id: "",
  unit: "pcs", min_order_qty: 1, stock_qty: 0,
  low_stock_threshold: 10,
  is_active: true, datasheet_url: "",
  shakkel_ref: "",
  highlights: [] as string[],
  specs_ar: [] as Spec[],
  specs_en: [] as Spec[],
};

const AdminProducts = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingDocs, setPendingDocs] = useState<{ file: File; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const removeProduct = async () => {
    if (!toDelete) return;
    setDeleting(true);
    await supabase.from("product_images").delete().eq("product_id", toDelete.id);
    await supabase.from("product_documents").delete().eq("product_id", toDelete.id);
    await supabase.from("quote_request_items").update({ product_id: null }).eq("product_id", toDelete.id);
    const { error } = await supabase.from("products").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit", { _action: "delete", _table: "products", _record_id: toDelete.id, _old: { code: toDelete.code, name: toDelete.name } as any, _new: null as any });
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
    setToDelete(null);
    load();
  };

  const docUrls = (p: Product) => {
    const docs = (p.product_documents || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((d) => d.file_url);
    if (docs.length) return docs.join(" | ");
    return p.datasheet_url || "";
  };
  const imageUrls = (p: Product) =>
    (p.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url).join(" | ");

  const exportCsv = () => {
    const headers = ["code", "shakkel_ref", "name", "brand", "category", "unit", "min_order_qty", "stock_qty", "low_stock_threshold", "is_active", "datasheet_url", "image_urls", "description"];
    const data = filtered.map((p) => [
      p.code, p.shakkel_ref || "", p.name, p.brands?.name || "",
      cats.find((c) => c.id === p.category_id)?.name || "",
      p.unit, p.min_order_qty, p.stock_qty, p.low_stock_threshold,
      p.is_active, docUrls(p), imageUrls(p), p.description || "",
    ]);
    downloadCsv(`products-${Date.now()}.csv`, toCsv(headers, data));
  };

  const load = async () => {
    setLoading(true);
    const [p, b, c] = await Promise.all([
      supabase.from("products").select("*, brands(name), product_images(image_url,sort_order), product_documents(file_url,file_name,sort_order)").order("created_at", { ascending: false }),
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setRows(((p.data as any) || []) as Product[]);
    setBrands((b.data as Brand[]) || []);
    setCats((c.data as Cat[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setPendingImages([]); setPendingDocs([]); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({
      id: p.id, code: p.code,
      name_ar: p.name_ar || p.name || "",
      name_en: p.name_en || p.name || "",
      description_ar: p.description_ar || p.description || "",
      description_en: p.description_en || p.description || "",
      long_description_ar: p.long_description_ar || p.long_description || "",
      long_description_en: p.long_description_en || p.long_description || "",
      brand_id: p.brand_id || "", category_id: p.category_id || "",
      unit: p.unit, min_order_qty: p.min_order_qty, stock_qty: p.stock_qty,
      low_stock_threshold: p.low_stock_threshold,
      is_active: p.is_active, datasheet_url: p.datasheet_url || "",
      shakkel_ref: p.shakkel_ref || "",
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      specs_ar: Array.isArray(p.specs_ar) && p.specs_ar.length ? (p.specs_ar as Spec[]) : (Array.isArray(p.specs) ? (p.specs as Spec[]) : []),
      specs_en: Array.isArray(p.specs_en) && p.specs_en.length ? (p.specs_en as Spec[]) : (Array.isArray(p.specs) ? (p.specs as Spec[]) : []),
    });
    setPendingImages([]); setPendingDocs([]);
    setOpen(true);
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const submit = async () => {
    const nameAr = form.name_ar.trim();
    const nameEn = form.name_en.trim();
    if (!form.code.trim()) return toast.error(lang === "ar" ? "الكود مطلوب" : "Code required");
    if (!nameAr || !nameEn) return toast.error(lang === "ar" ? "اسم المنتج مطلوب بالعربي والإنجليزي" : "Product name required in both Arabic and English");
    if (form.min_order_qty < 1) return toast.error(lang === "ar" ? "أقل كمية يجب أن تكون ١ على الأقل" : "Min order ≥ 1");
    if (form.stock_qty < 0) return toast.error(lang === "ar" ? "المخزون لا يمكن أن يكون سالبًا" : "Stock can't be negative");

    setSaving(true);
    try {
      const cleanedHighlights = form.highlights.map((h) => h.trim()).filter(Boolean).slice(0, 12);
      const cleanSpecs = (arr: Spec[]) => arr
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        .filter((s) => s.label || s.value);
      const cleanedSpecsAr = cleanSpecs(form.specs_ar);
      const cleanedSpecsEn = cleanSpecs(form.specs_en);

      const descAr = form.description_ar.trim();
      const descEn = form.description_en.trim();
      const longAr = form.long_description_ar.trim();
      const longEn = form.long_description_en.trim();

      const payload: any = {
        code: form.code.trim(),
        // Legacy single-language columns kept in sync (prefer AR, fallback EN) for backward compatibility
        name: nameAr || nameEn,
        description: (descAr || descEn) || null,
        long_description: (longAr || longEn) || null,
        specs: cleanedSpecsAr.length ? cleanedSpecsAr : cleanedSpecsEn,
        // Bilingual columns
        name_ar: nameAr,
        name_en: nameEn,
        description_ar: descAr || null,
        description_en: descEn || null,
        long_description_ar: longAr || null,
        long_description_en: longEn || null,
        specs_ar: cleanedSpecsAr,
        specs_en: cleanedSpecsEn,
        highlights: cleanedHighlights,
        brand_id: form.brand_id || null,
        category_id: form.category_id || null,
        unit: form.unit.trim() || "pcs",
        min_order_qty: Number(form.min_order_qty) || 1,
        stock_qty: Number(form.stock_qty) || 0,
        low_stock_threshold: Math.max(0, Number(form.low_stock_threshold) || 0),
        is_active: form.is_active,
        status: (form.is_active ? "active" : "inactive") as "active" | "inactive",
        datasheet_url: form.datasheet_url || null,
      };

      let productId = form.id;
      let createdShakkel: string | null = form.shakkel_ref || null;
      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
        await supabase.rpc("log_audit", { _action: "update", _table: "products", _record_id: form.id, _old: null as any, _new: payload as any });
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id,shakkel_ref").single();
        if (error) throw error;
        productId = data.id;
        createdShakkel = (data as any).shakkel_ref;
        await supabase.rpc("log_audit", { _action: "create", _table: "products", _record_id: productId, _old: null as any, _new: payload as any });
      }

      // Upload pending images
      if (pendingImages.length && productId) {
        let order = 0;
        // For edits, append after existing
        if (form.id) {
          const { data: existing } = await supabase.from("product_images").select("sort_order").eq("product_id", productId);
          order = (existing || []).length ? Math.max(...(existing as any).map((x: any) => x.sort_order)) + 1 : 0;
        }
        for (const file of pendingImages) {
          const url = await uploadToBucket("product-images", file, productId);
          const { error } = await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: order++ });
          if (error) throw error;
        }
      }

      // Upload pending documents
      if (pendingDocs.length && productId) {
        let order = 0;
        if (form.id) {
          const { data: existing } = await supabase.from("product_documents").select("sort_order").eq("product_id", productId);
          order = (existing || []).length ? Math.max(...(existing as any).map((x: any) => x.sort_order)) + 1 : 0;
        }
        for (const { file, name } of pendingDocs) {
          const url = await uploadToBucket("product-documents", file, productId);
          const { error } = await supabase.from("product_documents").insert({
            product_id: productId, file_url: url,
            file_name: (name || stripExt(file.name)).trim() || "document",
            mime_type: file.type || null, size_bytes: file.size, sort_order: order++,
          });
          if (error) throw error;
        }
      }

      toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
      if (createdShakkel) setForm((f) => ({ ...f, id: productId!, shakkel_ref: createdShakkel! }));
      setPendingImages([]); setPendingDocs([]);
      // Keep dialog open on create so admin can see Shakkel ref and manage media
      if (!form.id) {
        // refresh id state but stay open
      } else {
        setOpen(false);
      }
      load();
    } catch (e: any) {
      const msg = e.message || "Error";
      toast.error(msg.includes("duplicate") || msg.includes("unique") ? (lang === "ar" ? "كود المنتج موجود مسبقًا" : "Product code already exists") : msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.code.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || (p.shakkel_ref || "").toLowerCase().includes(s);
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.products}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 me-1.5" /> CSV</Button>
          <Button variant="outline" onClick={() => exportXlsx(`products-${Date.now()}.xlsx`, [{
            name: "Products",
            rows: filtered.map((p) => ({
              code: p.code, shakkel_ref: p.shakkel_ref || "", name: p.name, brand: p.brands?.name || "",
              category: cats.find((c) => c.id === p.category_id)?.name || "",
              unit: p.unit, min_order_qty: p.min_order_qty, stock_qty: p.stock_qty,
              low_stock_threshold: p.low_stock_threshold, is_active: p.is_active,
              datasheet_url: docUrls(p), image_urls: imageUrls(p), description: p.description || "",
            })),
          }])}><Download className="h-4 w-4 me-1.5" /> Excel</Button>
          <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 me-1.5" /> {t.admin.addProduct}</Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, Shakkel ref or name…" className="ps-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Image</th>
                  <th className="px-5 py-3">{t.products.code}</th>
                  <th className="px-5 py-3">Shakkel Ref</th>
                  <th className="px-5 py-3">{t.admin.name}</th>
                  <th className="px-5 py-3">{t.products.brand}</th>
                  <th className="px-5 py-3">{t.products.stock}</th>
                  <th className="px-5 py-3">{t.admin.status}</th>
                  <th className="px-5 py-3 text-end">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const img = (p.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        {img ? <img src={img} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold">{p.code}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.shakkel_ref || "—"}</td>
                      <td className="px-5 py-3 font-medium max-w-xs">{p.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.brands?.name || "—"}</td>
                      <td className="px-5 py-3 font-semibold">{p.stock_qty} {p.unit}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={p.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted"}>
                          {p.is_active ? t.admin.active : t.admin.inactive}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1 items-center">
                          <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No products</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? t.admin.edit : t.admin.addProduct}</DialogTitle></DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basic">{lang === "ar" ? "أساسي" : "Basic"}</TabsTrigger>
              <TabsTrigger value="images">{lang === "ar" ? "الصور" : "Images"}</TabsTrigger>
              <TabsTrigger value="docs">{lang === "ar" ? "المستندات" : "Documents"}</TabsTrigger>
              <TabsTrigger value="details">{lang === "ar" ? "التفاصيل" : "Details"}</TabsTrigger>
              <TabsTrigger value="specs">{lang === "ar" ? "المواصفات" : "Specs"}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t.products.code} *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={60} /></div>
                <div>
                  <Label>Shakkel Ref</Label>
                  <Input value={form.shakkel_ref} readOnly disabled placeholder={lang === "ar" ? "يُولَّد تلقائيًا عند الحفظ" : "auto-generated on save"} className="font-mono text-xs bg-secondary/40" />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.admin.name} (العربية) *</Label>
                    <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={160} dir="rtl" />
                  </div>
                  <div>
                    <Label>{t.admin.name} (English) *</Label>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} maxLength={160} dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label>{t.products.brand}</Label>
                  <Select value={form.brand_id || "none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.products.category}</Label>
                  <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t.products.unit}</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>{t.products.moq}</Label><Input type="number" min={1} value={form.min_order_qty} onChange={(e) => setForm({ ...form, min_order_qty: Number(e.target.value) })} /></div>
                <div><Label>{t.products.stock}</Label><Input type="number" min={0} value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: Number(e.target.value) })} /></div>
                <div><Label>{lang === "ar" ? "حد المخزون المنخفض" : "Low stock threshold"}</Label><Input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} /></div>
                <div className="flex items-end justify-between col-span-2"><Label>{t.admin.active}</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="mt-4">
              {form.id ? (
                <ProductImagesEditor productId={form.id} lang={lang} onChanged={load} />
              ) : (
                <PendingImagesPicker files={pendingImages} onChange={setPendingImages} lang={lang} />
              )}
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              {form.id ? (
                <ProductDocumentsEditor productId={form.id} lang={lang} onChanged={load} />
              ) : (
                <PendingDocumentsPicker files={pendingDocs} onChange={setPendingDocs} lang={lang} />
              )}
              {form.datasheet_url && (
                <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {lang === "ar" ? "ملف Datasheet القديم:" : "Legacy datasheet:"} <a href={form.datasheet_url} target="_blank" rel="noreferrer" className="text-accent underline">{lang === "ar" ? "عرض" : "Open"}</a>
                </p>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-5">
              <HighlightsEditor value={form.highlights} onChange={(h) => setForm({ ...form, highlights: h })} lang={lang} />
              <Tabs defaultValue="ar" className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="ar" className="mt-3 space-y-4" dir="rtl">
                  <div>
                    <Label>ملخص قصير</Label>
                    <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} maxLength={500} />
                  </div>
                  <div>
                    <Label>الوصف الطويل (اختياري)</Label>
                    <Textarea value={form.long_description_ar} onChange={(e) => setForm({ ...form, long_description_ar: e.target.value })} rows={6} maxLength={5000} />
                  </div>
                </TabsContent>
                <TabsContent value="en" className="mt-3 space-y-4" dir="ltr">
                  <div>
                    <Label>Summary</Label>
                    <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} maxLength={500} />
                  </div>
                  <div>
                    <Label>Long description (optional)</Label>
                    <Textarea value={form.long_description_en} onChange={(e) => setForm({ ...form, long_description_en: e.target.value })} rows={6} maxLength={5000} />
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="specs" className="mt-4">
              <Tabs defaultValue="ar" className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="ar" className="mt-3" dir="rtl">
                  <SpecsEditor value={form.specs_ar} onChange={(s) => setForm({ ...form, specs_ar: s })} lang="ar" />
                </TabsContent>
                <TabsContent value="en" className="mt-3" dir="ltr">
                  <SpecsEditor value={form.specs_en} onChange={(s) => setForm({ ...form, specs_en: s })} lang="en" />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

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
              <strong>{toDelete?.name}</strong> ({toDelete?.code}) — {t.deleteDialog.productWarn} {t.deleteDialog.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={removeProduct} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminProducts;
