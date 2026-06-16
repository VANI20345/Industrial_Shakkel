import { useEffect, useState, useMemo } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Package, Users, FileSpreadsheet, Building2, Inbox, Plus, FileUp, LayoutDashboard,
  Settings, FolderTree, MessageCircle, BarChart3,
} from "lucide-react";

type Result = {
  id: string; type: string; label: string; sub?: string; href: string;
};

export const AdminCommandPalette = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const like = `%${term}%`;
      const [products, brands, customers, quotes, messages] = await Promise.all([
        supabase.from("products").select("id, name, sku").or(`name.ilike.${like},sku.ilike.${like}`).limit(6),
        supabase.from("brands").select("id, name, slug").ilike("name", like).limit(4),
        supabase.from("profiles").select("id, full_name, email, company_name").or(`full_name.ilike.${like},email.ilike.${like},company_name.ilike.${like}`).limit(4),
        supabase.from("quote_requests").select("id, name, company, email").or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`).limit(4),
        client.from("contact_messages").select("id, name, subject, email").or(`name.ilike.${like},subject.ilike.${like},email.ilike.${like}`).limit(4),
      ]);
      if (cancelled) return;
      const out: Result[] = [];
      (products.data || []).forEach((p: any) => out.push({ id: `p-${p.id}`, type: "product", label: p.name, sub: p.sku, href: `/products/${p.id}` }));
      (brands.data || []).forEach((b: any) => out.push({ id: `b-${b.id}`, type: "brand", label: b.name, href: `/admin/brands` }));
      (customers.data || []).forEach((c: any) => out.push({ id: `c-${c.id}`, type: "customer", label: c.full_name || c.email, sub: c.company_name || c.email, href: `/admin/customers` }));
      (quotes.data || []).forEach((r: any) => out.push({ id: `q-${r.id}`, type: "quote", label: r.name, sub: r.company || r.email, href: `/admin/quotes` }));
      (messages.data || []).forEach((m: any) => out.push({ id: `m-${m.id}`, type: "message", label: m.name, sub: m.subject || m.email, href: `/admin/messages` }));
      setResults(out);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const grouped = useMemo(() => {
    const groups: Record<string, Result[]> = {};
    results.forEach((r) => { (groups[r.type] ||= []).push(r); });
    return groups;
  }, [results]);

  const go = (href: string) => { onOpenChange(false); navigate(href); };

  const iconFor = (type: string) => ({
    product: Package, brand: Building2, customer: Users, quote: FileSpreadsheet, message: MessageCircle,
  }[type] || Package);

  const labelFor = (type: string) => ({
    product: lang === "ar" ? "منتجات" : "Products",
    brand: lang === "ar" ? "ماركات" : "Brands",
    customer: lang === "ar" ? "عملاء" : "Customers",
    quote: lang === "ar" ? "طلبات تسعير" : "Quote Requests",
    message: lang === "ar" ? "رسائل" : "Messages",
  }[type] || type);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={lang === "ar" ? "ابحث في المنتجات، العملاء، الطلبات…" : "Search products, customers, quotes…"}
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>{q.length < 2 ? (lang === "ar" ? "اكتب حرفين على الأقل" : "Type at least 2 characters") : (lang === "ar" ? "لا توجد نتائج" : "No results")}</CommandEmpty>

        {Object.entries(grouped).map(([type, list]) => {
          const Icon = iconFor(type);
          return (
            <CommandGroup key={type} heading={labelFor(type)}>
              {list.map((r) => (
                <CommandItem key={r.id} value={`${r.label} ${r.sub || ""} ${r.id}`} onSelect={() => go(r.href)}>
                  <Icon className="me-2 h-4 w-4 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        <CommandSeparator />
        <CommandGroup heading={lang === "ar" ? "إجراءات سريعة" : "Quick Actions"}>
          <CommandItem onSelect={() => go("/admin")}><LayoutDashboard className="me-2 h-4 w-4" />{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/products")}><Plus className="me-2 h-4 w-4" />{lang === "ar" ? "المنتجات" : "Products"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/categories")}><FolderTree className="me-2 h-4 w-4" />{lang === "ar" ? "التصنيفات" : "Categories"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/import")}><FileUp className="me-2 h-4 w-4" />{lang === "ar" ? "استيراد CSV" : "Import CSV"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/quotes")}><FileSpreadsheet className="me-2 h-4 w-4" />{lang === "ar" ? "طلبات التسعير" : "Quote Requests"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/messages")}><Inbox className="me-2 h-4 w-4" />{lang === "ar" ? "صندوق الرسائل" : "Inbox"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/canned-responses")}><MessageCircle className="me-2 h-4 w-4" />{lang === "ar" ? "ردود جاهزة" : "Canned Responses"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/analytics")}><BarChart3 className="me-2 h-4 w-4" />{lang === "ar" ? "التحليلات" : "Analytics"}</CommandItem>
          <CommandItem onSelect={() => go("/admin/settings")}><Settings className="me-2 h-4 w-4" />{lang === "ar" ? "الإعدادات" : "Settings"}</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
