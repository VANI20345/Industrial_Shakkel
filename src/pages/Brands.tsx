import { SiteLayout } from "@/components/layout/SiteLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";
import { useBrands } from "@/hooks/useCatalog";
import { Seo } from "@/components/Seo";

const Brands = () => {
  const { t, dir, lang } = useI18n();
  const { data: brands, loading } = useBrands();

  return (
    <SiteLayout>
      <Seo
        title={lang === "ar" ? "العلامات التجارية | شَكَّل" : "Brands | Shakkel"}
        description={lang === "ar" ? "توزيع صناعي معتمد من أبرز الشركات المصنعة." : "Authorized industrial distribution from leading global manufacturers."}
        path="/brands"
      />
      <div className="container-page py-12 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold">{t.brands.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.brands.subtitle}</p>
        </div>

        {loading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {!loading && brands.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            {lang === "ar" ? "لم تتم إضافة شركات بعد." : "No brands have been added yet."}
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((b) => (
            <Link key={b.id} to={`/products?brand=${b.id}`}>
              <Card className="p-6 transition-base hover:shadow-glow hover:-translate-y-0.5 hover:border-primary/30 h-full flex flex-col">
                <div className="h-20 mb-4 flex items-center">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-16 max-w-[160px] object-contain" loading="lazy" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">{b.name}</h3>
                {b.description && <p className="text-sm text-muted-foreground leading-relaxed flex-1">{b.description}</p>}
                <div className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1.5">
                  {t.products.viewDetails}
                  <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Brands;
