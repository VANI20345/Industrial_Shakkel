import { SiteLayout } from "@/components/layout/SiteLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ChevronLeft, Minus, Plus, Check, FileText, Download } from "lucide-react";
import { useQuote } from "@/contexts/QuoteContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProduct, productPrimaryImage, stockState } from "@/hooks/useCatalog";
import { Seo } from "@/components/Seo";
import { ProductGallery } from "@/components/ProductGallery";
import { docIcon } from "@/components/admin/ProductDocumentsEditor";
import { productName, productDescription, productLongDescription, productSpecs, productHighlights } from "@/lib/i18nProduct";

const ProductDetails = () => {
  const { id } = useParams();
  const { t, dir, lang } = useI18n();
  const navigate = useNavigate();
  const { add } = useQuote();
  const { data: product, loading } = useProduct(id);
  const [qty, setQty] = useState(1);

  useEffect(() => { if (product) setQty(product.min_order_qty); }, [product]);

  if (loading) return <SiteLayout><div className="container-page py-20 text-center">{t.common.loading}</div></SiteLayout>;
  if (!product) return <SiteLayout><div className="container-page py-20 text-center">Product not found.</div></SiteLayout>;

  const status = stockState(product);
  const mainImg = productPrimaryImage(product);
  const docs = (product.product_documents || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const highlights = productHighlights(product, lang);
  const name = productName(product, lang);
  const desc = productDescription(product, lang);
  const longDesc = productLongDescription(product, lang);
  const specs = productSpecs(product, lang);

  const handleAdd = () => {
    if (qty > product.stock_qty) { toast.error(t.products.maxStockError); return; }
    if (qty < product.min_order_qty) { toast.error(t.products.moq + ": " + product.min_order_qty); return; }
    add(product.id, qty);
    toast.success(t.products.added);
    navigate("/quote");
  };

  const availabilitySchema = status === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: name,
    sku: product.code,
    description: (desc || longDesc || undefined),
    image: mainImg || undefined,
    brand: product.brands ? { "@type": "Brand", name: product.brands.name } : undefined,
    category: product.categories?.name || undefined,
    additionalProperty: specs.length
      ? specs.map((s) => ({ "@type": "PropertyValue", name: s.label, value: s.value }))
      : undefined,
    offers: {
      "@type": "Offer",
      availability: availabilitySchema,
      itemCondition: "https://schema.org/NewCondition",
      priceCurrency: "SAR",
      priceSpecification: { "@type": "PriceSpecification", description: "Request for Quotation" },
    },
  };

  const flashScroll = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    }, 1500);
  };

  return (
    <SiteLayout>
      <Seo
        title={`${name} (${product.code})`}
        description={desc?.slice(0, 160) || `${name} — ${product.brands?.name || ""}`}
        image={mainImg || undefined}
        type="product"
        path={`/products/${product.id}`}
        jsonLd={jsonLd}
      />
      <div className="container-page py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ChevronLeft className={`h-4 w-4 me-1 ${dir === "rtl" ? "rotate-180" : ""}`} /> {t.common.back}
        </Button>

        {/* In-page tab navigation */}
        <div className="sticky top-16 z-30 -mx-4 px-4 mb-6 bg-background/80 backdrop-blur border-b border-border">
          <div className="flex gap-1 overflow-x-auto py-2">
            <Button variant="ghost" size="sm" onClick={() => flashScroll("section-product")}>
              {t.products.tabProduct}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => flashScroll("section-details")}>
              {t.products.tabDetails}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => flashScroll("section-specs")}>
              {t.products.tabSpecs}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => flashScroll("section-datasheet")}>
              {t.products.tabDatasheet}
            </Button>
          </div>
        </div>

        <div id="section-product" className="grid lg:grid-cols-2 gap-10 scroll-mt-32 rounded-lg transition-shadow">
          <ProductGallery images={product.product_images || []} alt={name} />

          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {product.brands && <span className="text-sm font-bold px-3 py-1 rounded bg-secondary text-foreground">{product.brands.name}</span>}
              {product.categories && <span className="text-sm text-muted-foreground">{product.categories.name}</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{name}</h1>
            <div className="mt-2 space-y-0.5">
              <p className="font-mono text-sm text-muted-foreground">{t.products.code}: {product.code}</p>
              {product.shakkel_ref && <p className="font-mono text-xs text-muted-foreground">Shakkel Ref: {product.shakkel_ref}</p>}
            </div>

            <div className="mt-5">
              <Badge className={cn(
                "text-sm px-3 py-1 border",
                status === "in" && "bg-success/10 text-success border-success/30 hover:bg-success/15",
                status === "low" && "bg-warning/15 text-warning-foreground border-warning/40",
                status === "out" && "bg-destructive/10 text-destructive border-destructive/30",
              )}>
                {status === "out" ? t.products.outOfStock : status === "in" ? t.products.inStock : t.products.lowStock}
              </Badge>
            </div>

            {desc && <p className="mt-6 text-foreground/80 leading-relaxed whitespace-pre-line">{desc}</p>}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t.products.quantity}</label>
                <div className="flex items-center border border-border rounded-md w-fit">
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-none" onClick={() => setQty(Math.max(product.min_order_qty, qty - 1))}><Minus className="h-4 w-4" /></Button>
                  <Input type="number" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-center border-0 h-11 focus-visible:ring-0 text-base font-semibold" />
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-none" onClick={() => setQty(Math.min(product.stock_qty || qty + 1, qty + 1))}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button size="lg" disabled={status === "out"} onClick={handleAdd} className="flex-1 h-11 bg-gradient-primary hover:opacity-95">
                <Check className="h-4 w-4 me-2" /> {t.products.addToQuote}
              </Button>
            </div>
          </div>
        </div>

        {/* Highlights + long description */}
        {(highlights.length > 0 || longDesc) && (
          <Card id="section-details" className="mt-12 p-6 md:p-8 scroll-mt-32 transition-shadow">
            <h2 className="text-2xl font-extrabold mb-5">{lang === "ar" ? "تفاصيل المنتج" : "Product Details"}</h2>
            {highlights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{lang === "ar" ? "النقاط البارزة" : "Highlights"}</h3>
                <ul className="space-y-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span className="text-foreground/85">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {longDesc && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{lang === "ar" ? "الوصف" : "Description"}</h3>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{longDesc}</p>
              </div>
            )}
          </Card>
        )}

        {/* Specifications */}
        <Card id="section-specs" className="mt-8 p-6 md:p-8 overflow-hidden scroll-mt-32 transition-shadow">
          <h2 className="text-2xl font-extrabold mb-5">{t.products.tabSpecs}</h2>
          {specs.length > 0 ? (
            <div className="overflow-x-auto -mx-6 md:-mx-8">
              <table className="w-full text-sm">
                <tbody>
                  {specs.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                      <td className="px-6 md:px-8 py-3 font-semibold text-foreground/90 w-1/3 align-top">{s.label}</td>
                      <td className="px-6 md:px-8 py-3 text-foreground/75">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{lang === "ar" ? "لا توجد مواصفات مضافة." : "No specifications added."}</p>
          )}
        </Card>

        {/* Datasheet section */}
        <Card id="section-datasheet" className="mt-8 p-6 md:p-8 scroll-mt-32 transition-shadow">
          <h2 className="text-2xl font-extrabold mb-5">{t.products.tabDatasheet}</h2>
          {docs.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {docs.map((d) => {
                const Icon = docIcon(d.mime_type);
                return (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
                     className="flex items-center gap-3 border border-border rounded-lg p-3 hover:border-primary hover:bg-secondary/30 transition-base">
                    <Icon className="h-6 w-6 text-primary shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{d.file_name}</span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          ) : product.datasheet_url ? (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href={product.datasheet_url} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4 me-2" /> {t.products.downloadDatasheet}
              </a>
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">{t.products.noDatasheet}</p>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
};

export default ProductDetails;
