import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Counts contact messages with unread admin replies for the current user.
// Uses Supabase Realtime to react instantly to new replies, with a polling safety net.
export const useUnreadReplies = (intervalMs = 60_000) => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    const load = async () => {
      const { count: c } = await client
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read_by_user", false);
      if (!cancelled) setCount(c || 0);
    };

    load();
    const id = setInterval(load, intervalMs);

    // Realtime: when a new reply arrives for one of my messages, refresh.
    const channel = supabase
      .channel(`unread-replies-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_message_replies" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contact_messages", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [user, intervalMs]);

  return count;
};
