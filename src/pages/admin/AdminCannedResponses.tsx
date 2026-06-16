import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Row = {
  id: string;
  title_ar: string; title_en: string;
  body_ar: string; body_en: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const empty: Partial<Row> = { title_ar: "", title_en: "", body_ar: "", body_en: "", category: "general", sort_order: 0, is_active: true };

const AdminCannedResponses = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const load = async () => {
    const { data, error } = await client.from("canned_responses").select("*").order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!editing) return;
    const e = editing;
    if (!e.title_ar?.trim() || !e.title_en?.trim() || !e.body_ar?.trim() || !e.body_en?.trim()) {
      return toast.error(lang === "ar" ? "كل الحقول مطلوبة" : "All fields required");
    }
    setSaving(true);
    const payload = {
      title_ar: e.title_ar, title_en: e.title_en,
      body_ar: e.body_ar, body_en: e.body_en,
      category: e.category || "general",
      sort_order: e.sort_order || 0,
      is_active: e.is_active ?? true,
    };
    const res = e.id
      ? await client.from("canned_responses").update(payload).eq("id", e.id)
      : await client.from("canned_responses").insert({ ...payload, created_by: user?.id });
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا الرد؟" : "Delete this response?")) return;
    const { error } = await client.from("canned_responses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2"><MessageSquareText className="h-6 w-6 text-primary" />{lang === "ar" ? "الردود الجاهزة" : "Canned Responses"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{lang === "ar" ? "قوالب للرد السريع على رسائل العملاء" : "Templates for quick replies to customer messages"}</p>
        </div>
        <Button onClick={() => setEditing(empty)} className="bg-gradient-primary"><Plus className="h-4 w-4 me-2" />{lang === "ar" ? "رد جديد" : "New Response"}</Button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <MessageSquareText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {lang === "ar" ? "لا توجد ردود جاهزة بعد" : "No canned responses yet"}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{lang === "ar" ? r.title_ar : r.title_en}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {r.category && <Badge variant="outline" className="text-[10px]">{r.category}</Badge>}
                    {!r.is_active && <Badge variant="secondary" className="text-[10px]">{lang === "ar" ? "غير مفعل" : "Inactive"}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{lang === "ar" ? r.body_ar : r.body_en}</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? (lang === "ar" ? "تعديل الرد" : "Edit Response") : (lang === "ar" ? "رد جديد" : "New Response")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</label>
                  <Input value={editing.title_ar || ""} onChange={(e) => setEditing({ ...editing, title_ar: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}</label>
                  <Input value={editing.title_en || ""} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "النص (عربي)" : "Body (Arabic)"}</label>
                <Textarea rows={4} value={editing.body_ar || ""} onChange={(e) => setEditing({ ...editing, body_ar: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "النص (إنجليزي)" : "Body (English)"}</label>
                <Textarea rows={4} value={editing.body_en || ""} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "التصنيف" : "Category"}</label>
                  <Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="general" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">{lang === "ar" ? "الترتيب" : "Sort"}</label>
                  <Input type="number" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                    {lang === "ar" ? "مفعّل" : "Active"}
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCannedResponses;
