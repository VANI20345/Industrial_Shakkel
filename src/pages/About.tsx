import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import {
  ShieldCheck, FileText, Truck, Headphones, Sparkles, Target,
  Compass, ArrowRight, CheckCircle2, Building2, PackageSearch, Handshake,
} from "lucide-react";

const About = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const values = [
    {
      Icon: ShieldCheck,
      title: isAr ? "الشفافية أولاً" : "Transparency first",
      desc: isAr
        ? "صفحات منتجات واضحة، مواصفات معتمدة من المصنّع، وحالة مخزون دقيقة قبل تقديم أي عرض."
        : "Clear product pages, manufacturer-verified specs, and accurate stock status before any quote is offered.",
    },
    {
      Icon: FileText,
      title: isAr ? "توثيق فني" : "Technical documentation",
      desc: isAr
        ? "كل منتج مرفق بداتا شيت أو وثيقة فنية متى توفّرت لمساعدة فريقك الهندسي على اتخاذ القرار."
        : "Datasheets and technical files attached whenever available, so your engineering team can decide with confidence.",
    },
    {
      Icon: Handshake,
      title: isAr ? "علاقة طويلة الأمد" : "Long-term partnership",
      desc: isAr
        ? "لسنا متجرًا لمرة واحدة. نبني علاقات مع فِرق المشتريات ونتعلّم احتياجاتكم المتكررة."
        : "We're not a one-off shop. We build relationships with procurement teams and learn your recurring needs.",
    },
    {
      Icon: Sparkles,
      title: isAr ? "مشروع جديد، طموح كبير" : "New venture, big ambition",
      desc: isAr
        ? "شَكَّل منصة حديثة الانطلاق؛ نُسرّع التطوير بناءً على ملاحظات عملائنا الأوائل."
        : "Shakkel is a recently-launched platform; we iterate fast based on feedback from our early customers.",
    },
  ];

  const steps = [
    {
      Icon: PackageSearch,
      title: isAr ? "تصفّح أو ابحث" : "Browse or search",
      desc: isAr
        ? "اكتشف الكتالوج حسب الفئة أو العلامة التجارية، أو ابحث برمز المنتج مباشرة."
        : "Explore the catalog by category or brand, or search by product code directly.",
    },
    {
      Icon: FileText,
      title: isAr ? "أضف إلى قائمة التسعير" : "Add to your quote list",
      desc: isAr
        ? "أضف المنتجات والكميات المطلوبة دون التزام. لا حاجة لإنشاء حساب للتجربة."
        : "Add products and quantities without commitment. No account needed to try.",
    },
    {
      Icon: Headphones,
      title: isAr ? "نتواصل معك" : "We get back to you",
      desc: isAr
        ? "يقوم فريقنا بمراجعة الطلب وإرسال عرض السعر بأقصى سرعة ممكنة عبر الوسيلة التي تفضّلها."
        : "Our team reviews and sends a quote as fast as possible, via your preferred channel.",
    },
    {
      Icon: Truck,
      title: isAr ? "نُكمل المعاملة" : "We complete the deal",
      desc: isAr
        ? "بعد موافقتك، نُنسّق التوريد والشحن والتوثيق دون تعقيد."
        : "After your approval, we coordinate supply, shipping, and paperwork without friction.",
    },
  ];

  const promises = [
    isAr ? "لا نعد بما لا نملك — المخزون والحالة معروضان بصدق." : "We don't promise what we don't have — stock is shown honestly.",
    isAr ? "لا توجد رسوم خفية في طلب التسعير." : "No hidden fees on a quote request.",
    isAr ? "نرد على كل استفسار، حتى لو لم يتحول إلى صفقة." : "We respond to every inquiry, even if it doesn't become a deal.",
    isAr ? "بياناتك مع شَكَّل لا تُشارك مع أي طرف ثالث." : "Your data stays with Shakkel — never shared with third parties.",
  ];

  return (
    <SiteLayout>
      <Seo
        title={isAr ? "من نحن | شَكَّل" : "About | Shakkel"}
        description={isAr
          ? "شَكَّل منصة B2B جديدة لتوريد المنتجات الصناعية بشفافية وسرعة لفرق المشتريات في المملكة."
          : "Shakkel is a new B2B platform for industrial supply, built around transparency and speed for procurement teams in Saudi Arabia."}
        path="/about"
      />

      {/* Hero */}
      <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 industrial-grid-bg opacity-10" />
        <div className="container-page py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-xs font-medium mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "منصة جديدة قيد البناء معكم" : "A new platform — building with our customers"}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              {isAr ? "نُبسّط شراء المستلزمات الصناعية" : "We make industrial procurement simple"}
            </h1>
            <p className="mt-5 text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              {isAr
                ? "شَكَّل هي منصة B2B سعودية تربط فِرق المشتريات بموردي المنتجات الصناعية، مع كتالوج شفّاف، وعملية تسعير منظمة، وتواصل مباشر مع فريق إنساني — لا روبوتات."
                : "Shakkel is a Saudi B2B platform connecting procurement teams with industrial suppliers — through a transparent catalog, an organized quotation flow, and direct contact with a real team, not bots."}
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/products">{isAr ? "تصفح المنتجات" : "Browse products"} <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/contact">{isAr ? "تواصل معنا" : "Talk to us"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-7 md:p-8">
            <Target className="h-9 w-9 text-primary mb-4" />
            <h2 className="text-2xl font-extrabold mb-3">{isAr ? "مهمتنا" : "Our mission"}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {isAr
                ? "تمكين كل مصنع وورشة وفريق صيانة في المملكة من الوصول السريع والشفاف إلى المنتجات الصناعية التي يحتاجونها — دون مكالمات لا تنتهي أو عروض غامضة."
                : "Empower every factory, workshop, and maintenance team in the Kingdom with fast, transparent access to the industrial products they need — without endless phone calls or vague offers."}
            </p>
          </Card>
          <Card className="p-7 md:p-8">
            <Compass className="h-9 w-9 text-accent mb-4" />
            <h2 className="text-2xl font-extrabold mb-3">{isAr ? "رؤيتنا" : "Our vision"}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {isAr
                ? "أن نكون الوجهة الأولى الموثوقة لفِرق المشتريات الصناعية في المنطقة، حيث الطلب والتسعير والتوريد عملية واضحة من البداية للنهاية."
                : "To be the go-to destination for industrial procurement teams in the region, where request, quotation, and supply are a clear process end-to-end."}
            </p>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold">{isAr ? "ما الذي يميّزنا" : "What we stand for"}</h2>
            <p className="text-muted-foreground mt-3">
              {isAr ? "قيم بسيطة نعمل بها كل يوم." : "Simple values we work by every day."}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v) => (
              <Card key={v.title} className="p-6 hover:shadow-md transition-base">
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <v.Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold">{isAr ? "كيف تتم العملية" : "How it works"}</h2>
          <p className="text-muted-foreground mt-3">
            {isAr ? "أربع خطوات بسيطة من الفكرة إلى التسليم." : "Four simple steps from idea to delivery."}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <Card key={s.title} className="p-6 relative">
              <div className="absolute top-4 end-4 text-5xl font-extrabold text-primary/10 leading-none">{i + 1}</div>
              <s.Icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Promises */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container-page py-16 md:py-20">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
            <div>
              <Building2 className="h-9 w-9 text-primary mb-4" />
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                {isAr ? "وعودنا لك" : "Our promises to you"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {isAr
                  ? "كوننا منصة جديدة لا يعني الحاجة لتنازلات في الثقة. هذه التزاماتنا الواضحة من اليوم الأول."
                  : "Being a new platform doesn't mean trade-offs on trust. These are our clear commitments from day one."}
              </p>
            </div>
            <ul className="space-y-3">
              {promises.map((p) => (
                <li key={p} className="flex gap-3 items-start p-4 rounded-md bg-card border border-border">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 md:py-24">
        <Card className="p-8 md:p-12 bg-gradient-primary text-primary-foreground text-center border-0">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
            {isAr ? "هل لديك طلب توريد؟" : "Have a supply request?"}
          </h2>
          <p className="text-primary-foreground/85 max-w-xl mx-auto mb-6">
            {isAr
              ? "أرسل لنا قائمتك أو اطرح سؤالك — سنرد عليك في أقرب وقت."
              : "Send us your list or ask a question — we'll get back to you as soon as possible."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to="/quote">{isAr ? "ابدأ قائمة تسعير" : "Start a quote list"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/contact">{isAr ? "تواصل معنا" : "Contact us"}</Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
};

export default About;
