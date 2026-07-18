import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, FolderOpen, Package } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBrands, useCategories, useProducts, type SortBy, type Availability } from "@/hooks/useCatalog";
import { Seo } from "@/components/Seo";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { categoryName, getChildren, getDescendantIds, getAncestors } from "@/lib/categories";

const PAGE_SIZE = 12;

const Products = () => {
  const { t, dir, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const categoryParam = params.get("category") || "";
  const [qInput, setQInput] = useState(params.get("q") || "");
  const [q, setQ] = useState(params.get("q") || "");
  const [brand, setBrand] = useState(params.get("brand") || "all");
  const [availability, setAvailability] = useState<Availability>((params.get("av") as Availability) || "all");
  const [sortBy, setSortBy] = useState<SortBy>((params.get("sort") as SortBy) || "newest");
  const [page, setPage] = useState(Number(params.get("page")) || 1);

  useEffect(() => {
    const id = setTimeout(() => { setQ(qInput); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [qInput]);

  const { data: brands } = useBrands();
  const { data: categories } = useCategories();

  const currentCategory = useMemo(
    () => (categoryParam ? categories.find((c) => c.id === categoryParam) || null : null),
    [categories, categoryParam],
  );
  const children = useMemo(
    () => getChildren(categories, categoryParam || null),
    [categories, categoryParam],
  );
  const ancestors = useMemo(
    () => (currentCategory ? getAncestors(categories, currentCategory.id) : []),
    [categories, currentCategory],
  );

  // Top-level browse: no category param → show root categories.
  // Subcategory browse: has children → show child categories.
  // Listing: leaf category → show products.
  const showCategoryGrid = !categoryParam || children.length > 0;
  const descendantIds = useMemo(
    () => (currentCategory ? getDescendantIds(categories, currentCategory.id) : undefined),
    [categories, currentCategory],
  );

  // Sync URL
  useEffect(() => {
    const next: Record<string, string> = {};
    if (categoryParam) next.category = categoryParam;
    if (q) next.q = q;
    if (brand !== "all") next.brand = brand;
    if (availability !== "all") next.av = availability;
    if (sortBy !== "newest") next.sort = sortBy;
    if (page > 1) next.page = String(page);
    setParams(next, { replace: true });
  }, [categoryParam, q, brand, availability, sortBy, page, setParams]);

  useEffect(() => { setPage(1); }, [categoryParam, brand, availability, sortBy]);

  const { data: products, total, loading } = useProducts({
    brandId: brand !== "all" ? brand : undefined,
    categoryIds: descendantIds ? descendantIds : undefined,
    search: q || undefined,
    availability,
    sortBy,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToCategory = (id: string | null) => {
    const next = new URLSearchParams();
    if (id) next.set("category", id);
    setParams(next, { replace: false });
  };

  const reset = () => {
    setQInput(""); setQ(""); setBrand("all");
    setAvailability("all"); setSortBy("newest"); setPage(1);
  };

  const rootCats = useMemo(() => getChildren(categories, null), [categories]);
  const gridItems = categoryParam ? children : rootCats;

  return (
    <SiteLayout>
      <Seo
        title={lang === "ar" ? "المنتجات | Shakkel" : "Products | Shakkel"}
        description={lang === "ar"
          ? "تصفّح كتالوج المنتجات الصناعية واطلب تسعيرة مباشرة."
          : "Browse the industrial products catalog and request a quote directly."}
        path="/products"
      />
      <div className="container-page py-8 md:py-10">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-5">
          <BreadcrumbList>
            <BreadcrumbItem>
              {categoryParam ? (
                <BreadcrumbLink asChild>
                  <Link to="/products">{t.products.title}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{t.products.title}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {ancestors.map((a, i) => {
              const isLast = i === ancestors.length - 1;
              return (
                <span key={a.id} className="contents">
                  <BreadcrumbSeparator className={dir === "rtl" ? "rotate-180" : ""} />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{categoryName(a, lang)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={`/products?category=${a.id}`}>{categoryName(a, lang)}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold">
            {currentCategory ? categoryName(currentCategory, lang) : t.products.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {showCategoryGrid ? t.products.browseCategories : t.products.subtitle}
          </p>
        </div>

        {showCategoryGrid && (
          <div className="mb-10">
            <CategoryGrid items={gridItems} lang={lang} onSelect={goToCategory} />
          </div>
        )}

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="lg:sticky lg:top-20 self-start">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold inline-flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" /> {t.products.filters}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-auto p-1">Reset</Button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={t.products.search} className="ps-9" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t.products.brand}</label>
                    <Select value={brand} onValueChange={setBrand}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.products.all}</SelectItem>
                        {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t.products.availability}</label>
                    <Select value={availability} onValueChange={(v) => setAvailability(v as Availability)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.products.all}</SelectItem>
                        <SelectItem value="in">{t.products.inStock}</SelectItem>
                        <SelectItem value="low">{t.products.lowStock}</SelectItem>
                        <SelectItem value="out">{t.products.outOfStock}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </aside>

            <div>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="text-sm text-muted-foreground">
                  {loading ? t.common.loading : `${total} ${t.products.title.toLowerCase()}`}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t.sort.label}:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                    <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t.sort.newest}</SelectItem>
                      <SelectItem value="oldest">{t.sort.oldest}</SelectItem>
                      <SelectItem value="name_asc">{t.sort.nameAsc}</SelectItem>
                      <SelectItem value="name_desc">{t.sort.nameDesc}</SelectItem>
                      <SelectItem value="stock_desc">{t.sort.stockDesc}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <ProductGridSkeleton count={PAGE_SIZE} />
              ) : products.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground">{t.products.noResults}</Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} /> {t.common.previous}
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">
                    {t.pagination.page} {page} {t.pagination.of} {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    {t.common.next} <ChevronRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              )}
            </div>
          </div>
      </div>
    </SiteLayout>
  );
};

const CategoryGrid = ({
  items, lang, onSelect,
}: {
  items: { id: string; name: string; name_ar?: string | null; name_en?: string | null; image_url?: string | null }[];
  lang: "ar" | "en";
  onSelect: (id: string) => void;
}) => {
  if (items.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        {lang === "ar" ? "لا توجد تصنيفات" : "No categories yet"}
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="group text-start"
        >
          <Card className="overflow-hidden h-full flex flex-col transition-base hover:shadow-glow hover:-translate-y-0.5 hover:border-primary/40">
            <div className="aspect-[4/3] bg-secondary/40 flex items-center justify-center overflow-hidden">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={categoryName(c, lang)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <FolderOpen className="h-14 w-14 text-muted-foreground/40" />
              )}
            </div>
            <div className="p-4 flex-1 flex items-center justify-between gap-3">
              <h3 className="font-bold leading-snug">{categoryName(c, lang)}</h3>
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
};

export default Products;
