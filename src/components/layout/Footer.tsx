import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useContactSettings } from "@/hooks/useSiteSettings";

export const Footer = () => {
  const { t, lang } = useI18n();
  const { user, isAdmin } = useAuth();
  const { contact } = useContactSettings();

  const brandText = lang === "ar" ? "شَكَّل" : "SHAKKEL";

  return (
    <footer className="mt-24 border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="container-page py-14 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Brand */}
        <div className="md:col-span-4">
          <BrandLogo size="md" showText variant="light" />
          <p className="mt-4 text-sm text-sidebar-foreground/70 leading-relaxed max-w-sm">
            {t.footer.tagline}
          </p>
        </div>

        {/* Company */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-sidebar-foreground/90">
            {t.footer.company}
          </h4>
          <ul className="space-y-2.5 text-sm text-sidebar-foreground/70">
            <li><Link to="/about" className="hover:text-accent transition-base">{t.footer.about}</Link></li>
            <li><Link to="/contact" className="hover:text-accent transition-base">{t.footer.contact}</Link></li>
            {user && isAdmin && (
              <li><Link to="/admin" className="hover:text-accent transition-base">{t.nav.admin}</Link></li>
            )}
          </ul>
        </div>

        {/* Catalog */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-sidebar-foreground/90">
            {t.footer.catalog}
          </h4>
          <ul className="space-y-2.5 text-sm text-sidebar-foreground/70">
            <li><Link to="/products" className="hover:text-accent transition-base">{t.footer.browse}</Link></li>
            <li><Link to="/brands" className="hover:text-accent transition-base">{t.footer.brandsLink}</Link></li>
            <li><Link to="/quote" className="hover:text-accent transition-base">{t.nav.quote}</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-sidebar-foreground/90">
            {t.footer.legal}
          </h4>
          <ul className="space-y-2.5 text-sm text-sidebar-foreground/70">
            <li><Link to="/privacy" className="hover:text-accent transition-base">{t.footer.privacy}</Link></li>
            <li><Link to="/terms" className="hover:text-accent transition-base">{t.footer.terms}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-sidebar-foreground/90">
            {t.footer.contact}
          </h4>
          <ul className="space-y-2.5 text-sm text-sidebar-foreground/70">
            {contact.show_email_footer && contact.email && (
              <li className="flex items-center gap-2 break-all">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-accent">{contact.email}</a>
              </li>
            )}
            {contact.show_phone_footer && contact.phone && (
              <li className="flex items-center gap-2" dir="ltr">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-accent">{contact.phone}</a>
              </li>
            )}
            {contact.show_whatsapp_footer && contact.whatsapp && (
              <li className="flex items-center gap-2" dir="ltr">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank" rel="noreferrer"
                  className="hover:text-accent"
                >
                  {contact.whatsapp}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{lang === "ar" ? contact.address_ar : contact.address_en}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sidebar-border">
        <div className="container-page py-5 text-center text-xs text-sidebar-foreground/60">
          © 2026 {brandText}. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
};
