import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ArrowUp, ArrowDown, Star, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { ALLOWED_PRODUCT_IMAGE, MAX_IMAGE_BYTES, uploadToBucket } from "@/lib/storage";

type Img = { id: string; image_url: string; sort_order: number };

export const ProductImagesDialog = ({
  productId, open, onOpenChange, onChanged,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) => {
  const { t, lang } = useI18n();
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!productId) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_images")
      .select("id,image_url,sort_order")
      .eq("product_id", productId)
      .order("sort_order");
    setImages((data as Img[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && productId) load(); }, [open, productId]);

  const upload = async (file: File) => {
    if (!productId) return;
    if (!ALLOWED_PRODUCT_IMAGE.includes(file.type)) return toast.error(lang === "ar" ? "صورة غير مدعومة" : "Image format not supported");
    if (file.size > MAX_IMAGE_BYTES) return toast.error(lang === "ar" ? "الصورة أكبر من 5MB" : "Image > 5MB");
    setUploading(true);
    try {
      const url = await uploadToBucket("product-images", file, productId);
      const nextOrder = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
      const { error } = await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: nextOrder });
      if (error) throw error;
      toast.success(lang === "ar" ? "تم الرفع" : "Uploaded");
      await load();
      onChanged?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t.productImages.removed);
    await load();
    onChanged?.();
  };

  const reorder = async (newList: Img[]) => {
    setImages(newList);
    // persist sort_order
    await Promise.all(newList.map((im, idx) =>
      supabase.from("product_images").update({ sort_order: idx }).eq("id", im.id)
    ));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.productImages.title}</DialogTitle></DialogHeader>

        <div className="mb-4">
          <Label>{t.productImages.upload} (PNG/JPG/WEBP, max 5MB)</Label>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            className="mt-1.5"
          />
          {uploading && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {lang === "ar" ? "جارٍ الرفع…" : "Uploading…"}</p>}
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : images.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t.productImages.empty}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((im, idx) => (
              <div key={im.id} className="relative group border border-border rounded-md overflow-hidden">
                <img src={im.image_url} alt="" className="w-full aspect-square object-cover" />
                {idx === 0 && (
                  <Badge className="absolute top-1.5 start-1.5 bg-primary text-primary-foreground border-0 text-[10px]">
                    <Star className="h-3 w-3 me-1" /> {t.productImages.primary}
                  </Badge>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur p-1.5 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-base">
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => move(idx, -1)} disabled={idx === 0} title={t.productImages.moveUp}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => move(idx, 1)} disabled={idx === images.length - 1} title={t.productImages.moveDown}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    {idx !== 0 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => makePrimary(idx)} title={t.productImages.makePrimary}>
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={() => remove(im.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
