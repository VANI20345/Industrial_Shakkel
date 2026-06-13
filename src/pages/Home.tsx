import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { ArrowRight, Building2, FileCheck2, Headphones, PackageCheck, Timer, Upload, Wallet, Truck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { useBrands, useCategories, useProducts } from "@/hooks/useCatalog";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/contexts/AuthContext";
import heroImg from "@/assets/hero-industrial.jpg";

const Home = () => {
  const { t, dir, lang } = useI18n();
  const { user } = useAuth();
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const { data: products } = useProducts();
  const featured = products.slice(0, 8);
  const topCategories = categories.slice(0, 3);

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

      {/* HERO — full-bleed industrial */}
      <section className="relative w-full min-h-[640px] md:min-h-[720px] bg-[#14171C] flex items-center overflow-hidden">
        <img
          src={heroImg}
          alt={lang === "ar" ? "آلات صناعية متقدمة" : "Industrial machinery"}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#14171C] via-[#14171C]/90 to-[#14171C]/30 rtl:bg-gradient-to-l" />

        <div className="relative container-page w-full py-20 md:py-28">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 bg-primary-foreground animate-pulse rounded-full" />
            {t.hero.eyebrow}
          </div>
          <h1 className="text-white text-4xl sm:text-5xl md:text-7xl font-black max-w-4xl leading-[1.05] mb-8 tracking-tight">
            {t.hero.title}
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-medium">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider gap-3 rounded-none">
              <Link to="/products">
                {t.hero.ctaPrimary}
                <ArrowRight className={`h-5 w-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 bg-transparent hover:bg-white/10 text-white border-2 border-white/20 hover:text-white font-bold uppercase tracking-wider rounded-none">
              <Link to="/quote">{t.hero.ctaSecondary}</Link>
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="absolute bottom-0 left-0 w-full bg-[#14171C]/80 backdrop-blur-sm border-t border-white/10 py-5">
          <div className="container-page flex flex-wrap justify-center md:justify-start items-center gap-x-10 gap-y-2 text-white/60 text-xs font-bold tracking-widest uppercase">
            <div className="flex items-center gap-3"><span className="text-primary text-lg">{brands.length || "+"}</span> {lang === "ar" ? "علامة عالمية" : "Global Brands"}</div>
            <div className="flex items-center gap-3"><span className="text-primary text-lg">24h</span> {lang === "ar" ? "زمن الرد" : "RFQ Response"}</div>
            <div className="flex items-center gap-3"><span className="text-primary text-lg">100%</span> {lang === "ar" ? "معتمد" : "Certified"}</div>
          </div>
        </div>
      </section>

      {/* BRAND WALL */}
      {brands.length > 0 && (
        <section className="bg-[#2A2F38] py-12 border-b border-white/5">
          <div className="container-page">
            <div className="text-center mb-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{lang === "ar" ? "شركاؤنا" : "Our Partners"}</div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {brands.slice(0, 10).map((b) => (
                <Link
                  key={b.id}
                  to={`/products?brand=${b.id}`}
                  className="bg-white rounded-md px-5 py-3 h-16 min-w-[140px] flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                  title={b.name}
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="max-h-10 max-w-[140px] w-auto object-contain" loading="lazy" />
                  ) : (
                    <div className="text-[#14171C] font-bold">{b.name}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES — Content-rich grid */}
      {topCategories.length > 0 && (
        <section className="container-page py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-5 leading-tight uppercase tracking-tight">
                {t.categories.title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {lang === "ar"
                  ? "حلول هندسية معتمدة للمتطلبات الميكانيكية والكهربائية والسلامة. كتالوجنا مفحوص بصرامة لمعايير ISO والأداء."
                  : "Engineered solutions for mechanical, electrical, and safety requirements. Strictly vetted for ISO compliance and performance."}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-none border-2 font-bold uppercase tracking-widest text-xs h-12 px-6">
              <Link to="/products">{lang === "ar" ? "كل المنتجات" : "All Products"} →</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topCategories.map((c, i) => (
              <Link
                key={c.id}
                to={`/products?category=${c.id}`}
                className="group bg-card border border-border hover:border-primary transition-all"
              >
                <div className="relative h-64 overflow-hidden bg-secondary">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                      <Building2 className="h-20 w-20 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-4 start-4 bg-[#14171C] text-white text-[10px] font-black px-2 py-1 uppercase tracking-tighter">
                    {lang === "ar" ? `قسم ${String(i + 1).padStart(2, "0")}` : `Cat. ${String(i + 1).padStart(2, "0")}`}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-extrabold mb-3 group-hover:text-primary transition-colors">{(lang === "ar" ? (c as any).name_ar : (c as any).name_en) || c.name}</h3>
                  <span className="inline-flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                    {lang === "ar" ? "استعراض القسم" : "Explore Section"} <span className="text-primary">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      {featured.length > 0 && (
        <section className="bg-gradient-surface py-24">
          <div className="container-page">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{t.products.title}</h2>
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

      {/* PROCUREMENT MANAGEMENT */}
      <section className="bg-[#2A2F38] py-24 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-1/2 h-full bg-[#14171C] -skew-x-12 translate-x-24 rtl:skew-x-12 rtl:-translate-x-24 hidden lg:block" />
        <div className="container-page relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-white text-4xl md:text-5xl font-black mb-10 leading-tight uppercase tracking-tight">
                {lang === "ar" ? "إدارة المشتريات" : "Procurement Management"}
              </h2>
              <div className="space-y-8">
                {[
                  { Icon: Upload, t: lang === "ar" ? "طلب تسعير بالجملة" : "Bulk RFQ Workflow", d: lang === "ar" ? "ارفع قائمة منتجاتك للحصول على تسعير موحّد فوري من العلامات المعتمدة." : "Upload your BOM or project list for immediate consolidated pricing." },
                  { Icon: Wallet, t: lang === "ar" ? "حسابات مؤسسية" : "Corporate Accounts", d: lang === "ar" ? "حسابات مؤسسية مع مدير حساب مخصّص لكبار المشترين." : "Qualified industrial partners get dedicated account desks." },
                  { Icon: ShieldCheck, t: lang === "ar" ? "ضمان الجودة" : "Quality Assurance", d: lang === "ar" ? "منتجات أصلية من علامات معتمدة مع شهادات مطابقة وضمان المصنع." : "Genuine products from certified brands with conformity certificates and full manufacturer warranty." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary flex items-center justify-center font-bold text-primary-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                        <s.Icon className="h-5 w-5 text-primary" /> {s.t}
                      </h4>
                      <p className="text-gray-400">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-10 shadow-2xl border-t-8 border-primary">
              <h3 className="text-2xl font-black mb-2 uppercase">{lang === "ar" ? "مكتب التسعير B2B" : "B2B Quote Desk"}</h3>
              <p className="text-muted-foreground text-sm mb-8">{lang === "ar" ? "متوسط زمن الاستجابة: أقل من 24 ساعة" : "Average response time: under 24 hours"}</p>
              <div className="space-y-4 text-sm">
                {[
                  lang === "ar" ? "تسعير دقيق من العلامات الأصلية" : "Accurate pricing from authorized brands",
                  lang === "ar" ? "تشمل المواصفات الفنية ومدد التوريد" : "Includes technical specs and lead times",
                  lang === "ar" ? "صلاحية العرض حتى 14 يوماً" : "Quote validity up to 14 days",
                  lang === "ar" ? "دعم لخيارات الشحن والتسليم" : "Shipping and delivery options supported",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                    <span className="text-primary font-black">✓</span>
                    <span className="text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <Button asChild size="lg" className="w-full mt-8 h-14 bg-[#14171C] hover:bg-primary text-white font-black uppercase tracking-widest rounded-none">
                <Link to="/quote">{lang === "ar" ? "أنشئ طلب تسعير" : "Submit RFQ Request"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="container-page">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{t.features.title}</h2>
            <p className="mt-3 text-muted-foreground">{t.features.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: FileCheck2, title: t.features.f1Title, desc: t.features.f1Desc },
              { Icon: PackageCheck, title: t.features.f2Title, desc: t.features.f2Desc },
              { Icon: Timer, title: t.features.f3Title, desc: t.features.f3Desc },
              { Icon: Headphones, title: t.features.f4Title, desc: t.features.f4Desc },
            ].map((f) => (
              <div key={f.title} className="bg-card border border-border p-6 hover:border-primary transition-all group">
                <div className="h-11 w-11 bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-bold mb-2 uppercase tracking-wide text-sm">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pb-20">
        <div className="container-page">
          <div className="bg-[#14171C] p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between border-l-8 border-primary rtl:border-l-0 rtl:border-r-8">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-4">
                {lang === "ar" ? "ابدأ مشروعك معنا اليوم" : "Start your project with us"}
              </h2>
              <p className="text-gray-400 max-w-xl">
                {lang === "ar" ? "انضم إلى فِرق المشتريات التي تعتمد Shakkel لإمدادات بنيتها الصناعية." : "Join procurement teams who trust Shakkel for their industrial infrastructure supplies."}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {user ? (
                <>
                  <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-none">
                    <Link to="/quote">{t.nav.quote}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-[#14171C] font-black uppercase tracking-widest rounded-none">
                    <Link to="/contact">{t.nav.contact}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-none">
                    <Link to="/register">{t.nav.register}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-[#14171C] font-black uppercase tracking-widest rounded-none">
                    <Link to="/contact">{t.nav.contact}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default Home;
