import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ImageIcon, Plus } from "lucide-react";
import { useQuote } from "@/contexts/QuoteContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DBProduct, productPrimaryImage, stockState } from "@/hooks/useCatalog";
import { productName } from "@/lib/i18nProduct";

export const ProductCard = ({ product }: { product: DBProduct }) => {
  const { t, lang } = useI18n();
  const { add, has } = useQuote();
  const status = stockState(product);
  const inQuote = has(product.id);
  const img = productPrimaryImage(product);
  const name = productName(product, lang);

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
    <Card className="group overflow-hidden flex flex-col transition-base hover:shadow-glow hover:-translate-y-0.5">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary/40 flex items-center justify-center">
          {img ? (
            <img
              src={img}
              alt={name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
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
          <p className="text-xs font-mono text-muted-foreground mb-1">{product.code}</p>
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
