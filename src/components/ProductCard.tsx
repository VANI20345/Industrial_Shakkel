import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ImageIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuote } from "@/contexts/QuoteContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DBProduct, stockState } from "@/hooks/useCatalog";
import { productName } from "@/lib/i18nProduct";

const FIRST_DELAY_MS = 800;
const ROTATE_MS = 2500;

export const ProductCard = ({ product }: { product: DBProduct }) => {
  const { t, lang } = useI18n();
  const { add, has } = useQuote();
  const status = stockState(product);
  const inQuote = has(product.id);
  const name = productName(product, lang);

  const sortedImgs = useMemo(
    () => (product.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [product.product_images],
  );
  const [imgIdx, setImgIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const startRotate = () => {
    if (sortedImgs.length <= 1 || intervalRef.current || timeoutRef.current) return;
    timeoutRef.current = window.setTimeout(() => {
      setImgIdx((i) => (i + 1) % sortedImgs.length);
      intervalRef.current = window.setInterval(() => {
        setImgIdx((i) => (i + 1) % sortedImgs.length);
      }, ROTATE_MS);
      timeoutRef.current = null;
    }, FIRST_DELAY_MS);
  };
  const stopRotate = () => {
    clearTimers();
    setImgIdx(0);
  };
  useEffect(() => () => clearTimers(), []);

  const currentImg = sortedImgs[imgIdx]?.image_url;

  const statusConfig = {
    in: { label: t.products.inStock, cls: "bg-success/10 text-success border-success/30" },
    low: { label: t.products.lowStock, cls: "bg-warning/15 text-warning-foreground border-warning/40" },
    out: { label: t.products.outOfStock, cls: "bg-destructive/10 text-destructive border-destructive/30" },
  }[status];

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (status === "out") return;
    add(product.id, product.min_order_qty);
    toast.success(t.products.added, { description: name });
  };

  return (
    <Card
      className="group overflow-hidden flex flex-col transition-base hover:shadow-glow hover:-translate-y-0.5"
      onMouseEnter={startRotate}
      onMouseLeave={stopRotate}
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary/40 flex items-center justify-center">
          {currentImg ? (
            <>
              {sortedImgs.map((im, idx) => (
                <img
                  key={im.image_url}
                  src={im.image_url}
                  alt={idx === 0 ? name : ""}
                  loading={idx === 0 ? "lazy" : "lazy"}
                  decoding="async"
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                    idx === imgIdx ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}
              {sortedImgs.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {sortedImgs.map((_, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        idx === imgIdx ? "bg-white" : "bg-white/40",
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          )}
          <div className="absolute top-3 start-3">
            <Badge variant="outline" className={cn("border", statusConfig.cls)}>{statusConfig.label}</Badge>
          </div>
          {product.brands && (
            <div className="absolute top-3 end-3">
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-card/90 backdrop-blur border border-border text-foreground">
                {product.brands.name}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/70 border border-border mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t.products.ref}</span>
            <span className="text-xs font-mono font-bold text-foreground">{product.code}</span>
          </div>
          <Link to={`/products/${product.id}`}>
            <h3 className="font-semibold leading-snug line-clamp-2 hover:text-primary transition-base">
              {name}
            </h3>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mt-auto pt-3 border-t border-border">
          <div>
            <span className="text-muted-foreground block">{t.products.availability}</span>
            <span className="font-semibold">{statusConfig.label}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t.products.moq}</span>
            <span className="font-semibold">{product.min_order_qty} {product.unit}</span>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={status === "out" || inQuote}
          variant={inQuote ? "secondary" : "default"}
          size="sm"
          className={cn("w-full", !inQuote && status !== "out" && "bg-gradient-primary hover:opacity-95")}
        >
          {inQuote ? <><Check className="h-4 w-4 me-1.5" /> {t.products.added}</> : <><Plus className="h-4 w-4 me-1.5" /> {t.products.addToQuote}</>}
        </Button>
      </div>
    </Card>
  );
};
