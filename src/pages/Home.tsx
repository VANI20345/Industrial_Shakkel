import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { ArrowRight, Box, Building2, FileCheck2, Headphones, PackageCheck, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { useBrands, useCategories, useProducts } from "@/hooks/useCatalog";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const { t, dir, lang } = useI18n();
  const { user } = useAuth();
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const { data: products } = useProducts();
  const featured = products.slice(0, 4);

  return (
    <SiteLayout>
      <Seo
        title={lang === "ar" ? "Shakkel — منتجات صناعية من أفضل العلامات" : "Shakkel — Industrial Supply & RFQ"}
        description={lang === "ar" ? "كتالوج صناعي معتمد وطلبات تسعيرة سريعة لفِرق المشتريات." : "Certified industrial catalog and fast quotation workflow for procurement teams."}
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Shakkel",
          url: typeof window !== "undefined" ? window.location.origin : undefined,
        }}
      />
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 industrial-grid-bg opacity-10" />
        <div className="relative container-page py-20 md:py-28 text-primary-foreground">
          <div className="max-w-3xl animate-fade-in">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/15 border border-card/30 text-primary-foreground text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
              {t.hero.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1]">
              {t.hero.title}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-2xl">
              {t.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-card text-primary hover:bg-card/90 h-12 px-7 text-base font-semibold">
                <Link to="/products">{t.hero.ctaPrimary} <ArrowRight className={`h-5 w-5 ${dir === "rtl" ? "rotate-180 me-2" : "ms-2"}`} /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base font-semibold bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/quote">{t.hero.ctaSecondary}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* BRANDS WE SUPPLY */}
      {brands.length > 0 && (
        <section className="py-20 bg-gradient-surface">
          <div className="container-page">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold">{t.brands.title}</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t.brands.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.map((b) => (
                <Link key={b.id} to={`/products?brand=${b.id}`} className="flex justify-center">
                  <Card className="p-5 h-24 w-full flex items-center justify-center transition-base hover:shadow-glow hover:-translate-y-0.5">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="max-h-14 max-w-full object-contain" loading="lazy" />
                    ) : (
                      <div className="text-sm font-bold">{b.name}</div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button asChild variant="outline" size="lg">
                <Link to="/brands">{t.brands.viewAll} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180 me-2" : "ms-2"}`} /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="py-20">
          <div className="container-page">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-10">{t.categories.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((c) => (
                <Link key={c.id} to={`/products?category=${c.id}`}>
                  <Card className="p-6 flex flex-col items-center justify-center text-center gap-3 transition-base hover:shadow-glow hover:-translate-y-1 hover:border-primary/40 h-full">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} loading="lazy" className="h-14 w-14 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                        <Box className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                    <span className="font-semibold text-sm">{c.name}</span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      {featured.length > 0 && (
        <section className="py-20 bg-gradient-surface">
          <div className="container-page">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold">{t.products.title}</h2>
                <p className="mt-2 text-muted-foreground">{t.products.subtitle}</p>
              </div>
              <Button asChild variant="ghost"><Link to="/products">{t.brands.viewAll} →</Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {brands.length === 0 && products.length === 0 && (
        <section className="py-20">
          <div className="container-page">
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">Get started</h3>
              <p className="text-muted-foreground mb-6">Sign in as admin and add your first brands and products.</p>
              <Button asChild className="bg-gradient-primary"><Link to="/admin">Go to Admin</Link></Button>
            </Card>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="py-20">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold">{t.features.title}</h2>
            <p className="mt-3 text-muted-foreground">{t.features.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: FileCheck2, title: t.features.f1Title, desc: t.features.f1Desc },
              { Icon: PackageCheck, title: t.features.f2Title, desc: t.features.f2Desc },
              { Icon: Timer, title: t.features.f3Title, desc: t.features.f3Desc },
              { Icon: Headphones, title: t.features.f4Title, desc: t.features.f4Desc },
            ].map((f) => (
              <Card key={f.title} className="p-6 transition-base hover:shadow-md hover:border-primary/30">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container-page">
          <Card className="relative overflow-hidden p-10 md:p-14 bg-gradient-primary text-primary-foreground border-0">
            <div className="absolute inset-0 industrial-grid-bg opacity-10" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-extrabold leading-tight">{t.hero.title}</h3>
                <p className="mt-4 text-primary-foreground/85">{t.hero.subtitle}</p>
              </div>
              <div className="flex md:justify-end gap-3 flex-wrap">
                {user ? (
                  <>
                    <Button asChild size="lg" className="bg-card text-primary hover:bg-card/90"><Link to="/quote">{t.nav.quote}</Link></Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/contact">{t.nav.contact}</Link></Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-card text-primary hover:bg-card/90"><Link to="/register">{t.nav.register}</Link></Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/contact">{t.nav.contact}</Link></Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
};

export default Home;
