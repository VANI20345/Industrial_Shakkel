import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Loader2, Mail, Phone, ShieldCheck, User as UserIcon, Send, MessageCircle, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Msg = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
type Reply = {
  id: string;
  contact_message_id: string;
  sender_id: string | null;
  sender_role: "admin" | "customer";
  sender_name: string | null;
  message: string;
  created_at: string;
};

const STATUSES = ["new", "in_review", "replied", "closed"] as const;
const statusLabel = (s: string, lang: "ar" | "en") => ({
  new: lang === "ar" ? "جديد" : "New",
  in_review: lang === "ar" ? "قيد المراجعة" : "In Review",
  replied: lang === "ar" ? "تم الرد" : "Replied",
  closed: lang === "ar" ? "مغلق" : "Closed",
}[s] || s);

const AdminMessages = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [meName, setMeName] = useState("Admin");
  const [canned, setCanned] = useState<{ id: string; title_ar: string; title_en: string; body_ar: string; body_en: string }[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const reload = async () => {
    const { data } = await client.from("contact_messages").select("*").order("updated_at", { ascending: false });
    setRows((data as Msg[]) || []);
  };

  useEffect(() => {
    client.from("canned_responses").select("id,title_ar,title_en,body_ar,body_en").eq("is_active", true).order("sort_order", { ascending: true })
      .then(({ data }: any) => setCanned(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
    if (user) {
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.full_name) setMeName(data.full_name); });
    }
    const ch = supabase
      .channel("admin-inbox-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => reload())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_message_replies" }, () => {
        if (activeId) {
          client.from("contact_message_replies").select("*").eq("contact_message_id", activeId).order("created_at", { ascending: true })
            .then(({ data }: { data: Reply[] | null }) => setReplies(data || []));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeId]);


  const open = async (m: Msg) => {
    setActiveId(m.id);
    setReply("");
    const { data } = await client
      .from("contact_message_replies")
      .select("*")
      .eq("contact_message_id", m.id)
      .order("created_at", { ascending: true });
    setReplies((data as Reply[]) || []);
  };

  const sendReply = async () => {
    if (!activeId || !user) return;
    const text = reply.trim();
    if (text.length < 1) return toast.error(lang === "ar" ? "اكتب الرد" : "Write a reply");
    if (text.length > 4000) return toast.error(lang === "ar" ? "الرد طويل جدًا" : "Reply too long");
    setSending(true);
    const { error } = await client.from("contact_message_replies").insert({
      contact_message_id: activeId,
      sender_id: user.id,
      sender_role: "admin",
      sender_name: meName,
      message: text,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setReply("");
    toast.success(lang === "ar" ? "تم الإرسال" : "Sent");
    const { data: rs } = await client
      .from("contact_message_replies")
      .select("*")
      .eq("contact_message_id", activeId)
      .order("created_at", { ascending: true });
    setReplies((rs as Reply[]) || []);
    const { data: m } = await client.from("contact_messages").select("*").eq("id", activeId).maybeSingle();
    if (m) setRows((rs2) => rs2.map((x) => x.id === activeId ? (m as Msg) : x));
  };

  const setStatus = async (m: Msg, status: string) => {
    const { error } = await client.from("contact_messages").update({ status }).eq("id", m.id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((x) => x.id === m.id ? { ...x, status } : x));
    toast.success(lang === "ar" ? "تم تحديث الحالة" : "Status updated");
  };

  const active = rows.find((m) => m.id === activeId) || null;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{lang === "ar" ? "صندوق الرسائل" : "Inbox"}</h1>
        <p className="text-muted-foreground text-sm mt-1">{rows.length} {lang === "ar" ? "رسالة" : "messages"}</p>
      </div>
      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {lang === "ar" ? "لا توجد رسائل" : "No messages"}
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-4">
          <div className="space-y-2 max-h-[75vh] overflow-y-auto pe-1">
            {rows.map((m) => (
              <button key={m.id} onClick={() => open(m)} className={`w-full text-start p-3 rounded-md border transition-base ${activeId === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">{m.name}</span>
                  <Badge variant="outline" className="text-[10px]">{statusLabel(m.status, lang)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{m.subject || m.message.slice(0, 60)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.updated_at).toLocaleString()}</p>
              </button>
            ))}
          </div>

          <Card className="p-5 min-h-[60vh]">
            {!active ? (
              <p className="text-center text-muted-foreground py-20 text-sm">{lang === "ar" ? "اختر رسالة" : "Select a message"}</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="font-bold text-lg">{active.subject || (lang === "ar" ? "بدون موضوع" : "No subject")}</h2>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                        <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {active.name}{active.user_id && <Badge variant="outline" className="text-[9px] ms-1">{lang === "ar" ? "مسجل" : "Registered"}</Badge>}</span>
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> <span dir="ltr">{active.email}</span></span>
                        {active.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> <span dir="ltr">{active.phone}</span></span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(active.created_at).toLocaleString()}</p>
                    </div>
                    <Select value={active.status} onValueChange={(v) => setStatus(active, v)}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-md bg-secondary/40 border border-border p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{lang === "ar" ? "نص الاستفسار" : "Inquiry"}</p>
                  <p className="text-sm whitespace-pre-line">{active.message}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{lang === "ar" ? "الردود" : "Replies"} ({replies.length})</p>
                  {replies.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{lang === "ar" ? "لا توجد ردود بعد." : "No replies yet."}</p>
                  ) : (
                    <div className="space-y-2">
                      {replies.map((r) => (
                        <div key={r.id} className="p-3 rounded-md bg-card border border-border">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold">{r.sender_name || "Admin"}</span>
                            <Badge variant="outline" className="text-[9px]">{r.sender_role}</Badge>
                            <span className="text-muted-foreground ms-auto">{new Date(r.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm whitespace-pre-line">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <Textarea
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={lang === "ar" ? "اكتب ردك للعميل…" : "Write your reply to the customer…"}
                    maxLength={4000}
                  />
                  <div className="flex justify-between items-center mt-2 gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                          <MessageSquareText className="h-3.5 w-3.5 me-1" />
                          {lang === "ar" ? "إدراج رد جاهز" : "Insert canned reply"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                        <DropdownMenuLabel className="text-xs">{lang === "ar" ? "اختر قالباً" : "Choose a template"}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canned.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground">
                            {lang === "ar" ? "لا توجد قوالب." : "No templates."}{" "}
                            <Link to="/admin/canned-responses" className="text-primary underline">{lang === "ar" ? "أضف" : "Add"}</Link>
                          </div>
                        ) : canned.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => setReply((prev) => prev ? `${prev}\n\n${lang === "ar" ? c.body_ar : c.body_en}` : (lang === "ar" ? c.body_ar : c.body_en))}
                            className="flex-col items-start gap-0.5"
                          >
                            <span className="text-xs font-semibold">{lang === "ar" ? c.title_ar : c.title_en}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">{lang === "ar" ? c.body_ar : c.body_en}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/canned-responses" className="text-xs text-primary">{lang === "ar" ? "إدارة القوالب…" : "Manage templates…"}</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={sendReply} disabled={sending || !reply.trim()} className="bg-gradient-primary">
                      {sending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                      {lang === "ar" ? "إرسال الرد" : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMessages;
