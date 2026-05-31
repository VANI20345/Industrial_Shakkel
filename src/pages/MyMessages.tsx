import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { Loader2, MessageCircle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

type Msg = {
  id: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_read_by_user: boolean;
};
type Reply = {
  id: string;
  contact_message_id: string;
  sender_role: "admin" | "customer";
  sender_name: string | null;
  message: string;
  created_at: string;
};

const statusLabel = (s: string, lang: "ar" | "en") => {
  const map: Record<string, [string, string]> = {
    new: ["New", "جديد"],
    in_review: ["In Review", "قيد المراجعة"],
    replied: ["Replied", "تم الرد"],
    closed: ["Closed", "مغلق"],
  };
  return map[s]?.[lang === "ar" ? 1 : 0] || s;
};

const MyMessages = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [rows, setRows] = useState<Msg[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data } = await client
        .from("contact_messages")
        .select("id,subject,message,status,created_at,updated_at,is_read_by_user")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setRows((data as Msg[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const open = async (m: Msg) => {
    const newOpen = openId === m.id ? null : m.id;
    setOpenId(newOpen);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    if (newOpen && !replies[m.id]) {
      const { data } = await client
        .from("contact_message_replies")
        .select("*")
        .eq("contact_message_id", m.id)
        .order("created_at", { ascending: true });
      setReplies((r) => ({ ...r, [m.id]: (data as Reply[]) || [] }));
    }
    if (newOpen && !m.is_read_by_user) {
      await client.from("contact_messages").update({ is_read_by_user: true }).eq("id", m.id);
      setRows((rs) => rs.map((x) => x.id === m.id ? { ...x, is_read_by_user: true } : x));
    }
  };

  return (
    <SiteLayout>
      <div className="container-page py-10 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold">{lang === "ar" ? "رسائلي" : "My Messages"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? "استفساراتك وردود الفريق" : "Your inquiries and team replies"}</p>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            {lang === "ar" ? "لا توجد رسائل بعد" : "No messages yet"}
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => {
              const isOpen = openId === m.id;
              const rs = replies[m.id] || [];
              return (
                <Card key={m.id} className="overflow-hidden">
                  <button onClick={() => open(m)} className="w-full p-4 flex items-start gap-3 text-start hover:bg-secondary/40 transition-base">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{m.subject || (lang === "ar" ? "بدون موضوع" : "No subject")}</span>
                        <Badge variant="outline" className="text-[10px]">{statusLabel(m.status, lang)}</Badge>
                        {!m.is_read_by_user && <Badge className="text-[10px] bg-accent text-accent-foreground border-0">{lang === "ar" ? "رد جديد" : "New reply"}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border p-4 space-y-3 bg-secondary/20">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{lang === "ar" ? "رسالتك" : "Your message"}</p>
                        <p className="text-sm whitespace-pre-line">{m.message}</p>
                      </div>
                      {rs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">{lang === "ar" ? "لا توجد ردود بعد." : "No replies yet."}</p>
                      ) : (
                        <div className="space-y-2">
                          {rs.map((r) => (
                            <div key={r.id} className="p-3 rounded-md bg-card border border-border">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-foreground">{r.sender_name || (lang === "ar" ? "الإدارة" : "Admin")}</span>
                                <span>·</span>
                                <span>{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-sm whitespace-pre-line">{r.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button asChild variant="outline"><a href="/contact">{lang === "ar" ? "إرسال استفسار جديد" : "Send a new inquiry"}</a></Button>
        </div>
      </div>
    </SiteLayout>
  );
};

export default MyMessages;
