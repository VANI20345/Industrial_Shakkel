import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { Upload, FileDown, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { parseCsv, rowsToObjects, toCsv, downloadCsv, slugify } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  product_code: string; product_name: string; brand: string; category: string;
  description: string; long_description: string; highlights: string;
  specs: string; unit: string; min_order_qty: string; stock_qty: string;
  low_stock_threshold: string; status: string; is_active: string;
  datasheet_url: string; image_urls: string;
};
type ParsedRow = Row & { __errors: string[]; __action: "create" | "update" | "skip" };

const REQUIRED = ["product_code", "product_name"];
const KNOWN = [
  "product_code","product_name","brand","category","description","long_description",
  "highlights","specs","unit","min_order_qty","stock_qty","low_stock_threshold",
  "status","is_active","datasheet_url","image_urls",
];

const TEMPLATE = toCsv(KNOWN, [[
  "PROD-001","Sample product","BrandName","Category Name",
  "Short description","Long marketing description",
  "Durable build|Energy efficient|2 year warranty",
  "Voltage=220V|Weight=3.4kg|Color=Black",
  "pcs","1","10","5","active","true","",
  "https://example.com/img1.jpg|https://example.com/img2.jpg",
]]);

const AdminImport = () => {
  const { lang } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const validate = async (objs: Row[]): Promise<ParsedRow[]> => {
    // Pre-fetch existing codes for create/update detection
    const codes = objs.map((o) => o.product_code).filter(Boolean);
    const { data: existing } = await supabase.from("products").select("code").in("code", codes.length ? codes : ["__none__"]);
    const existingSet = new Set((existing || []).map((p: any) => p.code));
    const seen = new Set<string>();
    return objs.map((r) => {
      const errs: string[] = [];
      const code = (r.product_code || "").trim();
      if (!code) errs.push("product_code required");
      if (!(r.product_name || "").trim()) errs.push("product_name required");
      if (code && seen.has(code)) errs.push("duplicate product_code in file");
      if (code) seen.add(code);
      if (r.min_order_qty && Number.isNaN(Number(r.min_order_qty))) errs.push("min_order_qty must be a number");
      if (r.stock_qty && Number.isNaN(Number(r.stock_qty))) errs.push("stock_qty must be a number");
      if (r.low_stock_threshold && Number.isNaN(Number(r.low_stock_threshold))) errs.push("low_stock_threshold must be a number");
      if (r.status && !["active", "inactive"].includes(r.status.toLowerCase())) errs.push("status must be active|inactive");
      const action: ParsedRow["__action"] = errs.length ? "skip" : (existingSet.has(code) ? "update" : "create");
      return { ...r, __errors: errs, __action: action } as ParsedRow;
    });
  };

  const onFile = async (f: File) => {
    setFile(f); setDone(null); setRows([]);
    setParsing(true);
    try {
      const text = await f.text();
      const { headers: h, rows: rawRows } = parseCsv(text);
      const missing = REQUIRED.filter((k) => !h.includes(k));
      if (missing.length) { toast.error(`Missing required columns: ${missing.join(", ")}`); setParsing(false); return; }
      setHeaders(h);
      const objs = rowsToObjects<Row>(h, rawRows);
      const validated = await validate(objs);
      setRows(validated);
    } catch (e: any) {
      toast.error(e?.message || "Failed to parse CSV");
    } finally {
      setParsing(false);
    }
  };

  const ensureBrand = async (name: string, cache: Map<string, string>): Promise<string | null> => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key)!;
    const slug = slugify(name);
    const { data: existing } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
    if (existing) { cache.set(key, existing.id); return existing.id; }
    const { data, error } = await supabase.from("brands").insert({ name: name.trim(), slug }).select("id").single();
    if (error) throw error;
    cache.set(key, data.id);
    return data.id;
  };
  const ensureCategory = async (name: string, cache: Map<string, string>): Promise<string | null> => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key)!;
    const slug = slugify(name);
    const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (existing) { cache.set(key, existing.id); return existing.id; }
    const { data, error } = await supabase.from("categories").insert({ name: name.trim(), slug }).select("id").single();
    if (error) throw error;
    cache.set(key, data.id);
    return data.id;
  };

  const runImport = async () => {
    setImporting(true);
    let created = 0, updated = 0, failed = 0;
    const brandCache = new Map<string, string>();
    const catCache = new Map<string, string>();
    for (const r of rows) {
      if (r.__action === "skip") continue;
      try {
        const brand_id = r.brand ? await ensureBrand(r.brand, brandCache) : null;
        const category_id = r.category ? await ensureCategory(r.category, catCache) : null;
        const isActive = r.is_active ? !["false","0","no"].includes(r.is_active.toLowerCase()) : true;
        const status = (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";

        // Highlights: pipe-separated
        const highlights = (r.highlights || "")
          .split("|").map((h) => h.trim()).filter(Boolean).slice(0, 12);
        // Specs: "Label=Value|Label=Value"
        const specs = (r.specs || "").split("|").map((kv) => {
          const idx = kv.indexOf("=");
          if (idx < 0) return null;
          const label = kv.slice(0, idx).trim();
          const value = kv.slice(idx + 1).trim();
          if (!label && !value) return null;
          return { label, value };
        }).filter(Boolean);

        const payload: any = {
          code: r.product_code.trim(),
          name: r.product_name.trim(),
          description: r.description?.trim() || null,
          long_description: r.long_description?.trim() || null,
          highlights,
          specs,
          brand_id, category_id,
          unit: r.unit?.trim() || "pcs",
          min_order_qty: Number(r.min_order_qty) || 1,
          stock_qty: Number(r.stock_qty) || 0,
          low_stock_threshold: Number(r.low_stock_threshold) || 10,
          status,
          is_active: isActive,
          datasheet_url: r.datasheet_url?.trim() || null,
        };

        let productId: string;
        if (r.__action === "create") {
          const { data, error } = await supabase.from("products").insert(payload).select("id").single();
          if (error) throw error;
          productId = data.id;
          await supabase.rpc("log_audit", { _action: "create", _table: "products", _record_id: r.product_code, _new: payload });
          created++;
        } else {
          const { data: prod } = await supabase.from("products").select("id").eq("code", r.product_code).maybeSingle();
          if (!prod) throw new Error("Product disappeared mid-import");
          productId = prod.id;
          const { error } = await supabase.from("products").update(payload).eq("id", prod.id);
          if (error) throw error;
          await supabase.rpc("log_audit", { _action: "update", _table: "products", _record_id: r.product_code, _new: payload });
          updated++;
        }

        // Image URLs: pipe-separated. Insert as product_images rows (URL references).
        const imageUrls = (r.image_urls || "").split("|").map((u) => u.trim()).filter(Boolean);
        if (imageUrls.length && productId) {
          const { data: existing } = await supabase.from("product_images").select("sort_order").eq("product_id", productId);
          let order = (existing || []).length ? Math.max(...(existing as any).map((x: any) => x.sort_order)) + 1 : 0;
          const inserts = imageUrls.map((url) => ({ product_id: productId, image_url: url, sort_order: order++ }));
          await supabase.from("product_images").insert(inserts);
        }
      } catch (e: any) {
        failed++;
        r.__errors = [...(r.__errors || []), e?.message || "Failed"];
        r.__action = "skip";
      }
    }
    setRows([...rows]);
    setImporting(false);
    setDone({ created, updated, failed });
    toast.success(lang === "ar" ? `إنشاء ${created} • تحديث ${updated} • فشل ${failed}` : `Created ${created} • Updated ${updated} • Failed ${failed}`);
  };

  const summary = {
    total: rows.length,
    create: rows.filter((r) => r.__action === "create").length,
    update: rows.filter((r) => r.__action === "update").length,
    errors: rows.filter((r) => r.__errors.length > 0).length,
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{lang === "ar" ? "استيراد منتجات CSV" : "Bulk Import CSV"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {lang === "ar" ? "ارفع ملف CSV لإضافة أو تحديث المنتجات. المفتاح: product_code." : "Upload a CSV to add or update products. Primary key: product_code."}
        </p>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold mb-1">{lang === "ar" ? "الحقول المدعومة" : "Supported columns"}</p>
            <p className="text-xs text-muted-foreground font-mono">{KNOWN.join(", ")}</p>
          </div>
          <Button variant="outline" onClick={() => downloadCsv("products-template.csv", TEMPLATE)}>
            <FileDown className="h-4 w-4 me-1.5" /> {lang === "ar" ? "نموذج CSV" : "Download template"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="max-w-sm" />
          {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
          {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
        </div>
      </Card>

      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3 flex-wrap">
            <Badge variant="outline">{lang === "ar" ? "إجمالي" : "Total"}: {summary.total}</Badge>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">{lang === "ar" ? "جديد" : "Create"}: {summary.create}</Badge>
            <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/40">{lang === "ar" ? "تحديث" : "Update"}: {summary.update}</Badge>
            {summary.errors > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{lang === "ar" ? "أخطاء" : "Errors"}: {summary.errors}</Badge>}
            <div className="ms-auto">
              <Button onClick={runImport} disabled={importing || summary.create + summary.update === 0} className="bg-gradient-primary">
                {importing ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <Upload className="h-4 w-4 me-1.5" />}
                {lang === "ar" ? "تنفيذ الاستيراد" : "Run import"}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">{lang === "ar" ? "الحالة" : "Action"}</th>
                  {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-mono">{h}</th>)}
                  <th className="px-3 py-2 text-left">{lang === "ar" ? "الأخطاء" : "Errors"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className={r.__errors.length ? "bg-destructive/5" : ""}>
                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2">
                      {r.__action === "create" ? <Badge variant="outline" className="bg-success/10 text-success border-success/30">{lang === "ar" ? "جديد" : "Create"}</Badge>
                        : r.__action === "update" ? <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/40">{lang === "ar" ? "تحديث" : "Update"}</Badge>
                        : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{lang === "ar" ? "تجاوز" : "Skip"}</Badge>}
                    </td>
                    {headers.map((h) => <td key={h} className="px-3 py-2 max-w-[160px] truncate font-mono">{(r as any)[h]}</td>)}
                    <td className="px-3 py-2 text-destructive text-[11px] max-w-[200px]">
                      {r.__errors.length > 0 && <span className="inline-flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" /> {r.__errors.join(", ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {done && (
            <div className="p-4 border-t bg-success/5 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {lang === "ar"
                ? `تم: إنشاء ${done.created} • تحديث ${done.updated} • فشل ${done.failed}`
                : `Done: created ${done.created} • updated ${done.updated} • failed ${done.failed}`}
            </div>
          )}
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminImport;
