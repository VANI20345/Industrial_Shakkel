import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { lang, dir } = useI18n();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  const isAr = lang === "ar";
  return (
    <SiteLayout>
      <div className="container-page py-24 flex flex-col items-center text-center">
        <div className="text-[120px] md:text-[180px] font-extrabold leading-none bg-gradient-primary bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-2 text-2xl md:text-3xl font-bold">
          {isAr ? "الصفحة غير موجودة" : "Page not found"}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {isAr
            ? "الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله."
            : "The page you’re looking for doesn’t exist or has been moved."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="bg-gradient-primary">
            <Link to="/">
              <Home className="h-4 w-4 me-2" />
              {isAr ? "العودة للرئيسية" : "Back to home"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/products">
              <ArrowLeft className={`h-4 w-4 me-2 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {isAr ? "تصفّح المنتجات" : "Browse products"}
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
};

export default NotFound;
