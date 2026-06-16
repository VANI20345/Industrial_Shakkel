import { useEffect, useState } from "react";
import { Bell, FileSpreadsheet, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  kind: "quote" | "message";
  title: string;
  subtitle: string;
  at: string;
  href: string;
};

const PAGE = 10;

export const NotificationsBell = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("admin_seen_notifs") || "[]")); }
    catch { return new Set(); }
  });

  const load = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const [q, m] = await Promise.all([
      supabase.from("quote_requests")
        .select("id, name, company, created_at, status")
        .order("created_at", { ascending: false })
        .limit(PAGE),
      client.from("contact_messages")
        .select("id, name, subject, message, created_at, status")
        .order("created_at", { ascending: false })
        .limit(PAGE),
    ]);
    const qs: Notif[] = (q.data || []).map((r: any) => ({
      id: `q-${r.id}`,
      kind: "quote",
      title: lang === "ar" ? `طلب تسعير من ${r.name}` : `Quote request from ${r.name}`,
      subtitle: r.company || "",
      at: r.created_at,
      href: `/admin/quotes`,
    }));
    const ms: Notif[] = (m.data || []).map((r: any) => ({
      id: `m-${r.id}`,
      kind: "message",
      title: lang === "ar" ? `رسالة من ${r.name}` : `Message from ${r.name}`,
      subtitle: r.subject || r.message?.slice(0, 60) || "",
      at: r.created_at,
      href: `/admin/messages`,
    }));
    const merged = [...qs, ...ms].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, PAGE);
    setItems(merged);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_requests" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const unread = items.filter((i) => !seenIds.has(i.id)).length;

  const markAllSeen = () => {
    const next = new Set(seenIds);
    items.forEach((i) => next.add(i.id));
    setSeenIds(next);
    try { localStorage.setItem("admin_seen_notifs", JSON.stringify([...next].slice(-200))); } catch { /* ignore */ }
  };

  const onItemClick = (n: Notif) => {
    const next = new Set(seenIds); next.add(n.id); setSeenIds(next);
    try { localStorage.setItem("admin_seen_notifs", JSON.stringify([...next].slice(-200))); } catch { /* ignore */ }
    setOpen(false);
    navigate(n.href);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(markAllSeen, 1500); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">{lang === "ar" ? "الإشعارات" : "Notifications"}</span>
          {items.length > 0 && (
            <button className="text-[11px] text-muted-foreground hover:text-foreground" onClick={markAllSeen}>
              {lang === "ar" ? "تعليم الكل كمقروء" : "Mark all read"}
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : items.map((n) => {
            const unseen = !seenIds.has(n.id);
            const Icon = n.kind === "quote" ? FileSpreadsheet : MessageCircle;
            return (
              <button
                key={n.id}
                onClick={() => onItemClick(n)}
                className={`w-full text-start flex gap-3 p-3 border-b last:border-b-0 hover:bg-secondary/40 ${unseen ? "bg-primary/5" : ""}`}
              >
                <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${n.kind === "quote" ? "bg-primary/15 text-primary" : "bg-accent/20 text-accent-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${unseen ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.subtitle && <p className="text-xs text-muted-foreground truncate">{n.subtitle}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(() => { try { return formatDistanceToNow(new Date(n.at), { addSuffix: true }); } catch { return ""; } })()}
                  </p>
                </div>
                {unseen && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t flex gap-2">
          <Button size="sm" variant="ghost" className="flex-1 justify-center text-xs" onClick={() => { setOpen(false); navigate("/admin/quotes"); }}>
            <FileSpreadsheet className="h-3.5 w-3.5 me-1" /> {lang === "ar" ? "الطلبات" : "Quotes"} <ExternalLink className="h-3 w-3 ms-1 opacity-60" />
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 justify-center text-xs" onClick={() => { setOpen(false); navigate("/admin/messages"); }}>
            <MessageCircle className="h-3.5 w-3.5 me-1" /> {lang === "ar" ? "الرسائل" : "Inbox"} <ExternalLink className="h-3 w-3 ms-1 opacity-60" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
