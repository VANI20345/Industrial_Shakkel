import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, ImageIcon } from "lucide-react";

type Img = { image_url: string; sort_order: number };

export const ProductGallery = ({ images, alt }: { images: Img[]; alt: string }) => {
  const sorted = images.slice().sort((a, b) => a.sort_order - b.sort_order);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => { setActiveIdx(0); }, [images.length]);

  const main = sorted[activeIdx]?.image_url;
  const visibleCount = Math.min(5, sorted.length);
  const overflowCount = sorted.length > 5 ? sorted.length - 5 : 0;

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const nav = (delta: number) => {
    if (lightboxIdx == null) return;
    setLightboxIdx((lightboxIdx + delta + sorted.length) % sorted.length);
  };

  useEffect(() => {
    if (lightboxIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nav(1);
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden bg-secondary/30 aspect-square flex items-center justify-center">
        {main ? (
          <button type="button" onClick={() => openLightbox(activeIdx)} className="w-full h-full">
            <img src={main} alt={alt} loading="eager" decoding="async" className="w-full h-full object-cover" />
          </button>
        ) : (
          <ImageIcon className="h-20 w-20 text-muted-foreground/40" />
        )}
      </Card>

      {sorted.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {sorted.slice(0, visibleCount).map((im, idx) => {
            const isOverflowTile = idx === 4 && overflowCount > 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => isOverflowTile ? openLightbox(4) : setActiveIdx(idx)}
                className={`relative aspect-square rounded-md overflow-hidden border-2 transition-base ${activeIdx === idx && !isOverflowTile ? "border-primary" : "border-border hover:border-primary/40"}`}
                aria-label={isOverflowTile ? `View all ${sorted.length} images` : `View image ${idx + 1}`}
              >
                <img src={im.image_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                {isOverflowTile && (
                  <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white font-bold text-lg">
                    +{overflowCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={lightboxIdx !== null} onOpenChange={(o) => !o && closeLightbox()}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black/95 border-0">
          {lightboxIdx !== null && (
            <div className="relative">
              <img
                src={sorted[lightboxIdx].image_url}
                alt={`${alt} ${lightboxIdx + 1}/${sorted.length}`}
                className="w-full max-h-[85vh] object-contain"
              />
              <Button variant="ghost" size="icon" onClick={closeLightbox} className="absolute top-2 end-2 text-white hover:bg-white/20 z-10">
                <X className="h-5 w-5" />
              </Button>
              {sorted.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => nav(-1)} className="absolute top-1/2 -translate-y-1/2 start-2 text-white hover:bg-white/20 h-12 w-12">
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => nav(1)} className="absolute top-1/2 -translate-y-1/2 end-2 text-white hover:bg-white/20 h-12 w-12">
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-xs font-mono bg-black/60 px-3 py-1 rounded-full">
                    {lightboxIdx + 1} / {sorted.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
