import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/i18n/I18nProvider";
import {
  History as HistoryIcon, Loader2, RefreshCw, Plus, Pencil, Trash2, Package, Building2,
  FolderTree, FileSpreadsheet, UserCog, Boxes, ChevronDown, User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: string; created_at: string; actor_email: string | null; actor_id: string | null;
  action: string; table_name: string; record_id: string | null;
  old_values: any; new_values: any;
};

const ACTION_META: Record<string, { color: string; Icon: any; ar: string; en: string }> = {
  create:        { color: "bg-success/10 text-success border-success/30",          Icon: Plus,    ar: "إنشاء",     en: "Created" },
  update:        { color: "bg-primary/10 text-primary border-primary/30",          Icon: Pencil,  ar: "تعديل",     en: "Updated" },
  delete:        { color: "bg-destructive/10 text-destructive border-destructive/30", Icon: Trash2, ar: "حذف",      en: "Deleted" },
  stock_add:     { color: "bg-success/10 text-success border-success/30",          Icon: Plus,    ar: "إضافة مخزون", en: "Stock added" },
  stock_adjust:  { color: "bg-warning/15 text-warning-foreground border-warning/40", Icon: Boxes,  ar: "تعديل مخزون", en: "Stock adjusted" },
  status_change: { color: "bg-accent/10 text-accent border-accent/30",             Icon: RefreshCw, ar: "تغيير حالة", en: "Status change" },
  role_change:   { color: "bg-warning/15 text-warning-foreground border-warning/40", Icon: UserCog, ar: "تغيير دور",  en: "Role change" },
};

const TABLE_META: Record<string, { ar: string; en: string; Icon: any }> = {
  products:       { ar: "منتج",        en: "Product",       Icon: Package },
  brands:         { ar: "علامة تجارية", en: "Brand",         Icon: Building2 },
  categories:     { ar: "تصنيف",       en: "Category",      Icon: FolderTree },
  quote_requests: { ar: "طلب تسعيرة",   en: "Quote request", Icon: FileSpreadsheet },
  user_roles:     { ar: "دور مستخدم",   en: "User role",     Icon: UserCog },
  profiles:       { ar: "ملف مستخدم",   en: "Profile",       Icon: User },
};

const ACTIONS = ["all", "create", "update", "delete", "stock_add", "stock_adjust", "status_change", "role_change"];
const TABLES = ["all", "products", "brands", "categories", "quote_requests", "user_roles", "profiles"];

const friendlyDate = (iso: string, lang: "ar" | "en") => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return lang === "ar" ? "الآن" : "just now";
  if (diff < 3600) return lang === "ar" ? `قبل ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return lang === "ar" ? `قبل ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
};

const summarise = (r: AuditRow, lang: "ar" | "en") => {
  const v = r.new_values || r.old_values || {};
  return v.name || v.code || v.full_name || v.customer_name || v.status || r.record_id?.slice(0, 8) || "—";
};

const AdminAuditLog = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [table, setTable] = useState("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (action !== "all") q = q.eq("action", action);
    if (table !== "all") q = q.eq("table_name", table);
    const { data } = await q;
    setRows((data as AuditRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [action, table]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (r.actor_email || "").toLowerCase().includes(s)
      || (r.record_id || "").toLowerCase().includes(s)
      || JSON.stringify(r.new_values || {}).toLowerCase().includes(s)
      || JSON.stringify(r.old_values || {}).toLowerCase().includes(s);
  }), [rows, search]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold inline-flex items-center gap-2">
            <HistoryIcon className="h-6 w-6" /> {isAr ? "سجل النشاط" : "Activity log"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr
              ? `يعرض آخر ${rows.length} عملية. النتائج: ${filtered.length}`
              : `Showing the last ${rows.length} operations. Filtered: ${filtered.length}`}
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 me-1.5" /> {isAr ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <Card className="p-4 mb-4 grid gap-3 md:grid-cols-3">
        <Input
          placeholder={isAr ? "ابحث (إيميل، اسم، كود…)" : "Search (email, name, code…)"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "all" ? (isAr ? "كل العمليات" : "All actions") : (ACTION_META[a] ? (isAr ? ACTION_META[a].ar : ACTION_META[a].en) : a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TABLES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? (isAr ? "كل الأنواع" : "All types") : (TABLE_META[t] ? (isAr ? TABLE_META[t].ar : TABLE_META[t].en) : t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {isAr ? "لا توجد نشاطات مطابقة." : "No matching activity."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = ACTION_META[r.action] || { color: "bg-secondary text-foreground border-border", Icon: HistoryIcon, ar: r.action, en: r.action };
            const tbl = TABLE_META[r.table_name];
            const TableIcon = tbl?.Icon || HistoryIcon;
            const actor = r.actor_email || (isAr ? "النظام" : "System");
            return (
              <Collapsible key={r.id} asChild>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/40 transition-base">
                      <div className={cn("h-9 w-9 rounded-md flex items-center justify-center border shrink-0", meta.color)}>
                        <meta.Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {isAr ? meta.ar : meta.en}
                          </span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <TableIcon className="h-3.5 w-3.5" />
                            {tbl ? (isAr ? tbl.ar : tbl.en) : r.table_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">{summarise(r, lang)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          <span className="font-medium text-foreground/80">{actor}</span> · {friendlyDate(r.created_at, lang)}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t border-border bg-secondary/30">
                      <div className="grid md:grid-cols-2 gap-3 text-xs mt-3">
                        {r.old_values && (
                          <div>
                            <div className="font-semibold text-destructive mb-1.5">{isAr ? "قبل" : "Before"}</div>
                            <pre className="p-2.5 rounded bg-background border border-border font-mono text-[11px] whitespace-pre-wrap break-all">
                              {JSON.stringify(r.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {r.new_values && (
                          <div>
                            <div className="font-semibold text-success mb-1.5">{isAr ? "بعد" : "After"}</div>
                            <pre className="p-2.5 rounded bg-background border border-border font-mono text-[11px] whitespace-pre-wrap break-all">
                              {JSON.stringify(r.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                        {isAr ? "معرف السجل" : "Record ID"}: {r.record_id || "—"} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAuditLog;
