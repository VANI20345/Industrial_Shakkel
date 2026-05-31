import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Admin badge: count of unattended items (new quotes + new messages).
// Realtime via Supabase channels, with a polling safety net.
export const useAdminUnread = (intervalMs = 60_000) => {
  const { isAdmin } = useAuth();
  const [quotes, setQuotes] = useState(0);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    if (!isAdmin) { setQuotes(0); setMessages(0); return; }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    const load = async () => {
      const [q, m] = await Promise.all([
        supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        client.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      if (cancelled) return;
      setQuotes(q.count || 0);
      setMessages(m.count || 0);
    };

    load();
    const id = setInterval(load, intervalMs);

    const ch = supabase
      .channel("admin-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => load())
      .subscribe();

    return () => { cancelled = true; clearInterval(id); supabase.removeChannel(ch); };
  }, [isAdmin, intervalMs]);

  return { quotes, messages, total: quotes + messages };
};
