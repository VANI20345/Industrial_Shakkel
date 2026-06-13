import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n/I18nProvider";

const Privacy = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const sections = isAr
    ? [
        { h: "مقدّمة", p: "تحترم شَكَّل خصوصيتك. توضّح هذه السياسة كيف نجمع بيانات عملاء الأعمال ونستخدمها ونحميها عند استخدام منصّتنا لطلب عروض الأسعار والتوريد الصناعي." },
        { h: "البيانات التي نجمعها", p: "الاسم، اسم الشركة، البريد الإلكتروني، رقم الجوال، المدينة، وسجلّ طلبات التسعيرة. كما نسجّل بعض البيانات التقنية لأغراض الأمان والتحسين." },
        { h: "كيف نستخدم البيانات", p: "للتواصل بشأن طلبات التسعيرة، تنفيذ التوريد، الفوترة، الدعم الفنّي، وتحسين الخدمة. لا نُستخدم بياناتك لتسويق طرف ثالث." },
        { h: "مشاركة البيانات", p: "لا نبيع بياناتك. قد نشاركها مع مزوّدي خدمات (مثل تشغيل البنية التحتية أو إرسال البريد) تحت اتفاقيات سرّية، أو عند طلب قانوني رسمي." },
        { h: "حقوقك", p: "يمكنك طلب الوصول لبياناتك أو تصحيحها أو حذفها عبر التواصل معنا. للحسابات المسجّلة، يمكنك تعديل بياناتك من صفحة الحساب." },
        { h: "أمان البيانات", p: "نستخدم تشفير النقل (HTTPS)، صلاحيات وصول مقيّدة (RLS)، وممارسات تخزين آمنة. لا يوجد نظام آمن 100٪، لكنّنا نتبع أفضل الممارسات." },
        { h: "الاحتفاظ بالبيانات", p: "نحتفظ بسجلّات طلبات التسعيرة والتعاملات لمدة لا تتجاوز المتطلبات النظامية في المملكة العربية السعودية." },
        { h: "التواصل", p: "لأي استفسار حول الخصوصية، تواصل معنا عبر صفحة (اتصل بنا)." },
      ]
    : [
        { h: "Introduction", p: "Shakkel respects your privacy. This policy explains how we collect, use and protect business-customer data on our quotation and industrial-supply platform." },
        { h: "Data we collect", p: "Name, company name, email, phone, city, and your quotation history. We also log limited technical data for security and service improvement." },
        { h: "How we use data", p: "To process and respond to quote requests, fulfil orders, invoice, provide support, and improve the platform. We do not use your data for third-party marketing." },
        { h: "Sharing", p: "We do not sell your data. We may share it with service providers (e.g. hosting, email delivery) under confidentiality, or when legally required." },
        { h: "Your rights", p: "You may request access, correction, or deletion of your data by contacting us. Registered users can edit their profile from the account page." },
        { h: "Security", p: "We use HTTPS, row-level access control, and secure storage practices. No system is 100% secure, but we follow industry best practices." },
        { h: "Retention", p: "Quote and transaction records are retained no longer than required by applicable laws in Saudi Arabia." },
        { h: "Contact", p: "For any privacy enquiry, please reach us via the Contact page." },
      ];

  return (
    <SiteLayout>
      <Seo title={isAr ? "سياسة الخصوصية — شَكَّل" : "Privacy Policy — Shakkel"} description={isAr ? "سياسة الخصوصية لمنصّة شَكَّل للتوريد الصناعي." : "Shakkel industrial supply platform privacy policy."} />
      <div className="container-page py-14 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
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

export default Privacy;
