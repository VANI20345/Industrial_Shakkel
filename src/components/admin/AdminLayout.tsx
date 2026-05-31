import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  LayoutDashboard, Building2, FolderTree, Package, Boxes, FileSpreadsheet,
  Users, Settings, Globe, ChevronLeft, Inbox, FileUp, History, UserCog, BarChart3, MapPin, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { t, lang, toggle, dir } = useI18n();
  const navigate = useNavigate();
  const [newCount, setNewCount] = useState<number>(0);
  const [msgCount, setMsgCount] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const fetchCount = async () => {
      const [q, m] = await Promise.all([
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        client.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      if (!alive) return;
      setNewCount(q.count || 0);
      setMsgCount(m.count || 0);
    };
    fetchCount();
    const channel = supabase
      .channel("admin-inbox-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_requests" }, () => fetchCount())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => fetchCount())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  const groups = [
    {
      label: lang === "ar" ? "عام" : "General",
      items: [
        { to: "/admin", icon: LayoutDashboard, label: t.admin.dashboard, end: true },
        { to: "/admin/analytics", icon: BarChart3, label: lang === "ar" ? "التحليلات" : "Analytics" },
      ],
    },
    {
      label: lang === "ar" ? "الكتالوج" : "Catalog",
      items: [
        { to: "/admin/brands", icon: Building2, label: t.admin.brands },
        { to: "/admin/categories", icon: FolderTree, label: t.admin.categories },
        { to: "/admin/products", icon: Package, label: t.admin.products },
        { to: "/admin/stock", icon: Boxes, label: t.admin.stock },
        { to: "/admin/import", icon: FileUp, label: lang === "ar" ? "استيراد CSV" : "Import CSV" },
      ],
    },
    {
      label: lang === "ar" ? "العملاء والطلبات" : "Customers & Orders",
      items: [
        { to: "/admin/quotes", icon: FileSpreadsheet, label: t.admin.quotes, badge: newCount },
        { to: "/admin/customers", icon: Users, label: t.admin.customers },
        { to: "/admin/messages", icon: Inbox, label: lang === "ar" ? "الرسائل" : "Inbox", badge: msgCount },
      ],
    },

    {
      label: lang === "ar" ? "النظام" : "System",
      items: [
        { to: "/admin/cities", icon: MapPin, label: lang === "ar" ? "المدن" : "Cities" },
        { to: "/admin/roles", icon: UserCog, label: lang === "ar" ? "الأدوار" : "Roles" },
        { to: "/admin/audit-log", icon: History, label: lang === "ar" ? "سجل النشاط" : "Audit Log" },
        { to: "/admin/settings", icon: Settings, label: t.admin.settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <SidebarBody groups={groups} dir={dir} lang={lang} toggle={toggle} navigate={navigate} />
      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-sidebar text-sidebar-foreground p-3 flex items-center justify-between sticky top-0 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/60">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <SidebarBody groups={groups} dir={dir} lang={lang} toggle={toggle} navigate={navigate} inSheet />
            </SheetContent>
          </Sheet>
          <div className="font-bold inline-flex items-center gap-2">
            {lang === "ar" ? "الإدارة" : "Admin"}
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">{newCount}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-sidebar-foreground">{lang === "ar" ? "الموقع" : "Site"}</Button>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
};

const SidebarBody = ({ groups, dir, lang, toggle, navigate, inSheet }: any) => (
  <aside className={cn("bg-sidebar text-sidebar-foreground flex-col", inSheet ? "flex h-full w-full" : "hidden md:flex w-64 sticky top-0 h-screen")}>
    <div className="p-4 border-b border-sidebar-border">
      <BrandLogo size="sm" />
    </div>
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
      {groups.map((g: any) => (
        <div key={g.label}>
          <div className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">{g.label}</div>
          <div className="space-y-1">
            {g.items.map((it: any) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-base",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )
                }
              >
                <it.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{it.label}</span>
                {it.badge && it.badge > 0 ? (
                  <span className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
    <div className="p-3 border-t border-sidebar-border space-y-1">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="w-full justify-start gap-2 text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
        <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} /> {lang === "ar" ? "العودة للموقع" : "Back to site"}
      </Button>
      <Button variant="ghost" size="sm" onClick={toggle} className="w-full justify-start gap-2 text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
        <Globe className="h-4 w-4" /> {lang === "en" ? "العربية" : "English"}
      </Button>
    </div>
  </aside>
);
