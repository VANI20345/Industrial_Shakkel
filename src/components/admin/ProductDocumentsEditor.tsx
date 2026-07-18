import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, FileText, FileSpreadsheet, FileImage, File as FileIcon, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALLOWED_DOCUMENT, MAX_DOC_BYTES, uploadToBucket } from "@/lib/storage";

type Doc = { id: string; file_url: string; file_name: string; mime_type: string | null; size_bytes: number | null; sort_order: number };

export const docIcon = (mime: string | null) => {
  if (!mime) return FileIcon;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  if (mime.startsWith("image/")) return FileImage;
  return FileIcon;
};

export const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

export const ProductDocumentsEditor = ({
  productId, lang, onChanged,
}: { productId: string; lang: "ar" | "en"; onChanged?: () => void }) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_documents")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setDocs((data as Doc[]) || []);
    setLoading(false);
  };
  useEffect(() => { if (productId) load(); }, [productId]);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    setUploading(true);
    try {
      let order = docs.length ? Math.max(...docs.map((d) => d.sort_order)) + 1 : 0;
      for (const file of arr) {
        if (!ALLOWED_DOCUMENT.includes(file.type)) { toast.error(`${file.name}: ${lang === "ar" ? "نوع غير مدعوم" : "Type not supported"}`); continue; }
        if (file.size > MAX_DOC_BYTES) { toast.error(`${file.name}: > 15MB`); continue; }
        const url = await uploadToBucket("product-documents", file, productId);
        const { error } = await supabase.from("product_documents").insert({
          product_id: productId, file_url: url, file_name: stripExt(file.name),
          mime_type: file.type || null, size_bytes: file.size, sort_order: order++,
        });
        if (error) throw error;
      }
      await load();
      onChanged?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const rename = async (id: string, name: string) => {
    setDocs((d) => d.map((x) => x.id === id ? { ...x, file_name: name } : x));
  };
  const saveName = async (d: Doc) => {
    await supabase.from("product_documents").update({ file_name: d.file_name.trim() || "document" }).eq("id", d.id);
    onChanged?.();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("product_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load(); onChanged?.();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...docs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDocs(next);
    await Promise.all(next.map((d, i) => supabase.from("product_documents").update({ sort_order: i }).eq("id", d.id)));
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{lang === "ar" ? "إضافة ملفات داتا شيت" : "Add datasheets"} (PDF/DOC/XLS/Images, ≤15MB)</Label>
        <Input
          type="file" multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={uploading}
          onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
          className="mt-1.5"
        />
        {uploading && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {lang === "ar" ? "جارٍ الرفع…" : "Uploading…"}</p>}
      </div>

      {loading ? (
        <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : docs.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border border-dashed rounded text-sm">
          {lang === "ar" ? "لا توجد ملفات داتا شيت" : "No datasheets"}
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d, idx) => {
            const Icon = docIcon(d.mime_type);
            return (
              <li key={d.id} className="flex items-center gap-2 border border-border rounded p-2 bg-card">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={d.file_name}
                  onChange={(e) => rename(d.id, e.target.value)}
                  onBlur={() => saveName(d)}
                  className="h-8 flex-1"
                />
                <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline shrink-0">{lang === "ar" ? "عرض" : "Open"}</a>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === docs.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** Pending picker (pre-insert) */
export const PendingDocumentsPicker = ({
  files, onChange, lang,
}: { files: { file: File; name: string }[]; onChange: (f: { file: File; name: string }[]) => void; lang: "ar" | "en" }) => {
  return (
    <div className="space-y-2">
      <Label>{lang === "ar" ? "ملفات الداتا شيت للمنتج" : "Product datasheets"} (PDF/DOC/XLS/Images, ≤15MB)</Label>
      <Input
        type="file" multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => onChange([...(files || []), ...Array.from(e.target.files || []).map((f) => ({ file: f, name: stripExt(f.name) }))])}
      />
      {files.length > 0 && (
        <ul className="text-xs space-y-1 mt-1">
          {files.map((f, i) => {
            const Icon = docIcon(f.file.type);
            return (
              <li key={i} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={f.name}
                  onChange={(e) => {
                    const next = [...files]; next[i] = { ...next[i], name: e.target.value }; onChange(next);
                  }}
                  className="h-7 text-xs flex-1"
                />
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(files.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
