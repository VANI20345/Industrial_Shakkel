import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n/I18nProvider";

const Terms = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const sections = isAr
    ? [
        { h: "قبول الشروط", p: "باستخدامك منصّة شَكَّل فإنك توافق على هذه الشروط. إذا لم توافق، يُرجى عدم استخدام المنصّة." },
        { h: "طبيعة الخدمة", p: "تقدّم شَكَّل منصّة B2B لتصفّح المنتجات الصناعية وطلب عروض الأسعار. الأسعار النهائية وتوافر المنتجات تخضع للتأكيد عبر عرض السعر الرسمي." },
        { h: "الحساب والمسؤولية", p: "أنت مسؤول عن سرّية بيانات حسابك وعن جميع الأنشطة التي تتم من خلاله. زوّدنا ببيانات صحيحة ومحدّثة." },
        { h: "طلبات التسعيرة", p: "إرسال طلب تسعيرة لا يُعدّ التزامًا بالشراء أو البيع. يصبح الالتزام نافذًا فقط بعد اعتماد عرض السعر وإصدار أمر شراء رسمي." },
        { h: "الأسعار والدفع", p: "الأسعار سارية لمدّة محدّدة في عرض السعر. شروط الدفع والشحن تُحدّد لكل صفقة." },
        { h: "الضمان وإخلاء المسؤولية", p: "المنتجات تخضع لضمانات الشركات المصنّعة الأصلية. لا تتحمّل شَكَّل المسؤولية عن الأضرار التبعية أو سوء الاستخدام." },
        { h: "حقوق الملكية", p: "جميع المحتويات والعلامات التجارية على المنصّة محميّة، ولا يجوز إعادة استخدامها دون إذن خطّي." },
        { h: "تعديل الشروط", p: "يحقّ لنا تعديل هذه الشروط في أي وقت، ويسري التعديل من تاريخ نشره على المنصّة." },
        { h: "القانون الحاكم", p: "تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختصّ محاكم الرياض بأي نزاع." },
      ]
    : [
        { h: "Acceptance", p: "By using the Shakkel platform you agree to these terms. If you do not agree, please discontinue use." },
        { h: "Service", p: "Shakkel provides a B2B platform to browse industrial products and request quotations. Final pricing and availability are confirmed via formal quotation." },
        { h: "Account responsibility", p: "You are responsible for the confidentiality of your account and all activity under it. Provide accurate and current information." },
        { h: "Quotations", p: "Submitting a quote request is not a binding purchase or sale. A binding commitment exists only upon accepted quotation and issued purchase order." },
        { h: "Pricing & payment", p: "Quoted prices are valid for the period stated. Payment and shipping terms are agreed per transaction." },
        { h: "Warranty & liability", p: "Products carry the original manufacturer warranty. Shakkel is not liable for consequential damages or misuse." },
        { h: "Intellectual property", p: "All content and trademarks on the platform are protected and may not be reused without written permission." },
        { h: "Changes", p: "We may amend these terms at any time. Changes take effect upon publication on the platform." },
        { h: "Governing law", p: "These terms are governed by the laws of the Kingdom of Saudi Arabia. The courts of Riyadh have exclusive jurisdiction." },
      ];

  return (
    <SiteLayout>
      <Seo title={isAr ? "الشروط والأحكام — شَكَّل" : "Terms & Conditions — Shakkel"} description={isAr ? "الشروط والأحكام لاستخدام منصّة شَكَّل." : "Terms & Conditions for using the Shakkel platform."} />
      <div className="container-page py-14 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{isAr ? "الشروط والأحكام" : "Terms & Conditions"}</h1>
        <p className="text-muted-foreground text-sm mb-10">{isAr ? "آخر تحديث: 2026" : "Last updated: 2026"}</p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold mb-2">{s.h}</h2>
              <p className="text-foreground/80 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Terms;
