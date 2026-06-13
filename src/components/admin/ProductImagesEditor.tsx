import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ArrowUp, ArrowDown, Star, ImageIcon, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALLOWED_PRODUCT_IMAGE, MAX_IMAGE_BYTES, uploadToBucket } from "@/lib/storage";

type Img = { id: string; image_url: string; sort_order: number };

/**
 * Inline editor for product images. Works only when a productId exists.
 * Use PendingImagesPicker before insert, then call commitPending() after.
 */
export const ProductImagesEditor = ({
  productId,
  onChanged,
  lang,
}: {
  productId: string;
  onChanged?: () => void;
  lang: "ar" | "en";
}) => {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_images")
      .select("id,image_url,sort_order")
      .eq("product_id", productId)
      .order("sort_order");
    setImages((data as Img[]) || []);
    setLoading(false);
  };
  useEffect(() => { if (productId) load(); }, [productId]);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    setUploading(true);
    try {
      let order = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
      for (const file of arr) {
        if (!ALLOWED_PRODUCT_IMAGE.includes(file.type)) { toast.error(`${file.name}: ${lang === "ar" ? "صورة غير مدعومة" : "Format not supported"}`); continue; }
        if (file.size > MAX_IMAGE_BYTES) { toast.error(`${file.name}: > 5MB`); continue; }
        const url = await uploadToBucket("product-images", file, productId);
        const { error } = await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: order++ });
        if (error) throw error;
      }
      await load();
      onChanged?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
    onChanged?.();
  };

  const reorder = async (newList: Img[]) => {
    setImages(newList);
    await Promise.all(newList.map((im, idx) => supabase.from("product_images").update({ sort_order: idx }).eq("id", im.id)));
    onChanged?.();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    reorder(next);
  };

  const makePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    reorder(next);
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch {}
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIdx !== idx) setOverIdx(idx);
  };
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIdx;
    setDragIdx(null); setOverIdx(null);
    if (from == null || from === idx) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    reorder(next);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="space-y-3">
      <div>
        <Label>{lang === "ar" ? "إضافة صور" : "Add images"} (PNG/JPG/WEBP/SVG/AVIF, ≤5MB)</Label>
        <Input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
          disabled={uploading}
          onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
          className="mt-1.5"
        />
        {uploading && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {lang === "ar" ? "جارٍ الرفع…" : "Uploading…"}</p>}
      </div>

      {loading ? (
        <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : images.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border border-dashed rounded">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {lang === "ar" ? "لا توجد صور" : "No images yet"}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "اسحب الصور لإعادة الترتيب" : "Drag images to reorder"}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((im, idx) => (
              <div
                key={im.id}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`relative group border-2 rounded overflow-hidden cursor-grab active:cursor-grabbing transition-base ${
                  dragIdx === idx ? "opacity-40" : ""
                } ${overIdx === idx && dragIdx !== idx ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
              >
                <img src={im.image_url} alt="" className="w-full aspect-square object-cover pointer-events-none" />
                <div className="absolute top-1 end-1 bg-black/60 rounded p-0.5 text-white opacity-0 group-hover:opacity-100">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
                {idx === 0 && (
                  <Badge className="absolute top-1 start-1 bg-primary text-primary-foreground border-0 text-[10px]">
                    <Star className="h-3 w-3 me-1" /> {lang === "ar" ? "رئيسية" : "Primary"}
                  </Badge>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/65 p-1 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-base">
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => move(idx, 1)} disabled={idx === images.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    {idx !== 0 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => makePrimary(idx)}><Star className="h-3 w-3" /></Button>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/20" onClick={() => remove(im.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** Picker shown before insert (no productId yet). Holds File[] in parent state. */
export const PendingImagesPicker = ({
  files, onChange, lang,
}: { files: File[]; onChange: (f: File[]) => void; lang: "ar" | "en" }) => {
  return (
    <div className="space-y-2">
      <Label>{lang === "ar" ? "صور المنتج" : "Product images"} (PNG/JPG/WEBP/SVG/AVIF, ≤5MB)</Label>
      <Input
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
        onChange={(e) => onChange([...(files || []), ...Array.from(e.target.files || [])])}
      />
      {files.length > 0 && (
        <ul className="text-xs space-y-1 mt-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between bg-secondary/50 rounded px-2 py-1">
              <span className="truncate">{i === 0 && <Badge className="me-1 bg-primary text-primary-foreground text-[9px]">{lang === "ar" ? "رئيسية" : "Primary"}</Badge>}{f.name}</span>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(files.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{lang === "ar" ? "أول صورة ستكون الرئيسية. يمكنك إعادة الترتيب بعد الحفظ." : "First image becomes primary. Reorder after saving."}</p>
    </div>
  );
};
