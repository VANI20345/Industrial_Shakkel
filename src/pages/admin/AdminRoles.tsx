import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = { id: string; full_name: string | null; email: string | null; company_name: string | null; phone: string | null };
type RoleRow = { user_id: string; role: "admin" | "customer" };

const AdminRoles = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, "admin" | "customer">>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,company_name,phone").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((p.data as Profile[]) || []);
    const map: Record<string, "admin" | "customer"> = {};
    ((r.data as RoleRow[]) || []).forEach((x) => { map[x.user_id] = x.role; });
    setRoles(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, role: "admin" | "customer") => {
    if (userId === user?.id && role !== "admin") {
      return toast.error(lang === "ar" ? "لا يمكنك إزالة صلاحية الأدمن من نفسك" : "You can't remove your own admin role");
    }
    setBusyId(userId);
    const old = roles[userId] || "customer";
    const { error } = await supabase.rpc("set_user_role", { _target_user: userId, _role: role });
    if (error) { setBusyId(null); return toast.error(error.message); }
    await supabase.rpc("log_audit", {
      _action: "role_change", _table: "user_roles", _record_id: userId,
      _old: { role: old } as any, _new: { role } as any,
    });
    setBusyId(null);
    toast.success(lang === "ar" ? "تم تحديث الدور" : "Role updated");
    load();
  };

  const filtered = profiles.filter((p) => {
    const s = search.toLowerCase();
    return !s || (p.full_name || "").toLowerCase().includes(s) || (p.email || "").toLowerCase().includes(s) || (p.company_name || "").toLowerCase().includes(s);
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold inline-flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> {lang === "ar" ? "إدارة الأدوار" : "Roles Management"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{filtered.length}</p>
      </div>

      <Card className="p-4 mb-4">
        <Input placeholder={lang === "ar" ? "بحث بالاسم/الإيميل/الشركة" : "Search by name/email/company"} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">{lang === "ar" ? "الشركة" : "Company"}</th>
                  <th className="px-5 py-3">{lang === "ar" ? "الدور" : "Role"}</th>
                  <th className="px-5 py-3 text-end">{lang === "ar" ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const role = roles[p.id] || "customer";
                  const isMe = p.id === user?.id;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-5 py-3 font-semibold">
                        {p.full_name || "—"} {isMe && <span className="text-xs text-muted-foreground">({lang === "ar" ? "أنت" : "you"})</span>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.email || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.company_name || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={role === "admin" ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary"}>{role}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {role === "admin" ? (
                            <Button size="sm" variant="outline" disabled={isMe || busyId === p.id} onClick={() => setRole(p.id, "customer")}>
                              {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5 me-1.5" />}
                              {lang === "ar" ? "تنزيل لعميل" : "Demote to Customer"}
                            </Button>
                          ) : (
                            <Button size="sm" disabled={busyId === p.id} onClick={() => setRole(p.id, "admin")} className="bg-gradient-primary">
                              {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 me-1.5" />}
                              {lang === "ar" ? "ترقية لأدمن" : "Promote to Admin"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No users</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
};

export default AdminRoles;
