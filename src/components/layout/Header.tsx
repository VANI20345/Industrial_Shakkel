import { Link, NavLink, useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { useQuote } from "@/contexts/QuoteContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, LogOut, Menu, ShoppingCart, User as UserIcon, X, ChevronDown, ShieldCheck, Bell, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { useUnreadReplies } from "@/hooks/useUnreadReplies";

export const Header = () => {
  const { t, lang, toggle } = useI18n();
  const { count } = useQuote();
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unread = useUnreadReplies();

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/brands", label: t.nav.brands },
    { to: "/products", label: t.nav.products },
    { to: "/about", label: t.nav.about },
    { to: "/contact", label: t.nav.contact },
  ];

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg">
      <div className="container-page flex h-[68px] items-center justify-between gap-6">
        <Link to="/" className="flex items-center shrink-0">
          <BrandLogo size="md" showText />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-3.5 py-2 text-sm font-medium rounded-md transition-base",
                  isActive ? "text-primary bg-secondary" : "text-foreground/70 hover:text-foreground hover:bg-secondary/60"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5 font-medium px-2.5">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{lang === "en" ? "العربية" : "EN"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/quote")}
            className="relative gap-2 border-primary/30 text-foreground hover:!bg-primary/10 hover:!text-primary hover:border-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">{t.nav.quote}</span>
            {count > 0 && (
              <Badge className="absolute -top-2 -end-2 h-5 min-w-5 px-1.5 bg-accent text-accent-foreground border-2 border-background text-[10px] font-bold">
                {count}
              </Badge>
            )}
          </Button>


          <div className="hidden md:flex items-center gap-2 ms-1">
            {user ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => navigate("/my-messages")} className="relative" title={lang === "ar" ? "رسائلي" : "My Messages"}>
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <Badge className="absolute -top-1 -end-1 h-4 min-w-4 px-1 bg-accent text-accent-foreground border-2 border-background text-[9px] font-bold">{unread}</Badge>
                  )}
                </Button>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                      {initials}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4 me-2" /> {lang === "ar" ? "حسابي" : "My Account"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-quotes")}>
                    <ShoppingCart className="h-4 w-4 me-2" /> {t.nav.myQuotes}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-messages")}>
                    <MessageCircle className="h-4 w-4 me-2" /> {lang === "ar" ? "رسائلي" : "My Messages"}
                    {unread > 0 && <Badge className="ms-auto h-4 min-w-4 px-1 bg-accent text-accent-foreground text-[9px]">{unread}</Badge>}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <ShieldCheck className="h-4 w-4 me-2" /> {t.nav.admin}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 me-2" /> {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>{t.nav.login}</Button>
                <Button size="sm" onClick={() => navigate("/register")} className="bg-gradient-primary hover:opacity-95 shadow-sm">
                  {t.nav.register}
                </Button>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container-page py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn("px-3 py-2.5 rounded-md text-sm font-medium", isActive ? "bg-secondary text-primary" : "text-foreground/80")
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <div className="mt-2 pt-3 border-t border-border space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/my-quotes"); setOpen(false); }}>
                  <UserIcon className="h-4 w-4" /> {t.nav.myQuotes}
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/admin"); setOpen(false); }}>
                    <ShieldCheck className="h-4 w-4" /> {t.nav.admin}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { signOut(); setOpen(false); }}>
                  <LogOut className="h-4 w-4" /> {t.nav.logout}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-2 pt-3 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={() => { navigate("/login"); setOpen(false); }}>{t.nav.login}</Button>
                <Button className="flex-1 bg-gradient-primary" onClick={() => { navigate("/register"); setOpen(false); }}>{t.nav.register}</Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
